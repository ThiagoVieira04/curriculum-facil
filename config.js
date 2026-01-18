// Configurações centralizadas
const config = {
    // Servidor
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',

    // Rate Limiting
    RATE_LIMIT: {
        MAX_REQUESTS: 50,
        WINDOW_MS: 60 * 60 * 1000, // 1 hora
        MAX_MAP_SIZE: 1000
    },

    // Upload de arquivos
    UPLOAD: {
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png'],
        ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png']
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

    // Templates disponíveis
    TEMPLATES: [
        { id: 'simples', label: 'Simples' },
        { id: 'moderno', label: 'Moderno' },
        { id: 'executivo', label: 'Executivo' }
    ],

    // Segurança
    SECURITY: {
        HELMET_OPTIONS: {
            contentSecurityPolicy: false // Para permitir AdSense
        },
        CORS_OPTIONS: {
            origin: process.env.NODE_ENV === 'production'
                ? ['https://gerador-curriculos.vercel.app']
                : true,
            credentials: true
        }
    }
};

module.exports = config;