/**
 * Serviço de Extração Configurável - Estilo Adveronix
 *
 * Permite extrair dados do Meta Ads com configuração flexível de:
 * - Campos selecionados pelo usuário
 * - Breakdowns (segmentações)
 * - Conversões/eventos de pixel
 * - Período de datas
 * - Filtros customizados
 */

import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import {
  ALL_FIELDS,
  AVAILABLE_BREAKDOWNS,
  getFieldById,
  getBreakdownById,
} from '../../constants/fieldCatalog';
import type {
  ExtractionConfig,
  ExtractionResult,
  ExtractionProgress,
  ExtractionProgressCallback,
  ExtractedRecord,
  ResultColumnMeta,
  DateRangeConfig,
  DatePreset,
  ReportLevel,
} from '../../types/extraction';

// ============================================
// Constantes de configuração
// ============================================

const META_API_VERSION = 'v19.0';
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Rate limiting
const REQUEST_DELAY_MS = 500;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// ============================================
// Classe principal do serviço
// ============================================

export class ConfigurableExtractService {
  private accessToken: string;
  private progressCallback?: ExtractionProgressCallback;
  private startTime: number = 0;

  constructor(accessToken: string, progressCallback?: ExtractionProgressCallback) {
    this.accessToken = accessToken;
    this.progressCallback = progressCallback;
  }

  /**
   * Executa uma extração de dados com a configuração especificada
   */
  async extract(config: ExtractionConfig): Promise<ExtractionResult> {
    this.startTime = Date.now();

    try {
      // 1. Validar configuração
      this.updateProgress('validating', 0, 4, 'Validando configuração...');
      this.validateConfig(config);

      // 2. Construir parâmetros da API
      this.updateProgress('validating', 1, 4, 'Construindo parâmetros da requisição...');
      const apiParams = this.buildApiParams(config);

      // 3. Calcular período de datas
      this.updateProgress('validating', 2, 4, 'Calculando período de datas...');
      const dateRange = this.calculateDateRange(config.dateRange);

      // 4. Fazer requisição à API
      this.updateProgress('fetching_data', 0, 1, 'Buscando dados da Meta API...');
      const rawData = await this.fetchFromApi(config, apiParams, dateRange);

      // 5. Processar dados
      this.updateProgress('processing', 0, 1, 'Processando dados...');
      const processedData = this.processData(rawData, config);

      // 6. Construir metadados das colunas
      const columns = this.buildColumnMeta(config.selectedFields);

      // 7. Salvar histórico da extração
      this.updateProgress('saving', 0, 1, 'Salvando histórico...');
      await this.saveExtractionHistory(config, processedData.length, dateRange);

      // 8. Retornar resultado
      this.updateProgress('complete', 1, 1, 'Extração concluída!');

      return {
        success: true,
        data: processedData,
        columns,
        totalRecords: processedData.length,
        dateRange: {
          start: dateRange.startDate,
          end: dateRange.endDate,
        },
        durationMs: Date.now() - this.startTime,
      };
    } catch (error: any) {
      this.updateProgress('error', 0, 0, `Erro: ${error.message}`);

      logger.error('Erro na extração configurável', {
        error: error.message,
        config: {
          level: config.level,
          fieldsCount: config.selectedFields.length,
          breakdownsCount: config.breakdowns.length,
        },
      });

      return {
        success: false,
        data: [],
        columns: [],
        totalRecords: 0,
        dateRange: { start: '', end: '' },
        durationMs: Date.now() - this.startTime,
        error: error.message,
      };
    }
  }

  /**
   * Atualiza o progresso da extração
   */
  private updateProgress(
    phase: ExtractionProgress['phase'],
    current: number,
    total: number,
    message: string
  ): void {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    if (this.progressCallback) {
      this.progressCallback({
        phase,
        current,
        total,
        message,
        percentage,
      });
    }

    logger.info(`Extração: ${message}`, { phase, current, total, percentage });
  }

