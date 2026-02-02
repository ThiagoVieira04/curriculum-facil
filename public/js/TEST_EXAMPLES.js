/**
 * Exemplos de Teste do Sistema de Empresas
 * ========================================
 * Execute no console do navegador para testar
 */

// ============================================
// 1. TESTES BÁSICOS DO SERVIÇO
// ============================================

console.log('=== TESTE 1: CompanyService ===');

// Teste de visibilidade do botão
console.log('Teste: shouldShowAddButton');
console.log('  > 3 empresas (botão visível):', companyService.shouldShowAddButton(4)); // true
console.log('  = 3 empresas (botão oculto):', companyService.shouldShowAddButton(3));  // false
console.log('  < 3 empresas (botão oculto):', companyService.shouldShowAddButton(2));  // false

// Teste de limite máximo
console.log('\nTeste: hasReachedMaxLimit');
console.log('  10 empresas:', companyService.hasReachedMaxLimit(10)); // true
console.log('  9 empresas:', companyService.hasReachedMaxLimit(9));   // false

// Teste de validação
console.log('\nTeste: validateCompany');
const validCompany = {
  name: 'Acme Corp',
  position: 'Desenvolvedor'
};
console.log('Empresa válida:', companyService.validateCompany(validCompany));

const invalidCompany = {
  name: '',
  position: ''
};
console.log('Empresa inválida:', companyService.validateCompany(invalidCompany));

// ============================================
// 2. TESTES DO HOOK
// ============================================

console.log('\n=== TESTE 2: UseCompaniesHook ===');

// Obter estado atual
console.log('Estado atual:', useCompaniesHook.getState());

// Inscrever-se a mudanças
let changeCount = 0;
const unsubscribe = useCompaniesHook.subscribe((state) => {
  changeCount++;
  console.log(`Mudança #${changeCount}:`, state);
});

// Adicionar empresa
console.log('\nAdicionando empresa...');
useCompaniesHook.addCompany({
  name: 'Tech Solutions',
  position: 'Senior Developer',
  description: 'Desenvolvimento de aplicações web',
  isCurrentlyWorking: true
}).then(result => {
  console.log('Resultado:', result);
});

// Aguardar e verificar estado
setTimeout(() => {
  console.log('\nEstado após adição:', useCompaniesHook.getState());
  
  // Remover empresa
  console.log('\nRemovendo empresa no índice 0...');
  useCompaniesHook.removeCompany(0).then(success => {
    console.log('Removido com sucesso:', success);
    console.log('Novo estado:', useCompaniesHook.getState());
    
    // Desinscrever
    unsubscribe();
  });
}, 100);

// ============================================
// 3. TESTES DO COMPONENTE
// ============================================

console.log('\n=== TESTE 3: AddCompanyButton ===');

// O gerenciador já deve estar inicializado
console.log('Gerenciador criado:', !!addCompanyButtonManager);

// Simular clique no botão
setTimeout(() => {
  const button = document.querySelector('.btn-add-company');
  if (button) {
    console.log('Botão encontrado, abrindo modal...');
    button.click();
    
    // Aguardar modal aparecer
    setTimeout(() => {
      const modal = document.getElementById('add-company-modal');
      console.log('Modal visível:', !!modal);
      
      if (modal) {
        // Fechar modal
        const closeBtn = modal.querySelector('.modal-close-btn');
        closeBtn?.click();
        console.log('Modal fechado');
      }
    }, 500);
  } else {
    console.log('Botão não encontrado (pode ser esperado com < 4 empresas)');
  }
}, 1000);

// ============================================
// 4. TESTES DE VALIDAÇÃO
// ============================================

console.log('\n=== TESTE 4: Validação ===');

// Testar validação
const testCases = [
  {
    name: 'Válido completo',
    data: {
      name: 'Empresa X',
      position: 'Gerente',
      description: 'Descrição',
      startDate: '2020-01-01',
      endDate: '2023-12-31',
      isCurrentlyWorking: false
    }
  },
  {
    name: 'Nome vazio',
    data: {
      name: '',
      position: 'Dev'
    }
  },
  {
    name: 'Sem posição',
    data: {
      name: 'Corp',
      position: ''
    }
  },
  {
    name: 'Nome muito longo (>100 chars)',
    data: {
      name: 'A'.repeat(101),
      position: 'Dev'
    }
  },
  {
    name: 'Data inválida',
    data: {
      name: 'Corp',
      position: 'Dev',
      startDate: 'invalid-date'
    }
  }
];

testCases.forEach(testCase => {
  const result = companyService.validateCompany(testCase.data);
  console.log(`${testCase.name}:`, result.valid ? '✅ VÁLIDO' : `❌ ${result.errors[0]}`);
});

// ============================================
// 5. TESTES DE STORAGE
// ============================================

console.log('\n=== TESTE 5: localStorage ===');

// Limpar antes do teste
localStorage.removeItem('cv_companies');

