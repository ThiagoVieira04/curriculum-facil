/**
 * Hook useCompanies
 * ==================
 * Gerencia estado de empresas com lógica centralizada
 * Compatível com vanilla JS e web (não depende de React)
 * 
 * Padrão: Observer com listeners para mudanças de estado
 */

class UseCompaniesHook {
  constructor() {
    // Estado privado
    this.state = {
      companies: [],
      loading: false,
      error: null,
      totalCount: 0,
      canAddMore: false,
      showAddButton: false
    };

    // Listeners para mudanças de estado
    this.listeners = [];

    // Inicializa com dados do localStorage
    this.initializeState();
  }

  /**
   * Inicializa estado com dados salvos
   */
  initializeState() {
    const stored = companyService.getFromStorage();
    this.updateStateInternal({
      companies: stored,
      totalCount: stored.length,
      canAddMore: !companyService.hasReachedMaxLimit(stored.length),
      showAddButton: companyService.shouldShowAddButton(stored.length)
    });
  }

  /**
   * Registra um listener para mudanças de estado
   * @param {Function} callback - Função chamada quando estado muda
   * @returns {Function} - Função para desinscrever
   */
  subscribe(callback) {
    this.listeners.push(callback);
    
    // Retorna função para unsubscribe
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notifica todos os listeners sobre mudanças
   * @private
   */
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Atualiza estado interno
   * @private
   */
  updateStateInternal(updates) {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Obtém estado atual
   * @returns {Object}
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Adiciona uma nova empresa
   * @param {Object} companyData - Dados da empresa
   * @returns {Promise<Object>} - { success: boolean, data?: Company, error?: string }
   */
  async addCompany(companyData) {
    try {
      // Validação local
      const validation = companyService.validateCompany(companyData);
      if (!validation.valid) {
        this.updateStateInternal({
          error: validation.errors[0]
        });
        this.notifyListeners();
        return { success: false, error: validation.errors[0] };
      }

      // Verifica limite máximo
      if (companyService.hasReachedMaxLimit(this.state.totalCount)) {
        const errorMsg = companyService.getMaxLimitMessage();
        this.updateStateInternal({ error: errorMsg });
        this.notifyListeners();
        return { success: false, error: errorMsg };
      }

      // Atualiza estado de loading
      this.updateStateInternal({
        loading: true,
        error: null
      });
      this.notifyListeners();

      // Formata dados para API
      const formattedData = companyService.formatForAPI(companyData);

      // Simula adicionar localmente e salvar
      const newCompanies = [...this.state.companies, formattedData];
      
      // Atualiza estado
      this.updateStateInternal({
        companies: newCompanies,
        totalCount: newCompanies.length,
        canAddMore: !companyService.hasReachedMaxLimit(newCompanies.length),
        showAddButton: companyService.shouldShowAddButton(newCompanies.length),
        loading: false
      });

      // Persiste no localStorage
      companyService.saveToStorage(newCompanies);

      this.notifyListeners();

      return { 
        success: true, 
        data: formattedData 
      };
    } catch (error) {
      const errorMsg = `Erro ao adicionar empresa: ${error.message}`;
      this.updateStateInternal({
        loading: false,
        error: errorMsg
      });
      this.notifyListeners();
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Remove uma empresa pelo índice
   * @param {number} index - Índice da empresa
   * @returns {Promise<boolean>}
   */
  async removeCompany(index) {
    try {
      if (index < 0 || index >= this.state.companies.length) {
        return false;
      }

      const newCompanies = this.state.companies.filter((_, i) => i !== index);

      this.updateStateInternal({
        companies: newCompanies,
        totalCount: newCompanies.length,
        canAddMore: !companyService.hasReachedMaxLimit(newCompanies.length),
        showAddButton: companyService.shouldShowAddButton(newCompanies.length),
        error: null
      });

      companyService.saveToStorage(newCompanies);
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('Erro ao remover empresa:', error);
      return false;
    }
  }

  /**
   * Atualiza uma empresa existente
   * @param {number} index - Índice da empresa
   * @param {Object} updates - Dados atualizados
   * @returns {Promise<boolean>}
   */
  async updateCompany(index, updates) {
    try {
      if (index < 0 || index >= this.state.companies.length) {
        return false;
      }

      const validation = companyService.validateCompany(updates);
      if (!validation.valid) {
        this.updateStateInternal({ error: validation.errors[0] });
        this.notifyListeners();
        return false;
      }

      const newCompanies = [...this.state.companies];
      newCompanies[index] = { ...newCompanies[index], ...updates };

      this.updateStateInternal({
        companies: newCompanies,
        error: null
      });

      companyService.saveToStorage(newCompanies);
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      return false;
    }
  }

  /**
   * Limpa o estado de erro
   */
  clearError() {
    this.updateStateInternal({ error: null });
    this.notifyListeners();
  }

  /**
   * Reset completo do estado
   */
  reset() {
    this.initializeState();
  }
}

// Singleton - instância única do hook
const useCompaniesHook = new UseCompaniesHook();
