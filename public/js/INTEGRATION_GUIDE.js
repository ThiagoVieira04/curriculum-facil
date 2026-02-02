/**
 * Guia de Integração do Sistema de Empresas
 * ==========================================
 * 
 * Este arquivo demonstra como integrar o novo sistema
 * de gerenciamento de empresas no seu projeto.
 */

// ============================================
// 1. INCLUIR SCRIPTS NO HTML (ordem importa!)
// ============================================

/*
HTML:
<head>
    ...
    <!-- Scripts de empresas (ordem importante) -->
    <script src="/js/services/companyService.js"></script>
    <script src="/js/hooks/useCompanies.js"></script>
    <script src="/js/components/AddCompanyButton.js"></script>
    <script src="/js/main.js"></script>
</head>
*/

// ============================================
// 2. ADICIONAR ESTILOS CSS
// ============================================

/*
Adicione em: public/css/style.css ou companies.css

/* Botão de Adicionar Empresa */
.btn-add-company {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    font-size: 24px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    transition: all 0.3s ease;
    margin: 20px 0;
}

.btn-add-company:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);
}

.btn-add-company:active {
    transform: scale(0.95);
}

/* Modal */
.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-container {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    z-index: 1001;
}

.add-company-modal {
    animation: slideUp 0.3s ease;
}

@keyframes slideUp {
    from {
        transform: translateY(50px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
    color: #1e293b;
    font-size: 1.3rem;
}

.modal-close-btn {
    background: none;
    border: none;
    font-size: 28px;
    color: #64748b;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-close-btn:hover {
    color: #1e293b;
}

.modal-body {
    padding: 20px;
}

.modal-info {
    background: #f0f4ff;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 15px;
    color: #475569;
    font-size: 0.9rem;
    margin: 0 0 15px 0;
}

.modal-footer {
    padding: 20px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

/* Formulário da Empresa */
.company-form {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.form-group {
    display: flex;
    flex-direction: column;
}

.form-group label {
    margin-bottom: 6px;
    font-weight: 600;
    color: #1e293b;
    font-size: 0.95rem;
}

.form-group input,
.form-group textarea,
.form-group select {
    padding: 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 0.95rem;
    font-family: inherit;
    transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group textarea {
    resize: vertical;
    min-height: 80px;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.form-group.checkbox {
    flex-direction: row;
    align-items: center;
}

.form-group.checkbox input[type="checkbox"] {
    width: 18px;
    height: 18px;
    margin-right: 8px;
    margin-bottom: 0;
}

.form-group.checkbox label {
    margin-bottom: 0;
}

/* Alertas */
.alert {
    padding: 12px 15px;
    border-radius: 8px;
    margin-bottom: 15px;
    font-size: 0.9rem;
}

.alert-error {
    background: #fee;
    color: #c33;
    border-left: 4px solid #c33;
}

.alert-success {
    background: #efe;
    color: #3c3;
    border-left: 4px solid #3c3;
}

.alert-warning {
    background: #ffeaa7;
    color: #d63031;
    border-left: 4px solid #d63031;
}

/* Botões */
.btn-primary,
.btn-secondary {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.95rem;
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-secondary {
    background: #e2e8f0;
    color: #475569;
}

.btn-secondary:hover {
    background: #cbd5e1;
}

/* Responsivo */
@media (max-width: 640px) {
    .modal-container {
        width: 95%;
    }

    .form-row {
        grid-template-columns: 1fr;
    }

    .modal-footer {
        flex-direction: column-reverse;
    }

    .modal-footer button {
        width: 100%;
    }

    .btn-add-company {
        width: 45px;
        height: 45px;
        font-size: 20px;
    }
}
*/

// ============================================
// 3. INTEGRAR NO HTML DO FORMULÁRIO
// ============================================

/*
Substitua a seção de "Experiência Profissional" por:

<div class="form-group">
    <label>Experiência Profissional</label>
    <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 15px;">
        Adicione suas empresas e funções
    </p>
    
    <!-- Container para o botão "+" -->
    <div id="add-company-btn-container"></div>
    
    <!-- Lista de empresas será renderizada aqui -->
    <div id="companies-list">
        <!-- Será preenchida dinamicamente -->
    </div>
    
    <!-- Campo de descrição geral (opcional) -->
    <textarea id="experiencia" name="experiencia" 
              placeholder="Descreva suas principais atividades e conquistas..."></textarea>
</div>
*/

// ============================================
// 4. INICIALIZAR NO main.js
// ============================================

/*
No DOMContentLoaded, adicione:

function initializeApp() {
    // ... inicialização existente ...
    
    // Inicializar gerenciador de empresas
    addCompanyButtonManager = new AddCompanyButton('add-company-btn-container');
    
    // Inscrever-se a mudanças de estado
    useCompaniesHook.subscribe((state) => {
        console.log('Estado de empresas atualizado:', state);
        renderCompaniesList(state.companies);
    });
}

function renderCompaniesList(companies) {
    const container = document.getElementById('companies-list');
    if (!container) return;
    
    if (companies.length === 0) {
        container.innerHTML = '<p style="color: #64748b;">Nenhuma empresa adicionada ainda.</p>';
        return;
    }
    
    const html = companies.map((company, index) => `
        <div class="company-card" style="
            background: #f8fafc;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 10px;
            border-left: 4px solid #667eea;
        ">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <strong style="color: #1e293b;">${company.name}</strong>
                    <p style="margin: 4px 0; color: #475569;">${company.position}</p>
                </div>
                <button onclick="useCompaniesHook.removeCompany(${index})"
                        style="background: #fee; color: #c33; border: none; 
                               padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                    ✕
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}
*/

// ============================================
// 5. EXPORTAR DADOS NO ENVIO DO FORMULÁRIO
// ============================================

/*
Quando submeter o formulário, recuperar empresas:

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const state = useCompaniesHook.getState();
    const formData = new FormData(document.getElementById('cv-form'));
    
    // Adicionar empresas ao formData
    formData.set('companies', JSON.stringify(state.companies));
    
    // Enviar para API...
}
*/

// ============================================
// 6. EXEMPLO DE USO DA API
// ============================================

/*
// Adicionar empresa
const result = await useCompaniesHook.addCompany({
    name: 'Acme Corp',
    position: 'Desenvolvedor Full Stack',
    description: 'Desenvolveu aplicações web...',
    startDate: '2020-01-15',
    endDate: '2023-12-31',
    isCurrentlyWorking: false
});

if (result.success) {
    console.log('Empresa adicionada:', result.data);
} else {
    console.log('Erro:', result.error);
}

// Obter estado
const state = useCompaniesHook.getState();
console.log('Total de empresas:', state.totalCount);
console.log('Pode adicionar mais?', state.canAddMore);
console.log('Mostrar botão +?', state.showAddButton);

// Remover empresa
await useCompaniesHook.removeCompany(0);

// Inscrever-se a mudanças
const unsubscribe = useCompaniesHook.subscribe((newState) => {
    console.log('Estado mudou:', newState);
});

// Desinscrever-se
unsubscribe();
*/

console.log('Guia de integração carregado. Consulte este arquivo para instruções detalhadas.');
