const express = require('express');
const router = express.Router();

// Página de Dicas (conteúdo adicional)
router.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dicas para Currículo Perfeito - CurrículoFácil</title>
            <meta name="description" content="Dicas essenciais para criar um currículo perfeito e conseguir a vaga dos seus sonhos. Guia completo com exemplos práticos.">
            <link rel="stylesheet" href="/css/style.css">
        </head>
        <body>
            <header>
                <nav>
                    <div class="container">
                        <h1><a href="/" style="text-decoration:none;color:inherit;">📄 CurrículoFácil</a></h1>
                        <div class="nav-links">
                            <a href="/">Início</a>
                            <a href="/dicas">Dicas</a>
                            <a href="/sobre">Sobre</a>
                            <a href="/contato">Contato</a>
                        </div>
                    </div>
                </nav>
            </header>
            
            <main style="padding-top: 100px;">
                <div class="container" style="padding: 50px 20px;">
                    <h1>Dicas para um Currículo Perfeito</h1>
                    
                    <h2>1. Informações Pessoais</h2>
                    <p>Inclua apenas informações essenciais: nome completo, telefone, email profissional e cidade. Evite informações pessoais como estado civil, idade ou foto (a menos que seja exigido).</p>
                    
                    <h2>2. Objetivo Profissional</h2>
                    <p>Seja específico sobre o cargo que deseja. Um objetivo claro mostra foco e direcionamento profissional. Exemplo: "Analista de Marketing Digital com foco em campanhas de performance".</p>
                    
                    <h2>3. Experiência Profissional</h2>
                    <p>Liste em ordem cronológica reversa (mais recente primeiro). Para cada experiência, inclua:</p>
                    <ul>
                        <li>Nome da empresa e período</li>
                        <li>Cargo ocupado</li>
                        <li>Principais responsabilidades e conquistas</li>
                        <li>Use números sempre que possível (ex: "Aumentei as vendas em 30%")</li>
                    </ul>
                    
                    <h2>4. Formação Acadêmica</h2>
                    <p>Inclua curso, instituição e ano de conclusão. Se você tem ensino superior, não precisa mencionar o ensino médio. Adicione cursos relevantes e certificações.</p>
                    
                    <h2>5. Habilidades</h2>
                    <p>Divida em habilidades técnicas (softwares, ferramentas) e comportamentais (liderança, comunicação). Seja honesto sobre seu nível de conhecimento.</p>
                    
                    <h2>6. Formatação</h2>
                    <p>Mantenha um design limpo e profissional. Use fonte legível (Arial, Calibri), tamanho 11-12. Evite cores muito chamativas ou elementos gráficos excessivos.</p>
                    
                    <h2>7. Tamanho Ideal</h2>
                    <p>Para profissionais com até 10 anos de experiência: 1 página. Para executivos seniores: máximo 2 páginas. Seja conciso e relevante.</p>
                    
                    <h2>8. Palavras-chave</h2>
                    <p>Inclua palavras-chave da área e do cargo desejado. Isso ajuda seu currículo a passar pelos sistemas ATS (Applicant Tracking Systems) das empresas.</p>
                    
                    <h2>9. Revisão</h2>
                    <p>Revise cuidadosamente para evitar erros de português. Peça para alguém de confiança revisar também. Erros de ortografia podem eliminar sua candidatura.</p>
                    
                    <h2>10. Personalização</h2>
                    <p>Adapte seu currículo para cada vaga. Destaque experiências e habilidades mais relevantes para a posição específica.</p>
                    
                    <div style="background: #f0f9ff; padding: 30px; border-radius: 10px; margin: 40px 0; border-left: 4px solid #0ea5e9;">
                        <h3>💡 Dica Extra</h3>
                        <p>Use o CurrículoFácil para aplicar essas dicas automaticamente! Nossa IA otimiza seu texto seguindo as melhores práticas do mercado.</p>
                        <a href="/" style="background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px;">Criar Meu Currículo</a>
                    </div>
                    
                    <p><strong>&copy; 2026 CurrículoFácil - Todos os direitos reservados à Papel e Sonhos Informática</strong></p>
                    
                    <p><a href="/">← Voltar ao início</a></p>
                </div>
            </main>
        </body>
        </html>
    `);
});module.exports = router;
