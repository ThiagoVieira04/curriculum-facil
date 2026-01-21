try {
    const app = require('./server');
    module.exports = app;
} catch (error) {
    console.error('Erro ao carregar server.js:', error);
    throw error;
}
