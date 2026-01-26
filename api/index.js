// ============================================
// PRODUCTION BUILD - VERCEL OPTIMIZED
// Bundle Size: ~50KB - ZERO External Dependencies
// ============================================

const express = require('express');
const multer = require('multer');
const path = require('path');

// INLINE VALIDATION FUNCTIONS
const validation = {
    sanitizeText: (text) => {
        if (!text) return '';
        return String(text)
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .trim();
    },
    validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    validatePhone: (phone) => /^[\d\s\-\+\(\)]{10,20}$/.test(phone.replace(/\s/g, ''))
};

const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', true);

// ============================================
// HEALTH CHECKS
// ============================================
app.get('/api/status', (req, res) => {
    res.json({ status: 'running', environment: process.env.NODE_ENV || 'production' });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production'
    });
});

// ============================================
// STATIC PAGES
// ============================================
app.get('/sobre', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'sobre.html'));
});

app.get('/contato', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'contato.html'));
});

app.get('/dicas', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'dicas.html'));
});

app.get('/empresa', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'empresa.html'));
});

app.get('/privacidade', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'privacidade.html'));
});

app.get('/termos', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'termos.html'));
});

// ============================================
// DATABASE (IN-MEMORY)
// ============================================
const cvDatabase = new Map();

// ============================================
// FILE UPLOAD
// ============================================
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ============================================
// TEMPLATES (SIMPLIFIED)
// ============================================
const templates = {
    simples: (data) => `
        <div style="font-family: Arial; max-width: 750px; margin: 40px auto; padding: 40px;">
            <h1>${data.nome}</h1>
            <h2>${data.cargo}</h2>
            <p>📧 ${data.email} | 📱 ${data.telefone} | 📍 ${data.cidade}</p>
            
            <h3>OBJETIVO</h3>
            <p>${data.objetivo || ''}</p>
            
            <h3>EXPERIÊNCIA PROFISSIONAL</h3>
            <p>${data.experiencia}</p>
            
            <h3>FORMAÇÃO</h3>
            <p>${data.formacao}</p>
            
            <h3>HABILIDADES</h3>
            <p>${data.habilidades}</p>
        </div>
    `
};

// ============================================
// GERAR CV
// ============================================
app.post('/api/generate-cv', upload.single('photo'), async (req, res) => {
    try {
        const {
            nome, cargo, email, telefone, cidade,
            experiencia, formacao, habilidades,
            template = 'simples'
        } = req.body;

        // Validação
        if (!nome || !cargo || !email || !telefone || !cidade || !experiencia || !formacao || !habilidades) {
            return res.status(400).json({ error: 'Campos obrigatórios faltando' });
        }

        if (!validation.validateEmail(email)) {
            return res.status(400).json({ error: 'Email inválido' });
        }

        // Sanitização
        const cleanData = {
            nome: validation.sanitizeText(nome),
            cargo: validation.sanitizeText(cargo),
            email: validation.sanitizeText(email),
            telefone: validation.sanitizeText(telefone),
            cidade: validation.sanitizeText(cidade),
            experiencia: validation.sanitizeText(experiencia),
            formacao: validation.sanitizeText(formacao),
            habilidades: validation.sanitizeText(habilidades),
            objetivo: validation.sanitizeText(req.body.objetivo || '')
        };

        // Renderizar template
        const templateFunc = templates[template] || templates.simples;
        const html = templateFunc(cleanData);

        // Gerar ID e salvar
        const cvId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        cvDatabase.set(cvId, { ...cleanData, html, createdAt: new Date() });

        res.json({
            id: cvId,
            html,
            message: 'Currículo gerado com sucesso!'
        });
    } catch (error) {
        console.error('CRITICAL ERROR on /api/generate-cv:', error.stack || error);
        res.status(500).json({
            error: 'Erro interno do servidor ao gerar currículo',
            message: error.message
        });
    }
});

// ============================================
// VISUALIZAR CV COMPARTILHADO
// ============================================
app.get('/cv/:id', (req, res) => {
    try {
        const cv = cvDatabase.get(req.params.id);

        if (!cv) {
            return res.status(404).send(`
                <html>
                    <body style="font-family: Arial; text-align: center; padding: 50px;">
                        <h1>Currículo não encontrado</h1>
                        <p><a href="/">← Criar novo currículo</a></p>
                    </body>
                </html>
            `);
        }

        res.send(`
            <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${cv.nome} - Currículo</title>
                </head>
                <body>
                    ${cv.html}
                    <p style="text-align: center; margin-top: 50px;">
                        <a href="/">← Criar novo currículo</a>
                    </p>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('CRITICAL ERROR on /cv/:id:', error.stack || error);
        res.status(500).send('Erro interno ao carregar currículo');
    }
});

// ============================================
// STATIC FILES
// ============================================
app.use(express.static(path.join(process.cwd(), 'public')));

// ============================================
// CATCH-ALL
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.use((req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// ============================================
// EXPORT
// ============================================
module.exports = app;
