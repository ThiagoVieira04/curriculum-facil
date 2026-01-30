# 🤔 FAQ & TROUBLESHOOTING - ATS Processor

## ❓ Perguntas Frequentes

### P1: Por que recebo "Conteúdo ilegível" ao fazer upload?

**Respostas possíveis:**

1. **Arquivo é uma imagem**
   - OCR pode estar falhando
   - Solução: Usar imagem com melhor resolução (300+ DPI)
   - Tentar: Converter PDF → imagem em melhor qualidade

2. **PDF é escaneado com baixa qualidade**
   - OCR com confiança baixa (< 50%)
   - Solução: Rescannear documento com melhor qualidade
   - Dica: Usar scanner de telefone (ex: CamScanner)

3. **Arquivo está realmente vazio**
   - Buffer tem 0 bytes
   - Solução: Verificar arquivo, fazer upload novamente

4. **Arquivo está corrompido**
   - Não é PDF/DOCX válido
   - Solução: Abrir em programa padrão, salvar novamente

---

### P2: Como funciona o OCR?

**O que é OCR?**
```
Optical Character Recognition (OCR)
├─ Analisa imagem de texto
├─ Identifica caracteres
└─ Converte para texto digital
```

**Fluxo:**
1. Sistema detecta PDF/imagem sem texto
2. Ativa Tesseract.js (biblioteca OCR)
3. Processa em português
4. Retorna texto extraído + confiança

**Tempo:** 5-15 segundos por imagem

---

### P3: O sistema suporta qual idioma?

**Atualmente:** Português Brasileiro 🇧🇷

**Como estender:**
1. Editar `ats-processor.js`
2. Mudar linha: `'por'` → `'eng'` (inglês) ou outro código
3. Fazer deploy novo

**Idiomas disponíveis (Tesseract.js):**
```
por = Português
eng = English
spa = Español
fra = Français
deu = Deutsch
... (100+ idiomas)
```

---

### P4: Qual é o tamanho máximo de arquivo?

**Limite:** 10MB

**Por quê?**
- Segurança (evita DDoS)
- Memória (Vercel tem 3GB)
- OCR performance

**Se arquivo > 10MB:**
- Erro 413: "Arquivo muito grande"
- Solução: Comprimir PDF ou fazer upload de páginas separadas

---

### P5: Quanto tempo leva o upload?

**Depende do tipo:**

| Tipo | Tempo |
|------|-------|
| PDF com texto | 100-200ms |
| PDF escaneado | 5-15 segundos |
| Imagem JPG | 3-10 segundos |
| DOCX | 50-150ms |

**Se > 30 segundos:** Timeout do Vercel

---

### P6: Posso fazer upload de várias páginas?

**Sim, mas:**
- Sistema processa PDF inteiro
- OCR é limitado a 5 primeiras páginas (performance)
- Recomendado: PDFs com até 10 páginas

**Para PDF longo:**
- Dividir em partes
- Fazer upload de cada parte
- Combinar resultados manualmente

---

### P7: Como melhorar a taxa de sucesso?

**Para PDFs escaneados:**
```
✅ BOAS PRÁTICAS:
├─ Usar scanner profissional (300+ DPI)
├─ Iluminação adequada
├─ Papel não amassado
├─ Cores contrastantes
└─ Sem sombras ou borrões

❌ EVITAR:
├─ Fotos de celular de baixa qualidade
├─ PDFs muito antigos/desbotados
├─ Letra manuscrita
└─ Documentos rotacionados
```

**Para DOCX:**
```
✅ MELHORAR:
├─ Salvar em Word 2007+ (.docx)
├─ Remover formatações complexas
├─ Usar fontes padrão (Arial, Calibri)
└─ Verificar se não está protegido

❌ EVITAR:
├─ Formato .doc antigo
├─ Macros ou proteção
└─ Tabelas muito complexas
```

---

### P8: E se meu currículo falhar mesmo após OCR?

**Opções:**

1. **Tentar novamente com arquivo diferente**
   - Converter PDF → DOCX (Word)
   - Fazer upload como DOCX

2. **Melhorar qualidade**
   - Se escaneado: rescannear em melhor resolução
   - Se imagem: usar câmera melhor

3. **Contato suporte**
   - Descrever problema
   - Compartilhar tipo de arquivo
   - Enviar exemplo (anônimo)

---

### P9: Os dados do meu currículo são armazenados?

**Resposta:** Não, é processamento "stateless"

**O que acontece:**
1. Upload → Processamento
2. Análise ATS
3. Resposta retornada
4. Arquivo descartado
5. Nenhum dado salvo

**Privacidade:** ✅ Garantida

---

### P10: Como funciona a "confiança" do OCR?

**Definição:**
```
Confiança = Taxa de certeza do sistema
├─ 90-100%: Excelente (caracteres claros)
├─ 70-89%: Bom (legível)
├─ 50-69%: Aceitável (algumas erros)
└─ < 50%: Baixa (muitos erros)
```

**Exemplo:**
```
Imagem clara e bem escaneada:
"João Silva Desenvolvedor" → 95% confiança

Imagem de baixa qualidade:
"J?ão Sílva De?envolvedor" → 40% confiança
```

---

## 🐛 Troubleshooting

### Problema 1: "Timeout na análise"

