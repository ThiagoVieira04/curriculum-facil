// Entry point para Vercel Serverless
// Otimizado para evitar crashes

const express = require('express');
const path = require('path');
const fs = require('fs');

// Criar app Express simples
const app = express();

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', true);

// Caminho para arquivos públicos - RESOLVIDO EXPLICITAMENTE
const publicPath = path.join(__dirname, '..', 'public');

// SECURITY: Validar que publicPath existe e é acessível
if (!fs.existsSync(publicPath)) {
    const errorMsg = `❌ ERRO CRÍTICO: publicPath não existe: ${publicPath}`;
    console.error(errorMsg);
    // Não fazer throw para não quebrar o servidor
}

// Servir arquivos estáticos
app.use(express.static(publicPath, {
    maxAge: '1d',
    etag: false
}));

// Health check simples
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Função auxiliar para servir arquivo com segurança
function serveFile(res, filename) {
    try {
        const filePath = path.join(publicPath, filename);
        
        // SECURITY: Verificar que o caminho está dentro de publicPath
        const resolvedPath = path.resolve(filePath);
        const resolvedPublic = path.resolve(publicPath);
        
        if (!resolvedPath.startsWith(resolvedPublic)) {
            return res.status(403).send('Acesso negado');
        }
        
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath, { maxAge: '1h' });
        }
        
        // Fallback para index.html se arquivo não existir
        const indexPath = path.join(publicPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            return res.sendFile(indexPath, { maxAge: '1h' });
        }
        
        return res.status(404).send('Página não encontrada');
    } catch (error) {
        console.error(`Erro ao servir arquivo ${filename}:`, error.message);
        return res.status(500).json({ error: 'Erro ao servir arquivo' });
    }
}

// Rotas específicas
app.get('/', (req, res) => serveFile(res, 'index.html'));
app.get('/sobre', (req, res) => serveFile(res, 'sobre.html'));
app.get('/contato', (req, res) => serveFile(res, 'contato.html'));
app.get('/empresa', (req, res) => serveFile(res, 'empresa.html'));

// Catch-all para SPA - redireciona para home
app.use((req, res) => {
    serveFile(res, 'index.html');
});

// GLOBAL ERROR HANDLER - CRÍTICO PARA VERCEL
app.use((err, req, res, next) => {
    console.error('❌ Erro não capturado:', err.message);
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Exportar para Vercel
module.exports = app;
