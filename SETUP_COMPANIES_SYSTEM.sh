#!/bin/bash
# Script de Configuração do Sistema de Empresas
# ===============================================
# Executa os passos necessários para integrar o sistema

echo "🚀 Iniciando configuração do Sistema de Empresas..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se os arquivos existem
echo -e "\n${BLUE}📋 Verificando arquivos criados...${NC}"

files=(
    "public/js/services/companyService.js"
    "public/js/hooks/useCompanies.js"
    "public/js/components/AddCompanyButton.js"
    "middleware/companyValidation.js"
    "public/css/companies.css"
    "COMPANIES_SYSTEM_README.md"
    "public/js/INTEGRATION_GUIDE.js"
    "public/js/TEST_EXAMPLES.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${YELLOW}✗${NC} $file (não encontrado)"
    fi
done

echo -e "\n${BLUE}📝 Próximos passos de integração:${NC}"
echo "
${YELLOW}1. INCLUIR SCRIPTS NO HTML${NC}
   Adicione em public/index.html (ordem importa!):
   
   <head>
       <link rel=\"stylesheet\" href=\"/css/companies.css\">
   </head>
   <body>
       ...
       <script src=\"/js/services/companyService.js\"></script>
       <script src=\"/js/hooks/useCompanies.js\"></script>
       <script src=\"/js/components/AddCompanyButton.js\"></script>
       <script src=\"/js/main.js\"></script>
   </body>

${YELLOW}2. ADICIONAR CONTAINER NO FORMULÁRIO${NC}
   Substitua a seção de 'Experiência Profissional' por:
   
   <div class=\"form-group\">
       <label>Experiência Profissional</label>
       <div id=\"add-company-btn-container\"></div>
       <div id=\"companies-list\"></div>
       <textarea id=\"experiencia\" name=\"experiencia\" 
                 placeholder=\"Descrição...\"></textarea>
   </div>

${YELLOW}3. INICIALIZAR NO main.js${NC}
   Adicione na função initializeApp():
   
   // Inicializar gerenciador de empresas
   addCompanyButtonManager = new AddCompanyButton('add-company-btn-container');
   
   // Inscrever-se a mudanças
   useCompaniesHook.subscribe((state) => {
       console.log('Estado atualizado:', state);
       renderCompaniesList(state.companies);
   });
   
   function renderCompaniesList(companies) {
       const container = document.getElementById('companies-list');
       container.innerHTML = companies.map((company, i) => \`
           <div class=\"company-card\">
               <strong>\${company.name}</strong> - \${company.position}
               <button onclick=\"useCompaniesHook.removeCompany(\${i})\">Remover</button>
           </div>
       \`).join('');
   }

${YELLOW}4. ATUALIZAR server.js${NC}
   Já adicionado! Verifique:
   ✓ Import do middleware (linha ~19)
   ✓ 3 endpoints de API (linhas ~1272-1370)

${YELLOW}5. TESTAR INTEGRAÇÃO${NC}
   a) Abrir navegador em: http://localhost:3000
   b) Abrir console: F12 → Console
   c) Executar: debugCompanySystem()
   d) Verificar:
      - Botão \"+" não aparece (< 4 empresas)
      - Estado do hook
      - localStorage vazio

${YELLOW}6. TESTE COMPLETO${NC}
   Execute no console:
   testMaxLimit()
   
   Deve:
   - Adicionar 10 empresas
   - Botão desaparecer depois de 3
   - Aparecer novamente com > 3
   - Bloquear 11ª empresa

${YELLOW}7. TESTAR EM MOBILE${NC}
   DevTools → Toggle Device Toolbar (Ctrl+Shift+M)
   Verificar responsividade

${BLUE}📚 DOCUMENTAÇÃO${NC}
   - COMPANIES_SYSTEM_README.md    → Referência técnica
   - INTEGRATION_GUIDE.js           → Passo a passo (em código)
   - TEST_EXAMPLES.js               → Testes para console
   - Este arquivo                   → Instruções de setup

${BLUE}🔍 DEBUGGING${NC}
   No console:
   ${GREEN}debugCompanySystem()${NC}           → Status geral
   ${GREEN}testMaxLimit()${NC}                 → Teste funcional
   ${GREEN}testAPI()${NC}                      → Teste de endpoints
   ${GREEN}useCompaniesHook.getState()${NC}   → Estado atual
   ${GREEN}localStorage.getItem('cv_companies')${NC} → Ver dados salvos

${GREEN}✅ Setup concluído!${NC}
Agora integre conforme as instruções acima.
"

echo -e "\n${BLUE}💡 DICAS IMPORTANTES:${NC}"
echo "
• Ordem dos scripts é crítica (services → hooks → components → main)
• CSS precisa estar carregado ANTES de usar os componentes
• localStorage é fallback - ideal integrar com banco de dados real
• Endpoints de API são exemplos - adaptar conforme seu sistema
• Sistema é totalmente modular - pode ser usado em outros projetos
"

echo -e "${GREEN}✨ Pronto para começar!${NC}\n"
