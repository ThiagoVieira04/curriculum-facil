const busboy = require('busboy');
const { validation, pdf, logger } = require('../utils');
const config = require('../config');

// Templates
const templates = require('../server').templates || {};

// Melhorias com IA
async function improveTextWithAI(text, context) {
    const improvements = {
        experiencia: (text) => text
            .replace(/\b(fiz|fazia)\b/gi, 'realizei')
            .replace(/\b(ajudei)\b/gi, 'colaborei')
            .replace(/\b(trabalhei)\b/gi, 'atuei'),
        formacao: (text) => text
            .replace(/\b(estudei)\b/gi, 'cursei')
            .replace(/\b(terminei)\b/gi, 'concluí'),
        habilidades: (text) => text
            .replace(/\b(sei)\b/gi, 'domino')
            .replace(/\b(conheço)\b/gi, 'possuo conhecimento em')
    };
    return improvements[context] ? improvements[context](text) : text;
}

// Processar foto
async function processPhoto(buffer) {
    try {
        if (buffer.length > 500 * 1024) return null;
        return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } catch (error) {
        console.error('Erro ao processar foto:', error);
        return null;
    }
}

// Calcular tamanho da fonte
const calculateNameFontSize = (name) => {
    const length = name ? name.length : 0;
    if (length > 50) return '16px';
    if (length > 35) return '20px';
    if (length > 25) return '24px';
    return '32px';
};

// Templates (simplificado)
const getTemplate = (templateName, data) => {
    const simples = `
        <div style="font-family: Arial, sans-serif; max-width: 750px; margin: 0 auto; padding: 40px; line-height: 1.6; background: white;">
            <div style="display: flex; align-items: center; gap: 30px; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 30px;">
                ${data.photo ? `<img src="${data.photo}" style="width: 90px; height: 120px; border-radius: 4px; object-fit: cover;">` : ''}
                <div>
                    <h1 style="margin: 0; color: #333; font-size: ${calculateNameFontSize(data.nome)};">${data.nome}</h1>
                    <h2 style="margin: 10px 0; color: #666; font-size: 20px; font-weight: normal;">${data.cargo}</h2>
                    <p style="margin: 10px 0; color: #666; font-size: 14px;">📧 ${data.email} | 📱 ${data.telefone} | 📍 ${data.cidade}</p>
                </div>
            </div>
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;">EXPERIÊNCIA PROFISSIONAL</h3>
                <p style="text-align: justify;">${data.experiencia}</p>
            </div>
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;">FORMAÇÃO</h3>
                <p style="text-align: justify;">${data.formacao}</p>
            </div>
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;">HABILIDADES</h3>
                <p style="text-align: justify;">${data.habilidades}</p>
            </div>
        </div>
    `;
    return simples;
};

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const bb = busboy({ headers: req.headers });
        const fields = {};
        let photoBuffer = null;

        bb.on('file', (fieldname, file, info) => {
            if (fieldname === 'photo') {
                const chunks = [];
                file.on('data', (data) => chunks.push(data));
                file.on('end', () => {
                    photoBuffer = Buffer.concat(chunks);
                });
            }
        });

        bb.on('field', (fieldname, val) => {
            fields[fieldname] = val;
        });

        bb.on('close', async () => {
            try {
                const { nome, cargo, email, telefone, cidade, experiencia, formacao, habilidades, template = 'simples' } = fields;

                // Validação
                if (!nome || !cargo || !email || !telefone || !cidade || !experiencia || !formacao || !habilidades) {
                    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
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
                    template: template
                };

                // Foto
                let photoData = null;
                if (photoBuffer) {
                    photoData = await processPhoto(photoBuffer);
                }

                // IA
                cleanData.experiencia = await improveTextWithAI(cleanData.experiencia, 'experiencia');
                cleanData.formacao = await improveTextWithAI(cleanData.formacao, 'formacao');
                cleanData.habilidades = await improveTextWithAI(cleanData.habilidades, 'habilidades');

                // Template
                const html = getTemplate(template, { ...cleanData, photo: photoData });

                // ID
                const cvId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

                res.status(200).json({
                    id: cvId,
                    html: html,
                    nome: cleanData.nome,
                    template: template,
                    message: 'Currículo gerado com sucesso!'
                });

            } catch (error) {
                console.error('Erro ao gerar currículo:', error);
                res.status(500).json({ error: 'Erro ao gerar currículo', message: error.message });
            }
        });

        req.pipe(bb);

    } catch (error) {
        console.error('Erro fatal:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
