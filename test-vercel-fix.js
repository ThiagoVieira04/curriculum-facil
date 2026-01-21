#!/usr/bin/env node

/**
 * Script de Teste - Validar Correções do Erro 500
 * 
 * Uso: node test-vercel-fix.js
 */

const http = require('http');
const app = require('./server');

const PORT = process.env.PORT || 3000;
let server;

// Cores para output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({\n                        status: res.statusCode,\n                        headers: res.headers,\n                        body: data ? JSON.parse(data) : data\n                    });\n                } catch (e) {\n                    resolve({\n                        status: res.statusCode,\n                        headers: res.headers,\n                        body: data\n                    });\n                }\n            });\n        });\n\n        req.on('error', reject);\n        req.on('timeout', () => {\n            req.destroy();\n            reject(new Error('Request timeout'));\n        });\n\n        req.end();\n    });\n}\n\nasync function runTests() {\n    log('\\n🧪 INICIANDO TESTES DE VALIDAÇÃO\\n', 'blue');\n\n    // Iniciar servidor\n    log('📍 Iniciando servidor na porta ' + PORT + '...', 'yellow');\n    server = app.listen(PORT, async () => {\n        log('✅ Servidor iniciado com sucesso\\n', 'green');\n\n        const tests = [\n            {\n                name: 'Health Check',\n                path: '/api/health',\n                expectedStatus: 200\n            },\n            {\n                name: 'Status',\n                path: '/api/status',\n                expectedStatus: 200\n            },\n            {\n                name: 'Debug Env',\n                path: '/api/debug-env',\n                expectedStatus: 200\n            },\n            {\n                name: 'Página Sobre',\n                path: '/sobre',\n                expectedStatus: 200\n            },\n            {\n                name: 'Página Contato',\n                path: '/contato',\n                expectedStatus: 200\n            },\n            {\n                name: 'Página Dicas',\n                path: '/dicas',\n                expectedStatus: 200\n            },\n            {\n                name: 'Página Privacidade',\n                path: '/privacidade',\n                expectedStatus: 200\n            },\n            {\n                name: 'Página Termos',\n                path: '/termos',\n                expectedStatus: 200\n            }\n        ];\n\n        let passed = 0;\n        let failed = 0;\n\n        for (const test of tests) {\n            try {\n                log(`\\n🔍 Testando: ${test.name}`, 'blue');\n                log(`   Path: ${test.path}`);\n\n                const response = await makeRequest(test.path);\n\n                if (response.status === test.expectedStatus) {\n                    log(`   ✅ Status: ${response.status} (esperado: ${test.expectedStatus})`, 'green');\n                    if (response.body && typeof response.body === 'object') {\n                        log(`   📦 Response: ${JSON.stringify(response.body).substring(0, 100)}...`);\n                    }\n                    passed++;\n                } else {\n                    log(`   ❌ Status: ${response.status} (esperado: ${test.expectedStatus})`, 'red');\n                    failed++;\n                }\n            } catch (error) {\n                log(`   ❌ Erro: ${error.message}`, 'red');\n                failed++;\n            }\n        }\n\n        // Resumo\n        log('\\n' + '='.repeat(50), 'blue');\n        log('📊 RESUMO DOS TESTES', 'blue');\n        log('='.repeat(50), 'blue');\n        log(`✅ Passou: ${passed}/${tests.length}`, 'green');\n        log(`❌ Falhou: ${failed}/${tests.length}`, failed > 0 ? 'red' : 'green');\n        log('='.repeat(50), 'blue');\n\n        if (failed === 0) {\n            log('\\n🎉 TODOS OS TESTES PASSARAM!\\n', 'green');\n            log('Você pode fazer deploy com segurança.\\n', 'green');\n        } else {\n            log('\\n⚠️  ALGUNS TESTES FALHARAM!\\n', 'red');\n            log('Verifique os erros acima antes de fazer deploy.\\n', 'red');\n        }\n\n        // Fechar servidor\n        server.close(() => {\n            log('🛑 Servidor encerrado\\n', 'yellow');\n            process.exit(failed > 0 ? 1 : 0);\n        });\n    });\n}\n\n// Executar testes\nrunTests().catch(error => {\n    log(`\\n❌ Erro ao executar testes: ${error.message}\\n`, 'red');\n    if (server) server.close();\n    process.exit(1);\n});\n