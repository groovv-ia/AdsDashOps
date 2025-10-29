/**
 * Utilitários de Validação
 *
 * Funções para validar diferentes tipos de dados e formatos.
 * Útil para validação de formulários e entrada de dados do usuário.
 */

/**
 * Valida se um email é válido
 *
 * @param email - Email a ser validado
 * @returns true se válido
 *
 * @example
 * isValidEmail("usuario@example.com") // true
 * isValidEmail("invalid-email") // false
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida se um CPF é válido (com verificação de dígitos)
 *
 * @param cpf - CPF a ser validado (com ou sem formatação)
 * @returns true se válido
 *
 * @example
 * isValidCPF("123.456.789-09") // false (dígitos inválidos)
 * isValidCPF("11144477735") // true
 */
export const isValidCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, '');

  // Verifica se tem 11 dígitos
  if (cleaned.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;

  // Valida primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;

  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(10))) return false;

  return true;
};

/**
 * Valida se um CNPJ é válido (com verificação de dígitos)
 *
 * @param cnpj - CNPJ a ser validado (com ou sem formatação)
 * @returns true se válido
 *
 * @example
 * isValidCNPJ("11.222.333/0001-81") // true
 */
export const isValidCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/\D/g, '');

  // Verifica se tem 14 dígitos
  if (cleaned.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;

  // Valida primeiro dígito verificador
  let length = cleaned.length - 2;
  let numbers = cleaned.substring(0, length);
  const digits = cleaned.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  // Valida segundo dígito verificador
  length = length + 1;
  numbers = cleaned.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
};

/**
 * Valida se um telefone brasileiro é válido
 *
 * @param phone - Telefone a ser validado
 * @returns true se válido
 *
 * @example
 * isValidPhone("(11) 98765-4321") // true
 * isValidPhone("11987654321") // true
 * isValidPhone("123") // false
 */
export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
};

/**
 * Valida se um CEP é válido
 *
 * @param cep - CEP a ser validado
 * @returns true se válido
 *
 * @example
 * isValidCEP("01310-100") // true
 * isValidCEP("01310100") // true
 */
export const isValidCEP = (cep: string): boolean => {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8;
};

/**
 * Valida se uma URL é válida
 *
 * @param url - URL a ser validada
 * @returns true se válida
 *
 * @example
 * isValidURL("https://example.com") // true
 * isValidURL("not-a-url") // false
 */
export const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Valida força da senha
 *
 * @param password - Senha a ser validada
 * @returns Objeto com score (0-4) e detalhes da validação
 *
 * @example
 * validatePassword("123") // { score: 0, hasMinLength: false, ... }
 * validatePassword("Senha@123") // { score: 4, hasMinLength: true, ... }
 */
export interface PasswordStrength {
  score: number; // 0 = muito fraca, 4 = muito forte
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  message: string;
}

export const validatePassword = (password: string): PasswordStrength => {
  const result: PasswordStrength = {
    score: 0,
    hasMinLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    message: '',
  };

  // Calcula score baseado nos critérios atendidos
  if (result.hasMinLength) result.score++;
  if (result.hasUpperCase) result.score++;
  if (result.hasLowerCase) result.score++;
  if (result.hasNumber) result.score++;
  if (result.hasSpecialChar) result.score++;

  // Define mensagem baseada no score
  if (result.score === 0) {
    result.message = 'Senha muito fraca';
  } else if (result.score <= 2) {
    result.message = 'Senha fraca';
  } else if (result.score === 3) {
    result.message = 'Senha média';
  } else if (result.score === 4) {
    result.message = 'Senha forte';
  } else {
    result.message = 'Senha muito forte';
  }

  return result;
};

/**
 * Valida se o valor está dentro de um range
 *
 * @param value - Valor a ser validado
 * @param min - Valor mínimo
 * @param max - Valor máximo
 * @returns true se está dentro do range
 *
 * @example
 * isInRange(5, 1, 10) // true
 * isInRange(15, 1, 10) // false
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Valida se uma string tem o comprimento mínimo
 *
 * @param value - String a ser validada
 * @param minLength - Comprimento mínimo
 * @returns true se atende o mínimo
 */
export const hasMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};

