import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DataSyncService, type DataSourceConnection } from '../lib/dataConnectors';

export interface DataSource {
  id: string;
  name: string;
  platform: string;
  type: 'advertising' | 'analytics' | 'crm' | 'file';
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSync: string;
  accountId?: string;
  logo: string;
  description: string;
  metrics?: string[];
  error?: string;
  config?: any;
}

export const useDataSources = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const syncService = new DataSyncService();

  const loadDataSources = async () => {
    try {
      setLoading(true);

      // Verificar se o Supabase está configurado
      if (!supabase) {
        console.warn('Supabase não configurado - fontes de dados não disponíveis');
        setDataSources([]);
        setError('Supabase não configurado');
        return;
      }

      const { data, error } = await supabase
        .from('data_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDataSources(data || []);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar fontes de dados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createDataSource = async (sourceData: Omit<DataSource, 'id' | 'lastSync'>) => {
    try {
      // Verificar se o Supabase está configurado
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure o Supabase para criar fontes de dados.');
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('data_connections')
        .insert({
          ...sourceData,
          user_id: user.user.id,
          last_sync: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await loadDataSources();
      return data;
    } catch (err) {
      console.error('Erro ao criar fonte de dados:', err);
      throw err;
    }
  };

  const updateDataSource = async (id: string, updates: Partial<DataSource>) => {
    try {
      // Verificar se o Supabase está configurado
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure o Supabase para atualizar fontes de dados.');
      }

      const { error } = await supabase
        .from('data_connections')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await loadDataSources();
    } catch (err) {
      console.error('Erro ao atualizar fonte de dados:', err);
      throw err;
    }
  };

  const deleteDataSource = async (id: string) => {
    try {
      // Verificar se o Supabase está configurado
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure o Supabase para deletar fontes de dados.');
      }

      const { error } = await supabase
        .from('data_connections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadDataSources();
    } catch (err) {
      console.error('Erro ao deletar fonte de dados:', err);
      throw err;
    }
  };

  const syncDataSource = async (id: string) => {
    try {
      const source = dataSources.find(s => s.id === id);
      if (!source) throw new Error('Fonte de dados não encontrada');

      // Update status to syncing
      await updateDataSource(id, { status: 'syncing' });

      const connection: DataSourceConnection = {
        id: source.id,
        name: source.name,
        platform: source.platform,
        type: source.type,
        status: source.status,
        config: source.config || {}
      };

      const result = await syncService.syncDataSource(connection);

      if (result.success) {
        await updateDataSource(id, { 
          status: 'connected', 
          lastSync: new Date().toISOString(),
          error: undefined
        });
      } else {
        await updateDataSource(id, { 
          status: 'error', 
          error: result.error 
        });
      }

      return result;
    } catch (err) {
      console.error('Erro ao sincronizar fonte de dados:', err);
      await updateDataSource(id, { 
        status: 'error', 
        error: err instanceof Error ? err.message : 'Erro desconhecido'
      });
      throw err;
    }
  };

  const testConnection = async (config: any, platform: string) => {
    try {
      // This would test the connection without saving it
      const connection: DataSourceConnection = {
        id: 'test',
        name: 'Test Connection',
        platform,
        type: 'advertising',
        status: 'disconnected',
        config
      };

      // Test authentication only
      switch (platform.toLowerCase()) {
        case 'meta':
          const { MetaAdsConnector } = await import('../lib/dataConnectors');
          const metaConnector = new MetaAdsConnector();
          return await metaConnector.authenticate(config.accessToken);
        
        case 'google':
          const { GoogleAdsConnector } = await import('../lib/dataConnectors');
          const googleConnector = new GoogleAdsConnector();
          return await googleConnector.authenticate(config.accessToken);
        
        case 'tiktok':
          const { TikTokAdsConnector } = await import('../lib/dataConnectors');
          const tiktokConnector = new TikTokAdsConnector();
          return await tiktokConnector.authenticate(config.accessToken);
        
        default:
          return { isValid: false, error: 'Plataforma não suportada' };
      }
    } catch (err) {
      return { 
        isValid: false, 
        error: err instanceof Error ? err.message : 'Erro ao testar conexão' 
      };
    }
  };

  useEffect(() => {
    loadDataSources();
  }, []);

  return {
    dataSources,
    loading,
    error,
    loadDataSources,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    syncDataSource,
    testConnection
  };
};