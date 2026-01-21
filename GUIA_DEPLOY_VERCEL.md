# 🚀 GUIA DE DEPLOY NA VERCEL - Erro 500 Resolvido

## ⚡ RESUMO EXECUTIVO

O erro 500 em `/sobre` foi causado por **falta de validação no carregamento de rotas**. As correções já foram aplicadas no código. Agora é só fazer deploy.

---

## 📋 PRÉ-REQUISITOS

- [ ] Node.js 16+ instalado
- [ ] Git configurado
- [ ] Conta Vercel criada (https://vercel.com)
- [ ] Vercel CLI instalada: `npm i -g vercel`

---

## 🔧 PASSO 1: VALIDAR LOCALMENTE

### 1.1 Instalar dependências
```bash
npm install
```

### 1.2 Testar servidor localmente
```bash
npm run dev
```

Você deve ver:
```
✅ Servidor rodando na porta 3000
Acesse: http://localhost:3000
```

### 1.3 Testar rotas em outro terminal
```bash
# Health check
curl http://localhost:3000/api/health

# Página sobre
curl http://localhost:3000/sobre

# Status
curl http://localhost:3000/api/status
```

Todos devem retornar status 200.

### 1.4 Executar suite de testes
```bash
node test-vercel-fix.js
```

Você deve ver:
```
✅ Passou: 8/8
❌ Falhou: 0/8

🎉 TODOS OS TESTES PASSARAM!
```

---

## 🌐 PASSO 2: FAZER DEPLOY NA VERCEL

### 2.1 Fazer commit das mudanças
```bash
git add .
git commit -m "Fix: Validação de rotas e health checks para Vercel"
```

### 2.2 Fazer deploy
```bash
# Primeira vez (conecta com Vercel)
vercel --prod

# Próximas vezes
vercel --prod
```

Você verá:
```
✅ Production: https://seu-dominio.vercel.app
```

### 2.3 Aguardar deploy completar
Espere 30-60 segundos para o deploy ser processado.

---

## ✅ PASSO 3: VALIDAR APÓS DEPLOY

### 3.1 Testar health check
```bash
curl https://seu-dominio.vercel.app/api/health
```

Deve retornar:
```json
{"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

### 3.2 Testar página /sobre
```bash
curl https://seu-dominio.vercel.app/sobre
```

Deve retornar HTML da página (status 200).

### 3.3 Testar status
```bash
curl https://seu-dominio.vercel.app/api/status
```

Deve retornar:
```json
{"status":"running","environment":"production","vercel":true,"timestamp":"..."}
```

### 3.4 Acessar no navegador
- https://seu-dominio.vercel.app/sobre
- https://seu-dominio.vercel.app/contato
- https://seu-dominio.vercel.app/dicas

Todas devem carregar sem erro 500.

---

## 🔍 PASSO 4: MONITORAR LOGS

### 4.1 Ver logs em tempo real
```bash
vercel logs --prod --follow
```

### 4.2 Ver logs do último deploy
```bash
vercel logs --prod
```

### 4.3 Procurar por erros
```bash
vercel logs --prod | grep -i error
```

---

## 🆘 TROUBLESHOOTING

### Problema: Ainda recebo erro 500

**Solução:**
```bash
# 1. Verificar logs
vercel logs --prod --follow

# 2. Fazer rebuild
vercel --prod --force

# 3. Verificar variáveis de ambiente
vercel env list
```

### Problema: Erro "Module not found"

**Solução:**
```bash
# 1. Reinstalar dependências
rm -rf node_modules package-lock.json
npm install

# 2. Fazer deploy novamente
vercel --prod
```

### Problema: Timeout ao fazer deploy

**Solução:**
```bash
# Aumentar timeout
vercel --prod --timeout 600
```

### Problema: Erro de permissão

**Solução:**
```bash
# Fazer login novamente
vercel login

# Fazer deploy
vercel --prod
```

---

## 📊 CHECKLIST DE DEPLOY

- [ ] `npm install` executado com sucesso
- [ ] `npm run dev` funciona localmente
- [ ] `node test-vercel-fix.js` passa em todos os testes
- [ ] Mudanças commitadas no Git
- [ ] `vercel --prod` executado com sucesso
- [ ] Health check retorna 200
- [ ] Página /sobre carrega sem erro
- [ ] Logs não mostram erros críticos

---

## 🎯 PRÓXIMOS PASSOS

### Após deploy bem-sucedido:

1. **Monitorar por 24 horas**
   - Verificar logs regularmente
   - Testar funcionalidades principais

2. **Configurar alertas** (opcional)
   - Vercel Dashboard > Settings > Alerts

3. **Documentar mudanças**
   - Adicionar ao changelog
   - Notificar stakeholders

---

## 📞 SUPORTE

Se tiver problemas:

1. **Verificar logs**: `vercel logs --prod --follow`
2. **Testar localmente**: `npm run dev`
3. **Consultar documentação**: https://vercel.com/docs
4. **Abrir issue**: GitHub Issues

---

## 🔐 VARIÁVEIS DE AMBIENTE (se necessário)

Se precisar configurar variáveis na Vercel:

```bash
# Listar variáveis
vercel env list

# Adicionar variável
vercel env add NOME_VARIAVEL

# Remover variável
vercel env rm NOME_VARIAVEL
```

---

## 📈 MONITORAMENTO CONTÍNUO

### Verificar saúde do servidor
```bash
# Diariamente
curl https://seu-dominio.vercel.app/api/health

# Com script
watch -n 60 'curl -s https://seu-dominio.vercel.app/api/health | jq'
```

### Alertas automáticos
Configure no Vercel Dashboard para ser notificado de:
- Erros 5xx
- Timeouts
- Falhas de deploy

---

**Última atualização:** 2024
**Status:** ✅ Pronto para deploy