/**
 * Valida se uma string tem o comprimento máximo
 *
 * @param value - String a ser validada
 * @param maxLength - Comprimento máximo
 * @returns true se não excede o máximo
 */
export const hasMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};

/**
 * Valida se um valor é numérico
 *
 * @param value - Valor a ser validado
 * @returns true se é numérico
 *
 * @example
 * isNumeric("123") // true
 * isNumeric("12.34") // true
 * isNumeric("abc") // false
 */
export const isNumeric = (value: string): boolean => {
  return !isNaN(Number(value)) && value.trim() !== '';
};

/**
 * Valida se um valor é um inteiro
 *
 * @param value - Valor a ser validado
 * @returns true se é inteiro
 */
export const isInteger = (value: string | number): boolean => {
  const num = typeof value === 'string' ? Number(value) : value;
  return Number.isInteger(num);
};

/**
 * Valida se um cartão de crédito é válido (algoritmo de Luhn)
 *
 * @param cardNumber - Número do cartão
 * @returns true se válido
 *
 * @example
 * isValidCreditCard("4532015112830366") // true (Visa)
 */
export const isValidCreditCard = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\D/g, '');

  if (cleaned.length < 13 || cleaned.length > 19) return false;

  let sum = 0;
  let isEven = false;

  // Percorre de trás para frente
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i));

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

/**
 * Identifica bandeira do cartão de crédito
 *
 * @param cardNumber - Número do cartão
 * @returns Nome da bandeira ou null
 *
 * @example
 * getCardBrand("4532015112830366") // "Visa"
 * getCardBrand("5425233430109903") // "Mastercard"
 */
export const getCardBrand = (cardNumber: string): string | null => {
  const cleaned = cardNumber.replace(/\D/g, '');

  // Visa
  if (/^4/.test(cleaned)) return 'Visa';

  // Mastercard
  if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'Mastercard';

  // American Express
  if (/^3[47]/.test(cleaned)) return 'American Express';

  // Diners Club
  if (/^3(?:0[0-5]|[68])/.test(cleaned)) return 'Diners Club';

  // Discover
  if (/^6(?:011|5)/.test(cleaned)) return 'Discover';

  // JCB
  if (/^35/.test(cleaned)) return 'JCB';

  // Elo
  if (/^(4011|4312|4389|4514|4573|5041|5066|5067|5090|6277|6362|6363|6504|6505|6516)/.test(cleaned)) {
    return 'Elo';
  }

  // Hipercard
  if (/^(3841|606282)/.test(cleaned)) return 'Hipercard';

  return null;
};

/**
 * Valida se um valor está vazio (null, undefined, string vazia, array vazio)
 *
 * @param value - Valor a ser validado
 * @returns true se vazio
 *
 * @example
 * isEmpty("") // true
 * isEmpty(null) // true
 * isEmpty([]) // true
 * isEmpty("texto") // false
 */
export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Valida campos obrigatórios de um objeto
 *
 * @param data - Objeto com dados
 * @param requiredFields - Array com nomes dos campos obrigatórios
 * @returns Objeto com resultado da validação
 *
 * @example
 * validateRequired({ nome: "João", email: "" }, ["nome", "email"])
 * // { isValid: false, missingFields: ["email"] }
 */
export const validateRequired = (
  data: Record<string, any>,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } => {
  const missingFields = requiredFields.filter(field => isEmpty(data[field]));

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * Valida formato de data ISO (YYYY-MM-DD)
 *
 * @param dateString - String da data
 * @returns true se válida
 *
 * @example
 * isValidISODate("2025-10-29") // true
 * isValidISODate("29/10/2025") // false
 */
export const isValidISODate = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Sanitiza string removendo caracteres especiais
 *
 * @param value - String a ser sanitizada
 * @param allowedChars - Regex de caracteres permitidos
 * @returns String sanitizada
 *
 * @example
 * sanitizeString("João123!@#") // "João123"
 * sanitizeString("test@#123", /[a-z0-9]/gi) // "test123"
 */
export const sanitizeString = (
  value: string,
  allowedChars: RegExp = /[a-zA-ZÀ-ÿ0-9\s]/g
): string => {
  return value.match(allowedChars)?.join('') || '';
};
