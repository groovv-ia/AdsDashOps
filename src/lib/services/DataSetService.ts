/**
 * DataSetService - Serviço de Persistência de Dados Extraídos
 *
 * Gerencia o armazenamento permanente de dados extraídos no Supabase,
 * permitindo criar, ler, atualizar e excluir conjuntos de dados salvos.
 */

import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import type { ExtractionResult, ExtractionConfig, ResultColumnMeta } from '../../types/extraction';

// ============================================
// Tipos e Interfaces
// ============================================

/** Representa um conjunto de dados salvo no banco */
export interface SavedDataSet {
  id: string;
  user_id: string;
  client_id: string | null;
  connection_id: string | null;
  name: string;
  description: string | null;
  platform: string;
  extraction_config: ExtractionConfig;
  data: Record<string, any>[];
  columns_meta: ResultColumnMeta[];
  date_range_start: string | null;
  date_range_end: string | null;
  record_count: number;
  created_at: string;
  updated_at: string;
}

/** Dados para criar um novo data set */
export interface CreateDataSetInput {
  name: string;
  description?: string;
  platform: string;
  clientId?: string;
  connectionId?: string;
  extractionConfig: ExtractionConfig;
  data: Record<string, any>[];
  columnsMeta: ResultColumnMeta[];
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

/** Dados para atualizar um data set existente */
export interface UpdateDataSetInput {
  name?: string;
  description?: string;
  data?: Record<string, any>[];
  columnsMeta?: ResultColumnMeta[];
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

/** Resultado da listagem de data sets */
export interface DataSetListItem {
  id: string;
  name: string;
  description: string | null;
  platform: string;
  record_count: number;
  date_range_start: string | null;
  date_range_end: string | null;
  created_at: string;
  updated_at: string;
  client_id: string | null;
  has_schedule: boolean;
  schedule_frequency?: string;
  dashboard_count: number;
}

// ============================================
// Classe Principal
// ============================================

export class DataSetService {
  /**
   * Cria um novo conjunto de dados salvo
   */
  async create(input: CreateDataSetInput): Promise<{ success: boolean; dataSet?: SavedDataSet; error?: string }> {
    try {
      // Obter usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Inserir no banco
      const { data, error } = await supabase
        .from('saved_data_sets')
        .insert({
          user_id: user.id,
          name: input.name,
          description: input.description || null,
          platform: input.platform,
          client_id: input.clientId || null,
          connection_id: input.connectionId || null,
          extraction_config: input.extractionConfig,
          data: input.data,
          columns_meta: input.columnsMeta,
          date_range_start: input.dateRangeStart || null,
          date_range_end: input.dateRangeEnd || null,
          record_count: input.data.length,
        })
        .select()
        .single();

      if (error) {
        logger.error('Erro ao criar data set', { error });
        return { success: false, error: error.message };
      }

      logger.info('Data set criado com sucesso', {
        id: data.id,
        name: data.name,
        recordCount: data.record_count
      });

      return { success: true, dataSet: data as SavedDataSet };
    } catch (error: any) {
      logger.error('Erro ao criar data set', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria data set a partir do resultado de uma extração
   */
  async createFromExtraction(
    name: string,
    description: string | undefined,
    extractionResult: ExtractionResult,
    extractionConfig: ExtractionConfig,
    clientId?: string
  ): Promise<{ success: boolean; dataSet?: SavedDataSet; error?: string }> {
    if (!extractionResult.success || !extractionResult.data.length) {
      return { success: false, error: 'Resultado da extração inválido ou vazio' };
    }

    return this.create({
      name,
      description,
      platform: 'meta',
      clientId,
      connectionId: extractionConfig.connectionId,
      extractionConfig,
      data: extractionResult.data,
      columnsMeta: extractionResult.columns,
      dateRangeStart: extractionResult.dateRange.start,
      dateRangeEnd: extractionResult.dateRange.end,
    });
  }

  /**
   * Lista todos os conjuntos de dados do usuário
   */
  async list(clientId?: string): Promise<{ success: boolean; dataSets?: DataSetListItem[]; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Buscar data sets com contagem de dashboards e schedules
      let query = supabase
        .from('saved_data_sets')
        .select(`
          id,
          name,
          description,
          platform,
          record_count,
          date_range_start,
          date_range_end,
          created_at,
          updated_at,
          client_id,
          dashboard_instances!dashboard_instances_data_set_id_fkey(count),
          scheduled_extractions!scheduled_extractions_data_set_id_fkey(
            id,
            frequency,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Filtrar por cliente se especificado
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao listar data sets', { error });
        return { success: false, error: error.message };
      }

      // Mapear para o formato de saída
      const dataSets: DataSetListItem[] = (data || []).map((item: any) => {
        const activeSchedule = item.scheduled_extractions?.find((s: any) => s.is_active);

        return {
          id: item.id,
          name: item.name,
          description: item.description,
          platform: item.platform,
          record_count: item.record_count,
          date_range_start: item.date_range_start,
          date_range_end: item.date_range_end,
          created_at: item.created_at,
          updated_at: item.updated_at,
          client_id: item.client_id,
          has_schedule: !!activeSchedule,
          schedule_frequency: activeSchedule?.frequency,
          dashboard_count: item.dashboard_instances?.[0]?.count || 0,
        };
      });

      return { success: true, dataSets };
    } catch (error: any) {
      logger.error('Erro ao listar data sets', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca um conjunto de dados pelo ID (com dados completos)
   */
  async getById(id: string): Promise<{ success: boolean; dataSet?: SavedDataSet; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      const { data, error } = await supabase
        .from('saved_data_sets')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Erro ao buscar data set', { error, id });
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Conjunto de dados não encontrado' };
      }

      return { success: true, dataSet: data as SavedDataSet };
    } catch (error: any) {
      logger.error('Erro ao buscar data set', { error: error.message, id });
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualiza um conjunto de dados existente
   */
  async update(id: string, input: UpdateDataSetInput): Promise<{ success: boolean; dataSet?: SavedDataSet; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Preparar objeto de atualização
      const updateData: Record<string, any> = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.data !== undefined) {
        updateData.data = input.data;
        updateData.record_count = input.data.length;
      }
      if (input.columnsMeta !== undefined) updateData.columns_meta = input.columnsMeta;
      if (input.dateRangeStart !== undefined) updateData.date_range_start = input.dateRangeStart;
      if (input.dateRangeEnd !== undefined) updateData.date_range_end = input.dateRangeEnd;

      const { data, error } = await supabase
        .from('saved_data_sets')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        logger.error('Erro ao atualizar data set', { error, id });
        return { success: false, error: error.message };
      }

      logger.info('Data set atualizado com sucesso', { id, name: data.name });

      return { success: true, dataSet: data as SavedDataSet };
    } catch (error: any) {
      logger.error('Erro ao atualizar data set', { error: error.message, id });
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualiza os dados de um data set com nova extração
   */
  async refreshData(
    id: string,
    newData: Record<string, any>[],
    newColumnsMeta: ResultColumnMeta[],
    dateRangeStart: string,
    dateRangeEnd: string
  ): Promise<{ success: boolean; dataSet?: SavedDataSet; error?: string }> {
    return this.update(id, {
      data: newData,
      columnsMeta: newColumnsMeta,
      dateRangeStart,
      dateRangeEnd,
    });
  }

  /**
   * Exclui um conjunto de dados
   */
  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      const { error } = await supabase
        .from('saved_data_sets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Erro ao excluir data set', { error, id });
        return { success: false, error: error.message };
      }

      logger.info('Data set excluído com sucesso', { id });

      return { success: true };
    } catch (error: any) {
      logger.error('Erro ao excluir data set', { error: error.message, id });
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca data sets recentes para exibição rápida
   */
  async getRecent(limit: number = 5): Promise<{ success: boolean; dataSets?: DataSetListItem[]; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      const { data, error } = await supabase
        .from('saved_data_sets')
        .select(`
          id,
          name,
          description,
          platform,
          record_count,
          date_range_start,
          date_range_end,
          created_at,
          updated_at,
          client_id
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Erro ao buscar data sets recentes', { error });
        return { success: false, error: error.message };
      }

      const dataSets: DataSetListItem[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        platform: item.platform,
        record_count: item.record_count,
        date_range_start: item.date_range_start,
        date_range_end: item.date_range_end,
        created_at: item.created_at,
        updated_at: item.updated_at,
        client_id: item.client_id,
        has_schedule: false,
        dashboard_count: 0,
      }));

      return { success: true, dataSets };
    } catch (error: any) {
      logger.error('Erro ao buscar data sets recentes', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Conta total de data sets do usuário
   */
  async count(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      const { count, error } = await supabase
        .from('saved_data_sets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) {
        logger.error('Erro ao contar data sets', { error });
        return { success: false, error: error.message };
      }

      return { success: true, count: count || 0 };
    } catch (error: any) {
      logger.error('Erro ao contar data sets', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

// Exporta instância singleton para uso direto
export const dataSetService = new DataSetService();
