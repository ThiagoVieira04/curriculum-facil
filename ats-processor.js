/**
 * ATS Document Processor
 * Responsável por extrair texto de PDFs, imagens e aplicar OCR automaticamente
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Resultado da extração de texto
 * @typedef {Object} ExtractionResult
 * @property {string} text - Texto extraído
 * @property {string} method - Método usado ('pdf-parse', 'mammoth', 'ocr', 'image-ocr')
 * @property {boolean} isOCR - Se foi necessário usar OCR
 * @property {boolean} isImage - Se era uma imagem
 * @property {number} confidence - Confiança do OCR (0-1)
 * @property {Object} details - Detalhes adicionais
 */

/**
 * Detecta se um PDF é escaneado (imagem) ou contém texto selecionável
 * @param {Buffer} buffer - Buffer do PDF
 * @returns {Promise<{isScanned: boolean, textLength: number}>}
 */
async function detectPdfType(buffer) {
    try {
        const data = await pdfParse(buffer);
        const text = (data.text || '').trim();
        
        // Se extraiu muito pouco texto em relação ao tamanho do arquivo,
        // provavelmente é escaneado
        const textLength = text.length;
        const isScanned = textLength < 100; // Heurística: menos de 100 chars = provável PDF escaneado
        
        return { isScanned, textLength };
    } catch (error) {
        console.error('Erro ao detectar tipo de PDF:', error.message);
        return { isScanned: true, textLength: 0 };
    }
}

/**
 * Extrai texto de um PDF com texto selecionável
 * @param {Buffer} buffer - Buffer do PDF
 * @returns {Promise<string>}
 */
async function extractTextFromPdf(buffer) {
    try {
        const data = await pdfParse(buffer);
        return (data.text || '').trim();
    } catch (error) {
        console.error('Erro ao extrair texto do PDF:', error.message);
        throw new Error(`PDF Parse Error: ${error.message}`);
    }
}

/**
 * Extrai texto de um documento DOCX
 * @param {Buffer} buffer - Buffer do DOCX
 * @returns {Promise<string>}
 */
async function extractTextFromDocx(buffer) {
    try {
        const data = await mammoth.extractRawText({ buffer });
        return (data.value || '').trim();
    } catch (error) {
        console.error('Erro ao extrair texto do DOCX:', error.message);
        throw new Error(`DOCX Parse Error: ${error.message}`);
    }
}

/**
 * Aplica OCR em um PDF escaneado
 * Nota: Versão simplificada que usa Tesseract direto no buffer
 * Para PDFs reais com múltiplas páginas, considere usar pdftoppm ou similar
 * @param {Buffer} pdfBuffer - Buffer do PDF escaneado
 * @returns {Promise<{text: string, confidence: number}>}
 */
async function applyOCRToPdf(pdfBuffer) {
    let tempFile = null;
    
    try {
        console.log('🔍 Iniciando OCR em PDF escaneado...');
        console.log('⚠️  Nota: OCR de PDF é computacionalmente intensivo');
        console.log('   Para melhor desempenho, converta o PDF para imagem em produção');
        
        // Salvar PDF temporariamente
        tempFile = path.join(os.tmpdir(), `ocr_pdf_${Date.now()}.pdf`);
        await fs.writeFile(tempFile, pdfBuffer);
        
        // Tentar ler como imagem (Tesseract pode processar PDFs em alguns casos)
        console.log(`📸 Processando PDF como imagem...`);
        const result = await Tesseract.recognize(
            tempFile,
            'por', // Português
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        if (progress % 20 === 0) {
                            console.log(`   OCR Progress: ${progress}%`);
                        }
                    }
                }
            }
        );
        
        if (result.data.text) {
            const text = (result.data.text || '').trim();
            const confidence = result.data.confidence / 100;
            
            console.log(`✅ OCR completado: ${text.length} caracteres, Confiança: ${(confidence * 100).toFixed(1)}%`);
            
            return { text, confidence };
        } else {
            // Se OCR falhou, retornar vazio mas sem erro
            console.log('⚠️  OCR retornou texto vazio');
            return { text: '', confidence: 0 };
        }
        
    } catch (error) {
        console.warn('⚠️  OCR em PDF falhou:', error.message);
        console.log('   → Isso é esperado para PDFs multipage ou com baixa qualidade');
        console.log('   → Sugestão: Use imagens da página individual em produção');
        // Não lançar erro, retornar vazio
        return { text: '', confidence: 0 };
    } finally {
        if (tempFile) {
            try {
                await fs.unlink(tempFile);
            } catch (e) {
                console.warn('Erro ao limpar arquivo temporário:', e.message);
            }
        }
    }
}

/**
 * Aplica OCR em uma imagem
 * @param {Buffer} imageBuffer - Buffer da imagem
 * @returns {Promise<{text: string, confidence: number}>}
 */
