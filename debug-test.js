// Script de debug para identificar problemas específicos
const fs = require('fs');
const path = require('path');

console.log('🔍 Iniciando diagnóstico...\n');

// 1. Verificar arquivos essenciais
const essentialFiles = [
    'server.js',
    'package.json',
    'vercel.json',
    'config.js',
    'utils.js',
    'sobre-route.js',
    'contato-route.js',
    'public/index.html',
    'public/js/main.js',
    'public/css/style.css'
];

console.log('📁 Verificando arquivos essenciais:');
essentialFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, file));
    console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// 2. Verificar dependências
console.log('\n📦 Verificando dependências:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});
    
    console.log(`✅ Dependencies: ${dependencies.length} (${dependencies.join(', ')})`);
    console.log(`✅ DevDependencies: ${devDependencies.length} (${devDependencies.join(', ')})`);
} catch (error) {
    console.log('❌ Erro ao ler package.json:', error.message);
}

// 3. Testar imports dos módulos principais
console.log('\n🔧 Testando imports:');
try {
    const config = require('./config');
    console.log('✅ config.js carregado');
    console.log(`   PORT: ${config.PORT}`);
    console.log(`   Templates: ${config.TEMPLATES?.length || 0}`);
} catch (error) {
    console.log('❌ Erro ao carregar config.js:', error.message);
}

try {
    const utils = require('./utils');
    console.log('✅ utils.js carregado');
    console.log(`   Funções: ${Object.keys(utils).join(', ')}`);
} catch (error) {
    console.log('❌ Erro ao carregar utils.js:', error.message);
}

try {
    const sobreRoute = require('./sobre-route');
    console.log('✅ sobre-route.js carregado');
} catch (error) {
    console.log('❌ Erro ao carregar sobre-route.js:', error.message);
}

try {
    const contatoRoute = require('./contato-route');
    console.log('✅ contato-route.js carregado');
} catch (error) {
    console.log('❌ Erro ao carregar contato-route.js:', error.message);
}

// 4. Testar server.js sem iniciar
console.log('\n🖥️ Testando server.js:');
try {
    // Definir variável para evitar auto-start
    process.env.AUTO_START = 'false';
    const app = require('./server');
    console.log('✅ server.js carregado sem erros');
    
    // Verificar se as rotas estão definidas
    const routes = [];
    app._router?.stack?.forEach(layer => {
        if (layer.route) {
            routes.push(`${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);
        }
    });
    console.log(`   Rotas encontradas: ${routes.length}`);
    routes.forEach(route => console.log(`   - ${route}`));
    
} catch (error) {
    console.log('❌ Erro ao carregar server.js:', error.message);
    console.log('   Stack:', error.stack);
}

// 5. Verificar estrutura do HTML
console.log('\n🌐 Verificando HTML:');
try {
    const htmlContent = fs.readFileSync('public/index.html', 'utf8');
    const hasForm = htmlContent.includes('cv-form');
    const hasJS = htmlContent.includes('main.js');
    const hasCSS = htmlContent.includes('style.css');
    
    console.log(`✅ HTML carregado (${htmlContent.length} chars)`);
    console.log(`${hasForm ? '✅' : '❌'} Formulário encontrado`);
    console.log(`${hasJS ? '✅' : '❌'} JavaScript incluído`);
    console.log(`${hasCSS ? '✅' : '❌'} CSS incluído`);
} catch (error) {
    console.log('❌ Erro ao ler HTML:', error.message);
}

// 6. Verificar JavaScript
console.log('\n📜 Verificando JavaScript:');
try {
    const jsContent = fs.readFileSync('public/js/main.js', 'utf8');
    const hasFormSubmit = jsContent.includes('handleFormSubmit');
    const hasPhotoUpload = jsContent.includes('handlePhotoUpload');
    const hasATSAnalysis = jsContent.includes('handleATSAnalyzeFile');
    
    console.log(`✅ JavaScript carregado (${jsContent.length} chars)`);
    console.log(`${hasFormSubmit ? '✅' : '❌'} Função de submit encontrada`);
    console.log(`${hasPhotoUpload ? '✅' : '❌'} Upload de foto encontrado`);
    console.log(`${hasATSAnalysis ? '✅' : '❌'} Análise ATS encontrada`);
} catch (error) {
    console.log('❌ Erro ao ler JavaScript:', error.message);
}

console.log('\n🎯 Diagnóstico concluído!');