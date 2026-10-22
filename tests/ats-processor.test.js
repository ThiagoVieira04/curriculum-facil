process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');

const atsProcessor = require('../ats-processor');

async function createDocxBuffer() {
    const zip = new JSZip();
    zip.file(
        '[Content_Types].xml',
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    );
    zip.folder('_rels').file(
        '.rels',
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
    );
    zip.folder('word').file(
        'document.xml',
        '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>João Silva - Desenvolvedor</w:t></w:r></w:p></w:body></w:document>'
    );
    return zip.generateAsync({ type: 'nodebuffer' });
}

test('normaliza texto removendo controles e espaços repetidos', () => {
    const dirty = 'João  \t\t  Silva\n\n\nCargo:   Desenvolvedor\r\n';
    const cleaned = atsProcessor.normalizeTextForATS(dirty);

    assert.equal(cleaned.includes('\t'), false);
    assert.equal(cleaned.includes('\r'), false);
    assert.equal(cleaned, 'João Silva\n\nCargo: Desenvolvedor');
});

test('buffer vazio retorna erro de validação', async () => {
    const result = await atsProcessor.processResume(Buffer.alloc(0), 'application/pdf');

    assert.equal(result.details.error, 'Buffer vazio');
    assert.equal(result.text, '');
    assert.equal(result.confidence, 0);
});

test('conteúdo não reconhecido não inventa confiança de extração', async () => {
    const result = await atsProcessor.processResume(Buffer.from('conteudo desconhecido'), 'application/octet-stream');

    assert.equal(result.text, '');
    assert.equal(result.details.textExtractedSuccessfully, false);
    assert.equal(result.confidence, 0);
});

test('DOCX válido extrai texto com a versão de xmldom em uso', async () => {
    const buffer = await createDocxBuffer();
    const result = await atsProcessor.processResume(
        buffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    assert.match(result.text, /João Silva - Desenvolvedor/);
    assert.equal(result.details.textExtractedSuccessfully, true);
    assert.ok(result.confidence > 0);
});

test('DOCX inválido falha com erro explícito', async () => {
    await assert.rejects(
        atsProcessor.extractTextFromDocx(Buffer.from([0x50, 0x4B, 0x03, 0x04])),
        /DOCX Parse Error/
    );
});
