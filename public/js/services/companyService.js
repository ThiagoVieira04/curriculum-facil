/**
 * Serviço de Gerenciamento de Empresas
 * =====================================
 * Centraliza toda a lógica de negócio relacionada a empresas
 * Separa concerns de UI da lógica de aplicação
 * 
 * Regras de Negócio:
 * - Máximo de 10 empresas por usuário
 * - Botão "+" visível apenas com > 3 empresas cadastradas
 * - Validação no backend como camada de segurança
 */

class CompanyService {
  constructor() {
    // Constantes de negócio
    this.MAX_COMPANIES = 10;
    this.SHOW_ADD_BUTTON_THRESHOLD = 3; // Mostrar botão quando tiver MAIS de 3
    this.API_BASE_URL = '/api';
    this.STORAGE_KEY = 'cv_companies';
  }

  /**
   * Verifica se o botão de adicionar deve estar visível
   * @param {number} companyCount - Número de empresas cadastradas
   * @returns {boolean}
   */
  shouldShowAddButton(companyCount) {
    return companyCount > this.SHOW_ADD_BUTTON_THRESHOLD;
  }

  /**
   * Verifica se o limite máximo de empresas foi atingido
   * @param {number} companyCount - Número de empresas cadastradas
   * @returns {boolean}
   */
  hasReachedMaxLimit(companyCount) {
    return companyCount >= this.MAX_COMPANIES;
  }

  /**
   * Valida dados de uma empresa
   * @param {Object} company - Dados da empresa
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateCompany(company) {
    const errors = [];

    if (!company.name || company.name.trim().length === 0) {
      errors.push('Nome da empresa é obrigatório');
    }

    if (company.name && company.name.length > 100) {
      errors.push('Nome da empresa não pode exceder 100 caracteres');
    }

    if (!company.position || company.position.trim().length === 0) {
      errors.push('Cargo/Função é obrigatório');
    }

    if (company.position && company.position.length > 100) {
      errors.push('Cargo/Função não pode exceder 100 caracteres');
    }

    if (company.startDate && !this.isValidDate(company.startDate)) {
      errors.push('Data de início inválida');
    }

    if (company.endDate && !this.isValidDate(company.endDate)) {
      errors.push('Data de término inválida');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Verifica se uma data é válida
   * @param {string} dateString - Data em formato ISO ou DD/MM/YYYY
   * @returns {boolean}
   */
  isValidDate(dateString) {
    if (!dateString) return true; // Campo opcional
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Obtém contagem de empresas do estado local
   * @param {Array} companies - Array de empresas
   * @returns {number}
   */
  getCompanyCount(companies) {
    return Array.isArray(companies) ? companies.length : 0;
  }

  /**
   * Obtém mensagem de erro amigável para limite atingido
   * @returns {string}
   */
  getMaxLimitMessage() {
    return `Você atingiu o limite máximo de ${this.MAX_COMPANIES} empresas. 
             Por favor, remova algumas para adicionar novas.`;
  }

  /**
   * Formata empresa para envio à API
   * @param {Object} company - Dados da empresa
   * @returns {Object}
   */
  formatForAPI(company) {
    return {
      name: company.name?.trim() || '',
      position: company.position?.trim() || '',
      description: company.description?.trim() || '',
      startDate: company.startDate || null,
      endDate: company.endDate || null,
      isCurrentlyWorking: company.isCurrentlyWorking || false
    };
  }

  /**
   * Obtém empresas do localStorage (fallback)
   * @returns {Array}
   */
  getFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Erro ao recuperar empresas do localStorage:', error);
      return [];
    }
  }

  /**
   * Salva empresas no localStorage
   * @param {Array} companies - Array de empresas
   */
  saveToStorage(companies) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(companies));
    } catch (error) {
      console.warn('Erro ao salvar empresas no localStorage:', error);
    }
  }

  /**
   * Obtém mensagem para o botão "+"
   * @param {number} companyCount - Número de empresas cadastradas
   * @returns {string}
   */
  getAddButtonTooltip(companyCount) {
    const remaining = this.MAX_COMPANIES - companyCount;
    return `Adicionar empresa (${remaining} vagas restantes)`;
  }
}

// Singleton - instância única do serviço
const companyService = new CompanyService();
