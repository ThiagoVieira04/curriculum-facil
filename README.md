# CurrículoFácil - Gerador Automático de Currículos

Aplicação web gratuita para criar currículos profissionais, com preview, download em PDF e análise de compatibilidade com sistemas ATS.

## Funcionalidades

- Formulário com preview em tempo real
- 5 modelos: Simples, Moderno, Executivo, Criativo e Elegante
- Upload opcional de foto (JPG/PNG), com redimensionamento e recorte
- Download do PDF gerado no navegador com `html2pdf.js` (sem marca d'água)
- Link compartilhável do currículo (`/cv/:id`)
- Análise ATS por dados preenchidos ou por upload de PDF/DOCX/imagem
- Extração de PDF (`pdf-parse`), DOCX (`mammoth`) e OCR (`tesseract.js`)
- Melhoria de texto determinística, sem dependência de API de IA
- Layout responsivo, páginas de privacidade/termos e anúncios AdSense

## Stack

- **Frontend:** HTML5, CSS3 e JavaScript vanilla
- **Backend:** Node.js + Express
- **PDF:** gerado no cliente com `html2pdf.js`
- **Imagens:** `sharp`
- **Deploy:** Vercel (serverless) ou qualquer host Node.js

## Requisitos

- Node.js >= 20.9
- npm

## Instalação

```bash
npm install
cp .env.example .env
npm run dev
```

Acesse `http://localhost:3000`.

Para executar em modo de produção local:

```bash
npm start
```

## Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta do servidor local |
| `NODE_ENV` | `development` | Ambiente de execução |
| `RATE_LIMIT_PER_HOUR` | `50` | Limite de escritas na API por IP/hora |
| `ALLOWED_ORIGINS` | — | Origens CORS extras, separadas por vírgula |
| `DEBUG_TOKEN` | — | Token para acessar `/api/debug-env` em produção |

Não há chave de IA configurada ou necessária. O projeto não usa a API da Anthropic. Os IDs de AdSense/Google Analytics são definidos diretamente no frontend.

## API

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/health` e `/api/status` | Health check |
| POST | `/api/generate-cv` | Gera currículo (`multipart/form-data`) |
| POST | `/api/ats-analyze-data` | Analisa dados do formulário |
| POST | `/api/ats-analyze-file` | Analisa upload de currículo |
| GET | `/cv/:id` | Visualiza currículo compartilhado |
| GET | `/api/debug-env` | Diagnóstico (bloqueado em produção sem token) |

As rotas de escrita da API têm rate limit. Respostas de erro da API são JSON; rotas de página desconhecidas usam fallback do frontend.

## Testes

```bash
npm test          # testes unitários e de integração (node:test)
npm run test:ats  # testes legados do processador ATS
npm run test:fixes
```

Os testes cobrem sanitização, validação de upload por magic bytes, rate limiting, extração de DOCX, análise ATS, geração de currículo e health checks.

## Deploy na Vercel

O projeto já inclui `vercel.json` e a entrada `api/index.js`, que exporta o app Express para o runtime serverless.

```bash
npm i -g vercel
vercel --prod
```

Configurar `NODE_ENV=production` e, se necessário, `ALLOWED_ORIGINS`, `RATE_LIMIT_PER_HOUR` e `DEBUG_TOKEN`.

## Limitações conhecidas

- Os currículos compartilhados ficam em memória (`Map`). Em serverless, links podem deixar de funcionar após cold start ou em outra instância. Para produção em escala, usar banco/objeto storage.
- OCR de PDF escaneado é melhor esforço e pode falhar em arquivos grandes ou de baixa qualidade.
- O limite de upload e o timeout de OCR precisam ser compatíveis com o plano da Vercel.
- O override de `@xmldom/xmldom` está fixado em `0.8.15` por compatibilidade com `mammoth`; versões 0.9.x quebram a extração de DOCX.

## Segurança

- Sanitização de texto preservando pontuação legítima
- Validação de upload por extensão, MIME e magic bytes
- Rate limiting apenas em rotas de escrita da API
- Helmet, CORS com allowlist, `trust proxy` restrito e `x-powered-by` desativado
- Páginas de currículo com `Cache-Control: no-store` e `X-Robots-Tag: noindex`
- Dados de formulário no `localStorage` expiram em 7 dias

## Licença

MIT.
