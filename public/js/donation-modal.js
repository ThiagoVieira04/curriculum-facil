/* ============================================
   PIX Donation Modal - Module
   Generates QR Code for voluntary PIX donation
   ============================================ */

(function () {
    'use strict';

    // ---- Configuration ----
    const PIX_KEY = 'tsmv04@hotmail.com';
    const PIX_NAME = 'Thiago S M Vieira';
    const PIX_CITY = 'SAO PAULO';
    const MERCHANT_CATEGORY = '0000';

    // ---- PIX EMV Payload Generator (BR spec) ----
    function buildPixPayload() {
        // EMV-QRCode spec for PIX (BRCode)
        function tlv(id, value) {
            const len = value.length.toString().padStart(2, '0');
            return id + len + value;
        }

        // Payload Format Indicator
        let payload = tlv('00', '01');

        // Merchant Account Info — PIX
        const gui = tlv('00', 'BR.GOV.BCB.PIX');
        const key = tlv('01', PIX_KEY);
        payload += tlv('26', gui + key);

        // Merchant Category Code
        payload += tlv('52', MERCHANT_CATEGORY);

        // Transaction Currency (BRL = 986)
        payload += tlv('53', '986');

        // Country Code
        payload += tlv('58', 'BR');

        // Merchant Name (max 25 chars)
        const name = PIX_NAME.substring(0, 25);
        payload += tlv('59', name);

        // Merchant City (max 15 chars)
        const city = PIX_CITY.substring(0, 15);
        payload += tlv('60', city);

        // Additional Data Field Template — txid
        const txId = tlv('05', '***');
        payload += tlv('62', txId);

        // CRC16 placeholder — will be calculated
        payload += '6304';

        // Calculate CRC16 (CCITT-FALSE)
        const crc = crc16(payload);
        payload += crc;

        return payload;
    }

    // CRC16-CCITT-FALSE implementation
    function crc16(str) {
        let crc = 0xFFFF;
        for (let i = 0; i < str.length; i++) {
            crc ^= str.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                if (crc & 0x8000) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc = crc << 1;
                }
            }
            crc &= 0xFFFF;
        }
        return crc.toString(16).toUpperCase().padStart(4, '0');
    }

    // ---- Modal HTML ----
    function createModalHTML() {
        return `
            <div class="donation-overlay" id="donation-overlay" role="dialog" aria-modal="true" aria-labelledby="donation-title">
                <div class="donation-modal">
                    <button class="donation-close" onclick="closeDonationModal()" aria-label="Fechar">&times;</button>
                    
                    <div class="donation-header">
                        <span class="emoji-icon" aria-hidden="true">🎉</span>
                        <h2 id="donation-title">Seu currículo ficou incrível!</h2>
                        <p>Se o <strong>CurrículoFácil</strong> te ajudou, considere fazer uma doação voluntária para manter o projeto 100% gratuito. Qualquer valor faz diferença!</p>
                    </div>

                    <div class="donation-qr-wrapper">
                        <div class="donation-qr-box" id="donation-qr-code" aria-label="QR Code PIX para doação"></div>
                        <span class="donation-qr-label">Escaneie com o app do seu banco</span>
                    </div>

                    <div class="donation-pix-key">
                        <code id="pix-key-text">${PIX_KEY}</code>
                        <button class="donation-copy-btn" id="copy-pix-btn" onclick="copyPixKey()">
                            📋 Copiar chave PIX
                        </button>
                    </div>

                    <div class="donation-actions">
                        <button class="donation-btn donation-btn-primary" onclick="donationDone()">
                            ❤️ Já fiz a doação
                        </button>
                        <button class="donation-btn donation-btn-secondary" onclick="createNewCV()">
                            📄 Gerar outro currículo
                        </button>
                        <button class="donation-btn donation-btn-link" onclick="closeDonationModal()">
                            Pular
                        </button>
                    </div>

                    <p class="donation-disclaimer">A doação é 100% voluntária e opcional. O serviço continua gratuito independente de contribuição.</p>
                </div>
            </div>
        `;
    }

    // ---- Public Functions ----

    // Show donation modal
    window.showDonationModal = function () {
        // Avoid duplicate modals
        if (document.getElementById('donation-overlay')) {
            document.getElementById('donation-overlay').classList.add('active');
            return;
        }

        // Inject modal HTML
        const container = document.createElement('div');
        container.id = 'donation-modal-container';
        container.innerHTML = createModalHTML();
        document.body.appendChild(container);

        // Generate QR Code
        const pixPayload = buildPixPayload();
        const qrContainer = document.getElementById('donation-qr-code');

        if (typeof QRCode !== 'undefined' && qrContainer) {
            new QRCode(qrContainer, {
                text: pixPayload,
                width: 200,
                height: 200,
                colorDark: '#1e293b',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        } else {
            // Fallback: show text-only if QRCode lib not loaded
            if (qrContainer) {
                qrContainer.innerHTML = '<p style="color:#64748b;font-size:0.85rem;padding:20px;">QR Code indisponível.<br>Use a chave PIX abaixo.</p>';
            }
        }

        // Animate in (next frame for CSS transition)
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                var overlay = document.getElementById('donation-overlay');
                if (overlay) overlay.classList.add('active');
            });
        });

        // Close on overlay click (outside modal)
        var overlay = document.getElementById('donation-overlay');
        if (overlay) {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) {
                    closeDonationModal();
                }
            });
        }

        // Close on Escape key
        document.addEventListener('keydown', handleEscKey);

        // Track event
        if (typeof trackEvent === 'function') {
            trackEvent('donation_modal_shown');
        }
    };

    // Close donation modal
    window.closeDonationModal = function () {
        var overlay = document.getElementById('donation-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            // Remove from DOM after animation
            setTimeout(function () {
                var container = document.getElementById('donation-modal-container');
                if (container) container.remove();
            }, 500);
        }
        document.removeEventListener('keydown', handleEscKey);
    };

    // Copy PIX key to clipboard
    window.copyPixKey = function () {
        var btn = document.getElementById('copy-pix-btn');

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(PIX_KEY).then(function () {
                showCopyFeedback(btn);
            }).catch(function () {
                fallbackCopy(btn);
            });
        } else {
            fallbackCopy(btn);
        }

        if (typeof trackEvent === 'function') {
            trackEvent('pix_key_copied');
        }
    };

    // "Já fiz a doação" button
    window.donationDone = function () {
        if (typeof trackEvent === 'function') {
            trackEvent('donation_confirmed');
        }
        closeDonationModal();
    };

    // "Gerar outro currículo" button
    window.createNewCV = function () {
        closeDonationModal();
        if (typeof trackEvent === 'function') {
            trackEvent('donation_create_new');
        }
        // Small delay so modal closes smoothly before navigation
        setTimeout(function () {
            if (typeof goHome === 'function') {
                goHome();
            } else {
                window.location.href = '/';
            }
        }, 300);
    };

    // ---- Private Helpers ----

    function handleEscKey(e) {
        if (e.key === 'Escape') {
            closeDonationModal();
        }
    }

    function showCopyFeedback(btn) {
        if (!btn) return;
        var original = btn.innerHTML;
        btn.innerHTML = '✅ Copiado!';
        btn.classList.add('copied');
        setTimeout(function () {
            btn.innerHTML = original;
            btn.classList.remove('copied');
        }, 2000);
    }

    function fallbackCopy(btn) {
        // Fallback for older browsers
        var textarea = document.createElement('textarea');
        textarea.value = PIX_KEY;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showCopyFeedback(btn);
        } catch (e) {
            // Silent fail
        }
        document.body.removeChild(textarea);
    }

})();
