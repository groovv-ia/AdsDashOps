/**
 * DashboardViewPage - Página de visualização de dashboard
 *
 * Exibe um dashboard salvo com todos os seus widgets e opções
 * de atualização, exportação e configuração de agendamento.
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Clock,
  Calendar,
  Settings,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { DynamicDashboard } from '../dynamic-dashboard';
import { dataSetService, type SavedDataSet } from '../../lib/services/DataSetService';
import { autoDashboardService, type DashboardInstance } from '../../lib/services/AutoDashboardService';
import { ConfigurableExtractService } from '../../lib/services/ConfigurableExtractService';
import { supabase } from '../../lib/supabase';
import { exportToCSV } from '../../utils/export';

// ============================================
// Tipos
// ============================================

interface DashboardViewPageProps {
  dashboardId: string;
  dataSetId: string;
  onBack: () => void;
}

// ============================================
// Componente
// ============================================

export function DashboardViewPage({
  dashboardId,
  dataSetId,
  onBack,
}: DashboardViewPageProps) {
  // Estados
  const [dashboard, setDashboard] = useState<DashboardInstance | null>(null);
  const [dataSet, setDataSet] = useState<SavedDataSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar dashboard e data set
  useEffect(() => {
    loadData();
  }, [dashboardId, dataSetId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Buscar dashboard
      const dashboardResult = await autoDashboardService.getById(dashboardId);
      if (!dashboardResult.success || !dashboardResult.dashboard) {
        throw new Error(dashboardResult.error || 'Dashboard não encontrado');
      }
      setDashboard(dashboardResult.dashboard);

      // Buscar data set com dados
      const dataSetResult = await dataSetService.getById(dataSetId);
      if (!dataSetResult.success || !dataSetResult.dataSet) {
        throw new Error(dataSetResult.error || 'Conjunto de dados não encontrado');
      }
      setDataSet(dataSetResult.dataSet);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Atualizar dados (re-extrair)
  const handleRefresh = async () => {
    if (!dataSet) return;

    setRefreshing(true);
    setError(null);

    try {
      // Buscar token de acesso
      const { data: tokenData } = await supabase
        .from('oauth_tokens')
        .select('access_token')
        .eq('id', dataSet.connection_id)
        .maybeSingle();

      if (!tokenData?.access_token) {
        throw new Error('Token de acesso não encontrado. Reconecte sua conta.');
      }

      // Re-executar extração com a mesma configuração
      const service = new ConfigurableExtractService(tokenData.access_token);
      const result = await service.extract(dataSet.extraction_config);

      if (!result.success) {
        throw new Error(result.error || 'Erro na re-extração');
      }

      // Atualizar data set com novos dados
      const updateResult = await dataSetService.refreshData(
        dataSet.id,
        result.data,
        result.columns,
        result.dateRange.start,
        result.dateRange.end
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      // Recarregar dados
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Exportar dados
  const handleExport = (format: 'csv' | 'pdf') => {
    if (!dataSet || !dataSet.data.length) return;

    if (format === 'csv') {
      // Preparar dados para exportação
      const headers = dataSet.columns_meta.map(c => c.displayName);
      const rows = dataSet.data.map(row =>
        dataSet.columns_meta.map(c => row[c.field] ?? '')
      );

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dataSet.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600">Carregando dashboard...</span>
      </div>
    );
  }

  // Erro
  if (error || !dashboard || !dataSet) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </button>

        <Card className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Erro ao carregar dashboard
          </h3>
          <p className="text-gray-500 mb-4">
            {error || 'Dashboard não encontrado'}
          </p>
          <Button onClick={loadData} icon={RefreshCw}>
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{dashboard.name}</h1>
            {dashboard.description && (
              <p className="text-gray-600 mt-1">{dashboard.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Info de período */}
          {dataSet.date_range_start && (
            <div className="hidden sm:flex items-center text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
              <Calendar className="w-4 h-4 mr-2" />
              {new Date(dataSet.date_range_start).toLocaleDateString('pt-BR')} -{' '}
              {new Date(dataSet.date_range_end || '').toLocaleDateString('pt-BR')}
            </div>
          )}

          {/* Última atualização */}
          <div className="hidden sm:flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            {new Date(dataSet.updated_at).toLocaleString('pt-BR')}
          </div>

          {/* Botões de ação */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            icon={RefreshCw}
          >
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>

          <div className="relative group">
            <Button variant="outline" size="sm" icon={Download}>
              Exportar
            </Button>
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[120px]">
              <button
                onClick={() => handleExport('csv')}
                className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
              >
                CSV
              </button>
            </div>
          </div>
        </div>
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

      {/* Dashboard */}
      <DynamicDashboard
        name=""
        data={dataSet.data}
        columns={dataSet.columns_meta}
        widgets={dashboard.widgets}
        layoutConfig={dashboard.layout_config}
        dateRangeStart={dataSet.date_range_start || undefined}
        dateRangeEnd={dataSet.date_range_end || undefined}
        lastUpdated={dataSet.updated_at}
        isLoading={refreshing}
      />
    </div>
  );
}
