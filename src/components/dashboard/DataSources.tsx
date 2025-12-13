import React, { useState, useEffect } from 'react';
import {
  Database,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SimpleMetaConnect } from './SimpleMetaConnect';
import { supabase } from '../../lib/supabase';
import {
  DataSyncService,
  type DataSourceConnection
} from '../../lib/dataConnectors';

interface DataSource {
  id: string;
  name: string;
  platform: string;
  type: 'advertising' | 'analytics' | 'crm' | 'database' | 'file';
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSync: string;
  accountId?: string;
  logo: string;
  description: string;
  metrics?: string[];
  error?: string;
}


export const DataSources: React.FC = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

  const syncService = new DataSyncService();

  useEffect(() => {
    loadDataSources();
  }, []);

  const loadDataSources = async () => {
    try {
      const { data, error } = await supabase
        .from('data_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDataSources(data || []);
    } catch (error) {
      console.error('Erro ao carregar fontes de dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'syncing': return 'text-blue-600 bg-blue-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'disconnected': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Conectado';
      case 'syncing': return 'Sincronizando';
      case 'error': return 'Erro';
      case 'disconnected': return 'Desconectado';
      default: return status;
    }
  };


  const handleSync = async (sourceId: string) => {
    setSyncingIds(prev => new Set(prev).add(sourceId));
    
    try {
      const source = dataSources.find(s => s.id === sourceId);
      if (!source) return;

      const connection: DataSourceConnection = {
        id: source.id,
        name: source.name,
        platform: source.platform,
        type: source.type,
        status: source.status,
        config: source as any
      };

      const result = await syncService.syncDataSource(connection);
      
      if (!result.success) {
        console.error('Erro na sincronização:', result.error);
      }
      
      await loadDataSources();
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
    } finally {
      setSyncingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(sourceId);
        return newSet;
      });
    }
  };

  const handleDelete = async (sourceId: string) => {
    if (!confirm('Tem certeza que deseja remover esta fonte de dados?')) return;

    try {
      const { error } = await supabase
        .from('data_connections')
        .delete()
        .eq('id', sourceId);

      if (error) throw error;
      
      await loadDataSources();
    } catch (error) {
      console.error('Erro ao deletar fonte:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fontes de Dados</h1>
            <p className="text-gray-600">Conecte sua conta Meta Ads em 3 passos simples</p>
          </div>
        </div>
      </div>

      {/* Conexão Meta Ads */}
      {dataSources.length === 0 ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Como conectar sua conta Meta Ads:</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Clique no botão "Conectar com Meta"</li>
              <li>Autorize o acesso na janela do Facebook</li>
              <li>Selecione a conta de anúncios desejada</li>
            </ol>
          </div>
          <SimpleMetaConnect />
        </div>
      ) : (
        <SimpleMetaConnect />
      )}

      {/* Connected Sources */}
      {dataSources.length > 0 && (
        <Card>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Contas Conectadas</h2>
            <p className="text-sm text-gray-600">Gerencie suas conexões Meta Ads ativas</p>
          </div>

          <div className="space-y-4">
            {dataSources.map((source) => {
              const isCurrentlySyncing = syncingIds.has(source.id);

              return (
                <div key={source.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
                        <img
                          src="/meta-icon.svg"
                          alt="Meta Ads"
                          className="w-8 h-8 object-contain"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{source.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">Facebook e Instagram Ads</p>
                        <div className="flex items-center space-x-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(source.status)}`}>
                            {source.status === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {source.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {(source.status === 'syncing' || isCurrentlySyncing) && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                            {getStatusText(isCurrentlySyncing ? 'syncing' : source.status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            Última sincronização: {new Date(source.lastSync).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        {source.error && (
                          <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                            {source.error}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSync(source.id)}
                        disabled={isCurrentlySyncing}
                        title="Sincronizar dados"
                      >
                        <RefreshCw className={`w-4 h-4 ${isCurrentlySyncing ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(source.id)}
                        title="Remover conexão"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

    </div>
  );
};