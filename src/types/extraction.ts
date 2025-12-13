/**
 * Tipos para o sistema de extração de dados estilo Adveronix
 * Permite configuração flexível de campos, breakdowns e conversões
 */

// ============================================
// Tipos de Nível de Relatório
// ============================================

/**
 * Nível do relatório - determina a granularidade dos dados
 */
export type ReportLevel = 'campaign' | 'adset' | 'ad';

/**
 * Plataforma de anúncios suportada
 */
export type AdPlatform = 'meta' | 'google' | 'tiktok';

// ============================================
// Tipos de Campos
// ============================================

/**
 * Categoria de campo para organização na UI
 */
export type FieldCategory =
  | 'dimension'      // Campos de dimensão (nome, id, etc)
  | 'delivery'       // Métricas de entrega (impressões, alcance)
  | 'performance'    // Métricas de performance (cliques, CTR)
  | 'cost'           // Métricas de custo (spend, CPC, CPM)
  | 'engagement'     // Métricas de engajamento
  | 'video'          // Métricas de vídeo
  | 'conversion'     // Métricas de conversão
  | 'attribution';   // Métricas de atribuição

/**
 * Tipo de dado do campo
 */
export type FieldDataType =
  | 'string'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'integer';

/**
 * Definição de um campo disponível para extração
 */
export interface FieldDefinition {
  // Identificador único do campo
  id: string;

  // Nome para exibição na UI
  displayName: string;

  // Descrição do campo
  description: string;

  // Nome do campo na API da plataforma
  apiField: string;

  // Categoria para agrupamento na UI
  category: FieldCategory;

  // Tipo de dado para formatação
  dataType: FieldDataType;

  // Plataformas onde este campo está disponível
  platforms: AdPlatform[];

  // Níveis de relatório onde este campo está disponível
  availableLevels: ReportLevel[];

  // Se o campo requer breakdown específico
  requiresBreakdown?: string[];

  // Campos que não podem ser usados junto com este
  incompatibleWith?: string[];

  // Se requer permissão especial do token
  requiresPermission?: string;

  // Se é um campo calculado (não vem direto da API)
  isCalculated?: boolean;

  // Fórmula para campos calculados
  formula?: string;

  // Ordem de exibição padrão
  displayOrder?: number;

  // Se é um campo popular/recomendado
  isPopular?: boolean;
}

// ============================================
// Tipos de Breakdowns
// ============================================

/**
 * Definição de um breakdown disponível
 */
export interface BreakdownDefinition {
  // Identificador único
  id: string;

  // Nome para exibição
  displayName: string;

  // Descrição
  description: string;

  // Nome na API
  apiField: string;

  // Plataformas disponíveis
  platforms: AdPlatform[];

  // Breakdowns incompatíveis (não podem ser combinados)
  incompatibleWith?: string[];

  // Se é um breakdown de tempo
  isTimeBreakdown?: boolean;

  // Valores possíveis (para breakdowns fixos como age, gender)
  possibleValues?: string[];
}

// ============================================
// Tipos de Conversões/Eventos de Pixel
// ============================================

/**
 * Evento de pixel/conversão detectado
 */
export interface PixelEvent {
  id: string;
  userId: string;
  connectionId: string;
  eventName: string;
  displayName: string;
  actionType: string;
  pixelId?: string;
  isCustom: boolean;
  isEnabled: boolean;
  eventCount?: number;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Conversão padrão do Meta Ads
 */
export interface StandardConversion {
  id: string;
  displayName: string;
  actionType: string;
  description: string;
  category: 'standard' | 'custom' | 'app';
}

// ============================================
// Tipos de Templates de Relatório
// ============================================

/**
 * Template de relatório salvo pelo usuário
 */
export interface ReportTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string;
  level: ReportLevel;
  platform: AdPlatform;
  selectedFields: string[];
  breakdowns: string[];
  filters: ReportFilters;
  datePreset: DatePreset;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input para criar/atualizar template
 */
export interface ReportTemplateInput {
  name: string;
  description?: string;
  level: ReportLevel;
  platform: AdPlatform;
  selectedFields: string[];
  breakdowns: string[];
  filters?: ReportFilters;
  datePreset?: DatePreset;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isDefault?: boolean;
}

// ============================================
// Tipos de Filtros
// ============================================

/**
 * Operadores de filtro disponíveis
 */
export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty';

/**
 * Um filtro individual
 */
export interface ReportFilter {
  field: string;
  operator: FilterOperator;
  value: string | number | string[] | number[];
}

/**
 * Conjunto de filtros para um relatório
 */
export interface ReportFilters {
  // Filtros de status
  status?: ('ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED')[];

