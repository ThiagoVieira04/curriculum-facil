process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const app = require('../api/index.js');

let server;
let baseUrl;

function validForm() {
    const form = new FormData();
    form.append('nome', 'Maria & João "Silva"');
    form.append('cargo', 'Desenvolvedora');
    form.append('email', 'maria@example.com');
    form.append('telefone', '(11) 99999-9999');
    form.append('cidade', 'São Paulo');
    form.append('experiencia', 'Desenvolvi sistemas e liderei equipes.');
    form.append('formacao', 'Ciência da Computação');
    form.append('habilidades', 'Node.js, JavaScript');
    return form;
}

test.before(async () => {
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    if (server) {
        await new Promise(resolve => server.close(resolve));
    }
});

test('health checks respondem 200', async () => {
    for (const path of ['/api/health', '/api/status']) {
        const response = await fetch(`${baseUrl}${path}`);
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.status, 'running');
    }
});

test('páginas estáticas principais respondem 200', async () => {
    for (const path of ['/', '/sobre', '/privacidade', '/termos']) {
        const response = await fetch(`${baseUrl}${path}`);
        assert.equal(response.status, 200, `GET ${path}`);
        const html = await response.text();
        assert.match(html, /<html/i);
    }
});

test('rota de API inexistente responde JSON 404, não HTML', async () => {
    const response = await fetch(`${baseUrl}/api/rota-inexistente`);
    assert.equal(response.status, 404);
    assert.match(response.headers.get('content-type') || '', /application\/json/);
});

test('gera currículo e disponibiliza link compartilhável', async () => {
    const response = await fetch(`${baseUrl}/api/generate-cv`, {
        method: 'POST',
        body: validForm()
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(typeof body.id, 'string');
    assert.match(body.html, /Maria/);
    assert.equal(body.html.includes('<script>alert'), false);

    const shared = await fetch(`${baseUrl}/cv/${body.id}`);
    assert.equal(shared.status, 200);
    assert.equal(shared.headers.get('cache-control'), 'no-store');
    const html = await shared.text();
    assert.match(html, /Maria/);
});

test('rejeita email inválido', async () => {
    const form = validForm();
    form.set('email', 'email-invalido');

    const response = await fetch(`${baseUrl}/api/generate-cv`, {
        method: 'POST',
        body: form
    });

    assert.equal(response.status, 400);
});

test('ignora foto cujo conteúdo não é imagem e informa warning', async () => {
    const form = validForm();
    const fakePhoto = new Blob([Buffer.from('%PDF-1.4\nnao-e-foto')], { type: 'image/jpeg' });
    form.append('photo', fakePhoto, 'foto.jpg');

    const response = await fetch(`${baseUrl}/api/generate-cv`, {
        method: 'POST',
        body: form
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(Array.isArray(body.warnings));
    assert.ok(body.warnings.length > 0);
});

test('análise ATS de dados exige conteúdo mínimo', async () => {
    const response = await fetch(`${baseUrl}/api/ats-analyze-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { nome: 'A' } })
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error, 'Dados insuficientes');
});

test('análise ATS de dados retorna score para conteúdo válido', async () => {
    const experiencia = 'Desenvolvi sistemas, liderei equipes e implementei melhorias de performance. '.repeat(5);
    const response = await fetch(`${baseUrl}/api/ats-analyze-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            data: {
                nome: 'Maria Silva',
                cargo: 'Desenvolvedora',
                email: 'maria@example.com',
                telefone: '(11) 99999-9999',
                objetivo: 'Atuar como desenvolvedora de software.',
                experiencia,
                formacao: 'Ciência da Computação',
                habilidades: 'Node.js, JavaScript'
            }
        })
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(typeof body.score, 'number');
    assert.ok(body.score >= 50, `score inesperado: ${body.score}`);
    assert.ok(body.strengths.some(item => /contato/i.test(item)));
    assert.ok(Array.isArray(body.improvements));
    assert.ok(Array.isArray(body.suggestions));
});

test('rejeita arquivo de currículo com extensão não suportada', async () => {
    const form = new FormData();
    form.append('resume', new Blob(['texto'], { type: 'text/plain' }), 'curriculo.txt');

    const response = await fetch(`${baseUrl}/api/ats-analyze-file`, {
        method: 'POST',
        body: form
    });

    assert.equal(response.status, 415);
});

test('rejeita PDF disfarçado de DOCX', async () => {
    const form = new FormData();
    form.append(
        'resume',
        new Blob([Buffer.from('%PDF-1.4\nconteudo')], { type: 'application/pdf' }),
        'curriculo.docx'
    );

    const response = await fetch(`${baseUrl}/api/ats-analyze-file`, {
        method: 'POST',
        body: form
    });

    assert.equal(response.status, 415);
});
