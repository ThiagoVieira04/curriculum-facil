/**
 * Componente: EmpresaPage
 * Descrição: Página "Sobre a Empresa" - Papel e Sonhos Informática
 * 
 * GARANTIAS DE SEGURANÇA:
 * ✓ Zero renderização dinâmica
 * ✓ Zero chamadas a API
 * ✓ Zero process.env
 * ✓ Zero state/hooks
 * ✓ Estaticamente gerável (SSG)
 * ✓ Compatível com Vercel / Netlify
 */

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function EmpresaPage() {
  return (
    <>
      <Head>
        <title>Sobre - Papel e Sonhos Informática | Desde 28/09/2012</title>
        <meta name="description" content="Papel e Sonhos Informática - 12+ anos de excelência em serviços gráficos, digitais e soluções profissionais. Confiança, qualidade e inovação desde 2012." />
        <meta name="keywords" content="papel sonhos informática, gráfica, impressão, currículos, serviços personalizados" />
        <meta property="og:title" content="Papel e Sonhos Informática - Desde 2012" />
        <meta property="og:description" content="Serviços gráficos, digitais e soluções profissionais com 12+ anos de experiência" />
        <link rel="canonical" href="https://curriculum-facil.vercel.app/empresa" />
      </Head>

      <main>
        {/* Hero Section */}
        <section className="empresa-hero">
          <div className="container">
            <h1>Papel e Sonhos Informática</h1>
            <p className="founded">Serviços Gráficos • Digitais • Profissionais</p>
            <p className="years">Desde 28 de setembro de 2012 • 12+ anos de excelência</p>
          </div>
        </section>

        {/* Missão */}
        <section className="empresa-section">
          <div className="container">
            <h2 className="section-title">Nossa Missão</h2>
            <article className="intro-text">
              <p>
                A Papel e Sonhos Informática nasceu com um propósito simples mas poderoso: facilitar a vida das pessoas e empresas através de serviços de qualidade, confiança e inovação. Durante mais de uma década, nos tornamos referência na comunidade, oferecendo soluções que combinam o melhor da tradição com a modernidade digital.
              </p>
              <p>
                Cada cliente é especial para nós. Cada projeto realizado reforça nosso compromisso com a excelência e nos motiva a continuar inovando, sempre buscando atender às necessidades do mercado e superar expectativas.
              </p>
            </article>
          </div>
        </section>

        {/* Valores */}
        <section className="empresa-section bg-light">
          <div className="container">
            <h2 className="section-title">Nossos Valores</h2>
            <div className="values-grid">
              {VALORES.map((valor, idx) => (
                <div key={idx} className="value-card">
                  <div className="value-icon">{valor.icon}</div>
                  <h3>{valor.title}</h3>
                  <p>{valor.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="empresa-section">
          <div className="container">
            <h2 className="section-title">Nossa Trajetória</h2>
            <div className="timeline">
              {TIMELINE.map((item, idx) => (
                <div key={idx} className="timeline-item">
                  <div className="timeline-marker">{item.icon}</div>
                  <div className="timeline-content">
                    <h4>{item.title}</h4>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Serviços */}
        <section className="empresa-section">
          <div className="container">
            <h2 className="section-title">Nossos Serviços</h2>
            <div className="services-container">
              {SERVICOS.map((servico, idx) => (
                <div key={idx} className="service-card">
                  <h3>
                    <span className="service-icon">{servico.icon}</span>
                    {servico.title}
                  </h3>
                  <ul>
                    {servico.items.map((item, itemIdx) => (
                      <li key={itemIdx}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="empresa-section">
          <div className="container cta-section">
            <h2>Pronto para Começar?</h2>
            <p>Crie seu currículo profissional gratuitamente ou conheça nossos serviços</p>
            <Link href="/">
              <button className="cta-button">🚀 Criar Currículo Agora</button>
            </Link>
          </div>
        </section>
      </main>

      <style jsx>{`
        .empresa-hero {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 80px 20px;
          text-align: center;
        }

        .empresa-hero h1 {
          font-size: 2.5rem;
          margin-bottom: 10px;
          font-weight: bold;
        }

        .empresa-hero .founded {
          font-size: 1.1rem;
          opacity: 0.95;
          margin-bottom: 5px;
        }

        .empresa-hero .years {
          font-size: 0.95rem;
          opacity: 0.85;
        }

        .section-title {
          font-size: 2rem;
          color: #1e293b;
          margin-bottom: 40px;
          text-align: center;
          border-bottom: 3px solid #667eea;
          padding-bottom: 20px;
        }

        .empresa-section {
          padding: 60px 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .empresa-section.bg-light {
          background-color: #f8fafc;
        }

        .intro-text {
          max-width: 800px;
          margin: 0 auto;
          line-height: 1.8;
          color: #475569;
          font-size: 1.05rem;
          text-align: justify;
        }

        .intro-text p {
          margin-bottom: 20px;
        }

        .services-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 25px;
          margin-top: 40px;
        }

        .service-card {
          background: white;
          border-left: 5px solid #667eea;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .service-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
        }

        .service-card h3 {
          color: #667eea;
          font-size: 1.2rem;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .service-card ul {
          list-style: none;
          padding: 0;
        }

        .service-card li {
          color: #475569;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
          line-height: 1.6;
        }

        .service-card li:last-child {
          border-bottom: none;
        }

        .service-icon {
          font-size: 1.5rem;
        }

        .values-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px;
          margin-top: 40px;
        }

        .value-card {
          text-align: center;
          padding: 30px;
        }

        .value-icon {
          font-size: 3rem;
          margin-bottom: 15px;
        }

        .value-card h3 {
          color: #1e293b;
          margin-bottom: 10px;
          font-size: 1.2rem;
        }

        .value-card p {
          color: #64748b;
          line-height: 1.6;
        }

        .timeline {
          max-width: 600px;
          margin: 40px auto;
        }

        .timeline-item {
          display: flex;
          margin-bottom: 30px;
          gap: 20px;
        }

        .timeline-marker {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          background: #667eea;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 1.2rem;
        }

        .timeline-content {
          flex: 1;
        }

        .timeline-content h4 {
          color: #1e293b;
          margin-bottom: 5px;
        }

        .timeline-content p {
          color: #64748b;
          line-height: 1.6;
        }

        .cta-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          padding: 60px 20px;
          border-radius: 12px;
          margin: 60px 0;
        }

        .cta-section h2 {
          font-size: 2rem;
          margin-bottom: 20px;
        }

        .cta-section p {
          font-size: 1.1rem;
          margin-bottom: 30px;
          opacity: 0.95;
        }

        .cta-button {
          background: white;
          color: #667eea;
          padding: 15px 40px;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .cta-button:hover {
          transform: scale(1.05);
        }

        @media (max-width: 768px) {
          .empresa-hero h1 {
            font-size: 1.8rem;
          }

          .section-title {
            font-size: 1.5rem;
          }

          .services-container {
            grid-template-columns: 1fr;
          }

          .values-grid {
            grid-template-columns: 1fr;
          }

          .cta-section h2 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </>
  );
}

// ============================================
// DADOS ESTÁTICOS (Zero renderização dinâmica)
// ============================================

const VALORES = [
  {
    icon: '⭐',
    title: 'Qualidade',
    description: 'Cada detalhe importa. Garantimos excelência em tudo que fazemos.',
  },
  {
    icon: '🤝',
    title: 'Confiança',
    description: 'Somos referência de confiabilidade e honestidade na comunidade.',
  },
  {
    icon: '🚀',
    title: 'Inovação',
    description: 'Acompanhamos as tendências e evoluímos constantemente.',
  },
  {
    icon: '👥',
    title: 'Atendimento',
    description: 'Dedicação pessoal a cada cliente e projeto.',
  },
  {
    icon: '✨',
    title: 'Profissionalismo',
    description: 'Competência e responsabilidade em todas as atividades.',
  },
  {
    icon: '🎯',
    title: 'Acessibilidade',
    description: 'Soluções tecnológicas e serviços ao alcance de todos.',
  },
];

const TIMELINE = [
  {
    icon: '📍',
    title: 'Fundação - Setembro 2012',
    description: 'Papel e Sonhos Informática abre as portas como estúdio de serviços gráficos e digitais, focando em soluções práticas para a comunidade local.',
  },
  {
    icon: '🎯',
    title: 'Expansão de Serviços - 2015-2018',
    description: 'Ampliamos nosso portfólio com novos serviços: impressão digital, criação de currículos profissionais e soluções personalizadas.',
  },
  {
    icon: '💻',
    title: 'Transformação Digital - 2020-2023',
    description: 'Integração de tecnologias modernas, serviços de informática e desenvolvimento de soluções web para acompanhar a evolução digital.',
  },
  {
    icon: '🚀',
    title: 'Presença Online - 2025',
    description: 'Lançamento do Gerador de Currículos Online e expansão da presença digital, mantendo a excelência em atendimento.',
  },
];

const SERVICOS = [
  {
    icon: '🖨️',
    title: 'Impressão & Reprodução',
    items: [
      'Xerox e impressão digital',
      'Emissão de boletos',
      'Escaneamento de documentos',
      'Envio para WhatsApp e E-mail',
    ],
  },
  {
    icon: '📋',
    title: 'Documentação Oficial',
    items: [
      'Certidão negativa estadual',
      'Certidão negativa federal',
      'Certidão negativa eleitoral',
      'Declaração de Imposto de Renda',
    ],
  },
  {
    icon: '📄',
    title: 'Currículos & Fotos',
    items: [
      'Criação de currículos profissionais',
      'Fotos 3x4, 10x15, 13x18',
      'Fotos em tamanho folha inteira',
      'Gerador de currículos online',
    ],
  },
  {
    icon: '🏥',
    title: 'Documentos de Saúde',
    items: [
      'Caderneta de vacina nova',
      'Reforma de caderneta de vacina',
      'Reforma de bíblia',
      'Caderneta de seguro de vida',
    ],
  },
  {
    icon: '🎨',
    title: 'Produtos Personalizados',
    items: [
      'Canecas sublimadas',
      'Camisas sublimadas',
      'Azulejos sublimados',
      'Topos de bolo personalizados',
    ],
  },
  {
    icon: '✂️',
    title: 'Soluções Gráficas',
    items: [
      'Papelaria personalizada',
      'Adesivos personalizados',
      'Banners e cartazes',
      'Gravação de áudio para propaganda',
    ],
  },
  {
    icon: '🖥️',
    title: 'Tecnologia & Informática',
    items: [
      'Conserto de computadores',
      'Formatação de notebooks',
      'Desbloqueio de conta Google',
      'Transformação Rio Card em Bilhete Único',
    ],
  },
  {
    icon: '💿',
    title: 'Mídia & Acessórios',
    items: [
      'Músicas para pen drive',
      'Cabos: Tipo C, V8, HDMI, RJ45',
      'Cópias de mídia digital',
      'Gravação profissional',
    ],
  },
  {
    icon: '📊',
    title: 'Serviços Fiscais',
    items: [
      'Declaração de renda (Rio Card Mais)',
      'Abertura de MEI',
      'Declaração de MEI',
      'Consultoria fiscal',
    ],
  },
];

// Exportar como estática (Next.js SSG)
export async function getStaticProps() {
  return {
    props: {},
    revalidate: 86400, // Revalidar a cada 24h (ISR)
  };
}