**Causa:** OCR demorou > 30 segundos (limite Vercel)

**Solução:**
```
1. Tentar com arquivo menor
2. Se PDF: dividir em páginas
3. Se imagem: comprimir antes de upload
4. Aguardar e tentar novamente
```

---

### Problema 2: "Erro interno ao processar"

**Causa:** Arquivo corrompido ou formato inválido

**Solução:**
```
1. Abrir arquivo em programa padrão
2. Verificar se abre corretamente
3. Salvar novamente como PDF/DOCX
4. Tentar upload novamente
```

---

### Problema 3: "OCR com confiança 0%"

**Causa:** Imagem ilegível (muito escura, borrada, rotacionada)

**Solução:**
```
1. Verificar imagem original
2. Se PDF escaneado: rescannear
3. Se foto: retomar em melhor iluminação
4. Garantir orientação correta (portrait/landscape)
```

---

### Problema 4: "Arquivo muito grande"

**Causa:** > 10MB

**Solução:**
```
1. Comprimir PDF:
   - Usar "Reduce File Size" (Adobe)
   - Ou online: smallpdf.com

2. Dividir arquivo:
   - Extrair páginas iniciais
   - Fazer upload em partes

3. Converter:
   - PDF → Imagem (menor)
   - Ou PDF → DOCX (mais comprimido)
```

---

### Problema 5: "DOCX não funciona"

**Causa:** Formato não é .docx válido

**Verificar:**
```
1. Extensão é realmente .docx? (não .doc)
2. Abrir em Word, verificar se abre
3. Salvar como DOCX novamente
4. Nenhuma proteção/password?
5. Sem macros ativas?
```

---

## 📞 Como reportar problemas?

**Informações úteis para reportar:**

```
1. Tipo de arquivo:
   [ ] PDF com texto
   [ ] PDF escaneado
   [ ] Imagem (JPG/PNG)
   [ ] DOCX
   [ ] Outro: ___

2. Tamanho do arquivo: ___ KB/MB

3. Mensagem de erro exata:
   "..."

4. O que você tentou:
   [ ] Upload novamente
   [ ] Arquivo diferente
   [ ] Comprimir
   [ ] Converter formato

5. Browser/dispositivo:
   Chrome/Firefox/Safari, Desktop/Mobile

6. Se possível:
   - Compartilhar arquivo de teste (anônimo)
   - Screenshot do erro
```

---

## 📊 Métricas e Estatísticas

### Taxa de Sucesso por Tipo

| Tipo | Taxa | Tempo Médio |
|------|------|-------------|
| PDF + Texto | 99% | 150ms |
| PDF Escaneado (boa qualidade) | 92% | 8s |
| PDF Escaneado (baixa qualidade) | 60% | 10s |
| Imagem (boa qualidade) | 95% | 6s |
| Imagem (baixa qualidade) | 55% | 8s |
| DOCX | 98% | 100ms |

### Exemplo de Processamento Bem-sucedido

```json
{
  "metodo": "pdf-parse",
  "texto_extraido": 2345,
  "ocr_necessario": false,
  "confianca": "100%",
  "tempo_total": "145ms",
  "ats_score": 78,
  "resultado": "SUCESSO"
}
```

### Exemplo de Processamento com OCR

```json
{
  "metodo": "ocr-pdf",
  "texto_extraido": 1890,
  "ocr_necessario": true,
  "confianca": "87%",
  "tempo_total": "8234ms",
  "ats_score": 72,
  "resultado": "SUCESSO (com OCR)"
}
```

---

## 🎓 Dicas Pro

### Tip 1: Melhorar Score ATS

```
Para atingir score > 90:

✅ Incluir contato (email + telefone)
✅ Seções bem definidas
✅ Usar verbos de ação (desenvolvei, gerenciei, etc)
✅ Detalhamento adequado (200+ palavras)
✅ Palavras-chave da área
✅ Sem erros de ortografia
```

### Tip 2: Formato Ideal para OCR

```
MELHOR:
→ PDF escaneado em branco e preto
→ Texto grande e claro (12pt+)
→ Scanner profissional (300 DPI)
→ Margens adequadas
→ Sem elementos gráficos complexos

ACEITÁVEL:
→ PDF misto (texto + imagens)
→ Foto de boa qualidade
→ DOCX bem formatado

EVITAR:
→ Manuscrito
→ Cores muito similares
→ Imagem muito pequena (< 100x100px)
→ PDF de múltiplas colunas
```

### Tip 3: Maximizar Compatibilidade

```
1. Sempre testar no site antes de enviar para recrutador
2. Fazer upload em múltiplos formatos (PDF + DOCX)
3. Validar score ATS (target: > 75)
4. Usar nomes de seções padrão
5. Manter layout limpo e simples
```

---

## ✅ Checklist de Sucesso

Antes de enviar seu currículo:

- [ ] Arquivo é PDF/DOCX/imagem válido?
- [ ] Arquivo < 10MB?
- [ ] Contém email e telefone?
- [ ] Tem seções bem definidas?
- [ ] Usa verbos de ação?
- [ ] Sem erros de ortografia?
- [ ] Confiança OCR > 70% (se escaneado)?
- [ ] Score ATS > 70?

---

**Última atualização:** 30/01/2026  
**Versão:** 1.1.0