  /**
   * Valida a configuração de extração
   */
  private validateConfig(config: ExtractionConfig): void {
    if (!config.connectionId) {
      throw new Error('ID da conexão é obrigatório');
    }

    if (!config.accountId) {
      throw new Error('ID da conta de anúncios é obrigatório');
    }

    if (!config.selectedFields || config.selectedFields.length === 0) {
      throw new Error('Selecione pelo menos um campo para extração');
    }

    // Validar que os campos existem
    for (const fieldId of config.selectedFields) {
      const field = getFieldById(fieldId);
      if (!field) {
        throw new Error(`Campo desconhecido: ${fieldId}`);
      }

      // Validar que o campo está disponível para o nível selecionado
      if (!field.availableLevels.includes(config.level)) {
        throw new Error(
          `Campo "${field.displayName}" não está disponível no nível "${config.level}"`
        );
      }
    }

    // Validar breakdowns
    for (const breakdownId of config.breakdowns) {
      const breakdown = getBreakdownById(breakdownId);
      if (!breakdown) {
        throw new Error(`Breakdown desconhecido: ${breakdownId}`);
      }
    }

    // Validar incompatibilidades entre breakdowns
    this.validateBreakdownCompatibility(config.breakdowns);
  }

  /**
   * Valida se os breakdowns selecionados são compatíveis entre si
   */
  private validateBreakdownCompatibility(breakdownIds: string[]): void {
    for (const breakdownId of breakdownIds) {
      const breakdown = getBreakdownById(breakdownId);
      if (breakdown?.incompatibleWith) {
        for (const incompatible of breakdown.incompatibleWith) {
          if (breakdownIds.includes(incompatible)) {
            throw new Error(
              `Breakdowns incompatíveis: "${breakdown.displayName}" não pode ser usado com "${getBreakdownById(incompatible)?.displayName}"`
            );
          }
        }
      }
    }
  }

  /**
   * Constrói os parâmetros para a requisição à API
   */
  private buildApiParams(config: ExtractionConfig): {
    fields: string[];
    breakdowns: string[];
  } {
    // Mapear campos selecionados para campos da API
    const apiFields: string[] = [];

    // Campos de identificação baseados no nível
    if (config.level === 'campaign' || config.level === 'adset' || config.level === 'ad') {
      apiFields.push('campaign_id', 'campaign_name');
    }
    if (config.level === 'adset' || config.level === 'ad') {
      apiFields.push('adset_id', 'adset_name');
    }
    if (config.level === 'ad') {
      apiFields.push('ad_id', 'ad_name');
    }

    // Adicionar campos selecionados pelo usuário
    for (const fieldId of config.selectedFields) {
      const field = getFieldById(fieldId);
      if (field) {
        // Campos de ação precisam de tratamento especial
        if (field.apiField.startsWith('actions:')) {
          // Campos de conversão/ação - adicionamos 'actions' e processamos depois
          if (!apiFields.includes('actions')) {
            apiFields.push('actions');
          }
        } else if (field.apiField.startsWith('action_values:')) {
          // Valores de conversão
          if (!apiFields.includes('action_values')) {
            apiFields.push('action_values');
          }
        } else if (!apiFields.includes(field.apiField)) {
          apiFields.push(field.apiField);
        }
      }
    }

    // Sempre incluir data
    if (!apiFields.includes('date_start')) {
      apiFields.push('date_start');
    }
    if (!apiFields.includes('date_stop')) {
      apiFields.push('date_stop');
    }

    // Mapear breakdowns
    const apiBreakdowns = config.breakdowns
      .map(id => getBreakdownById(id)?.apiField)
      .filter((field): field is string => !!field);

    return {
      fields: apiFields,
      breakdowns: apiBreakdowns,
    };
  }

  /**
   * Calcula o período de datas baseado no preset ou datas customizadas
   */
  private calculateDateRange(dateRange: DateRangeConfig): {
    startDate: string;
    endDate: string;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate: Date;
    let endDate: Date;

    // Se incluir hoje, endDate é hoje, senão é ontem
    if (dateRange.includeToday !== false) {
      endDate = new Date(today);
    } else {
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() - 1);
    }

    // Calcular data inicial baseado no preset
    switch (dateRange.preset) {
      case 'today':
        startDate = new Date(today);
        endDate = new Date(today);
        break;

      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        break;

      case 'last_7_days':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 6);
        break;

