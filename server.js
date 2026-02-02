// Deploy Trigger: Vercel Retry
const express = require('express');
const multer = require('multer');
// Retirando requires topo de nível de bibliotecas nativas para evitar erros em Serverless/Vercel
// const sharp = require('sharp');
// Puppeteer será carregado dinamicamente quando necessário
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const helmet = require('helmet');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fileType = require('file-type');

// Configurações e utilitários
const config = require('./config');
const { validation, rateLimiting, cleanup, pdf, logger } = require('./utils');
const atsProcessor = require('./ats-processor');
const { validateCompanyData, checkCompanyLimit } = require('./middleware/companyValidation');

const app = express();
const PORT = config.PORT;

// Banco de dados em memória (para simplicidade)
const cvDatabase = new Map();

// Rate limiting DESABILITADO para desenvolvimento
const rateLimitMap = new Map();

function rateLimit(req, res, next) {
    // BYPASS completo durante desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
        return next();
    }

    const ip = req.ip || req.connection.remoteAddress || 'unknown';
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
app.set('trust proxy', true);

// Ativar Rate Limiting
app.use(rateLimit);

// IMPORTANTE: Rotas dinâmicas ANTES de express.static
// Isso garante que /sobre, /contato, /api/* sejam processadas antes de procurar arquivos estáticos

// Rota de diagnóstico leve (sem dependências pesadas)
app.get('/api/debug-env', (req, res) => {
    res.json({
        status: 'online',
        node_env: process.env.NODE_ENV,
        vercel: process.env.VERCEL || 'false',
        node_version: process.version,
        memory: process.memoryUsage(),
        uptime: process.uptime()
    });
});



// Rota raiz para verificar se servidor está rodando
app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        vercel: !!process.env.VERCEL,
        timestamp: new Date().toISOString()
    });
});

// Middleware para logs de requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Rotas para páginas HTML estáticas
app.get('/sobre', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sobre.html'));
});

app.get('/contato', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contato.html'));
});

app.get('/dicas', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dicas.html'));
});

app.get('/empresa', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'empresa.html'));
});

// Rota para compartilhar/visualizar currículo
app.get('/cv/:id', (req, res) => {
    const { id } = req.params;

    // Buscar currículo no banco de dados em memória
    const cv = cvDatabase.get(id);

    if (!cv) {
        return res.status(404).send(`
            <html>
                <head><title>Currículo não encontrado</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1>Currículo não encontrado</h1>
                    <p>O currículo que você está procurando não existe ou expirou.</p>
                    <a href="/" style="color: #6366f1; text-decoration: none; font-weight: bold;">← Criar novo currículo</a>
                </body>
            </html>
        `);
    }

    // Retornar página com currículo
    res.send(`
        <html>
            <head>
                <meta charset="UTF-8">
                <title>${cv.nome} - Currículo</title>
                <style>
                    body { font-family: Arial; margin: 0; padding: 20px; background: #f5f5f5; }
                    .container { max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
                    a { color: #6366f1; text-decoration: none; font-weight: bold; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                <div class="container">
                    <header>
                        <h1>Currículo de ${validation.sanitizeText(cv.nome)}</h1>
                        <div>
                            <a href="/" style="margin-right: 10px;">← Criar novo currículo</a>
                            <a href="/api/download-pdf/${id}" style="margin-right: 10px;">📥 Baixar PDF</a>
                            <a onclick="window.print()" style="cursor: pointer;">🖨️ Imprimir</a>
                        </div>
                    </header>
                    <div>${cv.html}</div>
                </div>
            </body>
        </html>
    `);
});

// Servir arquivos estáticos DEPOIS das rotas dinâmicas
app.use(express.static('public'));

// Configuração do Multer otimizada
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        // Aceita qualquer arquivo, validação acontece depois
        cb(null, true);
    }
});

