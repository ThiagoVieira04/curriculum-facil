const busboy = require('busboy');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fileType = require('file-type');

// Análise ATS
function analyzeATS(text) {
    const report = {
        score: 0,
        strengths: [],
        improvements: [],
        suggestions: []
    };

    if (!text) return report;

    const lowerText = text.toLowerCase();
    let score = 0;

    // Contato
    const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(text);
    const hasPhone = /(\(?\d{2}\)?\s?\d{4,5}-?\d{4})/.test(text);
    if (hasEmail && hasPhone) {
        score += 15;
        report.strengths.push("Informações de contato completas.");
    } else {
        report.improvements.push("Faltam informações de contato claras.");
    }

    // Seções
    const sections = [
        { name: "Experiência", keywords: ["experiência", "profissional", "atuação"] },
        { name: "Formação", keywords: ["formação", "educação", "graduação"] },
        { name: "Habilidades", keywords: ["habilidades", "competências", "skills"] }
    ];

    let sectionsFound = 0;
    sections.forEach(s => {
        if (s.keywords.some(k => lowerText.includes(k))) {
            sectionsFound++;
        }
    });

    score += (sectionsFound / sections.length) * 25;
    if (sectionsFound === sections.length) {
        report.strengths.push("Estrutura bem definida com todas as seções essenciais.");
    }

    // Verbos de ação
    const actionVerbs = ["realizei", "desenvolvi", "coordenei", "lideri", "apliquei", "gerenciei"];
    const foundVerbs = actionVerbs.filter(v => lowerText.includes(v));
    if (foundVerbs.length >= 5) {
        score += 30;
        report.strengths.push("Bom uso de verbos de ação.");
    } else if (foundVerbs.length > 0) {
        score += 15;
        report.improvements.push("Pode usar mais verbos de ação.");
    }

    // Volume
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 300) {
        score += 30;
        report.strengths.push("Conteúdo detalhado e informativo.");
    } else if (wordCount > 150) {
        score += 15;
        report.improvements.push("O currículo está um pouco curto.");
    }

    report.score = Math.min(Math.round(score), 100);
    if (report.strengths.length === 0) {
        report.strengths.push("Formato de arquivo compatível para leitura.");
    }

    return report;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const bb = busboy({ headers: req.headers });
        let fileBuffer = null;

        bb.on('file', (fieldname, file, info) => {
            if (fieldname === 'resume') {
                const chunks = [];
                file.on('data', (data) => chunks.push(data));
                file.on('end', () => {
                    fileBuffer = Buffer.concat(chunks);
                });
            }
        });

        bb.on('close', async () => {
            try {
                if (!fileBuffer) {
                    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
                }

                if (fileBuffer.size > 10 * 1024 * 1024) {
                    return res.status(400).json({ error: 'Arquivo muito grande' });
                }

                let text = '';
                let typeInfo = await fileType.fromBuffer(fileBuffer);
                let mimeType = typeInfo ? typeInfo.mime : '';

                // Tentar PDF
                if (mimeType === 'application/pdf') {
                    try {
                        const data = await pdfParse(fileBuffer);
                        text = data.text;
                    } catch (e) {
                        console.warn('Falha ao parsear PDF, tentando DOCX');
                    }
                }

                // Tentar DOCX
                if (!text) {
                    try {
                        const data = await mammoth.extractRawText({ buffer: fileBuffer });
                        text = data.value;
                    } catch (e) {
                        console.warn('Falha ao parsear DOCX');
                    }
                }

                if (!text) {
                    return res.status(422).json({
                        error: 'Arquivo corrompido ou inválido',
                        message: 'Não foi possível ler o arquivo. Verifique se é um PDF ou DOCX válido.'
                    });
                }

                const cleanText = text.replace(/\s+/g, ' ').trim();
                if (cleanText.length < 50) {
                    return res.status(422).json({
                        error: 'Conteúdo ilegível',
                        message: 'O arquivo parece estar vazio ou ser uma imagem digitalizada.'
                    });
                }

                const report = analyzeATS(text);
                res.status(200).json(report);

            } catch (error) {
                console.error('Erro na análise ATS:', error);
                res.status(500).json({ error: 'Erro ao analisar arquivo' });
            }
        });

        req.pipe(bb);

    } catch (error) {
        console.error('Erro fatal:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
