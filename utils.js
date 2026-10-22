const config = require('./config');

// Utilitários de validação
const validation = {
    // Sanitização que remove apenas HTML/controle, preservando pontuação legítima
    // (ex.: "Maria & João", "O'Brien") sem permitir injeção de tags.
    sanitizeText: (text) => {
        if (text === null || text === undefined) return '';
        if (typeof text !== 'string') text = String(text);

        return text.replace(/<[^>]*>/g, '')
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
            .replace(/[<>]/g, '')
            .trim()
            .substring(0, config.VALIDATION.MAX_TEXT_LENGTH);
    },

    // Detecta o tipo real do arquivo pelos magic bytes, sem confiar no MIME do cliente
    detectFileType: (buffer) => {
        if (!buffer || buffer.length < 4) return null;

        if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
            return { mime: 'application/pdf', ext: 'pdf' };
        }
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return { mime: 'image/jpeg', ext: 'jpg' };
        }
        if (buffer.length >= 8 &&
            buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
            buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
            return { mime: 'image/png', ext: 'png' };
        }
        // DOCX é um ZIP (PK\x03\x04). O mammoth valida a estrutura interna depois.
        if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
            return { mime: 'application/zip', ext: 'zip' };
        }

        return null;
    },

    // Garante que é um array de strings (para habilidades, cursos, etc)
    sanitizeArray: (input, separator = '\n') => {
        if (Array.isArray(input)) {
            return input.map(item => validation.sanitizeText(item));
        }
        if (typeof input === 'string') {
            return input.split(separator).map(item => validation.sanitizeText(item)).filter(Boolean);
        }
        return [];
    },

    validateRequired: (fields) => {
        for (const [key, value] of Object.entries(fields)) {
            // Verifica null/undefined e string vazia
            if (value == null || (typeof value === 'string' && value.trim().length < config.VALIDATION.MIN_TEXT_LENGTH)) {
                return `Campo '${key}' é obrigatório`;
            }
        }
        return null; // Retorna null se tudo estiver ok
    },

    validateEmail: (email) => {
        if (typeof email !== 'string') return false;
        return config.VALIDATION.EMAIL_REGEX.test(email);
    },

    validatePhone: (phone) => {
        if (typeof phone !== 'string') return false;
        return config.VALIDATION.PHONE_REGEX.test(phone);
    },

    validateFileUpload: (file, type = 'photo') => {
        if (!file) return { valid: true };

        const uploadConfig = type === 'resume' ? config.UPLOAD.RESUME : config.UPLOAD;

        if (file.size > uploadConfig.MAX_FILE_SIZE) {
            return {
                valid: false,
                error: `Arquivo muito grande. Máximo ${uploadConfig.MAX_FILE_SIZE / 1024 / 1024}MB.`
            };
        }

        // Extensão exata (sem includes, que aceitaria extensões parciais)
        const ext = (file.originalname || '').toLowerCase().split('.').pop();
        if (!ext || !uploadConfig.ALLOWED_EXTENSIONS.includes(`.${ext}`)) {
            return {
                valid: false,
                error: 'Extensão de arquivo inválida.'
            };
        }

        // Magic bytes são a fonte de verdade. O MIME declarado só é usado
        // quando o buffer não está disponível (ex.: validação antes do upload).
        const detected = file.buffer ? validation.detectFileType(file.buffer) : null;

        if (detected) {
            const allowedDetected = type === 'resume'
                ? ['application/pdf', 'application/zip', 'image/jpeg', 'image/png']
                : ['image/jpeg', 'image/png'];

            if (!allowedDetected.includes(detected.mime)) {
                const typesMsg = type === 'resume' ? 'Use PDF, DOCX, JPG ou PNG.' : 'Use JPG ou PNG.';
                return {
                    valid: false,
                    error: `Conteúdo do arquivo não suportado. ${typesMsg}`
                };
            }

            const expectedExt = {
                'application/pdf': ['pdf'],
                'application/zip': ['docx'],
                'image/jpeg': ['jpg', 'jpeg'],
                'image/png': ['png']
            }[detected.mime] || [];

            if (!expectedExt.includes(ext)) {
                return {
                    valid: false,
                    error: 'A extensão do arquivo não corresponde ao conteúdo real.'
                };
            }

            return { valid: true, detectedMime: detected.mime };
        }

        // Sem buffer ou assinatura desconhecida: aceita apenas MIME declarado permitido
        if (!file.mimetype || !uploadConfig.ALLOWED_TYPES.includes(file.mimetype)) {
            const typesMsg = type === 'resume' ? 'Use PDF, DOCX, JPG ou PNG.' : 'Use JPG ou PNG.';
            return {
                valid: false,
                error: `Formato de arquivo não suportado. ${typesMsg}`
            };
        }

        return { valid: true };
    }
};

// Utilitários de rate limiting
const rateLimiting = {
    cleanupOldEntries: (rateLimitMap) => {
        const now = Date.now();
        let cleaned = 0;

        if (rateLimitMap.size > config.RATE_LIMIT.MAX_MAP_SIZE) {
            for (const [key, requests] of rateLimitMap.entries()) {
                const validRequests = requests.filter(time => now - time < config.RATE_LIMIT.WINDOW_MS);
                if (validRequests.length === 0) {
                    rateLimitMap.delete(key);
                    cleaned++;
                } else {
                    rateLimitMap.set(key, validRequests);
                }
            }
        }

        return cleaned;
    },

    checkRateLimit: (ip, rateLimitMap) => {
        const now = Date.now();
        const requests = rateLimitMap.get(ip) || [];
        const validRequests = requests.filter(time => now - time < config.RATE_LIMIT.WINDOW_MS);

        if (validRequests.length >= config.RATE_LIMIT.MAX_REQUESTS) {
            return {
                allowed: false,
                retryAfter: Math.ceil((validRequests[0] + config.RATE_LIMIT.WINDOW_MS - now) / 1000)
            };
        }

        validRequests.push(now);
        rateLimitMap.set(ip, validRequests);
        return { allowed: true };
    }
};

// Utilitários de limpeza
const cleanup = {
    cleanupOldCVs: (cvDatabase) => {
        const cutoff = Date.now() - config.CLEANUP.DATA_RETENTION_MS;
        let cleaned = 0;

        for (const [id, data] of cvDatabase.entries()) {
            if (data.createdAt.getTime() < cutoff) {
                cvDatabase.delete(id);
                cleaned++;
            }
        }

        return cleaned;
    }
};

// Utilitários de PDF
const pdf = {
    generateSafeFilename: (nome) => {
        return nome.replace(/[^\w\s-À-ÿ]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase()
            .substring(0, 50);
    },

    getPrintStyles: () => `
        <style>
            @page { margin: 0; size: A4; }
            @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none !important; }
            }
            body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
                font-size: 14px;
                line-height: 1.4;
            }
            * { box-sizing: border-box; }
        </style>
    `
};

// Utilitários de logging
const logger = {
    info: (message, data = {}) => {
        console.log(`ℹ️ ${message}`, data);
    },

    error: (message, error = {}) => {
        console.error(`❌ ${message}`, {
            message: error.message,
            stack: error.stack,
            ...error
        });
    },

    warn: (message, data = {}) => {
        console.warn(`⚠️ ${message}`, data);
    },

    success: (message, data = {}) => {
        console.log(`✅ ${message}`, data);
    }
};

module.exports = {
    validation,
    rateLimiting,
    cleanup,
    pdf,
    logger
};