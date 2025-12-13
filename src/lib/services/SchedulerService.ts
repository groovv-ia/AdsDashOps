/**
 * SchedulerService - Serviço de Agendamento de Extrações
 *
 * Gerencia agendamentos de re-extrações periódicas de dados,
 * permitindo criar, atualizar, cancelar e executar jobs agendados.
 */

import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import { ConfigurableExtractService } from './ConfigurableExtractService';
import { dataSetService } from './DataSetService';
import type { ExtractionConfig } from '../../types/extraction';

// ============================================
// Tipos
// ============================================

/** Frequência de agendamento */
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

/** Configuração de agendamento */
export interface ScheduleConfig {
  dataSetId: string;
  connectionId: string;
  extractionConfig: ExtractionConfig;
  frequency: ScheduleFrequency;
  preferredHour: number;
  preferredDay?: number;
  notifyOnComplete: boolean;
}

/** Agendamento salvo */
export interface ScheduledExtraction {
  id: string;
  user_id: string;
  data_set_id: string;
  connection_id: string;
  extraction_config: ExtractionConfig;
  frequency: ScheduleFrequency;
  preferred_hour: number;
  preferred_day: number | null;
  next_run_at: string;
  last_run_at: string | null;
  last_run_status: 'success' | 'error' | null;
  last_run_error: string | null;
  is_active: boolean;
  notify_on_complete: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Funções auxiliares
// ============================================

/** Calcula próxima execução baseado na frequência */
function calculateNextRun(
  frequency: ScheduleFrequency,
  preferredHour: number,
  preferredDay?: number
): Date {
  const now = new Date();
  const next = new Date();

  // Definir hora preferida
  next.setHours(preferredHour, 0, 0, 0);

  switch (frequency) {
    case 'daily':
      // Se já passou a hora hoje, agenda para amanhã
      if (now > next) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case 'weekly':
      // preferredDay: 0 = domingo, 6 = sábado
      const targetDay = preferredDay ?? 1; // Default: segunda
      const currentDay = now.getDay();
      let daysUntilTarget = targetDay - currentDay;

      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && now > next)) {
        daysUntilTarget += 7;
      }

      next.setDate(next.getDate() + daysUntilTarget);
      break;

    case 'monthly':
      // preferredDay: 1-31
      const targetDate = preferredDay ?? 1;
      next.setDate(targetDate);

      // Se já passou no mês atual, vai para o próximo mês
      if (now > next) {
        next.setMonth(next.getMonth() + 1);
      }

      // Ajustar para meses com menos dias
      const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      if (targetDate > lastDayOfMonth) {
        next.setDate(lastDayOfMonth);
      }
      break;
  }

  return next;
}

// ============================================
// Classe Principal
// ============================================

export class SchedulerService {
  private checkInterval: number | null = null;

