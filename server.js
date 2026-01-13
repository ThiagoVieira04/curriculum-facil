const express = require('express');
const multer = require('multer');
// Retirando requires topo de nível de bibliotecas nativas para evitar erros em Serverless/Vercel
// const sharp = require('sharp');
// const puppeteer = require('puppeteer'); // Removido para evitar crash no Vercel (Cold Start)
let puppeteer;
try {
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
        puppeteer = require('puppeteer');
    }
} catch (e) {
    console.warn('Puppeteer dev dependency not found (safe in production)');
}
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const helmet = require('helmet');

// Configurações e utilitários
const config = require('./config');
const { validation, rateLimiting, cleanup, pdf, logger } = require('./utils');

// Rotas extras (comentadas até serem criadas)
// const sobreRoute = require('./sobre-route');
// const contatoRoute = require('./contato-route');
// const dicasRoute = require('./dicas-route');

const app = express();
const PORT = config.PORT;

// Rate limiting otimizado
const rateLimitMap = new Map();

function rateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    // Limpeza automática
    const cleaned = rateLimiting.cleanupOldEntries(rateLimitMap);
    if (cleaned > 0) {
        logger.info(`Rate limit cleanup: ${cleaned} entries removed`);
    }

    const result = rateLimiting.checkRateLimit(ip, rateLimitMap);

    if (!result.allowed) {
        return res.status(429).json({
            error: 'Muitas tentativas. Tente novamente em 1 hora.',
            retryAfter: result.retryAfter
        });
    }

    next();
}

// Middleware
app.use(helmet(config.SECURITY.HELMET_OPTIONS));
app.use(cors(config.SECURITY.CORS_OPTIONS));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));
app.set('trust proxy', true);

// Middleware para logs de requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Integrar Rotas (comentadas)
// app.use('/sobre', sobreRoute);
// app.use('/contato', contatoRoute);
// app.use('/dicas', dicasRoute);

// Configuração do Multer otimizada
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: config.UPLOAD.MAX_FILE_SIZE,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const validationResult = validation.validateFileUpload(file);
        if (!validationResult.valid) {
            return cb(new Error(validationResult.error), false);
        }
        cb(null, true);
    }
});

// Banco de dados em memória (para simplicidade)
const cvDatabase = new Map();

// Limpeza automática otimizada
setInterval(() => {
    const cleaned = cleanup.cleanupOldCVs(cvDatabase);
    if (cleaned > 0) {
        logger.info(`Limpeza automática: ${cleaned} currículos removidos`);
    }
}, config.CLEANUP.INTERVAL_MS);

// Função para melhorar texto com IA
async function improveTextWithAI(text, context) {
    // Fallback para melhorias básicas (sempre usar por enquanto)
    const improvements = {
        experiencia: (text) => text
            .replace(/\b(fiz|fazia)\b/gi, 'realizei')
            .replace(/\b(ajudei)\b/gi, 'colaborei')
            .replace(/\b(trabalhei)\b/gi, 'atuei')
            .replace(/\b(muito bom)\b/gi, 'excelente'),
        formacao: (text) => text
            .replace(/\b(estudei)\b/gi, 'cursei')
            .replace(/\b(terminei)\b/gi, 'concluí')
            .replace(/\b(fiz)\b/gi, 'realizei'),
        habilidades: (text) => text
            .replace(/\b(sei)\b/gi, 'domino')
            .replace(/\b(conheço)\b/gi, 'possuo conhecimento em')
            .replace(/\b(uso)\b/gi, 'utilizo')
    };

    return improvements[context] ? improvements[context](text) : text;
}

// Função para processar foto com Fallback
async function processPhoto(buffer) {
    try {
        // Tenta carregar o sharp apenas quando necessário
        let sharp;
        try {
            sharp = require('sharp');
        } catch (e) {
            console.warn('Sharp module not found or incompatible. Using fallback.');
        }

        if (sharp) {
            const processedImage = await sharp(buffer)
                .resize(200, 200, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: 90 })
                .toBuffer();

            return `data:image/jpeg;base64,${processedImage.toString('base64')}`;
        } else {
            // Fallback: Retorna a imagem original sem processamento (se não for muito grande)
            // Limitando fallback a 500KB para não estourar payload
            if (buffer.length > 500 * 1024) {
                console.warn('Foto original muito grande para fallback sem processamento.');
                return null;
            }
            return `data:image/jpeg;base64,${buffer.toString('base64')}`;
        }
    } catch (error) {
        console.error('Erro ao processar foto:', error);
        return null;
    }
}

// Helper para calcular tamanho da fonte do nome
const calculateNameFontSize = (name) => {
    const length = name ? name.length : 0;
    if (length > 50) return '16px';
    if (length > 35) return '20px';
    if (length > 25) return '24px';
    return '32px';
};

