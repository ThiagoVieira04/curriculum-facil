// Entry point para Vercel Serverless Functions
const app = require('../server');

// Em produção (Vercel) apenas exporta o app; localmente (npm start / npm run dev)
// inicia o servidor HTTP de verdade.
if (require.main === module) {
    app.startServer();
}

module.exports = app;
