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
const publicPath = path.join(process.cwd(), 'public');

app.get('/sobre', (req, res) => {
    res.sendFile(path.join(publicPath, 'sobre.html'));
});

app.get('/contato', (req, res) => {
    res.sendFile(path.join(publicPath, 'contato.html'));
});

app.get('/dicas', (req, res) => {
    res.sendFile(path.join(publicPath, 'dicas.html'));
});

app.get('/empresa', (req, res) => {
    res.sendFile(path.join(publicPath, 'empresa.html'));
});

app.get('/privacidade', (req, res) => {
    res.sendFile(path.join(publicPath, 'privacidade.html'));
});

app.get('/termos', (req, res) => {
    res.sendFile(path.join(publicPath, 'termos.html'));
});

// ============================================
// DATABASE (IN-MEMORY)
// ============================================
const cvDatabase = new Map();

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

// ============================================
// FILE UPLOAD
// ============================================
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Helper para calcular tamanho da fonte do nome
const calculateNameFontSize = (name) => {
    const length = name ? name.length : 0;
    if (length > 50) return '16px';
    if (length > 35) return '20px';
    if (length > 25) return '24px';
    return '32px';
};

// ============================================
// TEMPLATES (RESTORED FROM SERVER.JS)
// ============================================
const templates = {
    simples: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 750px; margin: 0 auto; padding: 30px; line-height: 1.4; background: white; min-height: 1050px; display: flex; flex-direction: column;">
            <div class="cv-section" style="display: flex; align-items: center; gap: 25px; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 20px;">
                ${data.photoData ? `<img src="data:image/jpeg;base64,${data.photoData}" style="width: 80px; height: 105px; border-radius: 4px; object-fit: cover;">` : ''}
                <div style="text-align: left;">
                    <h1 style="margin: 0; color: #333; font-size: ${calculateNameFontSize(data.nome)}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.nome}</h1>
                    <h2 style="margin: 5px 0; color: #666; font-size: 18px; font-weight: normal;">${data.cargo}</h2>
                    <p style="margin: 5px 0; color: #666; font-size: 13px;">
                        📧 ${data.email} | 📱 ${data.telefone} | 📍 ${data.cidade}
                    </p>
                    ${data.nascimento || data.estadoCivil || data.naturalidade || data.nacionalidade ? `
                        <p style="margin: 3px 0; color: #666; font-size: 11px;">
                            ${data.nascimento ? `${formatDate(data.nascimento)}` : ''}
                            ${data.estadoCivil ? ` | ${data.estadoCivil}` : ''}
                            ${data.naturalidade ? ` | ${data.naturalidade}` : ''}
                            ${data.nacionalidade ? ` | ${data.nacionalidade}` : ''}
                        </p>
                    ` : ''}
                </div>
            </div>
            
            <div style="flex: 1;">
                ${data.objetivo ? `
                    <div class="cv-section" style="margin-bottom: 15px;">
                        <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px; font-size: 14px; text-transform: uppercase;">OBJETIVO</h3>
                        <p style="text-align: justify; font-size: 13px; margin: 5px 0;">${data.objetivo}</p>
                    </div>
                ` : ''}
                
                <div class="cv-section" style="margin-bottom: 15px;">
                    <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px; font-size: 14px; text-transform: uppercase;">EXPERIÊNCIA PROFISSIONAL</h3>
                    ${data.empresa1 ? `
                        <div style="margin-bottom: 8px; font-size: 13px;">
                            <strong>${data.empresa1}</strong> - ${data.funcao1} (${data.periodo1})
                        </div>
                    ` : ''}
                    ${data.empresa2 ? `
                        <div style="margin-bottom: 8px; font-size: 13px;">
                            <strong>${data.empresa2}</strong> - ${data.funcao2} (${data.periodo2})
                        </div>
                    ` : ''}
                    ${data.empresa3 ? `
                        <div style="margin-bottom: 8px; font-size: 13px;">
                            <strong>${data.empresa3}</strong> - ${data.funcao3} (${data.periodo3})
                        </div>
                    ` : ''}
                    <p style="text-align: justify; white-space: pre-wrap; font-size: 13px; margin: 5px 0;">${data.experiencia}</p>
                </div>
                
                <div class="cv-section" style="margin-bottom: 15px;">
                    <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px; font-size: 14px; text-transform: uppercase;">FORMAÇÃO</h3>
                    <p style="text-align: justify; white-space: pre-wrap; font-size: 13px; margin: 5px 0;">${data.formacao}</p>
                </div>
                
                ${data.cursos ? `
                    <div class="cv-section" style="margin-bottom: 15px;">
                        <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px; font-size: 14px; text-transform: uppercase;">CURSOS E CERTIFICAÇÕES</h3>
                        <p style="text-align: justify; white-space: pre-wrap; font-size: 13px; margin: 5px 0;">${data.cursos}</p>
                    </div>
                ` : ''}
                
                <div class="cv-section" style="margin-bottom: 15px;">
                    <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px; font-size: 14px; text-transform: uppercase;">HABILIDADES</h3>
                    <p style="text-align: justify; font-size: 13px; margin: 5px 0;">${data.habilidades}</p>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <div style="border-top: 1px solid #eee; padding-top: 8px; text-align: right; font-style: italic; color: #888; font-size: 11px;">
                    ${data.nome}
                </div>
                <div style="margin-top: 10px; text-align: center; font-size: 9px; color: #aaa; opacity: 0.7;">
                    Gerado por Papel e Sonhos Informática
                </div>
            </div>
        </div>
    `,

    moderno: (data) => `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 750px; margin: 0 auto; padding: 0; line-height: 1.4; background: white; min-height: 1050px; display: flex; flex-direction: column;">
            <div class="cv-section" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 30px 40px; display: flex; align-items: center; gap: 25px; margin-bottom: 20px;">
                ${data.photoData ? `<img src="data:image/jpeg;base64,${data.photoData}" style="width: 80px; height: 105px; border-radius: 4px; border: 3px solid rgba(255,255,255,0.3); object-fit: cover;">` : ''}
                <div style="text-align: left;">
                    <h1 style="margin: 0; font-size: ${calculateNameFontSize(data.nome)}; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.nome}</h1>
                    <h2 style="margin: 5px 0; font-size: 18px; font-weight: normal; opacity: 0.9;">${data.cargo}</h2>
                    <p style="margin: 5px 0; font-size: 13px; opacity: 0.9;">
                        📧 ${data.email} | 📱 ${data.telefone} | 📍 ${data.cidade}
                    </p>
                    ${data.nascimento || data.estadoCivil || data.naturalidade || data.nacionalidade ? `
                        <p style="margin: 3px 0; font-size: 11px; opacity: 0.8;">
                            ${data.nascimento ? `${formatDate(data.nascimento)}` : ''}
                            ${data.estadoCivil ? ` | ${data.estadoCivil}` : ''}
                            ${data.naturalidade ? ` | ${data.naturalidade}` : ''}
                            ${data.nacionalidade ? ` | ${data.nacionalidade}` : ''}
                        </p>
                    ` : ''}
                </div>
            </div>
            
            <div style="padding: 0 40px; flex: 1;">
                ${data.objetivo ? `
                    <div class="cv-section" style="margin-bottom: 15px;">
                        <h3 style="color: #6b7280; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #6b7280; padding-bottom: 3px;">OBJETIVO</h3>
                        <p style="text-align: justify; font-size: 13px; margin: 5px 0;">${data.objetivo}</p>
                    </div>
                ` : ''}
                
                <div class="cv-section" style="margin-bottom: 15px;">
                    <h3 style="color: #6b7280; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #6b7280; padding-bottom: 3px;">EXPERIÊNCIA PROFISSIONAL</h3>
                    ${data.empresa1 ? `
                        <div style="margin-bottom: 8px; font-size: 13px;">
                            <strong>${data.empresa1}</strong> - ${data.funcao1} (${data.periodo1})
                        </div>
                    ` : ''}
                    ${data.empresa2 ? `
                        <div style="margin-bottom: 8px; font-size: 13px;">
                            <strong>${data.empresa2}</strong> - ${data.funcao2} (${data.periodo2})
                        </div>
                    ` : ''}
                    ${data.empresa3 ? `
                        <div style="margin-bottom: 8px; font-size: 13px;">
                            <strong>${data.empresa3}</strong> - ${data.funcao3} (${data.periodo3})
                        </div>
                    ` : ''}
                    <p style="text-align: justify; white-space: pre-wrap; font-size: 13px; margin: 5px 0;">${data.experiencia}</p>
                </div>
                
                <div class="cv-section" style="margin-bottom: 15px;">
                    <h3 style="color: #6b7280; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #6b7280; padding-bottom: 3px;">FORMAÇÃO</h3>
                    <p style="text-align: justify; white-space: pre-wrap; font-size: 13px; margin: 5px 0;">${data.formacao}</p>
                </div>
                
                ${data.cursos ? `
                    <div class="cv-section" style="margin-bottom: 15px;">
                        <h3 style="color: #6b7280; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #6b7280; padding-bottom: 3px;">CURSOS E CERTIFICAÇÕES</h3>
                        <p style="text-align: justify; white-space: pre-wrap; font-size: 13px; margin: 5px 0;">${data.cursos}</p>
                    </div>
                ` : ''}
                
                <div class="cv-section" style="margin-bottom: 15px;">
                    <h3 style="color: #6b7280; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #6b7280; padding-bottom: 3px;">HABILIDADES</h3>
                    <p style="text-align: justify; font-size: 13px; margin: 5px 0;">${data.habilidades}</p>
                </div>
            </div>
            
            <div style="padding: 20px 40px;">
                <div style="border-top: 1px solid #eee; padding-top: 8px; text-align: right; font-style: italic; color: #888; font-size: 11px;">
                    ${data.nome}
                </div>
                <div style="margin-top: 10px; text-align: center; font-size: 9px; color: #aaa; opacity: 0.7;">
                    Gerado por Papel e Sonhos Informática
                </div>
            </div>
        </div>
    `,

    executivo: (data) => `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; background: white; display: flex; box-shadow: 0 0 10px rgba(0,0,0,0.1); min-height: 1000px;">
            <!-- Coluna Lateral (Esquerda) -->
            <div style="width: 30%; background-color: #2c3e50; color: white; padding: 30px 20px; text-align: center;">
                ${data.photoData ? `<div style="width: 112.5px; height: 150px; margin: 0 auto 20px; border-radius: 4px; border: 4px solid #34495e; overflow: hidden;"><img src="data:image/jpeg;base64,${data.photoData}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
                
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
                    <p style="color: #34495e; font-size: 14px; line-height: 1.6; text-align: justify; margin-top: 10px; white-space: pre-wrap;">${data.experiencia}</p>
                </div>

                <div style="margin-bottom: 30px;">
                    <h3 style="color: #2c3e50; font-size: 16px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <span style="background: #2c3e50; color: white; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px;">🎓</span>
                        Formação
                    </h3>
                    <p style="color: #34495e; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${data.formacao}</p>
                </div>

                ${data.cursos ? `
                    <div style="margin-bottom: 30px;">
                        <h3 style="color: #2c3e50; font-size: 16px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                            <span style="background: #2c3e50; color: white; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px;">📜</span>
                            Cursos
                        </h3>
                        <p style="color: #34495e; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${data.cursos}</p>
                    </div>
                ` : ''}
                
                <!-- Assinatura -->
                <div style="margin-top: 30px; text-align: center; font-size: 9px; color: #aaa; opacity: 0.7;">
                    Gerado por Papel e Sonhos Informática
                </div>
            </div>
        </div>
    `,

    criativo: (data) => `
        <div style="font-family: 'Segoe UI', Roboto, sans-serif; max-width: 750px; margin: 0 auto; padding: 0; line-height: 1.6; background: white;">
            <div style="background: #1e293b; color: white; padding: 40px; display: flex; align-items: center; gap: 30px; margin-bottom: 30px;">
                ${data.photoData ? `<img src="data:image/jpeg;base64,${data.photoData}" style="width: 90px; height: 120px; border-radius: 4px; border: 3px solid #38bdf8; object-fit: cover;">` : ''}
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
                    <p style="text-align: justify; white-space: pre-wrap;">${data.experiencia}</p>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #0f172a; border-left: 5px solid #38bdf8; padding-left: 10px; font-size: 18px; text-transform: uppercase;">FORMAÇÃO</h3>
                    <p style="text-align: justify; white-space: pre-wrap;">${data.formacao}</p>
                </div>
                
                ${data.cursos ? `
                    <div style="margin-bottom: 25px;">
                        <h3 style="color: #0f172a; border-left: 5px solid #38bdf8; padding-left: 10px; font-size: 18px; text-transform: uppercase;">CURSOS E CERTIFICAÇÕES</h3>
                        <p style="text-align: justify; white-space: pre-wrap;">${data.cursos}</p>
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
                    Gerado por Papel e Sonhos Informática
                </div>
            </div>
        </div>
    `,

    elegante: (data) => `
        <div style="font-family: Georgia, serif; max-width: 750px; margin: 0 auto; padding: 40px; line-height: 1.6; background: white; color: #2c3e50;">
            <div style="display: flex; align-items: center; gap: 30px; margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 30px;">
                ${data.photoData ? `<img src="data:image/jpeg;base64,${data.photoData}" style="width: 90px; height: 120px; border-radius: 4px; object-fit: cover; filter: grayscale(100%);">` : ''}
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
                <p style="text-align: justify; white-space: pre-wrap;">${data.experiencia}</p>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px; text-transform: uppercase; font-style: italic; letter-spacing: 1px;">FORMAÇÃO</h3>
                <p style="text-align: justify; white-space: pre-wrap;">${data.formacao}</p>
            </div>
            
            ${data.cursos ? `
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #2c3e50; font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px; text-transform: uppercase; font-style: italic; letter-spacing: 1px;">CURSOS E CERTIFICAÇÕES</h3>
                    <p style="text-align: justify; white-space: pre-wrap;">${data.cursos}</p>
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
                Gerado por Papel e Sonhos Informática
            </div>
        </div>
    `
};

// ============================================
// ATS ANALYSIS HEURISTICS
// ============================================
const performATSAnalysis = (text = '') => {
    const rawText = text.toLowerCase();
    let score = 65;
    const strengths = [];
    const improvements = [];
    const suggestions = [];

    // Heuristics
    if (rawText.length > 500) {
        score += 10;
        strengths.push('Boa densidade de conteúdo');
    } else {
        score -= 10;
        improvements.push('Conteúdo muito conciso');
        suggestions.push('Adicione mais detalhes sobre suas responsabilidades passadas');
    }

    if (rawText.includes('objetivo')) {
        score += 5;
        strengths.push('Inclui seção de objetivo');
    } else {
        improvements.push('Falta um objetivo claro');
        suggestions.push('Defina seu objetivo profissional no início do currículo');
    }

    if (rawText.includes('experiência') || rawText.includes('trabalho')) {
        score += 10;
        strengths.push('Experiência profissional identificada');
    } else {
        improvements.push('Falta detalhamento de experiências');
    }

    const keywords = ['gerenciamento', 'desenvolvimento', 'análise', 'coordenação', 'projetos', 'resultados'];
    const foundKeywords = keywords.filter(k => rawText.includes(k));
    if (foundKeywords.length >= 2) {
        score += 10;
        strengths.push('Uso de palavras-chave estratégicas');
    } else {
        suggestions.push('Utilize verbos de ação e termos técnicos da sua área');
    }

    return {
        score: Math.min(Math.max(score, 0), 100),
        strengths,
        improvements,
        suggestions: [...suggestions, 'Mantenha o layout limpo e use fontes padrão'],
        timestamp: new Date().toISOString()
    };
};

// ============================================
// GERAR CV
// ============================================
app.post('/api/generate-cv', upload.single('photo'), async (req, res) => {
    try {
        const {
            nome, cargo, email, telefone, cidade,
            nascimento, estadoCivil, naturalidade, nacionalidade,
            objetivo, experiencia, formacao, cursos, habilidades,
            empresa1, funcao1, periodo1,
            empresa2, funcao2, periodo2,
            empresa3, funcao3, periodo3,
            template = 'simples'
        } = req.body;

        // Validação básica
        if (!nome || !cargo || !email || !telefone || !cidade || !experiencia || !formacao || !habilidades) {
            return res.status(400).json({ error: 'Campos obrigatórios faltando' });
        }

        if (!validation.validateEmail(email)) {
            return res.status(400).json({ error: 'Email inválido' });
        }

        // Processar foto se houver
        let photoBase64 = null;
        if (req.file) {
            photoBase64 = req.file.buffer.toString('base64');
        }

        // Sanitização e Preparação de Dados
        const cleanData = {
            nome: validation.sanitizeText(nome),
            cargo: validation.sanitizeText(cargo),
            email: validation.sanitizeText(email),
            telefone: validation.sanitizeText(telefone),
            cidade: validation.sanitizeText(cidade),
            nascimento: validation.sanitizeText(nascimento || ''),
            estadoCivil: validation.sanitizeText(estadoCivil || ''),
            naturalidade: validation.sanitizeText(naturalidade || ''),
            nacionalidade: validation.sanitizeText(nacionalidade || ''),
            objetivo: validation.sanitizeText(objetivo || ''),
            experiencia: validation.sanitizeText(experiencia),
            formacao: validation.sanitizeText(formacao),
            cursos: validation.sanitizeText(cursos || ''),
            habilidades: validation.sanitizeText(habilidades),
            empresa1: validation.sanitizeText(empresa1 || ''),
            funcao1: validation.sanitizeText(funcao1 || ''),
            periodo1: validation.sanitizeText(periodo1 || ''),
            empresa2: validation.sanitizeText(empresa2 || ''),
            funcao2: validation.sanitizeText(funcao2 || ''),
            periodo2: validation.sanitizeText(periodo2 || ''),
            empresa3: validation.sanitizeText(empresa3 || ''),
            funcao3: validation.sanitizeText(funcao3 || ''),
            periodo3: validation.sanitizeText(periodo3 || ''),
            photoData: photoBase64
        };

        // Renderizar template
        const templateFunc = templates[template] || templates.simples;
        const html = templateFunc(cleanData);

        // Gerar ID e salvar (em memória - ideal seria Redis para Vercel persistente)
        const cvId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        cvDatabase.set(cvId, { ...cleanData, html, createdAt: new Date() });

        res.json({
            id: cvId,
            html,
            nome: cleanData.nome, // Enviando de volta para o cliente usar no nome do arquivo
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
// ATS ENDPOINTS
// ============================================
app.post('/api/ats-analyze-file', upload.single('resume'), (req, res) => {
    try {
        // Simulação de leitura de arquivo (como é mock, analisamos metadados ou conteúdo fictício)
        // Em um sistema real, usaríamos pdf-parse aqui
        const report = performATSAnalysis(req.file?.originalname || '');
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao analisar arquivo' });
    }
});

app.post('/api/ats-analyze-data', (req, res) => {
    try {
        const { data } = req.body;
        const textToAnalyze = Object.values(data || {}).join(' ');
        const report = performATSAnalysis(textToAnalyze);
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao analisar dados' });
    }
});

// ============================================
// PDF DOWNLOAD (FALLBACK / HTML SERVICE)
// ============================================
app.post('/api/download-pdf/:id', (req, res) => {
    try {
        const { html, nome } = req.body;

        // Nota Dev Sênior: O Vercel Serverless não suporta Puppeteer nativo de forma leve.
        // Já implementamos a geração via html2pdf.js no front-end para alta qualidade.
        // Este endpoint serve como um fallback robusto fornecendo o HTML otimizado para impressão.

        const fileName = (nome || 'curriculo').toLowerCase().replace(/[^a-z0-9]/gi, '_') + '.html';

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>${nome || 'Currículo'}</title>
                <style>
                    body { margin: 0; padding: 0; background-color: #f0f2f5; }
                    @media print {
                        .no-print { display: none !exports; }
                        body { background: white; }
                    }
                    .print-notice { 
                        background: #1e293b; 
                        color: white; 
                        padding: 15px; 
                        text-align: center; 
                        font-family: system-ui, -apple-system, sans-serif; 
                    }
                </style>
            </head>
            <body>
                <div class="no-print print-notice">
                    Pressione <strong>Ctrl + P</strong> (ou Cmd + P) e selecione <strong>"Salvar como PDF"</strong> para a melhor qualidade.
                </div>
                ${html}
            </body>
            </html>
        `);
    } catch (error) {
        console.error('ERRO /api/download-pdf:', error);
        res.status(500).json({ error: 'Erro ao preparar arquivo' });
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

// Fallback para qualquer rota não encontrada (SPA Behavior)
app.get('*', (req, res) => {
    // Tenta servir o index.html como último recurso
    const indexPath = path.join(process.cwd(), 'public', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Erro ao servir index.html no fallback:', err);
            res.status(500).send('Erro crítico: Falha ao carregar a aplicação.');
        }
    });
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
