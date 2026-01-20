const express = require('express');
const router = express.Router();

// Página Sobre
router.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sobre o CurrículoFácil - Quem Somos</title>
            <meta name="description" content="Conheça a história do CurrículoFácil, nossa missão de ajudar pessoas a conseguirem melhores oportunidades de trabalho através de currículos profissionais.">
            <link rel="stylesheet" href="/css/style.css">
        </head>
        <body>
            <header>
                <nav>
                    <div class="container">
                        <h1><a href="/" style="text-decoration:none;color:inherit;">📄 CurrículoFácil</a></h1>
                        <div class="nav-links">
                            <a href="/">Início</a>
                            <a href="/sobre">Sobre</a>
                            <a href="/contato">Contato</a>
                        </div>
                    </div>
                </nav>
            </header>
            
            <main style="padding-top: 100px;">
                <div class="container" style="padding: 50px 20px;">
                    <h1>Sobre o CurrículoFácil</h1>
                    
                    <h2>Nossa Missão</h2>
                    <p>O CurrículoFácil foi criado com uma missão simples: democratizar o acesso a currículos profissionais de qualidade. Acreditamos que toda pessoa merece ter um currículo bem estruturado para conquistar melhores oportunidades no mercado de trabalho.</p>
                    
                    <h2>Nossa História</h2>
                    <p>Fundado em 2024 pela Papel e Sonhos Informática, o CurrículoFácil nasceu da necessidade observada no mercado brasileiro: muitas pessoas talentosas não conseguiam oportunidades simplesmente por não terem um currículo bem apresentado.</p>
                    
                    <h2>Como Funciona</h2>
                    <p>Nossa plataforma utiliza inteligência artificial para melhorar automaticamente o texto do seu currículo, transformando descrições simples em linguagem profissional. Oferecemos três modelos diferentes, todos otimizados para sistemas ATS (Applicant Tracking Systems) utilizados por empresas.</p>
                    
                    <h2>Compromisso com a Qualidade</h2>
                    <p>Todos os nossos templates foram desenvolvidos por especialistas em recursos humanos e são constantemente atualizados para atender às melhores práticas do mercado. Nosso serviço é 100% gratuito e sempre será.</p>
                    
                    <h2>Tecnologia</h2>
                    <p>Utilizamos as mais modernas tecnologias web para garantir uma experiência rápida e segura. Nossos currículos são gerados em PDF de alta qualidade, sem marca d'água, prontos para impressão ou envio digital.</p>
                    
                    <h2>Privacidade e Segurança</h2>
                    <p>Levamos sua privacidade a sério. Todos os dados são processados de forma segura e não são compartilhados com terceiros. Os currículos ficam disponíveis apenas temporariamente para download.</p>
                    
                    <h2>Contato</h2>
                    <p>Tem alguma dúvida ou sugestão? Entre em contato conosco através da nossa <a href="/contato">página de contato</a>.</p>
                    
                    <p><strong>&copy; 2026 CurrículoFácil - Todos os direitos reservados à Papel e Sonhos Informática</strong></p>
                    
                    <p><a href="/">← Voltar ao início</a></p>
                </div>
            </main>
        </body>
        </html>
    `);
});module.exports = router;
