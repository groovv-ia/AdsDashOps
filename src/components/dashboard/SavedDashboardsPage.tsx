/**
 * SavedDashboardsPage - Página de listagem de dashboards salvos
 *
 * Exibe todos os dashboards gerados pelo usuário com opções de
 * visualizar, editar, agendar atualizações e excluir.
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  RefreshCw,
  Trash2,
  Eye,
  MoreVertical,
  Database,
  AlertCircle,
  Search,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { dataSetService, type DataSetListItem } from '../../lib/services/DataSetService';
import { autoDashboardService, type DashboardInstance } from '../../lib/services/AutoDashboardService';

// ============================================
// Tipos
// ============================================

interface SavedDashboardsPageProps {
  onViewDashboard: (dashboardId: string, dataSetId: string) => void;
}

// ============================================
// Componente
// ============================================

export function SavedDashboardsPage({
  onViewDashboard,
}: SavedDashboardsPageProps) {
  // Estados
  const [dataSets, setDataSets] = useState<DataSetListItem[]>([]);
  const [dashboards, setDashboards] = useState<Map<string, DashboardInstance[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Carregar dados ao montar
  useEffect(() => {
    loadData();
  }, []);

  // Carregar data sets e dashboards
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Buscar data sets
      const dataSetsResult = await dataSetService.list();
      if (!dataSetsResult.success) {
        throw new Error(dataSetsResult.error);
      }

      setDataSets(dataSetsResult.dataSets || []);

      // Buscar dashboards para cada data set
      const dashboardsResult = await autoDashboardService.list();
      if (dashboardsResult.success && dashboardsResult.dashboards) {
        // Agrupar dashboards por data_set_id
        const grouped = new Map<string, DashboardInstance[]>();
        for (const dashboard of dashboardsResult.dashboards) {
          const existing = grouped.get(dashboard.data_set_id) || [];
          existing.push(dashboard);
          grouped.set(dashboard.data_set_id, existing);
        }
        setDashboards(grouped);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Excluir data set e seus dashboards
  const handleDelete = async (dataSetId: string) => {
    if (!confirm('Tem certeza que deseja excluir este conjunto de dados e todos os dashboards associados?')) {
      return;
    }

    setDeletingId(dataSetId);

    try {
      const result = await dataSetService.delete(dataSetId);
      if (!result.success) {
        throw new Error(result.error);
      }

      // Recarregar lista
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
      setActiveMenu(null);
    }
  };

  // Filtrar data sets por termo de busca
  const filteredDataSets = dataSets.filter(ds =>
    ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ds.platform.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Formatar data
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Formatar data e hora
  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Obter cor da plataforma
  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'meta':
        return 'bg-blue-100 text-blue-700';
      case 'google':
        return 'bg-red-100 text-red-700';
      case 'tiktok':
        return 'bg-gray-900 text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meus Dashboards</h1>
            <p className="text-gray-600">
              {dataSets.length} {dataSets.length === 1 ? 'conjunto de dados salvo' : 'conjuntos de dados salvos'}
            </p>
          </div>
        </div>

      </div>

      {/* Barra de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar dashboards..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-600 underline mt-1"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">Carregando dashboards...</span>
        </div>
      )}

      {/* Lista vazia */}
      {!loading && filteredDataSets.length === 0 && (
        <Card className="py-12 text-center">
          <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum dashboard salvo'}
          </h3>
          <p className="text-gray-500">
            {searchTerm
              ? 'Tente buscar com outros termos.'
              : 'Nenhum dashboard disponivel. Sincronize dados pelo Meta Ads Sync para criar dashboards.'}
          </p>
        </Card>
      )}

      {/* Grid de dashboards */}
      {!loading && filteredDataSets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDataSets.map(dataSet => {
            const dataSetDashboards = dashboards.get(dataSet.id) || [];
            const mainDashboard = dataSetDashboards[0];
            const isDeleting = deletingId === dataSet.id;

            return (
              <Card
                key={dataSet.id}
                className={`relative group hover:shadow-lg transition-all duration-200 ${
                  isDeleting ? 'opacity-50' : ''
                }`}
              >
                {/* Badge de plataforma */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPlatformColor(dataSet.platform)}`}>
                    {dataSet.platform}
                  </span>

                  {/* Menu de ações */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === dataSet.id ? null : dataSet.id)}
                      className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>

                    {activeMenu === dataSet.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[140px]">
                        <button
                          onClick={() => {
                            setActiveMenu(null);
                            if (mainDashboard) {
                              onViewDashboard(mainDashboard.id, dataSet.id);
                            }
                          }}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                          disabled={!mainDashboard}
                        >
                          <Eye className="w-4 h-4" />
                          Visualizar
                        </button>
                        <button
                          onClick={() => handleDelete(dataSet.id)}
                          className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Título e descrição */}
                <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                  {dataSet.name}
                </h3>
                {dataSet.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                    {dataSet.description}
                  </p>
                )}

                {/* Métricas */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <div className="text-xs text-gray-500">Registros</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {dataSet.record_count.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <div className="text-xs text-gray-500">Dashboards</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {dataSetDashboards.length}
                    </div>
                  </div>
                </div>

                {/* Período dos dados */}
                {(dataSet.date_range_start || dataSet.date_range_end) && (
                  <div className="flex items-center text-xs text-gray-500 mb-3">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    {formatDate(dataSet.date_range_start)} - {formatDate(dataSet.date_range_end)}
                  </div>
                )}

                {/* Última atualização */}
                <div className="flex items-center text-xs text-gray-400 mb-4">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  Atualizado em {formatDateTime(dataSet.updated_at)}
                </div>

                {/* Indicador de agendamento */}
                {dataSet.has_schedule && (
                  <div className="flex items-center text-xs text-green-600 bg-green-50 rounded px-2 py-1 mb-4">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Atualização {dataSet.schedule_frequency === 'daily' ? 'diária' :
                               dataSet.schedule_frequency === 'weekly' ? 'semanal' : 'mensal'}
                  </div>
                )}

                {/* Botão de visualizar */}
                <Button
                  onClick={() => {
                    if (mainDashboard) {
                      onViewDashboard(mainDashboard.id, dataSet.id);
                    }
                  }}
                  variant="outline"
                  className="w-full"
                  icon={Eye}
                  disabled={!mainDashboard || isDeleting}
                >
                  {mainDashboard ? 'Visualizar Dashboard' : 'Sem dashboard'}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Click fora fecha o menu */}
      {activeMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActiveMenu(null)}
        />
      )}
    </div>
  );
}