// Templates de currículo
const templates = {
    simples: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 750px; margin: 0 auto; padding: 40px; line-height: 1.6; background: white;">
            <div style="display: flex; align-items: center; gap: 30px; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 30px;">
                ${data.photo ? `<img src="${data.photo}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover;">` : ''}
                <div style="text-align: left;">
                    <h1 style="margin: 0; color: #333; font-size: ${calculateNameFontSize(data.nome)}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.nome}</h1>
                    <h2 style="margin: 10px 0; color: #666; font-size: 20px; font-weight: normal;">${data.cargo}</h2>
                    <p style="margin: 10px 0; color: #666; font-size: 14px;">
                        📧 ${data.email} | 📱 ${data.telefone} | 📍 ${data.cidade}
                    </p>
                    ${data.nascimento || data.estadoCivil || data.naturalidade || data.nacionalidade ? `
                        <p style="margin: 5px 0; color: #666; font-size: 12px;">
                            ${data.nascimento ? `${data.nascimento}` : ''}
                            ${data.estadoCivil ? ` | ${data.estadoCivil}` : ''}
                            ${data.naturalidade ? ` | ${data.naturalidade}` : ''}
                            ${data.nacionalidade ? ` | ${data.nacionalidade}` : ''}
                        </p>
                    ` : ''}
                </div>
            </div>
            
            ${data.objetivo ? `
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;">OBJETIVO</h3>
                    <p style="text-align: justify;">${data.objetivo}</p>
                </div>
            ` : ''}
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;">EXPERIÊNCIA PROFISSIONAL</h3>
                ${data.empresa1 ? `
                    <div style="margin-bottom: 15px;">
                        <strong>${data.empresa1}</strong> - ${data.funcao1}<br>
                        <em>${data.periodo1}</em>
                    </div>
                ` : ''}
                ${data.empresa2 ? `
                    <div style="margin-bottom: 15px;">
                        <strong>${data.empresa2}</strong> - ${data.funcao2}<br>
                        <em>${data.periodo2}</em>
                    </div>
                ` : ''}
                ${data.empresa3 ? `
                    <div style="margin-bottom: 15px;">
                        <strong>${data.empresa3}</strong> - ${data.funcao3}<br>
                        <em>${data.periodo3}</em>
                    </div>
                ` : ''}
                <p style="text-align: justify;">${data.experiencia}</p>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;">ESCOLARIDADE</h3>
                <p style="text-align: justify;">${data.formacao}</p>
            </div>
            
            ${data.cursos ? `
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;">CURSOS E CERTIFICAÇÕES</h3>
                    <p style="text-align: justify;">${data.cursos}</p>
                </div>
            ` : ''}
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;">HABILIDADES</h3>
                <p style="text-align: justify;">${data.habilidades}</p>
            </div>
            
            <!-- Rodapé com nome -->
            <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px; text-align: right; font-style: italic; color: #888; font-size: 12px;">
                ${data.nome}
            </div>
        </div>
    `,

    moderno: (data) => `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 750px; margin: 0 auto; padding: 0; line-height: 1.6; background: white;">
            <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 40px; display: flex; align-items: center; gap: 30px; margin-bottom: 30px;">
                ${data.photo ? `<img src="${data.photo}" style="width: 120px; height: 120px; border-radius: 50%; border: 4px solid rgba(255,255,255,0.3); object-fit: cover;">` : ''}
                <div style="text-align: left;">
                    <h1 style="margin: 0; font-size: ${calculateNameFontSize(data.nome)}; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.nome}</h1>
                    <h2 style="margin: 10px 0; font-size: 20px; font-weight: normal; opacity: 0.9;">${data.cargo}</h2>
                    <p style="margin: 10px 0; font-size: 14px; opacity: 0.9;">
                        📧 ${data.email} | 📱 ${data.telefone} | 📍 ${data.cidade}
                    </p>
                    ${data.nascimento || data.estadoCivil || data.naturalidade || data.nacionalidade ? `
                        <p style="margin: 5px 0; font-size: 12px; opacity: 0.8;">
                            ${data.nascimento ? `${data.nascimento}` : ''}
                            ${data.estadoCivil ? ` | ${data.estadoCivil}` : ''}
                            ${data.naturalidade ? ` | ${data.naturalidade}` : ''}
                            ${data.nacionalidade ? ` | ${data.nacionalidade}` : ''}
                        </p>
                    ` : ''}
                </div>
            </div>
            
            <div style="padding: 0 40px 40px 40px;">
                ${data.objetivo ? `
                    <div style="margin-bottom: 25px;">
                        <h3 style="color: #6b7280; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #6b7280; padding-bottom: 5px;">OBJETIVO</h3>
                        <p style="text-align: justify;">${data.objetivo}</p>
                    </div>
                ` : ''}
                
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #6b7280; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #6b7280; padding-bottom: 5px;">EXPERIÊNCIA PROFISSIONAL</h3>
                    ${data.empresa1 ? `
                        <div style="margin-bottom: 15px;">
                            <strong>${data.empresa1}</strong> - ${data.funcao1}<br>
                            <em>${data.periodo1}</em>
                        </div>
                    ` : ''}
                    ${data.empresa2 ? `
                        <div style="margin-bottom: 15px;">
                            <strong>${data.empresa2}</strong> - ${data.funcao2}<br>
                            <em>${data.periodo2}</em>
                        </div>
                    ` : ''}
                    ${data.empresa3 ? `
                        <div style="margin-bottom: 15px;">
                            <strong>${data.empresa3}</strong> - ${data.funcao3}<br>
                            <em>${data.periodo3}</em>
                        </div>
                    ` : ''}
                    <p style="text-align: justify;">${data.experiencia}</p>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #6b7280; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #6b7280; padding-bottom: 5px;">ESCOLARIDADE</h3>
                    <p style="text-align: justify;">${data.formacao}</p>
                </div>
                
                ${data.cursos ? `
                    <div style="margin-bottom: 25px;">
                        <h3 style="color: #6b7280; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #6b7280; padding-bottom: 5px;">CURSOS E CERTIFICAÇÕES</h3>
                        <p style="text-align: justify;">${data.cursos}</p>
                    </div>
                ` : ''}
                
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #6b7280; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #6b7280; padding-bottom: 5px;">HABILIDADES</h3>
                    <p style="text-align: justify;">${data.habilidades}</p>
                </div>
                
                <!-- Rodapé com nome -->
                <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px; text-align: right; font-style: italic; color: #888; font-size: 12px;">
                    ${data.nome}
                </div>
            </div>
        </div>
    `,

    executivo: (data) => `
        <div style="font-family: 'Times New Roman', serif; max-width: 750px; margin: 0 auto; padding: 40px; line-height: 1.6; background: white; color: #333;">
            <div style="display: flex; align-items: center; gap: 30px; margin-bottom: 30px; border-bottom: 3px double #333; padding-bottom: 30px;">
                ${data.photo ? `<img src="${data.photo}" style="width: 120px; height: 120px; border-radius: 4px; object-fit: cover; border: 1px solid #333;">` : ''}
                <div style="text-align: left;">
                    <h1 style="margin: 0; color: #333; font-size: ${calculateNameFontSize(data.nome)}; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.nome}</h1>
                    <h2 style="margin: 10px 0; color: #555; font-size: 20px; font-weight: normal; font-style: italic;">${data.cargo}</h2>
                    <p style="margin: 10px 0; color: #555; font-size: 14px;">
                        📧 ${data.email} | 📱 ${data.telefone} | 📍 ${data.cidade}
                    </p>
                    ${data.nascimento || data.estadoCivil || data.naturalidade || data.nacionalidade ? `
                        <p style="margin: 5px 0; color: #555; font-size: 12px;">
                            ${data.nascimento ? `${data.nascimento}` : ''}
                            ${data.estadoCivil ? ` | ${data.estadoCivil}` : ''}
                            ${data.naturalidade ? ` | ${data.naturalidade}` : ''}
                            ${data.nacionalidade ? ` | ${data.nacionalidade}` : ''}
                        </p>
                    ` : ''}
                </div>
            </div>
            
            ${data.objetivo ? `
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #333; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 5px; text-transform: uppercase;">OBJETIVO</h3>
                    <p style="text-align: justify;">${data.objetivo}</p>
                </div>
            ` : ''}
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 5px; text-transform: uppercase;">EXPERIÊNCIA PROFISSIONAL</h3>
                ${data.empresa1 ? `
                    <div style="margin-bottom: 15px;">
                        <strong>${data.empresa1}</strong> - ${data.funcao1}<br>
                        <em>${data.periodo1}</em>
                    </div>
                ` : ''}
                ${data.empresa2 ? `
                    <div style="margin-bottom: 15px;">
                        <strong>${data.empresa2}</strong> - ${data.funcao2}<br>
                        <em>${data.periodo2}</em>
                    </div>
                ` : ''}
                ${data.empresa3 ? `
                    <div style="margin-bottom: 15px;">
                        <strong>${data.empresa3}</strong> - ${data.funcao3}<br>
                        <em>${data.periodo3}</em>
                    </div>
                ` : ''}
                <p style="text-align: justify;">${data.experiencia}</p>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 5px; text-transform: uppercase;">ESCOLARIDADE</h3>
                <p style="text-align: justify;">${data.formacao}</p>
            </div>
            
            ${data.cursos ? `
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #333; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 5px; text-transform: uppercase;">CURSOS E CERTIFICAÇÕES</h3>
                    <p style="text-align: justify;">${data.cursos}</p>
                </div>
            ` : ''}
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 5px; text-transform: uppercase;">HABILIDADES</h3>
                <p style="text-align: justify;">${data.habilidades}</p>
            </div>
            
            <!-- Rodapé com nome -->
            <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px; text-align: right; font-style: italic; color: #888; font-size: 12px;">
                ${data.nome}
            </div>
        </div>
    `,

    criativo: (data) => `
        <div style="font-family: 'Segoe UI', Roboto, sans-serif; max-width: 750px; margin: 0 auto; padding: 0; line-height: 1.6; background: white;">
            <div style="background: #1e293b; color: white; padding: 40px; display: flex; align-items: center; gap: 30px; margin-bottom: 30px;">
                ${data.photo ? `<img src="${data.photo}" style="width: 120px; height: 120px; border-radius: 20px; border: 3px solid #38bdf8; object-fit: cover;">` : ''}
                <div style="text-align: left;">
                    <h1 style="margin: 0; color: #38bdf8; font-size: ${calculateNameFontSize(data.nome)}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.nome}</h1>
                    <h2 style="margin: 10px 0; color: white; font-size: 20px; font-weight: normal; opacity: 0.9;">${data.cargo}</h2>
                    <p style="margin: 10px 0; color: white; font-size: 14px; opacity: 0.8;">
                        📧 ${data.email} | 📱 ${data.telefone} | 📍 ${data.cidade}
                    </p>
                    ${data.nascimento || data.estadoCivil || data.naturalidade || data.nacionalidade ? `
                        <p style="margin: 5px 0; color: white; font-size: 12px; opacity: 0.6;">
                            ${data.nascimento ? `${data.nascimento}` : ''}
                            ${data.estadoCivil ? ` | ${data.estadoCivil}` : ''}
                            ${data.naturalidade ? ` | ${data.naturalidade}` : ''}
                            ${data.nacionalidade ? ` | ${data.nacionalidade}` : ''}
                        </p>
                    ` : ''}
                </div>
            </div>
            
            <div style="padding: 0 40px 40px 40px;">
                ${data.objetivo ? `
                    <div style="margin-bottom: 25px;">
                        <h3 style="color: #0f172a; border-left: 5px solid #38bdf8; padding-left: 10px; font-size: 18px; text-transform: uppercase;">OBJETIVO</h3>
                        <p style="text-align: justify;">${data.objetivo}</p>
                    </div>
                ` : ''}
                
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #0f172a; border-left: 5px solid #38bdf8; padding-left: 10px; font-size: 18px; text-transform: uppercase;">EXPERIÊNCIA PROFISSIONAL</h3>
                    ${data.empresa1 ? `
                        <div style="margin-bottom: 15px;">
                            <strong>${data.empresa1}</strong> - ${data.funcao1}<br>
                            <em>${data.periodo1}</em>
                        </div>
                    ` : ''}
                    ${data.empresa2 ? `
                        <div style="margin-bottom: 15px;">
                            <strong>${data.empresa2}</strong> - ${data.funcao2}<br>
                            <em>${data.periodo2}</em>
                        </div>
                    ` : ''}
                    ${data.empresa3 ? `
                        <div style="margin-bottom: 15px;">
                            <strong>${data.empresa3}</strong> - ${data.funcao3}<br>
                            <em>${data.periodo3}</em>
                        </div>
                    ` : ''}
                    <p style="text-align: justify;">${data.experiencia}</p>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #0f172a; border-left: 5px solid #38bdf8; padding-left: 10px; font-size: 18px; text-transform: uppercase;">ESCOLARIDADE</h3>
                    <p style="text-align: justify;">${data.formacao}</p>
                </div>
                
                ${data.cursos ? `
                    <div style="margin-bottom: 25px;">
                        <h3 style="color: #0f172a; border-left: 5px solid #38bdf8; padding-left: 10px; font-size: 18px; text-transform: uppercase;">CURSOS E CERTIFICAÇÕES</h3>
                        <p style="text-align: justify;">${data.cursos}</p>
                    </div>
                ` : ''}
                
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #0f172a; border-left: 5px solid #38bdf8; padding-left: 10px; font-size: 18px; text-transform: uppercase;">HABILIDADES</h3>
                    <p style="text-align: justify;">${data.habilidades}</p>
                </div>
                
                <!-- Rodapé com nome -->
                <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: right; font-style: italic; color: #94a3b8; font-size: 12px;">
                    ${data.nome}
                </div>
            </div>
        </div>
    `,

    elegante: (data) => `
        <div style="font-family: Georgia, serif; max-width: 750px; margin: 0 auto; padding: 40px; line-height: 1.6; background: white; color: #2c3e50;">
            <div style="display: flex; align-items: center; gap: 30px; margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 30px;">
                ${data.photo ? `<img src="${data.photo}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; filter: grayscale(100%);">` : ''}
                <div style="text-align: left;">
                    <h1 style="margin: 0; color: #1a1a1a; font-size: ${calculateNameFontSize(data.nome)}; font-weight: normal; letter-spacing: 1px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.nome}</h1>
                    <h2 style="margin: 10px 0; color: #7f8c8d; font-size: 20px; font-weight: normal; font-style: italic;">${data.cargo}</h2>
                    <p style="margin: 10px 0; color: #7f8c8d; font-size: 14px;">
                        📧 ${data.email} | 📱 ${data.telefone} | 📍 ${data.cidade}
                    </p>
                    ${data.nascimento || data.estadoCivil || data.naturalidade || data.nacionalidade ? `
                        <p style="margin: 5px 0; color: #7f8c8d; font-size: 12px;">
                            ${data.nascimento ? `${data.nascimento}` : ''}
                            ${data.estadoCivil ? ` | ${data.estadoCivil}` : ''}
                            ${data.naturalidade ? ` | ${data.naturalidade}` : ''}
                            ${data.nacionalidade ? ` | ${data.nacionalidade}` : ''}
                        </p>
                    ` : ''}
                </div>
            </div>
            
            ${data.objetivo ? `
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #2c3e50; font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px; text-transform: uppercase; font-style: italic; letter-spacing: 1px;">OBJETIVO</h3>
                    <p style="text-align: justify;">${data.objetivo}</p>
                </div>
            ` : ''}
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px; text-transform: uppercase; font-style: italic; letter-spacing: 1px;">EXPERIÊNCIA PROFISSIONAL</h3>
                ${data.empresa1 ? `
                    <div style="margin-bottom: 15px;">
                        <strong>${data.empresa1}</strong> - ${data.funcao1}<br>
                        <em>${data.periodo1}</em>
                    </div>
                ` : ''}
                ${data.empresa2 ? `
                    <div style="margin-bottom: 15px;">
                        <strong>${data.empresa2}</strong> - ${data.funcao2}<br>
                        <em>${data.periodo2}</em>
                    </div>
                ` : ''}
                ${data.empresa3 ? `
                    <div style="margin-bottom: 15px;">
                        <strong>${data.empresa3}</strong> - ${data.funcao3}<br>
                        <em>${data.periodo3}</em>
                    </div>
                ` : ''}
                <p style="text-align: justify;">${data.experiencia}</p>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px; text-transform: uppercase; font-style: italic; letter-spacing: 1px;">ESCOLARIDADE</h3>
                <p style="text-align: justify;">${data.formacao}</p>
            </div>
            
            ${data.cursos ? `
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #2c3e50; font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px; text-transform: uppercase; font-style: italic; letter-spacing: 1px;">CURSOS E CERTIFICAÇÕES</h3>
                    <p style="text-align: justify;">${data.cursos}</p>
                </div>
            ` : ''}
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px; text-transform: uppercase; font-style: italic; letter-spacing: 1px;">HABILIDADES</h3>
                <p style="text-align: justify;">${data.habilidades}</p>
            </div>
            
            <!-- Rodapé com nome -->
            <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px; text-align: right; font-style: italic; color: #95a5a6; font-size: 12px;">
                ${data.nome}
            </div>
        </div>
    `
};

// Rotas da API

// Gerar currículo (rate limit desabilitado para desenvolvimento)
// Gerar currículo (Robustecido)
app.post('/api/generate-cv', upload.single('photo'), async (req, res) => {
    const requestId = Date.now().toString(36);
    console.log(`[${requestId}] Iniciando geração de currículo`);

    try {
        // 1. Validação de Entrada
        if (!req.body) {
            throw new Error('Nenhum dado recebido');
        }

        const {
            nome, cargo, email, telefone, cidade,
            experiencia, formacao, habilidades,
            template = 'simples'
        } = req.body;

        // Campos obrigatórios
        const requiredFields = { nome, cargo, email, telefone, cidade, experiencia, formacao, habilidades };
        const validationError = validation.validateRequired(requiredFields);

        if (validationError) {
            console.warn(`[${requestId}] Erro de validação: ${validationError}`);
            return res.status(400).json({ error: validationError });
        }

        if (!validation.validateEmail(email)) {
            return res.status(400).json({ error: 'Email inválido' });
        }

        // 2. Sanitização Segura
        const cleanData = {
            nome: validation.sanitizeText(nome),
            cargo: validation.sanitizeText(cargo),
            email: validation.sanitizeText(email),
            telefone: validation.sanitizeText(telefone),
            cidade: validation.sanitizeText(cidade),
            // Tratamento especial para campos de texto longo (quebras de linha preservadas na lógica, mas sanitizadas)
            experiencia: validation.sanitizeText(experiencia),
            formacao: validation.sanitizeText(formacao),
            habilidades: validation.sanitizeText(habilidades)
        };

        // Sanitização de Opcionais
        const optionalFields = ['nascimento', 'estadoCivil', 'naturalidade', 'nacionalidade', 'objetivo', 'cursos',
            'empresa1', 'funcao1', 'periodo1',
            'empresa2', 'funcao2', 'periodo2',
            'empresa3', 'funcao3', 'periodo3'];

        optionalFields.forEach(field => {
            cleanData[field] = validation.sanitizeText(req.body[field]);
        });

        // Formatação de Data (yyyy-mm-dd -> dd/mm/aaaa)
        if (cleanData.nascimento && /^\d{4}-\d{2}-\d{2}$/.test(cleanData.nascimento)) {
            const [year, month, day] = cleanData.nascimento.split('-');
            cleanData.nascimento = `${day}/${month}/${year}`;
        }

        // 3. Processamento de Foto (Fail-safe)
        let photoData = null;
        if (req.file) {
            try {
                photoData = await processPhoto(req.file.buffer);
            } catch (photoError) {
                console.error(`[${requestId}] Erro ao processar foto:`, photoError);
                // Não falha a requisição, apenas loga e segue sem foto
            }
        }

        // 4. Melhoria com IA (Fail-safe)
        const finalData = { ...cleanData, photo: photoData, template };

        try {
            finalData.experiencia = await improveTextWithAI(cleanData.experiencia, 'experiencia');
            finalData.formacao = await improveTextWithAI(cleanData.formacao, 'formacao');
            finalData.habilidades = await improveTextWithAI(cleanData.habilidades, 'habilidades');
            if (cleanData.objetivo) {
                finalData.objetivo = await improveTextWithAI(cleanData.objetivo, 'objetivo');
            }
        } catch (aiError) {
            console.error(`[${requestId}] Erro na IA (fallback para texto original):`, aiError);
            // Mantém o texto sanitizado original em caso de erro na IA
        }

        // 5. Renderização do Template (Crítico)
        let html;
        try {
            const templateFunction = templates[template] || templates.simples;
            html = templateFunction(finalData);

            if (!html || typeof html !== 'string') {
                throw new Error('Template retornou conteúdo inválido');
            }
        } catch (renderError) {
            console.error(`[${requestId}] Erro de renderização do template ${template}:`, renderError);
            // Tenta fallback para o simples se o escolhido falhar
            if (template !== 'simples') {
                console.log(`[${requestId}] Tentando fallback para template simples`);
                try {
                    html = templates.simples(finalData);
                } catch (fallbackError) {
                    throw new Error('Falha crítica na renderização do currículo');
                }
            } else {
                throw renderError;
            }
        }

        // 6. Persistência
        const cvId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        cvDatabase.set(cvId, {
            ...finalData,
            html,
            createdAt: new Date()
        });

        console.log(`[${requestId}] Currículo ${cvId} gerado com sucesso`);

        res.json({
            id: cvId,
            html,
            message: 'Currículo gerado com sucesso!',
            nome: finalData.nome,
            template: template,
            warnings: req.file && !photoData ? ['Foto não processada (erro ou arquivo inválido)'] : []
        });

    } catch (error) {
        console.error(`[${requestId}] Erro fatal na rota:`, error);
        res.status(500).json({
            error: 'Erro Interno',
            message: 'Ocorreu um erro ao processar seu currículo. Tente novamente sem foto ou escolha outro modelo.'
        });
    }
});

// Download PDF
app.all('/api/download-pdf/:id?', async (req, res) => {
    console.log('Recebida requisição para download PDF:', req.method, req.params.id);

    try {
        let cvData;
        let html;
        let nome = 'curriculo';

        if (req.method === 'POST') {
            // Se for POST, aceita HTML direto (evita problemas de estado)
            html = req.body.html;
            nome = req.body.nome || 'curriculo';
            console.log('Usando HTML do POST, nome:', nome);
        } else {
            // Se for GET, busca no banco (pode falhar em serverless)
            const cvId = req.params.id;
            cvData = cvDatabase.get(cvId);
            console.log('Buscando no banco, ID:', cvId, 'Encontrado:', !!cvData);

            if (!cvData) {
                // Tenta ver se o HTML foi enviado por query param (fallback extremo)
                if (req.query.html) {
                    html = decodeURIComponent(req.query.html);
                    console.log('Usando HTML do query param');
                } else {
                    console.log('Currículo não encontrado');
                    return res.status(404).json({ error: 'Currículo não encontrado ou sessão expirada. Por favor, gere o currículo novamente.' });
                }
            } else {
                html = cvData.html;
                nome = cvData.nome;
            }
        }

        if (!html) {
            console.log('HTML não fornecido');
            return res.status(400).json({ error: 'Conteúdo do currículo não fornecido' });
        }

        // Gerar PDF com Puppeteer (com tratamento de erro melhorado)
        let browser;
        try {
            const launchOptions = {
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            };

            if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
                const chromium = require('@sparticuz/chromium');
                const puppeteerCore = require('puppeteer-core');

                browser = await puppeteerCore.launch({
                    args: [...chromium.args, ...launchOptions.args],
                    defaultViewport: chromium.defaultViewport,
                    executablePath: await chromium.executablePath(),
                    headless: chromium.headless,
                });
            } else {
                browser = await puppeteer.launch(launchOptions);
            }
        } catch (launchError) {
            console.error('Erro ao iniciar browser:', launchError);
            return res.status(500).json({
                error: 'Erro técnico ao iniciar gerador de PDF',
                details: launchError.message || launchError.toString(),
                tip: 'Verifique os logs do Vercel para mais detalhes'
            });
        }

        const page = await browser.newPage();

        // Timeout e configurações de página
        await page.setDefaultTimeout(config.PDF.TIMEOUT_MS);
        await page.setDefaultNavigationTimeout(config.PDF.TIMEOUT_MS);

        // Estilos otimizados para PDF
        const printStyle = pdf.getPrintStyles();

        await page.setContent(printStyle + html, {
            waitUntil: ['networkidle0', 'domcontentloaded'],
            timeout: config.PDF.TIMEOUT_MS
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: config.PDF.MARGIN
        });

        await page.close();
        await browser.close();

        const safeNome = pdf.generateSafeFilename(nome);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="curriculo-${safeNome}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Cache-Control', 'no-cache');
        res.send(pdfBuffer);

    } catch (error) {
        logger.error('Erro detalhado ao gerar PDF:', error);
        res.status(500).json({
            error: 'Erro ao gerar PDF',
            details: config.NODE_ENV === 'development' ? error.message : 'Tente novamente',
            tip: 'Tente novamente. Se o problema persistir, pode ser uma instabilidade temporária no servidor.'
        });
    }
});

// Visualizar currículo compartilhado
app.get('/cv/:id', async (req, res) => {
    try {
        const cvId = req.params.id;
        const cvData = cvDatabase.get(cvId);

        if (!cvData) {
            return res.status(404).send('Currículo não encontrado');
        }

        const sharePageHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Currículo - ${cvData.nome}</title>
    <meta name="description" content="Currículo profissional de ${cvData.nome} - ${cvData.cargo}">
    <style>
        body { margin: 0; padding: 20px; background: #f5f5f5; font-family: Arial, sans-serif; }
        .container { max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .actions { text-align: center; padding: 20px; background: #333; }
        .actions a { color: white; text-decoration: none; margin: 0 10px; padding: 10px 20px; background: #007bff; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="actions">
            <a href="/api/download-pdf/${cvId}">📥 Baixar PDF</a>
            <a href="/">🏠 Criar Meu Currículo</a>
        </div>
        ${cvData.html}
    </div>
</body>
</html>`;

        res.send(sharePageHtml);

    } catch (error) {
        console.error('Erro ao exibir currículo:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Rota para páginas estáticas
app.get('/sobre', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sobre o CurrículoFácil - Quem Somos</title>
            <meta name="description" content="Conheça a história do CurrículoFácil, nossa missão de ajudar pessoas a conseguirem melhores oportunidades de trabalho através de currículos profissionais gratuitos.">
            <link rel="stylesheet" href="/css/style.css">
            <style>
                .about-section {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 2rem;
                }
                .about-section h2 {
                    color: #2563eb;
                    font-size: 1.8rem;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    border-left: 4px solid #2563eb;
                    padding-left: 1rem;
                }
                .about-section h3 {
                    color: #1e293b;
                    font-size: 1.3rem;
                    margin-top: 1.5rem;
                    margin-bottom: 0.8rem;
                }
                .feature-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.5rem;
                    margin: 2rem 0;
                }
                .feature-card {
                    background: #f8fafc;
                    padding: 1.5rem;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }
                .feature-card h4 {
                    color: #2563eb;
                    font-size: 1.1rem;
                    margin-bottom: 0.5rem;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 1rem;
                    margin: 2rem 0;
                }
                .stat-card {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 1.5rem;
                    border-radius: 8px;
                    text-align: center;
                }
                .stat-number {
                    font-size: 2rem;
                    font-weight: bold;
                    margin-bottom: 0.5rem;
                }
                .back-link {
                    display: inline-block;
                    margin-top: 2rem;
                    color: #2563eb;
                    text-decoration: none;
                    font-weight: 500;
                }
                .back-link:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <header>
                <nav>
                    <div class="container">
                        <h1><a href="/" style="text-decoration:none;color:inherit;">📄 CurrículoFácil</a></h1>
                        <div class="nav-links">
                            <a href="/">Início</a>
                            <a href="/sobre">Sobre</a>
                            <a href="/contato">Contato</a>
                        </div>
                    </div>
                </nav>
            </header>
            
            <main style="padding-top: 100px; padding-bottom: 50px;">
                <div class="about-section">
                    <h1 style="color: #1e293b; font-size: 2.5rem; margin-bottom: 1rem;">Sobre o CurrículoFácil</h1>
                    <p style="font-size: 1.2rem; color: #64748b; margin-bottom: 2rem;">Transformando vidas através de currículos profissionais e acessíveis para todos</p>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-number">50.000+</div>
                            <div>Currículos Criados</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">100%</div>
                            <div>Gratuito</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">3</div>
                            <div>Modelos Profissionais</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">24/7</div>
                            <div>Disponível</div>
                        </div>
                    </div>
                    
                    <h2>🎯 Nossa Missão</h2>
                    <p>O CurrículoFácil nasceu com uma missão clara e poderosa: <strong>democratizar o acesso a currículos profissionais de qualidade</strong>. Acreditamos que toda pessoa, independente de sua condição financeira ou conhecimentos técnicos, merece ter um currículo bem estruturado e profissional para conquistar melhores oportunidades no mercado de trabalho.</p>
                    <p>Em um mundo onde a primeira impressão é fundamental, um currículo bem elaborado pode ser a diferença entre conseguir ou não aquela entrevista de emprego dos sonhos.</p>
                    
                    <h2>📖 Nossa História</h2>
                    <p>Tudo começou em <strong>setembro de 2012</strong>, quando a <strong>Papel e Sonhos Informática</strong> deu seus primeiros passos com um propósito claro: <em>transformar vidas através da tecnologia</em>. Há mais de uma década, percebemos que a tecnologia não deveria ser um privilégio, mas uma ferramenta de transformação social acessível a todos.</p>
                    <p>Durante esses <strong>13 anos de trajetória</strong>, ajudamos milhares de brasileiros com soluções digitais inovadoras. Começamos desenvolvendo pequenos sistemas para comércios locais, criamos sites que deram voz a pequenos empreendedores, e sempre estivemos lado a lado com quem sonha em crescer. Cada projeto era mais que código - era uma história, um sonho, uma oportunidade.</p>
                    <p>O <strong>CurrículoFácil</strong> nasceu dessa mesma essência. Observávamos diariamente pessoas talentosas, esforçadas e qualificadas sendo eliminadas de processos seletivos antes mesmo da entrevista - não por falta de competência, mas por não terem um currículo bem apresentado. Muitos não sabiam por onde começar, outros não tinham recursos para pagar serviços profissionais.</p>
                    <p>Em 2024, decidimos que era hora de democratizar também o acesso a currículos profissionais. Nossa equipe - formada por desenvolvedores apaixonados, designers criativos e especialistas em recursos humanos com anos de experiência - uniu forças para criar uma plataforma que fosse tão simples quanto poderosa, tão acessível quanto profissional.</p>
                    <p><em>"Se conseguimos ajudar um pequeno comércio a crescer com um sistema, por que não ajudar pessoas a conquistarem seus empregos dos sonhos com um currículo de qualidade?"</em> - foi com esse pensamento que o CurrículoFácil ganhou vida.</p>
                    
                    <h2>⚙️ Como Funciona</h2>
                    <p>Nossa plataforma utiliza tecnologias modernas para oferecer uma experiência completa de criação de currículos:</p>
                    
                    <div class="feature-grid">
                        <div class="feature-card">
                            <h4>🤖 Inteligência Artificial</h4>
                            <p>Melhora automaticamente seus textos, transformando descrições simples em linguagem profissional e impactante.</p>
                        </div>
                        <div class="feature-card">
                            <h4>🎨 Templates Profissionais</h4>
                            <p>3 modelos diferentes, cada um otimizado para tipos específicos de vagas e níveis de experiência.</p>
                        </div>
                        <div class="feature-card">
                            <h4>📸 Processamento de Imagens</h4>
                            <p>Ajusta automaticamente sua foto para o tamanho ideal, mantendo a qualidade profissional.</p>
                        </div>
                        <div class="feature-card">
                            <h4>✅ Compatível com ATS</h4>
                            <p>Todos os templates são otimizados para sistemas ATS (Applicant Tracking Systems) que empresas usam para filtrar currículos.</p>
                        </div>
                    </div>
                    
                    <h2>🎓 Compromisso com a Qualidade</h2>
                    <p>Todos os nossos templates foram desenvolvidos seguindo as melhores práticas recomendadas por especialistas em recursos humanos e recrutamento. Atualizamos constantemente nossos modelos para refletir as tendências atuais do mercado de trabalho.</p>
                    
                    <h3>Por que somos diferentes?</h3>
                    <ul style="line-height: 1.8; color: #475569;">
                        <li><strong>100% Gratuito:</strong> Sem taxas ocultas, sem planos pagos, sem marca d'água. Sempre gratuito.</li>
                        <li><strong>Sem Cadastro:</strong> Não pedimos criação de conta. Acesse, crie e baixe. Simples assim.</li>
                        <li><strong>Instantâneo:</strong> Seu currículo fica pronto em menos de 3 minutos.</li>
                        <li><strong>Alta Qualidade:</strong> PDFs em alta resolução, prontos para impressão ou envio digital.</li>
                        <li><strong>Privacidade Garantida:</strong> Seus dados não são vendidos ou compartilhados.</li>
                    </ul>
                    
                    <h2>💻 Tecnologia de Ponta</h2>
                    <p>Utilizamos as mais modernas tecnologias web para garantir uma experiência rápida, segura e confiável:</p>
                    <ul style="line-height: 1.8; color: #475569;">
                        <li><strong>Node.js:</strong> Para processamento rápido e eficiente no servidor</li>
                        <li><strong>Puppeteer:</strong> Para geração de PDFs de alta qualidade</li>
                        <li><strong>Sharp:</strong> Para processamento otimizado de imagens</li>
                        <li><strong>Cloud Hosting:</strong> Infraestrutura confiável e escalável</li>
                    </ul>
                    
                    <h2>🔒 Privacidade e Segurança</h2>
                    <p>Levamos sua privacidade muito a sério. Aqui está nosso compromisso com você:</p>
                    <ul style="line-height: 1.8; color: #475569;">
                        <li>Todos os dados são processados de forma segura e criptografada</li>
                        <li>Não compartilhamos suas informações com terceiros</li>
                        <li>Os currículos ficam disponíveis apenas temporariamente (24 horas) para download</li>
                        <li>Após esse período, todos os dados são automaticamente excluídos</li>
                        <li>Não armazenamos informações pessoais além do necessário</li>
                    </ul>
                    <p>Para mais detalhes, consulte nossa <a href="/privacidade" style="color: #2563eb;">Política de Privacidade</a>.</p>
                    
                    <h2>🌟 13 Anos Transformando Vidas com Tecnologia</h2>
                    <p>Desde setembro de 2012, a Papel e Sonhos Informática é sinônimo de <strong>inovação acessível</strong>. Nossa jornada começou em um pequeno escritório, com grandes sonhos: usar a tecnologia como ponte entre pessoas e oportunidades.</p>
                    
                    <h3>🚀 Nossas Soluções ao Longo dos Anos</h3>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <h4>💼 Sistemas para Pequenas Empresas</h4>
                            <p>Desenvolvemos centenas de sistemas de gestão personalizados que ajudaram microempresas a se organizarem, crescerem e competirem no mercado.</p>
                        </div>
                        <div class="feature-card">
                            <h4>🌐 Sites Profissionais</h4>
                            <p>Demos voz digital a empreendedores locais, criando vitrines online que transformaram negócios de bairro em referências regionais.</p>
                        </div>
                        <div class="feature-card">
                            <h4>📱 Aplicativos Mobile</h4>
                            <p>Levamos inovação para o bolso das pessoas, desenvolvendo apps que facilitam o dia a dia e conectam negócios aos seus clientes.</p>
                        </div>
                        <div class="feature-card">
                            <h4>🎓 Educação Digital</h4>
                            <p>Criamos plataformas educacionais que democratizaram o acesso ao conhecimento, impactando estudantes de todo o Brasil.</p>
                        </div>
                        <div class="feature-card">
                            <h4>📊 Automação de Processos</h4>
                            <p>Simplificamos burocracias e otimizamos rotinas, economizando tempo e recursos para nossos clientes focarem no que realmente importa.</p>
                        </div>
                        <div class="feature-card">
                            <h4>💚 Soluções Sociais</h4>
                            <p>Desenvolvemos sistemas gratuitos para ONGs e projetos sociais, multiplicando o impacto de quem trabalha por um mundo melhor.</p>
                        </div>
                    </div>

                    <h2 style="margin-top: 3rem;">🛠️ Nossos Serviços e Especialidades</h2>
                    <p>Além do CurrículoFácil, a <strong>Papel e Sonhos Informática</strong> oferece uma gama completa de serviços para facilitar o seu dia a dia e impulsionar o seu negócio:</p>

                    <div class="feature-grid">
                        <div class="feature-card">
                            <h4>📄 Soluções Digitais & Documentação</h4>
                            <p>Xérox e Impressão de alta qualidade. Escaneamento direto para seu WhatsApp ou E-mail. Emissão de Certidões Negativas (Estadual, Federal e Eleitoral). Fazemos Declaração de Imposto de Renda e MEI. Cuidamos do seu RioCard (Bilhete Único e Declaração de Renda).</p>
                        </div>
                        <div class="feature-card">
                            <h4>💻 Tecnologia & Hardware</h4>
                            <p>Conserto e Formatação de Computadores e Notebooks. Desbloqueio de Conta Google. Cabos de alta performance (Tipo C, V8, HDMI, Rede RJ45). Seleção de músicas personalizadas para seu Pen Drive.</p>
                        </div>
                        <div class="feature-card">
                            <h4>🎨 Personalização & Brindes</h4>
                            <p>Dê vida às suas ideias com Canecas, Camisas e Azulejos sublimados. Topos de bolo e Papelaria Personalizada para tornar sua festa inesquecível. Adesivos e Banners para sua marca brilhar.</p>
                        </div>
                        <div class="feature-card">
                            <h4>📸 Fotografia & Restauração</h4>
                            <p>Fotos na hora (3x4 até Folha Inteira). Reforma e Restauração de Bíblias e Cadernetas de Vacinação. Emissão de novas Cadernetas de Vacina com layout moderno.</p>
                        </div>
                        <div class="feature-card">
                            <h4>🎙️ Mídia & Comunicação</h4>
                            <p>Gravação de áudio profissional para propagandas e anúncios que vendem mais. Dê voz ao seu negócio com qualidade de estúdio.</p>
                        </div>
                        <div class="feature-card">
                            <h4>✅ Facilitamos seu Dia</h4>
                            <p>Pagamento de boletos, consulta de situações cadastrais e muito mais. Se é digital ou envolve sonhos em papel, nós fazemos acontecer!</p>
                        </div>
                    </div>
                    
                    <h2>🌟 O Impacto do CurrículoFácil</h2>
                    <p>O CurrículoFácil é mais um capítulo dessa história de transformação. Desde nosso lançamento, já ajudamos <strong>mais de 50.000 pessoas</strong> a criarem currículos profissionais e conquistarem oportunidades melhores.</p>
                    <p>Recebemos diariamente histórias emocionantes: a mãe que conseguiu o primeiro emprego formal, o jovem aprovado no estágio dos sonhos, o profissional experiente que voltou ao mercado após anos afastado. Cada currículo gerado representa uma história, um sonho, uma vida sendo transformada.</p>
                    <p><em>"Não criamos apenas currículos. Criamos portas de entrada para novos futuros."</em></p>
                    
                    <h3>📈 Nossos Números (2012-2025)</h3>
                    <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
                        <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                            <div class="stat-number">13+</div>
                            <div>Anos de História</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                            <div class="stat-number">50k+</div>
                            <div>Currículos Criados</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                            <div class="stat-number">500+</div>
                            <div>Projetos Digitais</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                            <div class="stat-number">1000+</div>
                            <div>Clientes Atendidos</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);">
                            <div class="stat-number">100%</div>
                            <div>Gratuito Sempre</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);">
                            <div class="stat-number">24/7</div>
                            <div>Disponibilidade</div>
                        </div>
                    </div>
                    
                    <p>Nosso objetivo continua o mesmo de 2012: <strong>usar a tecnologia para criar oportunidades e transformar vidas</strong>. E vamos continuar fazendo isso, sempre mantendo o CurrículoFácil 100% gratuito e acessível para todos.</p>
                    
                    <h2>📞 Entre em Contato</h2>
                    <p>Tem dúvidas, sugestões ou feedback? Adoraríamos ouvir você! <a href="/contato" style="color: #2563eb;">Entre em contato conosco</a>.</p>
                    
                    <div style="margin-top: 3rem; padding: 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; text-align: center;">
                        <h3 style="color: white; margin-bottom: 1rem;">Pronto para criar seu currículo profissional?</h3>
                        <p style="margin-bottom: 1.5rem;">Junte-se a milhares de pessoas que já transformaram suas carreiras</p>
                        <a href="/" style="background: white; color: #667eea; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: 600; display: inline-block;">Criar Currículo Grátis →</a>
                    </div>
                    
                    <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b;">
                        <p><strong>&copy; 2025 CurrículoFácil - Todos os direitos reservados à Papel e Sonhos Informática</strong></p>
                        <a href="/" class="back-link">← Voltar ao início</a>
                    </div>
                </div>
            </main>
        </body>
        </html>
    `);
});

app.get('/contato', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Contato - CurrículoFácil</title>
            <meta name="description" content="Entre em contato com a equipe do CurrículoFácil. Tire suas dúvidas, envie sugestões ou reporte problemas.">
            <link rel="stylesheet" href="/css/style.css">
        </head>
        <body>
            <header>
                <nav>
                    <div class="container">
                        <h1><a href="/" style="text-decoration:none;color:inherit;">📄 CurrículoFácil</a></h1>
                        <div class="nav-links">
                            <a href="/">Início</a>
                            <a href="/sobre">Sobre</a>
                            <a href="/contato">Contato</a>
                        </div>
                    </div>
                </nav>
            </header>
            
            <main style="padding-top: 100px;">
                <div class="container" style="padding: 50px 20px;">
                    <h1>Entre em Contato</h1>
                    
                    <div style="max-width: 600px; margin: 0 auto;">
                        <h2>Fale Conosco</h2>
                        <p>Estamos aqui para ajudar! Se você tem dúvidas, sugestões ou encontrou algum problema, não hesite em nos contatar.</p>
                        
                        <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin: 30px 0;">
                            <h3>📧 Email</h3>
                            <p><strong>tsmv04@hotmail.com</strong></p>
                            <p>Respondemos em até 24 horas</p>
                            
                            <h3 style="margin-top: 30px;">📱 WhatsApp</h3>
                            <p><strong>(21) 98717-2463</strong></p>
                            <p><a href="https://wa.me/5521987172463" target="_blank" style="display: inline-block; background: #25d366; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-top: 10px;">Conversar no WhatsApp</a></p>
                            
                            <h3 style="margin-top: 30px;">🏢 Empresa</h3>
                            <p><strong>Papel e Sonhos Informática</strong></p>
                            <p>Especializada em soluções digitais para carreira e educação</p>
                            
                            <h3 style="margin-top: 30px;">⏰ Horário de Atendimento</h3>
                            <p>Segunda a Sexta: 9h às 18h</p>
                            <p>Sábados: 9h às 12h</p>
                        </div>
                        
                        <h2>Perguntas Frequentes</h2>
                        <div style="margin: 20px 0;">
                            <h4>O serviço é realmente gratuito?</h4>
                            <p>Sim! O CurrículoFácil é 100% gratuito e sempre será. Não cobramos nada para criar, visualizar ou baixar seu currículo.</p>
                            
                            <h4>Meus dados ficam seguros?</h4>
                            <p>Absolutamente. Seus dados são processados de forma segura e não são compartilhados com terceiros. Veja nossa <a href="/privacidade">Política de Privacidade</a>.</p>
                            
                            <h4>Posso usar o currículo comercialmente?</h4>
                            <p>Claro! O currículo gerado é seu e você pode usar da forma que desejar para buscar oportunidades de trabalho.</p>
                        </div>
                        
                        <p><strong>&copy; 2025 CurrículoFácil - Todos os direitos reservados à Papel e Sonhos Informática</strong></p>
                        
                        <p><a href="/">← Voltar ao início</a></p>
                    </div>
                </div>
            </main>
        </body>
        </html>
    `);
});

