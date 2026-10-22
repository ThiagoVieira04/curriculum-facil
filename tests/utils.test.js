process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../config');
const { validation, rateLimiting } = require('../utils');

const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const pdfBuffer = Buffer.from('%PDF-1.4\nconteudo');
const zipBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00]);

test('sanitizeText remove tags sem destruir pontuação legítima', () => {
    const cleaned = validation.sanitizeText('<script>alert(1)</script>Maria & João "Silva"');
    assert.equal(cleaned.includes('<script>'), false);
    assert.equal(cleaned.includes('<'), false);
    assert.equal(cleaned.includes('&'), true);
    assert.equal(cleaned.includes('"'), true);
    assert.equal(cleaned.includes('João'), true);
});

test('validações básicas de email, telefone e campos obrigatórios', () => {
    assert.equal(validation.validateEmail('teste@example.com'), true);
    assert.equal(validation.validateEmail('email-invalido'), false);
    assert.equal(validation.validatePhone('(11) 99999-9999'), true);
    assert.equal(validation.validatePhone('123'), false);
    assert.equal(validation.validateRequired({ nome: 'João', email: 'joao@email.com' }), null);
    assert.notEqual(validation.validateRequired({ nome: 'J', email: '' }), null);
});

test('detectFileType identifica formatos por magic bytes', () => {
    assert.equal(validation.detectFileType(pdfBuffer).mime, 'application/pdf');
    assert.equal(validation.detectFileType(jpegBuffer).mime, 'image/jpeg');
    assert.equal(validation.detectFileType(pngBuffer).mime, 'image/png');
    assert.equal(validation.detectFileType(zipBuffer).mime, 'application/zip');
    assert.equal(validation.detectFileType(Buffer.from('texto puro')), null);
});

test('upload de foto rejeita conteúdo que não é imagem', () => {
    const result = validation.validateFileUpload({
        size: pdfBuffer.length,
        mimetype: 'image/jpeg',
        originalname: 'foto.jpg',
        buffer: pdfBuffer
    }, 'photo');

    assert.equal(result.valid, false);
});

test('upload de foto aceita JPEG com extensão correta', () => {
    const result = validation.validateFileUpload({
        size: jpegBuffer.length,
        mimetype: 'image/jpeg',
        originalname: 'foto.JPG',
        buffer: jpegBuffer
    }, 'photo');

    assert.equal(result.valid, true);
});

test('upload de currículo aceita PDF e DOCX reais', () => {
    const pdf = validation.validateFileUpload({
        size: pdfBuffer.length,
        mimetype: 'application/pdf',
        originalname: 'curriculo.pdf',
        buffer: pdfBuffer
    }, 'resume');
    assert.equal(pdf.valid, true);

    const docx = validation.validateFileUpload({
        size: zipBuffer.length,
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        originalname: 'curriculo.docx',
        buffer: zipBuffer
    }, 'resume');
    assert.equal(docx.valid, true);
});

test('upload de currículo rejeita extensão e conteúdo divergentes', () => {
    const pdfAsDocx = validation.validateFileUpload({
        size: pdfBuffer.length,
        mimetype: 'application/pdf',
        originalname: 'curriculo.docx',
        buffer: pdfBuffer
    }, 'resume');
    assert.equal(pdfAsDocx.valid, false);

    const textAsPdf = validation.validateFileUpload({
        size: 12,
        mimetype: 'text/plain',
        originalname: 'curriculo.pdf',
        buffer: Buffer.from('texto puro')
    }, 'resume');
    assert.equal(textAsPdf.valid, false);
});

test('rate limiting bloqueia após o limite configurado', () => {
    const map = new Map();
    const ip = '127.0.0.1';

    for (let i = 0; i < config.RATE_LIMIT.MAX_REQUESTS; i++) {
        assert.equal(rateLimiting.checkRateLimit(ip, map).allowed, true);
    }

    const blocked = rateLimiting.checkRateLimit(ip, map);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfter > 0);
});