  /**
   * Cria um novo agendamento
   */
  async createSchedule(config: ScheduleConfig): Promise<{ success: boolean; schedule?: ScheduledExtraction; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Calcular próxima execução
      const nextRunAt = calculateNextRun(
        config.frequency,
        config.preferredHour,
        config.preferredDay
      );

      const { data, error } = await supabase
        .from('scheduled_extractions')
        .insert({
          user_id: user.id,
          data_set_id: config.dataSetId,
          connection_id: config.connectionId,
          extraction_config: config.extractionConfig,
          frequency: config.frequency,
          preferred_hour: config.preferredHour,
          preferred_day: config.preferredDay ?? null,
          next_run_at: nextRunAt.toISOString(),
          is_active: true,
          notify_on_complete: config.notifyOnComplete,
        })
        .select()
        .single();

      if (error) {
        logger.error('Erro ao criar agendamento', { error });
        return { success: false, error: error.message };
      }

      logger.info('Agendamento criado', {
        id: data.id,
        frequency: config.frequency,
        nextRun: nextRunAt.toISOString(),
      });

      return { success: true, schedule: data as ScheduledExtraction };
    } catch (error: any) {
      logger.error('Erro ao criar agendamento', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualiza um agendamento existente
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<ScheduleConfig>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Buscar agendamento atual
      const { data: current } = await supabase
        .from('scheduled_extractions')
        .select('*')
        .eq('id', scheduleId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!current) {
        return { success: false, error: 'Agendamento não encontrado' };
      }

      // Preparar dados de atualização
      const updateData: Record<string, any> = {};

      if (updates.frequency) updateData.frequency = updates.frequency;
      if (updates.preferredHour !== undefined) updateData.preferred_hour = updates.preferredHour;
      if (updates.preferredDay !== undefined) updateData.preferred_day = updates.preferredDay;
      if (updates.notifyOnComplete !== undefined) updateData.notify_on_complete = updates.notifyOnComplete;
      if (updates.extractionConfig) updateData.extraction_config = updates.extractionConfig;

      // Recalcular próxima execução se frequência/hora mudou
      if (updates.frequency || updates.preferredHour !== undefined || updates.preferredDay !== undefined) {
        const nextRunAt = calculateNextRun(
          updates.frequency || current.frequency,
          updates.preferredHour ?? current.preferred_hour,
          updates.preferredDay ?? current.preferred_day
        );
        updateData.next_run_at = nextRunAt.toISOString();
      }

      const { error } = await supabase
        .from('scheduled_extractions')
        .update(updateData)
        .eq('id', scheduleId)
        .eq('user_id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Ativa ou desativa um agendamento
   */
  async toggleSchedule(scheduleId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Se ativando, recalcular próxima execução
      let updateData: Record<string, any> = { is_active: isActive };

      if (isActive) {
        const { data: current } = await supabase
          .from('scheduled_extractions')
          .select('frequency, preferred_hour, preferred_day')
          .eq('id', scheduleId)
          .maybeSingle();

        if (current) {
          const nextRunAt = calculateNextRun(
            current.frequency,
            current.preferred_hour,
            current.preferred_day
          );
          updateData.next_run_at = nextRunAt.toISOString();
        }
      }

      const { error } = await supabase
        .from('scheduled_extractions')
        .update(updateData)
        .eq('id', scheduleId)
        .eq('user_id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Exclui um agendamento
   */
  async deleteSchedule(scheduleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      const { error } = await supabase
        .from('scheduled_extractions')
        .delete()
        .eq('id', scheduleId)
        .eq('user_id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista agendamentos do usuário
   */
  async list(dataSetId?: string): Promise<{ success: boolean; schedules?: ScheduledExtraction[]; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      let query = supabase
        .from('scheduled_extractions')
        .select('*')
        .eq('user_id', user.id)
        .order('next_run_at', { ascending: true });

      if (dataSetId) {
        query = query.eq('data_set_id', dataSetId);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, schedules: data as ScheduledExtraction[] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca agendamentos pendentes (próxima execução <= agora)
   */
  async getPendingSchedules(): Promise<ScheduledExtraction[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('scheduled_extractions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .lte('next_run_at', now);

      if (error) {
        logger.error('Erro ao buscar agendamentos pendentes', { error });
        return [];
      }

      return data as ScheduledExtraction[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Executa um agendamento (re-extrai dados)
   */
  async executeSchedule(schedule: ScheduledExtraction): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Executando agendamento', { scheduleId: schedule.id });

      // Buscar token de acesso
      const { data: tokenData } = await supabase
        .from('oauth_tokens')
        .select('access_token')
        .eq('id', schedule.connection_id)
        .maybeSingle();

      if (!tokenData?.access_token) {
        throw new Error('Token de acesso não encontrado');
      }

      // Executar extração
      const service = new ConfigurableExtractService(tokenData.access_token);
      const result = await service.extract(schedule.extraction_config);

      if (!result.success) {
        throw new Error(result.error || 'Erro na extração');
      }

      // Atualizar data set com novos dados
      const updateResult = await dataSetService.refreshData(
        schedule.data_set_id,
        result.data,
        result.columns,
        result.dateRange.start,
        result.dateRange.end
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      // Calcular próxima execução
      const nextRunAt = calculateNextRun(
        schedule.frequency,
        schedule.preferred_hour,
        schedule.preferred_day ?? undefined
      );

      // Atualizar agendamento
      await supabase
        .from('scheduled_extractions')
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: 'success',
          last_run_error: null,
          next_run_at: nextRunAt.toISOString(),
        })
        .eq('id', schedule.id);

      logger.info('Agendamento executado com sucesso', {
        scheduleId: schedule.id,
        records: result.data.length,
        nextRun: nextRunAt.toISOString(),
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Erro ao executar agendamento', {
        scheduleId: schedule.id,
        error: error.message,
      });

      // Registrar erro
      await supabase
        .from('scheduled_extractions')
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: 'error',
          last_run_error: error.message,
        })
        .eq('id', schedule.id);

      return { success: false, error: error.message };
    }
  }

  /**
   * Inicia verificação periódica de agendamentos
   */
  startScheduleChecker(intervalMs: number = 60000): void {
    if (this.checkInterval) {
      this.stopScheduleChecker();
    }

    logger.info('Iniciando verificador de agendamentos', { intervalMs });

    // Verificar imediatamente
    this.checkAndExecutePending();

    // Verificar periodicamente
    this.checkInterval = window.setInterval(() => {
      this.checkAndExecutePending();
    }, intervalMs);
  }

  /**
   * Para verificação periódica
   */
  stopScheduleChecker(): void {
    if (this.checkInterval) {
      window.clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Verificador de agendamentos parado');
    }
  }

  /**
   * Verifica e executa agendamentos pendentes
   */
  private async checkAndExecutePending(): Promise<void> {
    const pending = await this.getPendingSchedules();

    for (const schedule of pending) {
      await this.executeSchedule(schedule);
    }
  }
}

// Exporta instância singleton
export const schedulerService = new SchedulerService();