// Helper para formatar data (AAAA-MM-DD para DD/MM/AAAA)
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('/')) return dateStr; // Já está formatado
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
};

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
                .resize(90, 120, {
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

// Lógica de Análise ATS
function analyzeATS(text, data = {}) {
    const report = {
        score: 0,
        strengths: [],
        improvements: [],
        suggestions: []
    };

    if (!text) return report;

    const lowerText = text.toLowerCase();
    let score = 0;

    // 1. Informações de Contato (Peso: 15)
    const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(text);
    const hasPhone = /(\(?\d{2}\)?\s?\d{4,5}-?\d{4})/.test(text);
    if (hasEmail && hasPhone) {
        score += 15;
        report.strengths.push("Informações de contato completas (email e telefone).");
    } else {
        report.improvements.push("Faltam informações de contato claras.");
        report.suggestions.push("Certifique-se de que seu email e telefone estão bem visíveis.");
    }

    // 2. Seções Principais (Peso: 25)
    const sections = [
        { name: "Experiência", keywords: ["experiência", "histórico profissional", "atuação", "trajetória"] },
        { name: "Formação", keywords: ["formação", "escolaridade", "educação", "graduação", "acadêmico"] },
        { name: "Habilidades", keywords: ["habilidades", "competências", "conhecimentos", "skills", "tecnologias"] },
        { name: "Objetivo", keywords: ["objetivo", "resumo", "perfil"] }
    ];

    let sectionsFound = 0;
    sections.forEach(s => {
        if (s.keywords.some(k => lowerText.includes(k))) {
            sectionsFound++;
        } else {
            report.improvements.push(`Seção de ${s.name} não identificada claramente.`);
        }
    });

    const sectionScore = (sectionsFound / sections.length) * 25;
    score += sectionScore;
    if (sectionsFound === sections.length) {
        report.strengths.push("Estrutura bem definida com todas as seções essenciais.");
    }

    // 3. Verbos de Ação e Palavras-chave (Peso: 30)
    const actionVerbs = ["realizei", "desenvolvi", "coordenei", "lideri", "apliquei", "gerenciei", "otimizei", "implementei", "colaborei", "atuei"];
    const foundVerbs = actionVerbs.filter(v => lowerText.includes(v));
    if (foundVerbs.length >= 5) {
        score += 30;
        report.strengths.push("Bom uso de verbos de ação para descrever experiências.");
    } else if (foundVerbs.length > 0) {
        score += 15;
        report.improvements.push("Pode usar mais verbos de ação para destacar conquistas.");
        report.suggestions.push("Use palavras como 'gerenciei', 'desenvolvi' ou 'otimizei' em vez de apenas 'fiz'.");
    } else {
        report.improvements.push("Faltam termos de impacto nas descrições.");
    }

    // 4. Volume e Detalhamento (Peso: 30)
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 300) {
        score += 30;
        report.strengths.push("Conteúdo detalhado e informativo.");
    } else if (wordCount > 150) {
        score += 15;
        report.improvements.push("O currículo está um pouco curto.");
        report.suggestions.push("Tente detalhar mais suas responsabilidades e resultados alcançados.");
    } else {
        report.improvements.push("Conteúdo muito escasso para uma análise profunda.");
    }

    report.score = Math.min(Math.round(score), 100);

    // Fallback se não houver pontos positivos
    if (report.strengths.length === 0) {
        report.strengths.push("Formato de arquivo compatível para leitura.");
    }

    return report;
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
                ${data.photo ? `<img src="${data.photo}" style="width: 90px; height: 120px; border-radius: 4px; object-fit: cover;">` : ''}
                <div style="text-align: left;">
                    <h1 style="margin: 0; color: #333; font-size: ${calculateNameFontSize(data.nome)}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.nome}</h1>
                    <h2 style="margin: 10px 0; color: #666; font-size: 20px; font-weight: normal;">${data.cargo}</h2>
                    <p style="margin: 10px 0; color: #666; font-size: 14px;">
                        📧 ${data.email} | 📱 ${data.telefone} | 📍 ${data.cidade}
                    </p>
                    ${data.nascimento || data.estadoCivil || data.naturalidade || data.nacionalidade ? `
                        <p style="margin: 5px 0; color: #666; font-size: 12px;">
                            ${data.nascimento ? `${formatDate(data.nascimento)}` : ''}
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
                <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;">FORMAÇÃO</h3>
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
            
            <!-- Assinatura -->
            <div style="margin-top: 20px; text-align: center; font-size: 9px; color: #aaa; opacity: 0.7;">
                Desenvolvido por Papel e Sonhos Informática
            </div>
        </div>
    `,

    moderno: (data) => `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 750px; margin: 0 auto; padding: 0; line-height: 1.6; background: white;">
            <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 40px; display: flex; align-items: center; gap: 30px; margin-bottom: 30px;">
                ${data.photo ? `<img src="${data.photo}" style="width: 90px; height: 120px; border-radius: 4px; border: 4px solid rgba(255,255,255,0.3); object-fit: cover;">` : ''}
                <div style="text-align: left;">
                    <h1 style="margin: 0; font-size: ${calculateNameFontSize(data.nome)}; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.nome}</h1>
                    <h2 style="margin: 10px 0; font-size: 20px; font-weight: normal; opacity: 0.9;">${data.cargo}</h2>
                    <p style="margin: 10px 0; font-size: 14px; opacity: 0.9;">
                        📧 ${data.email} | 📱 ${data.telefone} | 📍 ${data.cidade}
                    </p>
                    ${data.nascimento || data.estadoCivil || data.naturalidade || data.nacionalidade ? `
                        <p style="margin: 5px 0; font-size: 12px; opacity: 0.8;">
                            ${data.nascimento ? `${formatDate(data.nascimento)}` : ''}
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
                    <h3 style="color: #6b7280; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #6b7280; padding-bottom: 5px;">FORMAÇÃO</h3>
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
                
                <!-- Assinatura -->
                <div style="margin-top: 20px; text-align: center; font-size: 9px; color: #aaa; opacity: 0.7;">
                    Desenvolvido por Papel e Sonhos Informática
                </div>
            </div>
        </div>
    `,

    executivo: (data) => `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; background: white; display: flex; box-shadow: 0 0 10px rgba(0,0,0,0.1); min-height: 1000px;">
            <!-- Coluna Lateral (Esquerda) -->
            <div style="width: 30%; background-color: #2c3e50; color: white; padding: 30px 20px; text-align: center;">
                ${data.photo ? `<div style="width: 112.5px; height: 150px; margin: 0 auto 20px; border-radius: 4px; border: 4px solid #34495e; overflow: hidden;"><img src="${data.photo}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
                
                <div style="text-align: left; margin-top: 30px;">
                    <div style="margin-bottom: 30px;">
                        <h3 style="color: #ecf0f1; border-bottom: 1px solid #7f8c8d; padding-bottom: 10px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Contato</h3>
                        <p style="font-size: 13px; margin: 5px 0; color: #bdc3c7;">📞 ${data.telefone}</p>
                        <p style="font-size: 13px; margin: 5px 0; color: #bdc3c7; word-break: break-all;">📧 ${data.email}</p>
                        <p style="font-size: 13px; margin: 5px 0; color: #bdc3c7;">📍 ${data.cidade}</p>
                    </div>

                    ${data.nascimento || data.estadoCivil || data.naturalidade || data.nacionalidade ? `
                        <div style="margin-bottom: 30px;">
                             <h3 style="color: #ecf0f1; border-bottom: 1px solid #7f8c8d; padding-bottom: 10px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Pessoal</h3>
                             <p style="font-size: 13px; margin: 5px 0; color: #bdc3c7;">${data.nascimento ? `${formatDate(data.nascimento)}<br>` : ''}
                             ${data.estadoCivil ? `${data.estadoCivil}<br>` : ''}
                             ${data.naturalidade ? `${data.naturalidade}<br>` : ''}
                             ${data.nacionalidade ? `${data.nacionalidade}` : ''}</p>
                        </div>
                    ` : ''}

                    ${data.habilidades ? `
                        <div style="margin-bottom: 30px;">
                            <h3 style="color: #ecf0f1; border-bottom: 1px solid #7f8c8d; padding-bottom: 10px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Habilidades</h3>
                            <p style="font-size: 13px; color: #bdc3c7; line-height: 1.6;">${data.habilidades}</p>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Coluna Principal (Direita) -->
            <div style="width: 70%; padding: 40px;">
                <div style="margin-bottom: 40px; border-bottom: 2px solid #2c3e50; padding-bottom: 20px;">
                    <h1 style="margin: 0; color: #2c3e50; font-size: 36px; text-transform: uppercase; letter-spacing: 2px; line-height: 1.2;">${data.nome}</h1>
                    <h2 style="margin: 10px 0 0; color: #7f8c8d; font-size: 18px; font-weight: 300; letter-spacing: 1px;">${data.cargo}</h2>
                </div>

                ${data.objetivo ? `
                    <div style="margin-bottom: 30px;">
                        <h3 style="color: #2c3e50; font-size: 16px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                            <span style="background: #2c3e50; color: white; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px;">★</span>
                            Objetivo
                        </h3>
                        <p style="color: #34495e; font-size: 14px; line-height: 1.6; text-align: justify;">${data.objetivo}</p>
                    </div>
                ` : ''}

                <div style="margin-bottom: 30px;">
                    <h3 style="color: #2c3e50; font-size: 16px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <span style="background: #2c3e50; color: white; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px;">💼</span>
                        Experiência
                    </h3>
                    ${data.empresa1 ? `
                        <div style="margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <strong style="color: #2c3e50; font-size: 15px;">${data.empresa1}</strong>
                                <span style="color: #7f8c8d; font-size: 12px; font-style: italic;">${data.periodo1}</span>
                            </div>
                            <div style="color: #34495e; font-size: 14px; margin-bottom: 5px;">${data.funcao1}</div>
                        </div>
                    ` : ''}
                    ${data.empresa2 ? `
                        <div style="margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <strong style="color: #2c3e50; font-size: 15px;">${data.empresa2}</strong>
                                <span style="color: #7f8c8d; font-size: 12px; font-style: italic;">${data.periodo2}</span>
                            </div>
                            <div style="color: #34495e; font-size: 14px; margin-bottom: 5px;">${data.funcao2}</div>
                        </div>
                    ` : ''}
                    ${data.empresa3 ? `
                        <div style="margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <strong style="color: #2c3e50; font-size: 15px;">${data.empresa3}</strong>
                                <span style="color: #7f8c8d; font-size: 12px; font-style: italic;">${data.periodo3}</span>
                            </div>
                            <div style="color: #34495e; font-size: 14px; margin-bottom: 5px;">${data.funcao3}</div>
                        </div>
                    ` : ''}
                    <p style="color: #34495e; font-size: 14px; line-height: 1.6; text-align: justify; margin-top: 10px;">${data.experiencia}</p>
                </div>

                <div style="margin-bottom: 30px;">
                    <h3 style="color: #2c3e50; font-size: 16px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <span style="background: #2c3e50; color: white; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px;">🎓</span>
                        Formação
                    </h3>
                    <p style="color: #34495e; font-size: 14px; line-height: 1.6;">${data.formacao}</p>
                </div>

                ${data.cursos ? `
                    <div style="margin-bottom: 30px;">
                        <h3 style="color: #2c3e50; font-size: 16px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                            <span style="background: #2c3e50; color: white; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px;">📜</span>
                            Cursos
                        </h3>
                        <p style="color: #34495e; font-size: 14px; line-height: 1.6;">${data.cursos}</p>
                    </div>
                ` : ''}
                
                <!-- Assinatura e Rodapé -->
                <div style="margin-top: 50px; text-align: center;">
                    <div style="font-family: 'Georgia', serif; font-size: 18px; color: #2c3e50; margin-bottom: 5px; font-style: italic;">
                        ${data.nome}
                    </div>
                    <div style="border-top: 1px solid #eee; width: 200px; margin: 0 auto 10px;"></div>
                    <div style="font-size: 9px; color: #aaa; opacity: 0.7;">
                        Gerado por Papel e Sonhos Informática
                    </div>
                </div>
            </div>
        </div>
    `,

    criativo: (data) => `
        <div style="font-family: 'Segoe UI', Roboto, sans-serif; max-width: 750px; margin: 0 auto; padding: 0; line-height: 1.6; background: white;">
            <div style="background: #1e293b; color: white; padding: 40px; display: flex; align-items: center; gap: 30px; margin-bottom: 30px;">
                ${data.photo ? `<img src="${data.photo}" style="width: 90px; height: 120px; border-radius: 4px; border: 3px solid #38bdf8; object-fit: cover;">` : ''}
                <div style="text-align: left;">
                    <h1 style="margin: 0; color: #38bdf8; font-size: ${calculateNameFontSize(data.nome)}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.nome}</h1>
                    <h2 style="margin: 10px 0; color: white; font-size: 20px; font-weight: normal; opacity: 0.9;">${data.cargo}</h2>
                    <p style="margin: 10px 0; color: white; font-size: 14px; opacity: 0.8;">
                        📧 ${data.email} | 📱 ${data.telefone} | 📍 ${data.cidade}
                    </p>
                    ${data.nascimento || data.estadoCivil || data.naturalidade || data.nacionalidade ? `
                        <p style="margin: 5px 0; color: white; font-size: 12px; opacity: 0.6;">
                            ${data.nascimento ? `${formatDate(data.nascimento)}` : ''}
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
                    <h3 style="color: #0f172a; border-left: 5px solid #38bdf8; padding-left: 10px; font-size: 18px; text-transform: uppercase;">FORMAÇÃO</h3>
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
                
                <!-- Assinatura -->
                <div style="margin-top: 20px; text-align: center; font-size: 9px; color: #aaa; opacity: 0.7;">
                    Desenvolvido por Papel e Sonhos Informática
                </div>
            </div>
        </div>
    `,

    elegante: (data) => `
        <div style="font-family: Georgia, serif; max-width: 750px; margin: 0 auto; padding: 40px; line-height: 1.6; background: white; color: #2c3e50;">
            <div style="display: flex; align-items: center; gap: 30px; margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 30px;">
                ${data.photo ? `<img src="${data.photo}" style="width: 90px; height: 120px; border-radius: 4px; object-fit: cover; filter: grayscale(100%);">` : ''}
                <div style="text-align: left;">
                    <h1 style="margin: 0; color: #1a1a1a; font-size: ${calculateNameFontSize(data.nome)}; font-weight: normal; letter-spacing: 1px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.nome}</h1>
                    <h2 style="margin: 10px 0; color: #7f8c8d; font-size: 20px; font-weight: normal; font-style: italic;">${data.cargo}</h2>
                    <p style="margin: 10px 0; color: #7f8c8d; font-size: 14px;">
                        📧 ${data.email} | 📱 ${data.telefone} | 📍 ${data.cidade}
                    </p>
                    ${data.nascimento || data.estadoCivil || data.naturalidade || data.nacionalidade ? `
                        <p style="margin: 5px 0; color: #7f8c8d; font-size: 12px;">
                            ${data.nascimento ? `${formatDate(data.nascimento)}` : ''}
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
                <h3 style="color: #2c3e50; font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px; text-transform: uppercase; font-style: italic; letter-spacing: 1px;">FORMAÇÃO</h3>
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
            
            <!-- Assinatura -->
            <div style="margin-top: 20px; text-align: center; font-size: 9px; color: #aaa; opacity: 0.7;">
                Desenvolvido por Papel e Sonhos Informática
            </div>
        </div>
    `
};

// Rotas da API

// Gerar currículo (Robustecido com melhor parsing de FormData)
app.post('/api/generate-cv', (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({ error: 'Erro no upload de arquivo' });
        } else if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: 'Erro ao processar arquivo' });
        }
        next();
    });
}, async (req, res) => {
    const requestId = Date.now().toString(36);
    console.log(`[${requestId}] 🚀 Iniciando geração de currículo (v2)`);
    console.log(`[${requestId}] Memória antes: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    try {
        // 0. Fail-fast para payload vazio
        if (!req.body) {
            throw new Error('Payload vazio ou corrompido');
        }

        // Extrair dados do body (FormData é parseado automaticamente pelo multer)
        // Se houver foto, multer já processou; se não, os campos estão em req.body
        let {
            nome, cargo, email, telefone, cidade,
            experiencia, formacao, habilidades,
            template = 'simples',
            // Campos opcionais
            nascimento, estadoCivil, naturalidade, nacionalidade, objetivo, cursos,
            empresa1, funcao1, periodo1,
            empresa2, funcao2, periodo2,
            empresa3, funcao3, periodo3
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
        cleanData.nascimento = validation.sanitizeText(nascimento);
        cleanData.estadoCivil = validation.sanitizeText(estadoCivil);
        cleanData.naturalidade = validation.sanitizeText(naturalidade);
        cleanData.nacionalidade = validation.sanitizeText(nacionalidade);
        cleanData.objetivo = validation.sanitizeText(objetivo);
        cleanData.cursos = validation.sanitizeText(cursos);
        cleanData.empresa1 = validation.sanitizeText(empresa1);
        cleanData.funcao1 = validation.sanitizeText(funcao1);
        cleanData.periodo1 = validation.sanitizeText(periodo1);
        cleanData.empresa2 = validation.sanitizeText(empresa2);
        cleanData.funcao2 = validation.sanitizeText(funcao2);
        cleanData.periodo2 = validation.sanitizeText(periodo2);
        cleanData.empresa3 = validation.sanitizeText(empresa3);
        cleanData.funcao3 = validation.sanitizeText(funcao3);
        cleanData.periodo3 = validation.sanitizeText(periodo3);

        // Formatação de Data (yyyy-mm-dd -> dd/mm/aaaa)
        if (cleanData.nascimento && /^\d{4}-\d{2}-\d{2}$/.test(cleanData.nascimento)) {
            const [year, month, day] = cleanData.nascimento.split('-');
            cleanData.nascimento = `${day}/${month}/${year}`;
        }

        // 3. Processamento de Foto (Fail-safe)
        let photoData = null;
        if (req.file) {
            // Validação explícita de foto
            const photoValidation = validation.validateFileUpload(req.file, 'photo');
            if (!photoValidation.valid) {
                console.warn(`[${requestId}] Foto ignorada: ${photoValidation.error}`);
                // Não falha a geração do CV, apenas ignora a foto inválida
            } else {
                try {
                    photoData = await processPhoto(req.file.buffer);
                } catch (photoError) {
                    console.error(`[${requestId}] Erro ao processar foto:`, photoError);
                    // Não falha a requisição, apenas loga e segue sem foto
                }
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

// Análise ATS de Arquivo (Upload) - VERSÃO ROBUSTA COM TIMEOUT E OCR PROTEGIDO
app.post('/api/ats-analyze-file', (req, res, next) => {
    upload.single('resume')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({ error: 'Erro no upload de arquivo' });
        } else if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: 'Erro ao processar arquivo' });
        }
        next();
    });
}, async (req, res) => {
    const requestId = Date.now().toString(36);
    const REQUEST_TIMEOUT_MS = 25000; // 25 segundos máximo para a requisição completa
    let responseEnviada = false;
    
    // Garantir que a resposta SEMPRE seja enviada
    const garantirResposta = (statusCode, data) => {
        if (!responseEnviada && !res.headersSent) {
            responseEnviada = true;
            return res.status(statusCode).json(data);
        }
    };
    
    // CRÍTICO: Timeout da requisição completa
    const timeoutId = setTimeout(() => {
        console.error(`[${requestId}] ❌ TIMEOUT GERAL: Requisição excedeu 25 segundos`);
        garantirResposta(408, {
            error: 'Timeout na análise',
            message: 'O processamento demorou muito. Tente novamente com um arquivo menor ou de melhor qualidade.'
        });
    }, REQUEST_TIMEOUT_MS);
    
    // Limpar timeout quando resposta for enviada
    res.on('finish', () => clearTimeout(timeoutId));

    try {
        console.log(`\n[${requestId}] 🚀 ========== INICIANDO ANÁLISE ATS ==========`);

        if (!req.file) {
            clearTimeout(timeoutId);
            return garantirResposta(400, { 
                error: 'Arquivo não encontrado',
                message: 'Nenhum arquivo foi enviado. Verifique se o upload foi completado.' 
            });
        }

        // 1. Validação de Tamanho
        if (req.file.size === 0) {
            clearTimeout(timeoutId);
            return garantirResposta(400, {
                error: 'Arquivo vazio',
                message: 'O arquivo enviado está vazio. Tente novamente com um arquivo válido.'
            });
        }

        if (req.file.size > config.UPLOAD.RESUME.MAX_FILE_SIZE) {
            clearTimeout(timeoutId);
            return garantirResposta(413, {
                error: 'Arquivo muito grande',
                message: `Arquivo excede o tamanho máximo permitido (${config.UPLOAD.RESUME.MAX_FILE_SIZE / 1024 / 1024}MB).`
            });
        }

        console.log(`[${requestId}] 📁 Arquivo: ${req.file.originalname} (${req.file.size} bytes)`);

        // 2. Detectar tipo MIME
        let typeInfo = await fileType.fromBuffer(req.file.buffer);
        let mimeType = typeInfo ? typeInfo.mime : req.file.mimetype || 'application/octet-stream';
        
        console.log(`[${requestId}] 🔍 Tipo: ${mimeType}`);

        // 3. Processar currículo COM TIMEOUT PROTETOR
        console.log(`[${requestId}] ⚙️  Processando (timeout: 15s)...`);
        
        // Promise.race para evitar travamento do OCR
        const processingPromise = atsProcessor.processResume(req.file.buffer, mimeType);
        const processingTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Processamento excedeu 15 segundos')), 15000)
        );
        
        let processingResult;
        try {
            processingResult = await Promise.race([processingPromise, processingTimeout]);
        } catch (e) {
            console.error(`[${requestId}] ⚠️  Processamento timeou ou falhou: ${e.message}`);
            // Continuar com resultado vazio - retornar erro apropriado
            clearTimeout(timeoutId);
            return garantirResposta(422, {
                error: 'Processamento timeout',
                message: 'O arquivo demorou muito para ser processado. Pode estar corrompido ou ser uma imagem muito grande. Tente com outro arquivo.'
            });
        }

        // 4. Validar resultado da extração
        if (!processingResult.text || processingResult.text.length < 50) {
            console.error(`[${requestId}] ❌ Texto insuficiente: ${processingResult.text?.length || 0} chars`);

            const errorType = processingResult.details.error;
            let errorMessage = '';

            if (errorType === 'Buffer vazio') {
                errorMessage = 'O arquivo parece estar corrompido. Tente fazer upload novamente.';
            } else if (processingResult.details.isScanned === true && !processingResult.isOCR) {
                errorMessage = 'PDF escaneado detectado mas OCR falhou. O arquivo pode ter imagem de baixa qualidade.';
            } else if (processingResult.isOCR && processingResult.confidence < 0.5) {
                errorMessage = `OCR com baixa confiança (${(processingResult.confidence * 100).toFixed(0)}%). Tente com arquivo de melhor qualidade.`;
            } else if (processingResult.details.error) {
                errorMessage = `Erro ao processar: ${processingResult.details.error}`;
            } else {
                errorMessage = 'Conteúdo insuficiente ou ilegível.';
            }

            clearTimeout(timeoutId);
            return garantirResposta(422, {
                error: 'Conteúdo não processável',
                message: errorMessage,
                debug: {
                    method: processingResult.method,
                    textLength: processingResult.text?.length || 0,
                    isOCR: processingResult.isOCR,
                    confidence: processingResult.confidence
                }
            });
        }

        console.log(`[${requestId}] ✅ Texto: ${processingResult.text.length} chars, Método: ${processingResult.method}`);

        // 5. Realizar análise ATS (síncrono - rápido)
        console.log(`[${requestId}] 📊 Analisando ATS...`);
        const report = analyzeATS(processingResult.text);

        // 6. Adicionar metadados
        report.processingInfo = {
            method: processingResult.method,
            isOCR: processingResult.isOCR,
            isImage: processingResult.isImage,
            confidence: Math.round(processingResult.confidence * 100),
            textLength: processingResult.text.length
        };

        console.log(`[${requestId}] 🎉 Concluído! Score: ${report.score}`);
        console.log(`[${requestId}] ========== FIM ==========\n`);
        
        clearTimeout(timeoutId);
        return garantirResposta(200, report);

    } catch (error) {
        console.error(`[${requestId}] ❌ ERRO CRÍTICO:`, error.message);
        clearTimeout(timeoutId);
        return garantirResposta(500, {
            error: 'Erro ao processar arquivo',
            message: 'Ocorreu um erro inesperado. Tente novamente com outro arquivo.'
        });
    }
});

// Análise ATS de Dados (JSON)
app.post('/api/ats-analyze-data', (req, res) => {
    try {
        const { data } = req.body;
        if (!data) {
            return res.status(400).json({ error: 'Dados não fornecidos' });
        }

        // Concatena campos para análise de texto
        const text = `
            ${data.nome} ${data.cargo}
            ${data.objetivo || ''}
            ${data.experiencia}
            ${data.formacao}
            ${data.habilidades}
            ${data.cursos || ''}
            ${data.empresa1 || ''} ${data.funcao1 || ''}
            ${data.empresa2 || ''} ${data.funcao2 || ''}
            ${data.empresa3 || ''} ${data.funcao3 || ''}
        `;

        const report = analyzeATS(text, data);
        res.json(report);
    } catch (error) {
        console.error('Erro na análise ATS de dados:', error);
        res.status(500).json({ error: 'Erro ao realizar análise.' });
    }
});

// Download PDF
app.all('/api/download-pdf/:id?', async (req, res) => {
    console.log('Recebida requisição para download PDF:', req.method, req.params.id);
    try {
        res.status(200).json({
            success: true,
            message: 'Currículo gerado com sucesso!',
            note: 'Geração de PDF temporariamente indisponível em ambiente serverless'
        });
    } catch (error) {
        logger.error('Erro ao processar requisição PDF:', error);
        res.status(500).json({
            error: 'Erro ao processar requisição',
            details: config.NODE_ENV === 'development' ? error.message : 'Tente novamente'
        });
    }
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
                
                <p><strong>&copy; 2026 CurrículoFácil - Todos os direitos reservados à Papel e Sonhos Informática</strong></p>
                
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
                
                <p><strong>&copy; 2026 CurrículoFácil - Todos os direitos reservados à Papel e Sonhos Informática</strong></p>
                
                <p><a href="/">← Voltar ao início</a></p>
            </div>
        </body>
        </html>
    `);
});

// Fallback para SPA (Single Page Application) - Deve ficar APÓS todas as rotas e ANTES do tratamento de erro
app.get('*', (req, res, next) => {
    // Se for rota de API não encontrada, passa para o error handler (404 JSON)
    if (req.path.startsWith('/api/')) {
        return next();
    }
    // Para outras rotas, serve o index.html
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// APIs de Gerenciamento de Empresas (NEW)
// ==========================================

/**
 * POST /api/companies/validate
 * Valida dados de uma empresa no backend
 * Camada de segurança para evitar manipulações
 */
app.post('/api/companies/validate', (req, res) => {
    try {
        const company = req.body;

        // Validação de dados básicos
        if (!company || typeof company !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                statusCode: 400
            });
        }

        // Valida dados da empresa
        const validation = validateCompanyData(company);

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Dados de empresa inválidos',
                errors: validation.errors,
                statusCode: 400
            });
        }

        res.status(200).json({
            success: true,
            message: 'Dados válidos',
            statusCode: 200
        });
    } catch (error) {
        logger.error('Erro em /api/companies/validate:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao validar empresa',
            statusCode: 500
        });
    }
});

/**
 * POST /api/companies/check-limit
 * Verifica se o usuário pode adicionar mais empresas
 * Regra de segurança no backend
 */
app.post('/api/companies/check-limit', (req, res) => {
    try {
        const { currentCompanyCount = 0 } = req.body;

        // Validação do input
        if (typeof currentCompanyCount !== 'number' || currentCompanyCount < 0) {
            return res.status(400).json({
                success: false,
                message: 'currentCompanyCount deve ser um número positivo',
                statusCode: 400
            });
        }

        // Verifica limite
        const limitCheck = checkCompanyLimit(currentCompanyCount);

        res.status(200).json({
            success: true,
            canAdd: limitCheck.canAdd,
            message: limitCheck.message || 'Você pode adicionar mais empresas',
            currentCount: currentCompanyCount,
            maxCount: 10,
            statusCode: 200
        });
    } catch (error) {
        logger.error('Erro em /api/companies/check-limit:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao verificar limite',
            statusCode: 500
        });
    }
});

/**
 * POST /api/companies/add
 * Endpoint de exemplo para adicionar empresa
 * Implementar com seu banco de dados/storage
 */
app.post('/api/companies/add', (req, res) => {
    try {
        const company = req.body;

        // Validação de dados
        const validation = validateCompanyData(company);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Dados de empresa inválidos',
                errors: validation.errors,
                statusCode: 400
            });
        }

        // Verifica limite (aqui seria necessário contar empresas do usuário no DB)
        const currentCount = 3; // Exemplo - seria obtido do banco de dados real
        const limitCheck = checkCompanyLimit(currentCount);

        if (!limitCheck.canAdd) {
            return res.status(400).json({
                success: false,
                message: limitCheck.message,
                reason: 'LIMIT_REACHED',
                statusCode: 400
            });
        }

        // TODO: Salvar no banco de dados real
        // await companyRepository.save(company);

        res.status(201).json({
            success: true,
            message: 'Empresa adicionada com sucesso',
            data: company,
            statusCode: 201
        });
    } catch (error) {
        logger.error('Erro em /api/companies/add:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao adicionar empresa',
            statusCode: 500
        });
    }
});

// Middleware de tratamento de erros melhorado
app.use((error, req, res, next) => {
    // Logging seguro
    try {
        logger.error('Erro capturado:', {
            message: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method
        });
    } catch (logError) {
        console.error('Falha ao logar erro:', logError);
    }

    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({ error: 'Arquivo muito grande. Máximo 10MB.' });
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

// Iniciar servidor
function startServer() {
    try {
        const server = app.listen(PORT, () => {
            logger.success(`Servidor rodando na porta ${PORT}`);
            logger.info(`Acesse: http://localhost:${PORT}`);
            logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
        });

        // Graceful shutdown
        const shutdown = () => {
            logger.warn('Encerrando servidor...');
            server.close(() => {
                logger.success('Servidor encerrado com sucesso');
                process.exit(0);
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

        return server;
    } catch (error) {
        logger.error('Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Exportar app como default para Vercel
if (typeof module !== 'undefined' && module.exports) {
    module.exports = app;
    module.exports.startServer = startServer;
}

// Auto-iniciar em ambiente local ou com flag
if (require.main === module || process.env.AUTO_START === 'true') {
    startServer();
}