      case 'last_14_days':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 13);
        break;

      case 'last_30_days':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 29);
        break;

      case 'last_90_days':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 89);
        break;

      case 'this_week':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        break;

      case 'last_week':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - startDate.getDay() - 7);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        break;

      case 'this_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;

      case 'last_month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;

      case 'this_quarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      }

      case 'last_quarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
        endDate = new Date(today.getFullYear(), quarter * 3, 0);
        break;
      }

      case 'this_year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;

      case 'last_year':
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        break;

      case 'lifetime':
        // Meta permite até 37 meses de histórico
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 36);
        break;

      case 'custom':
        if (!dateRange.startDate || !dateRange.endDate) {
          throw new Error('Para período personalizado, informe data inicial e final');
        }
        startDate = new Date(dateRange.startDate);
        endDate = new Date(dateRange.endDate);
        break;

      default:
        // Default: últimos 30 dias
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 29);
    }

    return {
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
    };
  }

  /**
   * Formata uma data para o formato da API (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Faz a requisição à API do Meta
   */
  private async fetchFromApi(
    config: ExtractionConfig,
    apiParams: { fields: string[]; breakdowns: string[] },
    dateRange: { startDate: string; endDate: string }
  ): Promise<any[]> {
    // Determinar o endpoint baseado no nível
    const endpoint = this.getEndpoint(config);

    // Construir URL
    const fieldsParam = apiParams.fields.join(',');
    const timeRange = encodeURIComponent(
      JSON.stringify({ since: dateRange.startDate, until: dateRange.endDate })
    );

    let url = `${META_API_BASE_URL}/${endpoint}?fields=${fieldsParam}&time_range=${timeRange}&time_increment=1&access_token=${this.accessToken}`;

    // Adicionar breakdowns se houver
    if (apiParams.breakdowns.length > 0) {
      url += `&breakdowns=${apiParams.breakdowns.join(',')}`;
    }

    // Adicionar limite se especificado
    if (config.limit && config.limit > 0) {
      url += `&limit=${config.limit}`;
    }

    logger.info('Fazendo requisição à Meta API', {
      endpoint,
      fieldsCount: apiParams.fields.length,
      breakdownsCount: apiParams.breakdowns.length,
      dateRange,
    });

    // Fazer requisição com paginação
    const allData: any[] = [];
    let hasNextPage = true;
    let pageCount = 0;

    while (hasNextPage) {
      const data = await this.fetchWithRetry(url);

      if (data.data && Array.isArray(data.data)) {
        allData.push(...data.data);
        pageCount++;

        this.updateProgress(
          'fetching_data',
          allData.length,
          allData.length,
          `Buscando dados... ${allData.length} registros (página ${pageCount})`
        );
      }

      // Verificar se há próxima página
      if (data.paging?.next) {
        url = data.paging.next;
        await this.sleep(REQUEST_DELAY_MS);
      } else {
        hasNextPage = false;
      }
    }

    logger.info('Dados recebidos da Meta API', {
      totalRecords: allData.length,
      pages: pageCount,
    });

    return allData;
  }

  /**
   * Determina o endpoint da API baseado no nível e configuração
   */
  private getEndpoint(config: ExtractionConfig): string {
    // Para insights, usamos o endpoint da conta com o nível especificado
    const levelParam = config.level === 'campaign' ? '' : `&level=${config.level}`;
    return `${config.accountId}/insights${levelParam}`;
  }

  /**
   * Faz uma requisição com retry automático
   */
  private async fetchWithRetry(url: string, retryCount = 0): Promise<any> {
    try {
      await this.sleep(REQUEST_DELAY_MS);

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        // Rate limit - aguarda e tenta novamente
        if (
          (data.error.code === 4 || data.error.code === 17) &&
          retryCount < MAX_RETRIES
        ) {
          const waitTime = RETRY_DELAY_MS * (retryCount + 1);
          logger.warn(`Rate limit atingido, aguardando ${waitTime}ms`, {
            retryCount: retryCount + 1,
          });

          this.updateProgress(
            'fetching_data',
            0,
            0,
            `Aguardando ${waitTime / 1000}s (limite da API)...`
          );

          await this.sleep(waitTime);
          return this.fetchWithRetry(url, retryCount + 1);
        }

        throw new Error(`Meta API Error: ${data.error.message}`);
      }

      return data;
    } catch (error: any) {
      if (retryCount < MAX_RETRIES) {
        await this.sleep(RETRY_DELAY_MS);
        return this.fetchWithRetry(url, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Processa os dados brutos da API para o formato de saída
   */
  private processData(rawData: any[], config: ExtractionConfig): ExtractedRecord[] {
    return rawData.map(row => {
      const record: ExtractedRecord = {};

      // Processar cada campo selecionado
      for (const fieldId of config.selectedFields) {
        const field = getFieldById(fieldId);
        if (!field) continue;

        // Campos de ação (conversões)
        if (field.apiField.startsWith('actions:')) {
          const actionType = field.apiField.split(':')[1];
          record[fieldId] = this.extractActionValue(row.actions, actionType);
        }
        // Valores de ação
        else if (field.apiField.startsWith('action_values:')) {
          const actionType = field.apiField.split(':')[1];
          record[fieldId] = this.extractActionValue(row.action_values, actionType);
        }
        // Campos diretos
        else {
          record[fieldId] = row[field.apiField] ?? null;
        }
      }

      // Adicionar breakdowns se existirem
      for (const breakdownId of config.breakdowns) {
        const breakdown = getBreakdownById(breakdownId);
        if (breakdown && row[breakdown.apiField] !== undefined) {
          record[breakdownId] = row[breakdown.apiField];
        }
      }

      // Sempre incluir data
      if (row.date_start) {
        record['date_start'] = row.date_start;
      }

      return record;
    });
  }

  /**
   * Extrai valor de uma ação específica do array de actions
   */
  private extractActionValue(actions: any[], actionType: string): number | null {
    if (!actions || !Array.isArray(actions)) return null;

    const action = actions.find(a => a.action_type === actionType);
    if (action && action.value !== undefined) {
      return parseFloat(action.value);
    }

    return null;
  }

  /**
   * Constrói os metadados das colunas para o resultado
   */
  private buildColumnMeta(selectedFields: string[]): ResultColumnMeta[] {
    return selectedFields
      .map(fieldId => {
        const field = getFieldById(fieldId);
        if (!field) return null;

        return {
          field: fieldId,
          displayName: field.displayName,
          dataType: field.dataType,
          category: field.category,
        };
      })
      .filter((col): col is ResultColumnMeta => col !== null);
  }

  /**
   * Salva o histórico da extração no banco de dados
   */
  private async saveExtractionHistory(
    config: ExtractionConfig,
    recordsCount: number,
    dateRange: { startDate: string; endDate: string }
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('extraction_history').insert({
        user_id: user.id,
        connection_id: config.connectionId,
        template_id: config.templateId || null,
        level: config.level,
        fields_extracted: config.selectedFields,
        breakdowns_used: config.breakdowns,
        conversions_included: config.conversions,
        date_start: dateRange.startDate,
        date_end: dateRange.endDate,
        records_count: recordsCount,
        status: 'completed',
        started_at: new Date(this.startTime).toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - this.startTime,
      });
    } catch (error) {
      logger.error('Erro ao salvar histórico de extração', { error });
      // Não propagar erro - histórico é secundário
    }
  }

  /**
   * Helper para aguardar um tempo
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// Funções auxiliares exportadas
// ============================================

/**
 * Busca eventos de pixel/conversão disponíveis para uma conta
 */
export async function fetchPixelEvents(
  accessToken: string,
  accountId: string
): Promise<{ id: string; name: string; eventCount: number }[]> {
  try {
    const url = `${META_API_BASE_URL}/${accountId}/customconversions?fields=id,name,custom_event_type,rule&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return (data.data || []).map((event: any) => ({
      id: event.id,
      name: event.name,
      eventCount: 0,
    }));
  } catch (error: any) {
    logger.error('Erro ao buscar eventos de pixel', { error: error.message });
    return [];
  }
}

/**
 * Detecta automaticamente as conversões disponíveis analisando dados recentes
 */
export async function detectAvailableConversions(
  accessToken: string,
  accountId: string
): Promise<string[]> {
  try {
    // Busca insights dos últimos 7 dias para identificar actions disponíveis
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const timeRange = encodeURIComponent(
      JSON.stringify({
        since: weekAgo.toISOString().split('T')[0],
        until: today.toISOString().split('T')[0],
      })
    );

    const url = `${META_API_BASE_URL}/${accountId}/insights?fields=actions&time_range=${timeRange}&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    // Extrair tipos de ação únicos
    const actionTypes = new Set<string>();
    for (const row of data.data || []) {
      if (row.actions) {
        for (const action of row.actions) {
          actionTypes.add(action.action_type);
        }
      }
    }

    return Array.from(actionTypes);
  } catch (error: any) {
    logger.error('Erro ao detectar conversões', { error: error.message });
    return [];
  }
}
