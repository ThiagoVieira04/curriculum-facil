const express = require('express');
const router = express.Router();

// Página de Contato
router.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Contato - CurrículoFácil</title>
            <meta name="description" content="Entre em contato com a equipe do CurrículoFácil. Tire suas dúvidas, envie sugestões ou reporte problemas.">
            <link rel="stylesheet" href="/css/style.css">
            <style>
                .contact-hero {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 80px 0 40px;
                    text-align: center;
                    margin-bottom: 40px;
                }
                .contact-grid {
                    display: grid;
                    grid-template-columns: 1fr 1.5fr;
                    gap: 40px;
                    margin-bottom: 60px;
                }
                .info-card {
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                    border: 1px solid #e2e8f0;
                    margin-bottom: 20px;
                    transition: transform 0.3s;
                }
                .info-card:hover {
                    transform: translateY(-5px);
                }
                .info-icon {
                    font-size: 24px;
                    margin-bottom: 15px;
                    background: #f0f9ff;
                    width: 50px;
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    color: #2563eb;
                }
                .info-title {
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 10px;
                    font-size: 1.1rem;
                }
                
                @media (max-width: 768px) {
                    .contact-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
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
            
            <main style="padding-top: 60px;">
                <div class="contact-hero">
                    <div class="container">
                        <h2>Fale Conosco</h2>
                        <p style="opacity: 0.9; font-size: 1.1rem;">Estamos aqui para ajudar você a conquistar sua próxima vaga</p>
                    </div>
                </div>

                <div class="container">
                    <div class="contact-grid">
                        <!-- Lado Esquerdo: Informações -->
                        <div class="contact-info">
                            <div class="info-card">
                                <div class="info-icon">📧</div>
                                <div class="info-title">Email</div>
                                <p style="color: #64748b; margin-bottom: 5px;">Dúvidas e Suporte:</p>
                                <a href="mailto:tsmv04@hotmail.com" style="color: #2563eb; text-decoration: none; font-weight: 500;">tsmv04@hotmail.com</a>
                            </div>
                            
                            <div class="info-card">
                                <div class="info-icon">🏢</div>
                                <div class="info-title">Empresa</div>
                                <p style="color: #1e293b; font-weight: 500;">Papel e Sonhos Informática</p>
                                <p style="color: #64748b; font-size: 0.9rem;">Soluções digitais para carreira</p>
                            </div>

                            <div class="info-card">
                                <div class="info-icon">⏰</div>
                                <div class="info-title">Atendimento</div>
                                <p style="color: #64748b;">Segunda a Sexta: 9h às 18h</p>
                                <p style="color: #64748b;">Sábados: 9h às 12h</p>
                            </div>
                        </div>

                        <!-- Lado Direito: Formulário -->
                        <div class="contact-form">
                            <div class="form-container" style="margin: 0; box-shadow: none; border: 1px solid #e2e8f0;">
                                <h3 style="margin-bottom: 20px; color: #1e293b;">Envie uma Mensagem</h3>
                                <form action="mailto:tsmv04@hotmail.com" method="post" enctype="text/plain">
                                    <div class="form-group">
                                        <label for="name">Nome Completo</label>
                                        <input type="text" id="name" name="name" placeholder="Seu nome" required>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="email">Email</label>
                                        <input type="email" id="email" name="email" placeholder="seu@email.com" required>
                                    </div>

                                    <div class="form-group">
                                        <label for="subject">Assunto</label>
                                        <select id="subject" name="subject">
                                            <option value="duvida">Tenho uma dúvida</option>
                                            <option value="sugestao">Sugestão de melhoria</option>
                                            <option value="bug">Reportar um problema</option>
                                            <option value="parceria">Parceria</option>
                                            <option value="outro">Outro</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="message">Mensagem</label>
                                        <textarea id="message" name="message" placeholder="Como podemos ajudar?" required></textarea>
                                    </div>

                                    <button type="submit" class="cta-button" style="width: 100%; border-radius: 8px;">Enviar Mensagem</button>
                                </form>
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                         <p style="color: #94a3b8;">&copy; 2026 CurrículoFácil - Papel e Sonhos Informática</p>
                         <p><a href="/" style="color: #2563eb; text-decoration: none; font-size: 0.9rem;">← Voltar ao início</a></p>
                    </div>
                </div>
            </main>
        </body>
        </html>
    `);
});