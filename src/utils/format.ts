/**
 * Utilitários de Formatação
 *
 * Este arquivo contém funções auxiliares para formatação de dados
 * como números, moedas, datas, porcentagens e outros valores comuns.
 */

/**
 * Formata um número como moeda em Reais (BRL)
 *
 * @param value - Valor numérico a ser formatado
 * @param showCurrency - Se true, exibe o símbolo R$
 * @returns String formatada como moeda
 *
 * @example
 * formatCurrency(1234.56) // "R$ 1.234,56"
 * formatCurrency(1234.56, false) // "1.234,56"
 */
export const formatCurrency = (value: number, showCurrency = true): string => {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return showCurrency ? `R$ ${formatted}` : formatted;
};

/**
 * Formata um número com separadores de milhar
 *
 * @param value - Valor numérico a ser formatado
 * @param decimals - Número de casas decimais (padrão: 0)
 * @returns String formatada com separadores
 *
 * @example
 * formatNumber(1234567) // "1.234.567"
 * formatNumber(1234.5678, 2) // "1.234,57"
 */
export const formatNumber = (value: number, decimals = 0): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Formata um número como porcentagem
 *
 * @param value - Valor numérico (0.15 = 15%)
 * @param decimals - Número de casas decimais (padrão: 2)
 * @param showSymbol - Se true, exibe o símbolo %
 * @returns String formatada como porcentagem
 *
 * @example
 * formatPercentage(0.1545) // "15,45%"
 * formatPercentage(0.1545, 0) // "15%"
 * formatPercentage(15.45, 2, false) // "15,45" (se o valor já está em %)
 */
export const formatPercentage = (
  value: number,
  decimals = 2,
  showSymbol = true
): string => {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return showSymbol ? `${formatted}%` : formatted;
};

/**
 * Formata números grandes com abreviações (K, M, B)
 *
 * @param value - Valor numérico a ser formatado
 * @param decimals - Número de casas decimais (padrão: 1)
 * @returns String formatada com abreviação
 *
 * @example
 * formatCompactNumber(1234) // "1,2K"
 * formatCompactNumber(1234567) // "1,2M"
 * formatCompactNumber(1234567890) // "1,2B"
 */
export const formatCompactNumber = (value: number, decimals = 1): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e9) {
    return `${sign}${(absValue / 1e9).toFixed(decimals)}B`;
  } else if (absValue >= 1e6) {
    return `${sign}${(absValue / 1e6).toFixed(decimals)}M`;
  } else if (absValue >= 1e3) {
    return `${sign}${(absValue / 1e3).toFixed(decimals)}K`;
  } else {
    return `${sign}${absValue.toFixed(decimals)}`;
  }
};

/**
 * Formata um número de telefone brasileiro
 *
 * @param phone - Número de telefone (apenas dígitos)
 * @returns String formatada como telefone
 *
 * @example
 * formatPhone("11987654321") // "(11) 98765-4321"
 * formatPhone("1132145678") // "(11) 3214-5678"
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
};

/**
 * Formata um CPF
 *
 * @param cpf - CPF (apenas dígitos)
 * @returns String formatada como CPF
 *
 * @example
 * formatCPF("12345678900") // "123.456.789-00"
 */
export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');

  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }

  return cpf;
};

/**
 * Formata um CNPJ
 *
 * @param cnpj - CNPJ (apenas dígitos)
 * @returns String formatada como CNPJ
 *
 * @example
 * formatCNPJ("12345678000190") // "12.345.678/0001-90"
 */
export const formatCNPJ = (cnpj: string): string => {
  const cleaned = cnpj.replace(/\D/g, '');

  if (cleaned.length === 14) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  }

  return cnpj;
};

/**
 * Formata um CEP
 *
 * @param cep - CEP (apenas dígitos)
 * @returns String formatada como CEP
 *
 * @example
 * formatCEP("01310100") // "01310-100"
 */
export const formatCEP = (cep: string): string => {
  const cleaned = cep.replace(/\D/g, '');

  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }

  return cep;
};

/**
 * Trunca um texto e adiciona reticências
 *
 * @param text - Texto a ser truncado
 * @param maxLength - Comprimento máximo
 * @param ellipsis - Caractere(s) de reticências (padrão: "...")
 * @returns Texto truncado
 *
 * @example
 * truncateText("Este é um texto muito longo", 15) // "Este é um te..."
 */
export const truncateText = (
  text: string,
  maxLength: number,
  ellipsis = '...'
): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
};

/**
 * Capitaliza a primeira letra de cada palavra
 *
 * @param text - Texto a ser capitalizado
 * @returns Texto com primeira letra de cada palavra maiúscula
 *
 * @example
 * capitalize("hello world") // "Hello World"
 */
export const capitalize = (text: string): string => {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Formata bytes em unidades legíveis (KB, MB, GB, TB)
 *
 * @param bytes - Tamanho em bytes
 * @param decimals - Número de casas decimais (padrão: 2)
 * @returns String formatada com unidade
 *
 * @example
 * formatBytes(1024) // "1.00 KB"
 * formatBytes(1048576) // "1.00 MB"
 * formatBytes(1073741824) // "1.00 GB"
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

/**
 * Remove acentos de uma string
 *
 * @param text - Texto com acentos
 * @returns Texto sem acentos
 *
 * @example
 * removeAccents("José João") // "Jose Joao"
 */
export const removeAccents = (text: string): string => {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Gera iniciais de um nome
 *
 * @param name - Nome completo
 * @param maxInitials - Número máximo de iniciais (padrão: 2)
 * @returns Iniciais em maiúsculas
 *
 * @example
 * getInitials("João da Silva") // "JS"
 * getInitials("Maria José dos Santos", 3) // "MJS"
 */
export const getInitials = (name: string, maxInitials = 2): string => {
  return name
    .split(' ')
    .filter(word => word.length > 0)
    .slice(0, maxInitials)
    .map(word => word[0].toUpperCase())
    .join('');
};

/**
 * Formata um slug a partir de um texto
 *
 * @param text - Texto a ser convertido
 * @returns Slug formatado (lowercase, sem espaços, sem acentos)
 *
 * @example
 * slugify("Hello World!") // "hello-world"
 * slugify("José da Silva") // "jose-da-silva"
 */
export const slugify = (text: string): string => {
  return removeAccents(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Mascara um email parcialmente para privacidade
 *
 * @param email - Email a ser mascarado
 * @returns Email parcialmente mascarado
 *
 * @example
 * maskEmail("usuario@example.com") // "us****o@example.com"
 */
export const maskEmail = (email: string): string => {
  const [username, domain] = email.split('@');
  if (username.length <= 2) return email;

  const maskedUsername =
    username[0] + '*'.repeat(username.length - 2) + username[username.length - 1];

  return `${maskedUsername}@${domain}`;
};

/**
 * Mascara um CPF parcialmente para privacidade
 *
 * @param cpf - CPF a ser mascarado
 * @returns CPF parcialmente mascarado
 *
 * @example
 * maskCPF("123.456.789-00") // "***.456.789-**"
 */
export const maskCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;

  return `***.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-**`;
};