app.get('/privacidade', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Política de Privacidade - CurrículoFácil</title>
            <link rel="stylesheet" href="/css/style.css">
        </head>
        <body>
            <div class="container" style="padding: 100px 20px 50px;">
                <h1>Política de Privacidade</h1>
                <p>Última atualização: ${new Date().toLocaleDateString('pt-BR')}</p>
                
                <h2>Coleta de Dados</h2>
                <p>Coletamos apenas os dados necessários para gerar seu currículo: nome, contato, experiência profissional e formação.</p>
                
                <h2>Uso dos Dados</h2>
                <p>Seus dados são usados exclusivamente para gerar e disponibilizar seu currículo. Não compartilhamos com terceiros.</p>
                
                <h2>Armazenamento</h2>
                <p>Os dados são armazenados temporariamente (24 horas) apenas para permitir o download e compartilhamento do currículo. Após esse período, são automaticamente excluídos.</p>
                
                <h2>Cookies e Tecnologias de Rastreamento</h2>
                <p>Utilizamos cookies para:</p>
                <ul>
                    <li>Melhorar a experiência do usuário</li>
                    <li>Salvar temporariamente dados do formulário</li>
                    <li>Análise de tráfego via Google Analytics</li>
                    <li>Exibição de anúncios relevantes via Google AdSense</li>
                </ul>
                
                <h2>Google Analytics</h2>
                <p>Utilizamos o Google Analytics para entender como os usuários interagem com nosso site. Essas informações nos ajudam a melhorar nossos serviços. Você pode desativar o rastreamento do Google Analytics instalando o complemento de desativação do navegador.</p>
                
                <h2>Google AdSense</h2>
                <p>Nosso site exibe anúncios fornecidos pelo Google AdSense. O Google pode usar cookies para exibir anúncios baseados em suas visitas anteriores ao nosso site e outros sites. Você pode desativar anúncios personalizados visitando as Configurações de Anúncios do Google.</p>
                
                <h2>Seus Direitos</h2>
                <p>Você tem o direito de:</p>
                <ul>
                    <li>Solicitar a exclusão de seus dados</li>
                    <li>Saber quais dados coletamos</li>
                    <li>Corrigir informações incorretas</li>
                    <li>Retirar seu consentimento a qualquer momento</li>
                </ul>
                
                <h2>Contato</h2>
                <p>Para questões sobre privacidade, entre em contato: <strong>tsmv04@hotmail.com</strong></p>
                
                <p><strong>&copy; 2025 CurrículoFácil - Todos os direitos reservados à Papel e Sonhos Informática</strong></p>
                
                <p><a href="/">← Voltar ao início</a></p>
            </div>
        </body>
        </html>
    `);
});

app.get('/termos', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Termos de Uso - CurrículoFácil</title>
            <link rel="stylesheet" href="/css/style.css">
        </head>
        <body>
            <div class="container" style="padding: 100px 20px 50px;">
                <h1>Termos de Uso</h1>
                <p>Última atualização: ${new Date().toLocaleDateString('pt-BR')}</p>
                
                <h2>Uso do Serviço</h2>
                <p>O CurrículoFácil é um serviço gratuito para criação de currículos profissionais.</p>
                
                <h2>Responsabilidades</h2>
                <p>Você é responsável pela veracidade das informações fornecidas em seu currículo.</p>
                
                <h2>Propriedade Intelectual</h2>
                <p>Os templates e o sistema são de propriedade do CurrículoFácil. O conteúdo do seu currículo pertence a você.</p>
                
                <h2>Limitações</h2>
                <p>O serviço é fornecido "como está", sem garantias de disponibilidade contínua.</p>
                
                <p><strong>&copy; 2025 CurrículoFácil - Todos os direitos reservados à Papel e Sonhos Informática</strong></p>
                
                <p><a href="/">← Voltar ao início</a></p>
            </div>
        </body>
        </html>
    `);
});

// Middleware de tratamento de erros melhorado
app.use((error, req, res, next) => {
    logger.error('Erro capturado:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });

    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({ error: 'Arquivo muito grande. Máximo 2MB.' });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({ error: 'Muitos arquivos enviados.' });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({ error: 'Arquivo não esperado.' });
            default:
                return res.status(400).json({ error: 'Erro no upload do arquivo.' });
        }
    }

    if (error.name === 'ValidationError') {
        return res.status(400).json({ error: error.message });
    }

    // Erro genérico
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: config.NODE_ENV === 'development' ? error.message : 'Tente novamente'
    });
});

// Iniciar servidor apenas se não for invocado por requerimento (Vercel/Testes)
if (require.main === module) {
    const server = app.listen(PORT, () => {
        logger.success(`Servidor rodando na porta ${PORT}`);
        logger.info(`Acesse: http://localhost:${PORT}`);
        logger.info(`Memória inicial: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.warn('Recebido SIGTERM, encerrando servidor...');
    server.close(() => {
        logger.success('Servidor encerrado com sucesso');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.warn('Recebido SIGINT, encerrando servidor...');
    server.close(() => {
        logger.success('Servidor encerrado com sucesso');
        process.exit(0);
    });
});

module.exports = app;