  // Filtros de objetivo
  objectives?: string[];

  // Filtros customizados
  custom?: ReportFilter[];
}

// ============================================
// Tipos de Período
// ============================================

/**
 * Presets de período disponíveis
 */
export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_14_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'lifetime'
  | 'custom';

/**
 * Configuração de período para extração
 */
export interface DateRangeConfig {
  preset: DatePreset;
  startDate?: string;  // YYYY-MM-DD format
  endDate?: string;    // YYYY-MM-DD format
  includeToday?: boolean;
}

// ============================================
// Tipos de Configuração de Extração
// ============================================

/**
 * Configuração completa para uma extração de dados
 */
export interface ExtractionConfig {
  // Conexão/conta a usar
  connectionId: string;
  accountId: string;

  // Nível do relatório
  level: ReportLevel;

  // Campos selecionados para extração
  selectedFields: string[];

  // Breakdowns a aplicar
  breakdowns: string[];

  // Conversões/eventos a incluir
  conversions: string[];

  // Configuração de período
  dateRange: DateRangeConfig;

  // Filtros adicionais
  filters?: ReportFilters;

  // Ordenação
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  // Limite de registros (0 = sem limite)
  limit?: number;

  // Template usado (se houver)
  templateId?: string;
}

// ============================================
// Tipos de Resultado da Extração
// ============================================

/**
 * Um registro de dados extraído
 */
export interface ExtractedRecord {
  [key: string]: string | number | null;
}

/**
 * Metadados de uma coluna no resultado
 */
export interface ResultColumnMeta {
  field: string;
  displayName: string;
  dataType: FieldDataType;
  category: FieldCategory;
}

/**
 * Resultado completo de uma extração
 */
export interface ExtractionResult {
  // Status da extração
  success: boolean;

  // Dados extraídos
  data: ExtractedRecord[];

  // Metadados das colunas
  columns: ResultColumnMeta[];

  // Total de registros
  totalRecords: number;

  // Período extraído
  dateRange: {
    start: string;
    end: string;
  };

  // Tempo de execução em ms
  durationMs: number;

  // Erro se houver
  error?: string;

  // Avisos (ex: dados incompletos)
  warnings?: string[];
}

// ============================================
// Tipos de Histórico de Extração
// ============================================

/**
 * Status de uma extração
 */
export type ExtractionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Registro no histórico de extrações
 */
export interface ExtractionHistoryEntry {
  id: string;
  userId: string;
  connectionId: string;
  templateId?: string;
  templateName?: string;
  level: ReportLevel;
  fieldsExtracted: string[];
  breakdownsUsed: string[];
  conversionsIncluded: string[];
  dateStart: string;
  dateEnd: string;
  recordsCount: number;
  status: ExtractionStatus;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  exportFormat?: string;
  createdAt: string;
}

// ============================================
// Tipos de Progresso
// ============================================

/**
 * Fase da extração para indicador de progresso
 */
export type ExtractionPhase =
  | 'initializing'
  | 'validating'
  | 'fetching_structure'
  | 'fetching_data'
  | 'processing'
  | 'saving'
  | 'complete'
  | 'error';

/**
 * Progresso da extração para atualização de UI
 */
export interface ExtractionProgress {
  phase: ExtractionPhase;
  current: number;
  total: number;
  message: string;
  percentage: number;
  estimatedTimeRemaining?: number; // em segundos
}

/**
 * Callback de progresso
 */
export type ExtractionProgressCallback = (progress: ExtractionProgress) => void;

// ============================================
// Tipos de Exportação
// ============================================

/**
 * Formato de exportação disponível
 */
export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'google_sheets';

/**
 * Configuração de exportação
 */
export interface ExportConfig {
  format: ExportFormat;
  filename?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
  numberFormat?: string;
  currencySymbol?: string;
}
