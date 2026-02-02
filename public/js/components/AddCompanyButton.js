/**
 * Componente: Botão "+" e Modal de Adicionar Empresa
 * ===================================================
 * Separa UI da lógica de negócio
 * Reutilizável em web e mobile
 * Usa padrão Observer para reatividade
 */

class AddCompanyButton {
  constructor(containerId = 'add-company-btn-container') {
    this.containerId = containerId;
    this.isModalOpen = false;
    this.currentEditingIndex = null; // Para futura funcionalidade de editar

    // Inscreve-se a mudanças de estado
    this.unsubscribe = useCompaniesHook.subscribe((state) => {
      this.render(state);
    });

    // Renderiza inicial
    this.render(useCompaniesHook.getState());
  }

  /**
   * Renderiza o botão baseado no estado
   * @param {Object} state - Estado das empresas
   * @private
   */
  render(state) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Se não deve mostrar o botão, limpa o container
    if (!state.showAddButton) {
      container.innerHTML = '';
      return;
    }

    // Renderiza o botão
    container.innerHTML = `
      <button class="btn-add-company" 
              title="${companyService.getAddButtonTooltip(state.totalCount)}"
              aria-label="Adicionar nova empresa">
        <span class="btn-icon">+</span>
      </button>
    `;

    // Adiciona event listener
    const button = container.querySelector('.btn-add-company');
    if (button) {
      button.addEventListener('click', () => this.openModal());
    }
  }

  /**
   * Abre o modal de adicionar empresa
   * @private
   */
  openModal() {
    if (this.isModalOpen) return;

    this.isModalOpen = true;
    this.showAddCompanyModal();
  }

  /**
   * Fecha o modal
   * @private
   */
  closeModal() {
    this.isModalOpen = false;
    this.removeModal();
  }

  /**
   * Renderiza o modal
   * @private
   */
  showAddCompanyModal() {
    // Cria backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'add-company-modal-backdrop';

    // Cria modal
    const modal = document.createElement('div');
    modal.className = 'modal-container add-company-modal';
    modal.id = 'add-company-modal';

    const state = useCompaniesHook.getState();

    modal.innerHTML = `
      <div class="modal-header">
        <h3>Adicionar Nova Empresa</h3>
        <button class="modal-close-btn" aria-label="Fechar modal">&times;</button>
      </div>

      <div class="modal-body">
        <p class="modal-info">Você tem ${state.totalCount} de ${companyService.MAX_COMPANIES} empresas cadastradas</p>

        ${state.error ? `
          <div class="alert alert-error" role="alert">
            ⚠️ ${state.error}
          </div>
        ` : ''}

        <form id="add-company-form" class="company-form">
          <div class="form-group">
            <label for="company-name">Nome da Empresa *</label>
            <input 
              type="text" 
              id="company-name" 
              name="name" 
              placeholder="Ex: Acme Corp"
              required
              maxlength="100"
            />
          </div>

          <div class="form-group">
            <label for="company-position">Cargo/Função *</label>
            <input 
              type="text" 
              id="company-position" 
              name="position" 
              placeholder="Ex: Desenvolvedor Full Stack"
              required
              maxlength="100"
            />
          </div>

          <div class="form-group">
            <label for="company-description">Descrição (opcional)</label>
            <textarea 
              id="company-description" 
              name="description" 
              placeholder="Descreva suas responsabilidades e realizações"
              rows="3"
              maxlength="500"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="company-startDate">Data de Início</label>
              <input 
                type="date" 
                id="company-startDate" 
                name="startDate" 
              />
            </div>

            <div class="form-group">
              <label for="company-endDate">Data de Término</label>
              <input 
                type="date" 
                id="company-endDate" 
                name="endDate" 
              />
            </div>
          </div>

          <div class="form-group checkbox">
            <input 
              type="checkbox" 
              id="company-current" 
              name="isCurrentlyWorking" 
            />
            <label for="company-current">Ainda trabalho lá</label>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-secondary" id="btn-cancel">Cancelar</button>
        <button type="button" class="btn-primary" id="btn-submit" ${state.loading ? 'disabled' : ''}>
          ${state.loading ? 'Adicionando...' : 'Adicionar Empresa'}
        </button>
      </div>
    `;

    // Adiciona ao DOM
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    // Event listeners
    this.attachModalListeners();
  }

  /**
   * Adiciona listeners ao modal
   * @private
   */
  attachModalListeners() {
    const modal = document.getElementById('add-company-modal');
    const backdrop = document.getElementById('add-company-modal-backdrop');
    const closeBtn = modal.querySelector('.modal-close-btn');
    const cancelBtn = document.getElementById('btn-cancel');
    const submitBtn = document.getElementById('btn-submit');
    const form = document.getElementById('add-company-form');

    // Fechar ao clicar no X
    closeBtn?.addEventListener('click', () => this.closeModal());

    // Fechar ao clicar no cancelar
    cancelBtn?.addEventListener('click', () => this.closeModal());

    // Fechar ao clicar no backdrop
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.closeModal();
      }
    });

    // Submit do formulário
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit(form);
    });

    // Prevenir submit ao pressionar Enter nos inputs
    form?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && e.target !== form.querySelector('textarea')) {
        e.preventDefault();
      }
    });
  }

  /**
   * Processa submit do formulário
   * @private
   */
  async handleFormSubmit(form) {
    const submitBtn = document.getElementById('btn-submit');
    const initialText = submitBtn.textContent;

    try {
      // Desabilita botão
      submitBtn.disabled = true;

      // Coleta dados do formulário
      const formData = new FormData(form);
      const companyData = Object.fromEntries(formData);

      // Converte checkbox para boolean
      companyData.isCurrentlyWorking = formData.has('isCurrentlyWorking');

      // Chama hook
      const result = await useCompaniesHook.addCompany(companyData);

      if (result.success) {
        // Sucesso - fecha modal e exibe mensagem
        this.showSuccessMessage('Empresa adicionada com sucesso!');
        
        setTimeout(() => {
          this.closeModal();
          companyService.saveToStorage(useCompaniesHook.getState().companies);
        }, 1000);
      } else {
        // Erro já foi setado no hook
        // Modal será re-renderizado automaticamente via subscriber
      }
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
      useCompaniesHook.clearError();
      // Usa o método de notify para forçar re-render do erro
      useCompaniesHook.notifyListeners();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = initialText;
    }
  }

  /**
   * Exibe mensagem de sucesso
   * @private
   */
  showSuccessMessage(message) {
    const modal = document.getElementById('add-company-modal');
    if (!modal) return;

    const modalBody = modal.querySelector('.modal-body');
    const alert = document.createElement('div');
    alert.className = 'alert alert-success';
    alert.innerHTML = `✅ ${message}`;
    alert.style.marginBottom = '15px';

    const errorAlert = modalBody.querySelector('.alert-error');
    if (errorAlert) {
      errorAlert.remove();
    }

    modalBody.insertBefore(alert, modalBody.firstChild);
  }

  /**
   * Remove o modal do DOM
   * @private
   */
  removeModal() {
    const modal = document.getElementById('add-company-modal');
    const backdrop = document.getElementById('add-company-modal-backdrop');

    if (modal) modal.remove();
    if (backdrop) backdrop.remove();
  }

  /**
   * Limpa recursos
   */
  destroy() {
    this.removeModal();
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

// Inicializa automaticamente quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Será inicializado no main.js
  });
}