// Adicionar dados
useCompaniesHook.addCompany({
  name: 'Storage Test',
  position: 'Dev'
}).then(() => {
  const stored = localStorage.getItem('cv_companies');
  console.log('Dados salvos:', stored ? '✅ Sim' : '❌ Não');
  
  if (stored) {
    const data = JSON.parse(stored);
    console.log('Empresas armazenadas:', data.length);
  }
});

// ============================================
// 6. TESTE DE API (BACKEND)
// ============================================

console.log('\n=== TESTE 6: API Backend ===');

// Função auxiliar para teste de API
async function testAPI() {
  try {
    // Teste 1: Validação
    console.log('Testando /api/companies/validate...');
    const validateRes = await fetch('/api/companies/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'API Test Corp',
        position: 'Developer'
      })
    });
    console.log('Validação:', validateRes.ok ? '✅' : `❌ ${validateRes.status}`);

    // Teste 2: Check limit
    console.log('Testando /api/companies/check-limit...');
    const limitRes = await fetch('/api/companies/check-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentCompanyCount: 5 })
    });
    const limitData = await limitRes.json();
    console.log('Check limit:', limitData.success ? '✅' : '❌');
    console.log('  Pode adicionar:', limitData.canAdd);
    console.log('  Mensagem:', limitData.message);

  } catch (error) {
    console.error('Erro ao testar API:', error);
  }
}

// Executar testes de API
testAPI();

// ============================================
// 7. TESTE DE LIMITE MÁXIMO
// ============================================

console.log('\n=== TESTE 7: Limite Máximo ===');

async function testMaxLimit() {
  console.log('Testando limite de 10 empresas...');
  
  // Limpar estado
  useCompaniesHook.reset();
  
  // Adicionar 10 empresas
  for (let i = 0; i < 10; i++) {
    await useCompaniesHook.addCompany({
      name: `Company ${i + 1}`,
      position: `Position ${i + 1}`
    });
  }
  
  const state = useCompaniesHook.getState();
  console.log(`Empresas adicionadas: ${state.totalCount}`);
  console.log(`Pode adicionar mais?: ${state.canAddMore}`);
  
  // Tentar adicionar a 11ª (deve falhar)
  const result = await useCompaniesHook.addCompany({
    name: 'Company 11',
    position: 'Position 11'
  });
  
  console.log(`Resultado ao tentar adicionar 11ª:`, result.success ? '✅ Sucesso' : `❌ Erro: ${result.error}`);
}

// Executar com pequeno delay
setTimeout(() => {
  testMaxLimit();
}, 500);

// ============================================
// 8. CHECKLIST DE TESTES MANUAIS
// ============================================

console.log('\n=== CHECKLIST DE TESTES MANUAIS ===');
console.log(`
✓ Abrir console do navegador (F12)
✓ Executar: testMaxLimit()
✓ Verificar:
  - [ ] Botão "+" aparece quando > 3 empresas
  - [ ] Botão "+" desaparece quando ≤ 3 empresas
  - [ ] Modal abre ao clicar no botão
  - [ ] Formulário valida campos obrigatórios
  - [ ] Alerta de erro aparece se dados inválidos
  - [ ] Empresa é adicionada com sucesso
  - [ ] Contador de empresas atualiza
  - [ ] Dados persistem ao recarregar página
  - [ ] Mensagem de limite ao atingir 10 empresas
  - [ ] Responsivo em mobile (DevTools)
  - [ ] Modal fecha ao clicar no X
  - [ ] Modal fecha ao clicar Cancelar
  - [ ] Modal fecha ao clicar fora (backdrop)
  - [ ] Teclado funciona (Tab, Enter)
`);

// ============================================
// 9. FUNÇÃO DE DEBUG
// ============================================

function debugCompanySystem() {
  console.log('=== DEBUG DO SISTEMA ===');
  console.log('\nServiço de Empresas:', {
    maxCompanies: companyService.MAX_COMPANIES,
    showThreshold: companyService.SHOW_ADD_BUTTON_THRESHOLD
  });
  
  console.log('\nEstado do Hook:', useCompaniesHook.getState());
  
  console.log('\nGerenciador do Botão:', {
    existe: !!addCompanyButtonManager,
    modalAberto: addCompanyButtonManager?.isModalOpen
  });
  
  console.log('\nlocalStorage:', {
    empresas: localStorage.getItem('cv_companies') ? 'Sim' : 'Não',
    tamanho: localStorage.getItem('cv_companies')?.length || 0
  });
  
  console.log('\nDOM:', {
    botao: !!document.querySelector('.btn-add-company'),
    modal: !!document.getElementById('add-company-modal'),
    container: !!document.getElementById('add-company-btn-container')
  });
}

// Usar: debugCompanySystem()

console.log('\n✅ Exemplos de teste carregados!');
console.log('Use: testMaxLimit() para teste completo');
console.log('Use: debugCompanySystem() para debug');
