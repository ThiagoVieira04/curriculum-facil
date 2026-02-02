/**
 * Middleware de Validação de Empresas
 * ===================================
 * Camada de segurança no backend
 * Evita que usuários contornem limite via API
 */

const COMPANY_LIMITS = {
  MAX_COMPANIES: 10,
  MAX_NAME_LENGTH: 100,
  MAX_POSITION_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
};

/**
 * Valida dados de empresa no backend
 * @param {Object} company - Dados da empresa
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateCompanyData(company) {
  const errors = [];

  // Nome obrigatório
  if (!company.name || typeof company.name !== 'string') {
    errors.push('Nome da empresa é obrigatório e deve ser texto');
  } else if (company.name.trim().length === 0) {
    errors.push('Nome da empresa não pode estar vazio');
  } else if (company.name.length > COMPANY_LIMITS.MAX_NAME_LENGTH) {
    errors.push(`Nome deve ter no máximo ${COMPANY_LIMITS.MAX_NAME_LENGTH} caracteres`);
  }

  // Posição obrigatória
  if (!company.position || typeof company.position !== 'string') {
    errors.push('Cargo/Função é obrigatório e deve ser texto');
  } else if (company.position.trim().length === 0) {
    errors.push('Cargo/Função não pode estar vazio');
  } else if (company.position.length > COMPANY_LIMITS.MAX_POSITION_LENGTH) {
    errors.push(`Cargo/Função deve ter no máximo ${COMPANY_LIMITS.MAX_POSITION_LENGTH} caracteres`);
  }

  // Descrição opcional
  if (company.description && company.description.length > COMPANY_LIMITS.MAX_DESCRIPTION_LENGTH) {
    errors.push(`Descrição deve ter no máximo ${COMPANY_LIMITS.MAX_DESCRIPTION_LENGTH} caracteres`);
  }

  // Datas opcionais
  if (company.startDate) {
    const date = new Date(company.startDate);
    if (isNaN(date.getTime())) {
      errors.push('Data de início inválida');
    }
  }

  if (company.endDate) {
    const date = new Date(company.endDate);
    if (isNaN(date.getTime())) {
      errors.push('Data de término inválida');
    }
  }

  // Validação cruzada de datas
  if (company.startDate && company.endDate) {
    const start = new Date(company.startDate);
    const end = new Date(company.endDate);
    if (start > end) {
      errors.push('Data de início não pode ser depois da data de término');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Verifica se o usuário pode adicionar mais empresas
 * @param {number} currentCompanyCount - Número atual de empresas
 * @returns {Object} { canAdd: boolean, message?: string }
 */
function checkCompanyLimit(currentCompanyCount) {
  if (currentCompanyCount >= COMPANY_LIMITS.MAX_COMPANIES) {
    return {
      canAdd: false,
      message: `Limite de ${COMPANY_LIMITS.MAX_COMPANIES} empresas atingido. Remova alguma para adicionar nova.`
    };
  }

  return { canAdd: true };
}

/**
 * Middleware de validação de empresa para requisições POST
 */
function validateCompanyMiddleware(req, res, next) {
  const company = req.body;

  // Se não é uma requisição de empresa, continua
  if (!req.path.includes('/company') && !req.path.includes('/companies')) {
    return next();
  }

  const validation = validateCompanyData(company);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: 'Dados de empresa inválidos',
      errors: validation.errors,
      statusCode: 400
    });
  }

  // Passa para o próximo middleware
  next();
}

/**
 * Middleware para validar limite de empresas
 */
function validateCompanyLimitMiddleware(req, res, next) {
  // Se não é POST para adicionar empresa, continua
  if (req.method !== 'POST' || !req.path.includes('/company')) {
    return next();
  }

  const currentCount = req.body.currentCompanyCount || 0;
  const limit = checkCompanyLimit(currentCount);

  if (!limit.canAdd) {
    return res.status(400).json({
      success: false,
      message: limit.message,
      statusCode: 400,
      reason: 'LIMIT_REACHED'
    });
  }

  next();
}

module.exports = {
  validateCompanyData,
  checkCompanyLimit,
  validateCompanyMiddleware,
  validateCompanyLimitMiddleware,
  COMPANY_LIMITS
};
