/**
 * Widget de Acessibilidade Global
 * WCAG 2.1 AA Compliant
 * Sem dependências externas
 * @version 1.0.0
 */
(function() {
    'use strict';

    // Namespace isolado
    const A11Y = {
        config: {
            storageKey: 'a11y_preferences',
            fontSizeStep: 10,
            fontSizeMin: 80,
            fontSizeMax: 150
        },
        
        state: {
            fontSize: 100,
            highContrast: false,
            grayscale: false,
            highlightLinks: false
        },

        // Inicialização
        init() {
            this.loadPreferences();
            this.injectStyles();
            this.injectHTML();
            this.bindEvents();
            this.applyPreferences();
        },

        // Carregar preferências salvas
        loadPreferences() {
            try {
                const saved = localStorage.getItem(this.config.storageKey);
                if (saved) {
                    this.state = { ...this.state, ...JSON.parse(saved) };
                }
            } catch (e) {
                console.warn('A11Y: localStorage não disponível');
            }
        },

        // Salvar preferências
        savePreferences() {
            try {
                localStorage.setItem(this.config.storageKey, JSON.stringify(this.state));
            } catch (e) {
                console.warn('A11Y: Não foi possível salvar preferências');
            }
        },

        // Injetar CSS isolado
        injectStyles() {
            const style = document.createElement('style');
            style.id = 'a11y-widget-styles';
            style.textContent = `
                /* Widget Button */
                .a11y-widget-btn {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: #2563eb;
                    color: white;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 999998;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s, box-shadow 0.2s;
                    font-size: 28px;
                    line-height: 1;
                }
                .a11y-widget-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.2);
                }
                .a11y-widget-btn:focus {
                    outline: 3px solid #fbbf24;
                    outline-offset: 2px;
                }
                .a11y-widget-btn:active {
                    transform: scale(0.95);
                }

                /* Panel */
                .a11y-widget-panel {
                    position: fixed;
                    bottom: 90px;
                    right: 20px;
                    width: 320px;
                    max-width: calc(100vw - 40px);
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                    z-index: 999999;
                    opacity: 0;
                    transform: translateY(20px) scale(0.95);
                    pointer-events: none;
                    transition: opacity 0.3s, transform 0.3s;
                }
                .a11y-widget-panel.a11y-active {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    pointer-events: auto;
                }

                .a11y-panel-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .a11y-panel-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #1f2937;
                    margin: 0;
                }
                .a11y-panel-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: #6b7280;
                    cursor: pointer;
                    padding: 4px;
                    line-height: 1;
                    border-radius: 4px;
                }
                .a11y-panel-close:hover {
                    background: #f3f4f6;
                    color: #1f2937;
                }
                .a11y-panel-close:focus {
                    outline: 2px solid #2563eb;
                    outline-offset: 2px;
                }

                .a11y-panel-body {
                    padding: 20px;
                }

                /* Controls */
                .a11y-control {
                    margin-bottom: 20px;
                }
                .a11y-control:last-child {
                    margin-bottom: 0;
                }
                .a11y-control-label {
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 8px;
                }

                /* Font Size Control */
                .a11y-font-control {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .a11y-font-btn {
                    width: 36px;
                    height: 36px;
                    border: 1px solid #d1d5db;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 18px;
                    font-weight: 600;
                    color: #374151;
                    transition: all 0.2s;
                }
                .a11y-font-btn:hover {
                    background: #f3f4f6;
                    border-color: #2563eb;
                }
                .a11y-font-btn:focus {
                    outline: 2px solid #2563eb;
                    outline-offset: 2px;
                }
                .a11y-font-value {
                    flex: 1;
                    text-align: center;
                    font-size: 14px;
                    color: #6b7280;
                    font-weight: 500;
                }

                /* Toggle Switch */
                .a11y-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .a11y-switch {
                    position: relative;
                    width: 48px;
                    height: 24px;
                    background: #d1d5db;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: background 0.3s;
                }
                .a11y-switch::after {
                    content: '';
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 20px;
                    height: 20px;
                    background: white;
                    border-radius: 50%;
                    transition: transform 0.3s;
                }
                .a11y-switch.a11y-on {
                    background: #2563eb;
                }
                .a11y-switch.a11y-on::after {
                    transform: translateX(24px);
                }
                .a11y-switch:focus {
                    outline: 2px solid #fbbf24;
                    outline-offset: 2px;
                }

                /* Reset Button */
                .a11y-reset-btn {
                    width: 100%;
                    padding: 10px;
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .a11y-reset-btn:hover {
                    background: #dc2626;
                }
                .a11y-reset-btn:focus {
                    outline: 2px solid #fbbf24;
                    outline-offset: 2px;
                }

                /* Applied Styles */
                body.a11y-high-contrast {
                    filter: contrast(1.5) !important;
                }
                body.a11y-grayscale {
                    filter: grayscale(100%) !important;
                }
                body.a11y-high-contrast.a11y-grayscale {
                    filter: contrast(1.5) grayscale(100%) !important;
                }
                body.a11y-highlight-links a {
                    background: #fef3c7 !important;
                    outline: 2px solid #f59e0b !important;
                    outline-offset: 2px !important;
                }

                /* Mobile */
                @media (max-width: 640px) {
                    .a11y-widget-btn {
                        width: 48px;
                        height: 48px;
                        bottom: 16px;
                        right: 16px;
                        font-size: 24px;
                    }
                    .a11y-widget-panel {
                        bottom: 76px;
                        right: 16px;
                        width: calc(100vw - 32px);
                    }
                }

                /* Reduced Motion */
                @media (prefers-reduced-motion: reduce) {
                    .a11y-widget-btn,
                    .a11y-widget-panel,
                    .a11y-switch,
                    .a11y-switch::after {
                        transition: none !important;
                    }
                }
            `;
            document.head.appendChild(style);
        },

        // Injetar HTML
        injectHTML() {
            const container = document.createElement('div');
            container.innerHTML = `
                <button class="a11y-widget-btn" aria-label="Abrir painel de acessibilidade" aria-expanded="false">
                    ♿
                </button>
                <div class="a11y-widget-panel" role="dialog" aria-labelledby="a11y-panel-title" aria-hidden="true">
                    <div class="a11y-panel-header">
                        <h2 id="a11y-panel-title" class="a11y-panel-title">Acessibilidade</h2>
                        <button class="a11y-panel-close" aria-label="Fechar painel">&times;</button>
                    </div>
                    <div class="a11y-panel-body">
                        <div class="a11y-control">
                            <label class="a11y-control-label">Tamanho da Fonte</label>
                            <div class="a11y-font-control">
                                <button class="a11y-font-btn" data-action="decrease-font" aria-label="Diminuir fonte">A-</button>
                                <span class="a11y-font-value" aria-live="polite">${this.state.fontSize}%</span>
                                <button class="a11y-font-btn" data-action="increase-font" aria-label="Aumentar fonte">A+</button>
                            </div>
                        </div>
                        <div class="a11y-control">
                            <div class="a11y-toggle">
                                <label class="a11y-control-label">Alto Contraste</label>
                                <button class="a11y-switch" role="switch" aria-checked="false" data-action="toggle-contrast" aria-label="Ativar alto contraste"></button>
                            </div>
                        </div>
                        <div class="a11y-control">
                            <div class="a11y-toggle">
                                <label class="a11y-control-label">Escala de Cinza</label>
                                <button class="a11y-switch" role="switch" aria-checked="false" data-action="toggle-grayscale" aria-label="Ativar escala de cinza"></button>
                            </div>
                        </div>
                        <div class="a11y-control">
                            <div class="a11y-toggle">
                                <label class="a11y-control-label">Destacar Links</label>
                                <button class="a11y-switch" role="switch" aria-checked="false" data-action="toggle-links" aria-label="Destacar todos os links"></button>
                            </div>
                        </div>
                        <div class="a11y-control">
                            <button class="a11y-reset-btn" data-action="reset" aria-label="Resetar todas as configurações">Resetar Configurações</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(container);

            this.elements = {
                btn: document.querySelector('.a11y-widget-btn'),
                panel: document.querySelector('.a11y-widget-panel'),
                closeBtn: document.querySelector('.a11y-panel-close'),
                fontValue: document.querySelector('.a11y-font-value'),
                contrastSwitch: document.querySelector('[data-action="toggle-contrast"]'),
                grayscaleSwitch: document.querySelector('[data-action="toggle-grayscale"]'),
                linksSwitch: document.querySelector('[data-action="toggle-links"]')
            };
        },

        // Bind eventos
        bindEvents() {
            // Toggle panel
            this.elements.btn.addEventListener('click', () => this.togglePanel());
            this.elements.closeBtn.addEventListener('click', () => this.closePanel());

            // Event delegation para todos os controles
            this.elements.panel.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (!action) return;

                switch(action) {
                    case 'increase-font':
                        this.changeFontSize(this.config.fontSizeStep);
                        break;
                    case 'decrease-font':
                        this.changeFontSize(-this.config.fontSizeStep);
                        break;
                    case 'toggle-contrast':
                        this.toggleContrast();
                        break;
                    case 'toggle-grayscale':
                        this.toggleGrayscale();
                        break;
                    case 'toggle-links':
                        this.toggleLinks();
                        break;
                    case 'reset':
                        this.reset();
                        break;
                }
            });

            // Fechar ao clicar fora
            document.addEventListener('click', (e) => {
                if (!this.elements.panel.contains(e.target) && 
                    !this.elements.btn.contains(e.target) &&
                    this.elements.panel.classList.contains('a11y-active')) {
                    this.closePanel();
                }
            });

            // ESC fecha painel
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.elements.panel.classList.contains('a11y-active')) {
                    this.closePanel();
                }
            });
        },

        // Toggle panel
        togglePanel() {
            const isOpen = this.elements.panel.classList.toggle('a11y-active');
            this.elements.btn.setAttribute('aria-expanded', isOpen);
            this.elements.panel.setAttribute('aria-hidden', !isOpen);
            
            if (isOpen) {
                this.elements.closeBtn.focus();
            }
        },

        closePanel() {
            this.elements.panel.classList.remove('a11y-active');
            this.elements.btn.setAttribute('aria-expanded', 'false');
            this.elements.panel.setAttribute('aria-hidden', 'true');
            this.elements.btn.focus();
        },

        // Mudar tamanho da fonte
        changeFontSize(delta) {
            const newSize = Math.max(
                this.config.fontSizeMin,
                Math.min(this.config.fontSizeMax, this.state.fontSize + delta)
            );
            
            if (newSize === this.state.fontSize) return;
            
            this.state.fontSize = newSize;
            document.documentElement.style.fontSize = `${newSize}%`;
            this.elements.fontValue.textContent = `${newSize}%`;
            this.savePreferences();
        },

        // Toggle alto contraste
        toggleContrast() {
            this.state.highContrast = !this.state.highContrast;
            document.body.classList.toggle('a11y-high-contrast', this.state.highContrast);
            this.elements.contrastSwitch.classList.toggle('a11y-on', this.state.highContrast);
            this.elements.contrastSwitch.setAttribute('aria-checked', this.state.highContrast);
            this.savePreferences();
        },

        // Toggle escala de cinza
        toggleGrayscale() {
            this.state.grayscale = !this.state.grayscale;
            document.body.classList.toggle('a11y-grayscale', this.state.grayscale);
            this.elements.grayscaleSwitch.classList.toggle('a11y-on', this.state.grayscale);
            this.elements.grayscaleSwitch.setAttribute('aria-checked', this.state.grayscale);
            this.savePreferences();
        },

        // Toggle destacar links
        toggleLinks() {
            this.state.highlightLinks = !this.state.highlightLinks;
            document.body.classList.toggle('a11y-highlight-links', this.state.highlightLinks);
            this.elements.linksSwitch.classList.toggle('a11y-on', this.state.highlightLinks);
            this.elements.linksSwitch.setAttribute('aria-checked', this.state.highlightLinks);
            this.savePreferences();
        },

        // Reset
        reset() {
            this.state = {
                fontSize: 100,
                highContrast: false,
                grayscale: false,
                highlightLinks: false
            };
            this.applyPreferences();
            this.savePreferences();
        },

        // Aplicar preferências
        applyPreferences() {
            // Font size
            document.documentElement.style.fontSize = `${this.state.fontSize}%`;
            if (this.elements.fontValue) {
                this.elements.fontValue.textContent = `${this.state.fontSize}%`;
            }

            // High contrast
            document.body.classList.toggle('a11y-high-contrast', this.state.highContrast);
            if (this.elements.contrastSwitch) {
                this.elements.contrastSwitch.classList.toggle('a11y-on', this.state.highContrast);
                this.elements.contrastSwitch.setAttribute('aria-checked', this.state.highContrast);
            }

            // Grayscale
            document.body.classList.toggle('a11y-grayscale', this.state.grayscale);
            if (this.elements.grayscaleSwitch) {
                this.elements.grayscaleSwitch.classList.toggle('a11y-on', this.state.grayscale);
                this.elements.grayscaleSwitch.setAttribute('aria-checked', this.state.grayscale);
            }

            // Highlight links
            document.body.classList.toggle('a11y-highlight-links', this.state.highlightLinks);
            if (this.elements.linksSwitch) {
                this.elements.linksSwitch.classList.toggle('a11y-on', this.state.highlightLinks);
                this.elements.linksSwitch.setAttribute('aria-checked', this.state.highlightLinks);
            }
        }
    };

    // Auto-inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => A11Y.init());
    } else {
        A11Y.init();
    }

    // Expor API global (opcional)
    window.A11Y_Widget = {
        reset: () => A11Y.reset(),
        getState: () => ({ ...A11Y.state })
    };
})();