async function applyOCRToImage(imageBuffer) {
    let tempFile = null;
    
    try {
        console.log('🔍 Iniciando OCR em imagem...');
        
        // Validar que é uma imagem válida
        if (!imageBuffer || imageBuffer.length < 100) {
            console.warn('⚠️  Buffer muito pequeno para ser imagem válida');
            return { text: '', confidence: 0 };
        }
        
        // Salvar imagem temporariamente
        tempFile = path.join(os.tmpdir(), `ocr_${Date.now()}.png`);
        await fs.writeFile(tempFile, imageBuffer);
        
        // Aplicar OCR com timeout e tratamento de erro robusto
        try {
            const result = await Tesseract.recognize(
                tempFile,
                'por', // Português
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const progress = Math.round(m.progress * 100);
                            if (progress % 20 === 0 && progress > 0) {
                                console.log(`   OCR Progress: ${progress}%`);
                            }
                        }
                    }
                }
            );
            
            const text = (result.data.text || '').trim();
            const confidence = (result.data.confidence || 0) / 100;
            
            if (text.length > 0) {
                console.log(`✅ OCR completado: ${text.length} caracteres, Confiança: ${(confidence * 100).toFixed(1)}%`);
            }
            
            return { text, confidence };
            
        } catch (ocrError) {
            console.warn('⚠️  Tesseract falhou:', ocrError.message);
            // Retornar vazio em vez de falhar
            return { text: '', confidence: 0 };
        }
        
    } catch (error) {
        console.error('❌ Erro ao processar imagem:', error.message);
        // Retornar resultado vazio em vez de lançar erro
        return { text: '', confidence: 0 };
    } finally {
        if (tempFile) {
            try {
                await fs.unlink(tempFile);
            } catch (e) {
                // Silenciosamente ignorar erro de limpeza
            }
        }
    }
}

/**
 * Normaliza texto para compatibilidade com ATS
 * Remove caracteres invisíveis, normaliza espaçamento
 * @param {string} text - Texto bruto
 * @returns {string}
 */
function normalizeTextForATS(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    return text
        // Remove caracteres de controle invisíveis (incluindo tabs)
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F\t]/g, ' ')
        // Remove múltiplos espaços
        .replace(/ {2,}/g, ' ')
        // Normaliza quebras de linha
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        // Trim geral
        .trim();
}

/**
 * Função principal para processar currículos
 * @param {Buffer} buffer - Buffer do arquivo
 * @param {string} mimeType - Tipo MIME do arquivo
 * @returns {Promise<ExtractionResult>}
 */
async function processResume(buffer, mimeType) {
    const result = {
        text: '',
        method: '',
        isOCR: false,
        isImage: false,
        confidence: 1,
        details: {}
    };

    try {
        // 1. Validação inicial
        if (!buffer || buffer.length === 0) {
            result.details.error = 'Buffer vazio';
            result.details.suggestion = 'O arquivo parece estar corrompido. Tente fazer upload novamente.';
            return result;
        }

        const isPdf = mimeType === 'application/pdf';
        const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const isImage = mimeType && (mimeType.startsWith('image/') || mimeType === 'application/octet-stream');

        // 2. Tentar extrair como PDF
        if (isPdf) {
            console.log('📄 Detectado: PDF');
            
            try {
                // Detectar se é escaneado
                const { isScanned, textLength } = await detectPdfType(buffer);
                result.details.isScanned = isScanned;
                result.details.initialTextLength = textLength;
                
                if (!isScanned && textLength >= 100) {
                    // PDF com texto selecionável
                    console.log('✅ PDF com texto selecionável detectado');
                    result.text = await extractTextFromPdf(buffer);
                    result.method = 'pdf-parse';
                    result.isOCR = false;
                } else {
                    // PDF escaneado - tentar OCR
                    console.log('🔍 PDF escaneado detectado - tentando OCR...');
                    const ocr = await applyOCRToPdf(buffer);
                    if (ocr.text && ocr.text.length > 0) {
                        result.text = ocr.text;
                        result.method = 'ocr-pdf';
                        result.confidence = ocr.confidence;
                        result.isOCR = true;
                    }
                }
            } catch (e) {
                console.warn('⚠️ Erro ao processar PDF:', e.message);
                result.details.pdfError = e.message;
            }
        }

        // 3. Se PDF falhou ou não era PDF, tentar DOCX
        if (!result.text && (isDocx || (!isPdf && !isImage))) {
            console.log('📋 Tentando extrair como DOCX...');
            try {
                result.text = await extractTextFromDocx(buffer);
                result.method = 'mammoth';
                result.isOCR = false;
            } catch (e) {
                console.log('⚠️ Não é DOCX válido:', e.message);
                result.details.docxError = e.message;
            }
        }

        // 4. Se ainda não tem texto, tentar como imagem com OCR
        if (!result.text && (isImage || !isPdf)) {
            console.log('🖼️ Detectado: Imagem - tentando OCR...');
            try {
                const ocr = await applyOCRToImage(buffer);
                if (ocr.text && ocr.text.length > 0) {
                    result.text = ocr.text;
                    result.method = 'ocr-image';
                    result.confidence = ocr.confidence;
                    result.isOCR = true;
                    result.isImage = true;
                }
            } catch (e) {
                console.warn('⚠️ OCR em imagem falhou:', e.message);
                result.details.imageError = e.message;
            }
        }

        // 5. Normalizar texto extraído
        if (result.text) {
            result.text = normalizeTextForATS(result.text);
        }

        // 6. Análise final do resultado
        const finalLength = result.text.length;
        result.details.finalTextLength = finalLength;
        result.details.textExtractedSuccessfully = finalLength >= 50;

        console.log(`\n📊 Resumo: Método=${result.method}, OCR=${result.isOCR}, TextLength=${finalLength}, Confiança=${(result.confidence * 100).toFixed(1)}%`);

        return result;

    } catch (error) {
        console.error('❌ Erro fatal ao processar currículo:', error.message);
        result.details.error = error.message;
        result.details.suggestion = 'Ocorreu um erro ao processar o arquivo. Tente com um arquivo diferente.';
        return result;
    }
}

module.exports = {
    processResume,
    detectPdfType,
    extractTextFromPdf,
    extractTextFromDocx,
    applyOCRToPdf,
    applyOCRToImage,
    normalizeTextForATS
};
