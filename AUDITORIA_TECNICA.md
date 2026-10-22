# Auditoria Técnica - CurrículoFácil

Data: 2026-10-22
Escopo: revisão de arquitetura, segurança, confiabilidade, funcionalidades, dependências, testes e documentação.
Ambiente validado: Node.js 22.22.3 / npm 10.9.8 / Windows.

## Resumo executivo

O projeto é uma aplicação Express com frontend estático, geração de PDF no navegador e processamento de currículos para ATS. A base funcionava, mas havia problemas de segurança, validação, documentação divergente, testes sem assertions, rate limit global, diagnóstico exposto e um entrypoint que não iniciava o servidor localmente.

Foram aplicadas correções incrementais sem alterar o fluxo de deploy da Vercel nem remover funcionalidades. A suíte nova tem 23 testes passando. O audit de produção caiu de 12 vulnerabilidades (incluindo 1 crítica e 6 altas) para 3 moderadas de uma única cadeia transitiva do `mammoth`, sem correção disponível sem downgrade quebrante.

## Problemas encontrados e correções

### Alta prioridade

| Problema | Evidência | Correção |
| --- | --- | --- |
| `npm start` e `npm run dev` não iniciavam o servidor | `api/index.js` apenas exportava o app; `startServer()` nunca era chamado fora da Vercel | `api/index.js` agora chama `app.startServer()` quando `require.main === module`, mantendo o export para serverless |
| Rate limit aplicado globalmente | Middleware atingia assets estáticos e leituras, com limite de 50/h | Limitador aplicado somente a escritas `/api/*`, configurável por `RATE_LIMIT_PER_HOUR` |
| Upload validava MIME informado pelo cliente | `validateFileUpload` confiava em `mimetype` e extensão com `.includes` (aceitava parciais) | Validação por extensão exata + magic bytes (`PDF`, JPEG, PNG, ZIP) + coerência extensão/conteúdo |
| `sanitizeText` destruía dados legítimos | Removia `&` e aspas, alterando textos de usuários | Remoção de tags/controles, preservando `&`, aspas e acentuação |
| Diagnóstico exposto publicamente | `/api/debug-env` retornava memória, uptime e versão do Node sem autenticação | Em produção exige `x-debug-token` igual a `DEBUG_TOKEN`; desabilitado se o token não existir |
| `/api/health` ausente | Teste de produção falhava com 404 | Adicionado alias para `/api/status` |
| Botão de ATS permanecia desabilitado após sucesso | `handleATSAnalyzeFile` não restaurava estado no caminho feliz | Restauração de botão/input em `finally` |
| PDF era parseado duas vezes no ATS | Detecção de PDF escaneado seguida de nova extração | Extração única, com o texto reaproveitado |
| Confiança de extração incorreta | Resultado sem texto podia manter `confidence = 1` | `confidence = 0` quando não há texto; buffer vazio também retorna 0 |

### Média prioridade

| Problema | Correção |
| --- | --- |
| `trust proxy` aberto (`true`) permitia spoofing de IP em cenários indevidos | Alterado para `1` |
| `x-powered-by` expunha stack | Desabilitado |
| JSON limit padrão pequeno para payloads legítimos | Ajustado para `2mb` |
| Timers de OCR e intervalos de limpeza podiam segurar o processo | `withTimeout` limpa o timer; `setInterval(...).unref()` |
| Nome de arquivo enviado era logado | Removido dos logs; apenas tamanho/tipo |
| 404 de API retornava HTML | Respostas JSON para `/api/*` inexistente |
| Currículos compartilhados podiam ser indexados/cacheados | `Cache-Control: no-store` e `X-Robots-Tag: noindex` |
| `ats-analyze-data` aceitava payload vazio e gerava score 0 | Validação de objeto e mínimo de 50 caracteres |
| PII no `localStorage` ficava indefinidamente | TTL de 7 dias, `try/catch` e compatibilidade com formato antigo |
| Upload de foto inválida podia derrubar a geração | Conteúdo é validado e a foto é ignorada com warning |
| `express.static` dependia do diretório de execução | Caminho absoluto com `path.join(__dirname, 'public')` |

### Baixa prioridade / organização

