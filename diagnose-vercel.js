/**
 * Diagnóstico Vercel - Verificar configuração serverless
 */

console.log('=== DIAGNÓSTICO VERCEL ===\n');

// 1. Verificar ambiente
console.log('1. AMBIENTE');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  VERCEL:', !!process.env.VERCEL);
console.log('  NODE_VERSION:', process.version);
console.log('');

// 2. Verificar imports
console.log('2. VERIFICANDO IMPORTS');
try {
    const config = require('./config');
    console.log('  ✅ config.js carregado');
} catch (e) {
    console.log('  ❌ ERRO em config.js:', e.message);
}

try {
    const utils = require('./utils');
    console.log('  ✅ utils.js carregado');
} catch (e) {
    console.log('  ❌ ERRO em utils.js:', e.message);
}

try {
    const express = require('express');
    console.log('  ✅ express carregado');
} catch (e) {
    console.log('  ❌ ERRO em express:', e.message);
}

try {
    const multer = require('multer');
    console.log('  ✅ multer carregado');
} catch (e) {
    console.log('  ❌ ERRO em multer:', e.message);
}

// 3. Verificar server.js
console.log('\n3. VERIFICANDO SERVER.JS');
try {
    const app = require('./server');
    console.log('  ✅ server.js carregado');
    console.log('  Tipo de app:', typeof app);
    console.log('  App é função?', typeof app === 'function');
    console.log('  App tem use?', typeof app.use === 'function');
    console.log('  App tem get?', typeof app.get === 'function');
} catch (e) {
    console.log('  ❌ ERRO em server.js:', e.message);
    console.log('  Stack:', e.stack);
}

// 4. Verificar API
console.log('\n4. VERIFICANDO API/INDEX.JS');
try {
    const apiApp = require('./api/index');
    console.log('  ✅ api/index.js carregado');
    console.log('  Tipo de apiApp:', typeof apiApp);
} catch (e) {
    console.log('  ❌ ERRO em api/index.js:', e.message);
}

console.log('\n=== FIM DO DIAGNÓSTICO ===\n');
