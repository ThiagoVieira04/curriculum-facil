// Configurações centralizadas
const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const config = {
    // Servidor
    PORT: process.env.PORT || 3000,
    NODE_ENV,

    // Rate Limiting (somente rotas de escrita da API)
    RATE_LIMIT: {
        MAX_REQUESTS: parsePositiveInt(process.env.RATE_LIMIT_PER_HOUR, 50),
        WINDOW_MS: 60 * 60 * 1000, // 1 hora
        MAX_MAP_SIZE: 1000
    },

    // Upload de arquivos
    UPLOAD: {
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB para fotos
        ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png'],
        ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png'],
        RESUME: {
            MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB para currículos
            ALLOWED_TYPES: [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/zip', // DOCX é um ZIP; a assinatura é validada em utils.js
                'image/jpeg',
                'image/png'
            ],
            ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.jpg', '.jpeg', '.png']
        }
    },

    // Validação
    VALIDATION: {
        MIN_TEXT_LENGTH: 2,
        MAX_TEXT_LENGTH: 2000,
        EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        PHONE_REGEX: /^[\d\s\(\)\-\+]{8,20}$/
    },

    // Limpeza de dados
    CLEANUP: {
        INTERVAL_MS: 30 * 60 * 1000, // 30 minutos
        DATA_RETENTION_MS: 24 * 60 * 60 * 1000 // 24 horas
    },

    // PDF
    PDF: {
        TIMEOUT_MS: 30000,
        MARGIN: {
            top: '10mm',
            right: '10mm',
            bottom: '10mm',
            left: '10mm'
        }
    },

    // Templates disponíveis (mantidos em sincronia com server.js)
    TEMPLATES: [
        { id: 'simples', label: 'Simples' },
        { id: 'moderno', label: 'Moderno' },
        { id: 'executivo', label: 'Executivo' },
        { id: 'criativo', label: 'Criativo' },
        { id: 'elegante', label: 'Elegante' }
    ],

    // Segurança
    SECURITY: {
        HELMET_OPTIONS: {
            contentSecurityPolicy: false // Para permitir AdSense
        },
        CORS_OPTIONS: {
            origin: function (origin, callback) {
                // Permitir requisições sem origem (como mobile apps ou curl)
                if (!origin) return callback(null, true);

                // Em desenvolvimento, permitir qualquer origem local
                if (NODE_ENV !== 'production') {
                    return callback(null, true);
                }

                // Origens explicitamente autorizadas via ALLOWED_ORIGINS
                if (ALLOWED_ORIGINS.includes(origin)) {
                    return callback(null, true);
                }

                // Em produção, permitir previews/deploys da Vercel
                try {
                    const hostname = new URL(origin).hostname;
                    if (hostname === 'vercel.app' || hostname.endsWith('.vercel.app')) {
                        return callback(null, true);
                    }
                } catch (error) {
                    // Origin malformada cai no bloqueio abaixo
                }

                // Bloquear outros
                console.error('CORS bloqueado para:', origin);
                callback(new Error('Not allowed by CORS'));
            },
            credentials: true
        }
    }
};

module.exports = config;