- `.gitignore` estava corrompido (bytes inválidos e nulls) e não ignorava nada. Reescrito em UTF-8.
- `node_modules` estava versionado. Agora é ignorado; se o projeto for versionado, remover do índice com `git rm -r --cached node_modules`.
- `README.md` descrevia Puppeteer, Claude API e 3 templates, itens que não existem no código. Reescrito para a arquitetura real.
- `.env.example` citava `CLAUDE_API_KEY` e `RATE_LIMIT_PER_HOUR=5`. Atualizado.
- `nodemon` foi substituído por `node --watch`, removendo 3 vulnerabilidades altas de dependências de desenvolvimento.
- `api/index-production.js` está quebrado (`require('./config')` e `./utils` não existem em `api/`) e não é referenciado. Não foi removido sem autorização; recomenda-se excluir.
- `por.traineddata` (2,4 MB) não é referenciado. Recomenda-se remover se o OCR não usar esse arquivo.

## Dependências

Antes:

- 12 vulnerabilidades: 1 crítica, 6 altas, 3 moderadas.
- `@xmldom/xmldom` alta via `mammoth`.
- `proxy-addr` crítica via `express`.
- `file-type` alta (dependência removida).
- `sharp`, `underscore` e outras.

Depois:

- `npm audit --omit=dev`: 3 moderadas, todas da cadeia `mammoth -> argparse -> sprintf-js`.
- `npm audit` completo: as mesmas 3 moderadas.
- `proxy-addr` atualizado via override para `2.0.8`.
- `@xmldom/xmldom` fixado em `0.8.15` (compatível com `mammoth`). A versão 0.9.x quebra a extração de DOCX.
- `underscore` atualizado para `1.13.8`.
- `file-type`, `pdf-lib` e `pdfjs-dist` removidos por não serem usados.
- `jszip` adicionado apenas como dependência de desenvolvimento para gerar fixture de DOCX nos testes.

Risco residual: o advisory de `sprintf-js` é de DoS via formatadores de precisão. O `argparse` é usado pela CLI do `mammoth`, não pelo caminho de extração de DOCX da aplicação. Não há versão corrigida compatível sem downgrade quebrante do `mammoth`.

## Testes

Novos testes em `tests/` usando `node:test`:

- `utils.test.js`: sanitização, email/telefone/obrigatórios, magic bytes, upload de foto/currículo, divergência extensão-conteúdo, rate limiting.
- `ats-processor.test.js`: normalização, buffer vazio, conteúdo desconhecido, DOCX válido (protege o override do `xmldom`) e DOCX inválido.
- `server.test.js`: health/status, páginas estáticas, 404 JSON de API, geração de currículo, link compartilhável, email inválido, foto inválida com warning, validação e score ATS, upload não suportado e PDF disfarçado de DOCX.

Resultado:

```text
tests 23
pass 23
fail 0
```

Smoke test local:

```text
GET http://127.0.0.1:3100/api/health -> 200 status=running
```

Validação específica de DOCX:

```text
DOCX_OK=true
```

## Arquivos alterados

- `server.js`: rotas, validação, CORS, rate limit, health, erros, cache.
- `utils.js`: sanitização, detecção de tipo e validação de upload.
- `config.js`: configuração de rate limit, CORS, uploads e templates.
- `ats-processor.js`: timeouts, extração única, confiança e flags de resultado.
- `api/index.js`: inicialização local + export para Vercel.
- `public/js/main.js`: ATS e TTL do `localStorage`.
- `package.json` / `package-lock.json`: deps, overrides, scripts e engines.
- `.gitignore`, `.env.example`, `README.md`.
- `tests/utils.test.js`, `tests/ats-processor.test.js`, `tests/server.test.js`.

## Riscos e pendências

1. **Persistência em memória:** `cvDatabase` é um `Map`. Em serverless, links `/cv/:id` quebram em cold start ou outra instância. O README prometia 24h. Solução recomendada: Redis/KV ou storage de objetos.
2. **`vercel.json` não foi alterado:** `maxDuration` e região dependem do plano e de autorização. Validar timeout de OCR/uploads no ambiente real.
3. **Node na Vercel:** `sharp@0.35.5` exige Node >= 20.9. Confirmar a versão de runtime configurada no projeto antes do deploy.
4. **`api/index-production.js`:** dead code quebrado; remover após autorização.
5. **`node_modules` versionado:** o `.gitignore` novo não remove arquivos já rastreados; é necessário `git rm -r --cached node_modules` se houver repositório.
6. **Sem validação em produção:** não houve acesso à instância Vercel; todos os resultados são locais.
7. **OCR:** é melhor esforço. PDFs escaneados podem falhar ou estourar timeout, especialmente em serverless.
8. **DOCX:** qualquer ZIP com extensão `.docx` passa na validação de magic bytes e só falha na extração. Isso é tratado como erro de parse, não como risco de execução.
9. **AdSense/Analytics:** IDs estão no frontend; não foram alterados nem validados por não haver acesso às contas.
