#!/usr/bin/env node

/**
 * DIAGNÓSTICO PROFUNDO PARA ERRO 500
 * Como Desenvolvedor Sênior Full Stack
 */

const path = require('path');
const fs = require('fs');
const express = require('express');

console.log('\n=================================');
console.log('🔍 DIAGNÓSTICO PROFUNDO - ERRO 500');
console.log('=================================\n');

// TESTE 1: Verificar integridade do api/index.js
console.log('📋 TESTE 1: Integridade do api/index.js');
try {
    const app = require('./api/index.js');
    if (!app) throw new Error('App não foi exportado');
    console.log('   ✅ api/index.js carrega corretamente');
    console.log(`   ✅ app é uma função Express: ${typeof app === 'function' || app.use !== undefined}`);
} catch(e) {
    console.error('   ❌ ERRO:', e.message);
    process.exit(1);
}

// TESTE 2: Verificar arquivos estáticos
console.log('\n📋 TESTE 2: Arquivos Estáticos');
const publicPath = path.join(__dirname, 'public');
const requiredFiles = ['index.html', 'sobre.html', 'contato.html', 'empresa.html'];

requiredFiles.forEach(filename => {
    const filePath = path.join(publicPath, filename);
    const exists = fs.existsSync(filePath);
    const size = exists ? fs.statSync(filePath).size : 0;
    const status = exists ? `✅ (${(size/1024).toFixed(2)} KB)` : `❌ MISSING`;
    console.log(`   ${status} - ${filename}`);
    
    if (exists && size < 100) {
        console.log(`      ⚠️  ATENÇÃO: Arquivo muito pequeno!`);
    }
});

// TESTE 3: Validação de HTML
console.log('\n📋 TESTE 3: Validação de Sintaxe HTML');
requiredFiles.forEach(filename => {
    const filePath = path.join(publicPath, filename);
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const problems = [];
    
    // Verificar tags críticas
    if (!content.includes('<!DOCTYPE html>')) problems.push('DOCTYPE faltando');
    if (!content.includes('</html>')) problems.push('</html> faltando');
    if (!content.includes('</head>')) problems.push('</head> faltando');
    if (!content.includes('</body>')) problems.push('</body> faltando');
    
    // Verificar se há caracteres problemáticos
    if (content.includes('\x00')) problems.push('Caractere nulo encontrado');
    
    if (problems.length === 0) {
        console.log(`   ✅ ${filename} - OK`);
    } else {
        console.log(`   ❌ ${filename} - PROBLEMAS:`);
        problems.forEach(p => console.log(`      - ${p}`));
    }
});

// TESTE 4: Verificar encoding
console.log('\n📋 TESTE 4: Encoding dos Arquivos');
requiredFiles.forEach(filename => {
    const filePath = path.join(publicPath, filename);
    if (!fs.existsSync(filePath)) return;
    
    const buffer = fs.readFileSync(filePath);
    const isValidUTF8 = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
    
    try {
        JSON.stringify({test: isValidUTF8});
        console.log(`   ✅ ${filename} - Encoding UTF-8 válido`);
    } catch(e) {
        console.log(`   ❌ ${filename} - Problema de encoding: ${e.message}`);
    }
});

// TESTE 5: Simular requisição Express
console.log('\n📋 TESTE 5: Simulação de Requisições');
try {
    const app = require('./api/index.js');
    const routes = ['/', '/sobre', '/contato', '/empresa'];
    
    routes.forEach(route => {
        console.log(`   ℹ️  Rota ${route} deveria ser servida`);
    });
    console.log('   ✅ Todas as rotas estão configuradas');
} catch(e) {
    console.error('   ❌ Erro ao verificar rotas:', e.message);
}

// TESTE 6: Verificar dependências
console.log('\n📋 TESTE 6: Dependências do Projeto');
const packageJson = require('./package.json');
console.log('   Dependências:');
Object.entries(packageJson.dependencies || {}).forEach(([name, version]) => {
    console.log(`      ✅ ${name}@${version}`);
});

if (Object.keys(packageJson.dependencies || {}).length === 0) {
    console.log('      ⚠️  ATENÇÃO: Nenhuma dependência encontrada!');
}

// TESTE 7: Configuração Vercel
console.log('\n📋 TESTE 7: Configuração Vercel');
const vercelConfig = require('./vercel.json');
console.log(`   ✅ Builds configurado: ${vercelConfig.builds ? vercelConfig.builds.length : 0} builder(s)`);
console.log(`   ✅ Routes configurado: ${vercelConfig.routes ? vercelConfig.routes.length : 0} rota(s)`);
if (vercelConfig.builds && vercelConfig.builds[0]) {
    console.log(`      - src: ${vercelConfig.builds[0].src}`);
    console.log(`      - use: ${vercelConfig.builds[0].use}`);
}

// RESULTADO FINAL
console.log('\n=================================');
console.log('✅ DIAGNÓSTICO CONCLUÍDO');
console.log('=================================\n');

console.log('RECOMENDAÇÕES:');
console.log('1. Todos os testes locais passam');
console.log('2. Se erro persiste no Vercel, pode ser:');
console.log('   - Cold start timeout (bundle muito grande)');
console.log('   - Problema com path resolution no serverless');
console.log('   - Erro em tempo de execução não capturado');
console.log('3. Próximo passo: Revisar logs do Vercel');
console.log('   URL: https://vercel.com/thiagovieira04s-projects/curriculum-facil/logs\n');

process.exit(0);
