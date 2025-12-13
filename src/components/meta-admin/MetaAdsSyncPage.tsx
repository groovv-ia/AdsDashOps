/**
 * MetaAdsSyncPage
 *
 * Pagina principal de sincronizacao Meta Ads com dashboard.
 * Permite extrair metricas, visualizar KPIs e tabelas por nivel.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
  Percent,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Filter,
  BarChart3,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  runMetaSync,
  getMetaSyncStatus,
  getInsightsFromDatabase,
  SyncStatusResponse,
  SyncResult,
} from '../../lib/services/MetaSystemUserService';
import { useClient } from '../../contexts/ClientContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Tipos locais
interface InsightRow {
  id: string;
  level: string;
  entity_id: string;
  entity_name: string;
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

interface KPIs {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
}

// Presets de periodo
const DATE_PRESETS = [
  { label: 'Hoje', value: 'today', days: 0 },
  { label: 'Ontem', value: 'yesterday', days: 1 },
  { label: 'Ultimos 7 dias', value: 'last_7', days: 7 },
  { label: 'Ultimos 30 dias', value: 'last_30', days: 30 },
  { label: 'Este mes', value: 'this_month', days: -1 },
];

// Niveis de entidade
const LEVELS = [
  { label: 'Campanhas', value: 'campaign' },
  { label: 'Conjuntos', value: 'adset' },
  { label: 'Anuncios', value: 'ad' },
];

export const MetaAdsSyncPage: React.FC = () => {
  const { selectedClient } = useClient();

  // Estado de sincronizacao
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // Estado de dados
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs>({
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalReach: 0,
    avgCtr: 0,
    avgCpc: 0,
    avgCpm: 0,
  });

  // Filtros
  const [selectedLevel, setSelectedLevel] = useState<string>('campaign');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('last_7');
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>('');
  const [includeToday, setIncludeToday] = useState(true);

  // Mensagens
  const [error, setError] = useState<string | null>(null);

  // Calcula datas baseado no preset
  const getDateRange = useCallback(() => {
    const today = new Date();
    let dateFrom: Date;
    let dateTo: Date = includeToday ? today : new Date(today.setDate(today.getDate() - 1));

    const preset = DATE_PRESETS.find((p) => p.value === selectedPeriod);
    if (!preset) {
      dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 7);
    } else if (preset.value === 'today') {
      dateFrom = new Date();
      dateTo = new Date();
    } else if (preset.value === 'yesterday') {
      dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 1);
      dateTo = new Date(dateFrom);
    } else if (preset.value === 'this_month') {
      dateFrom = new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
      dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - preset.days);
    }

    return {
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0],
    };
  }, [selectedPeriod, includeToday]);

  // Carrega status inicial
  useEffect(() => {
    loadStatus();
  }, [selectedClient]);

  // Carrega dados quando filtros mudam
  useEffect(() => {
    if (syncStatus?.connection?.status === 'connected') {
      loadInsights();
    }
  }, [selectedLevel, selectedPeriod, selectedAdAccount, includeToday, syncStatus]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const status = await getMetaSyncStatus(selectedClient?.id);
      setSyncStatus(status);

      // Usa o UUID interno (id) em vez do meta_id textual
      if (status.ad_accounts.length > 0 && !selectedAdAccount) {
        setSelectedAdAccount(status.ad_accounts[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Encontra a ad account selecionada para obter o meta_id para a API
  const getSelectedAdAccountMetaId = (): string => {
    const account = syncStatus?.ad_accounts.find((acc) => acc.id === selectedAdAccount);
    return account?.meta_id || '';
  };

  const loadInsights = async () => {
    const { dateFrom, dateTo } = getDateRange();

    try {
      const result = await getInsightsFromDatabase({
        clientId: selectedClient?.id,
        metaAdAccountId: selectedAdAccount,
        level: selectedLevel,
        dateFrom,
        dateTo,
        limit: 1000,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setInsights(result.data);
      calculateKPIs(result.data);
    } catch (err) {
      console.error('Erro ao carregar insights:', err);
    }
  };

  const calculateKPIs = (data: InsightRow[]) => {
    if (data.length === 0) {
      setKpis({
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalReach: 0,
        avgCtr: 0,
        avgCpc: 0,
        avgCpm: 0,
      });
      return;
    }

    const totals = data.reduce(
      (acc, row) => ({
        spend: acc.spend + (row.spend || 0),
        impressions: acc.impressions + (row.impressions || 0),
        clicks: acc.clicks + (row.clicks || 0),
        reach: acc.reach + (row.reach || 0),
      }),
      { spend: 0, impressions: 0, clicks: 0, reach: 0 }
    );

    setKpis({
      totalSpend: totals.spend,
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      totalReach: totals.reach,
      avgCtr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      avgCpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
      avgCpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const preset = DATE_PRESETS.find((p) => p.value === selectedPeriod);
      const daysBack = preset?.days === -1 ? 30 : preset?.days || 7;

      // Usa o meta_id textual para a API do Meta
      const metaId = getSelectedAdAccountMetaId();

      const result = await runMetaSync({
        mode: selectedPeriod === 'today' ? 'intraday' : 'backfill',
        clientId: selectedClient?.id,
        metaAdAccountId: metaId,
        daysBack: Math.max(daysBack, 1),
        levels: [selectedLevel],
      });

      setSyncResult(result);

      if (result.errors.length > 0) {
        setError(result.errors.join('; '));
      }

      // Recarrega dados
      await loadInsights();
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  // Agrupa dados por data para grafico
  const chartData = React.useMemo(() => {
    const grouped = insights.reduce((acc, row) => {
      const date = row.date;
      if (!acc[date]) {
        acc[date] = { date, spend: 0, impressions: 0, clicks: 0 };
      }
      acc[date].spend += row.spend || 0;
      acc[date].impressions += row.impressions || 0;
      acc[date].clicks += row.clicks || 0;
      return acc;
    }, {} as Record<string, { date: string; spend: number; impressions: number; clicks: number }>);

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [insights]);

  // Agrupa por entidade para tabela
  const tableData = React.useMemo(() => {
    const grouped = insights.reduce((acc, row) => {
      const key = row.entity_id;
      if (!acc[key]) {
        acc[key] = {
          entity_id: row.entity_id,
          entity_name: row.entity_name || row.entity_id,
          spend: 0,
          impressions: 0,
          clicks: 0,
          reach: 0,
        };
      }
      acc[key].spend += row.spend || 0;
      acc[key].impressions += row.impressions || 0;
      acc[key].clicks += row.clicks || 0;
      acc[key].reach += row.reach || 0;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped)
      .map((item: any) => ({
        ...item,
        ctr: item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0,
        cpc: item.clicks > 0 ? item.spend / item.clicks : 0,
        cpm: item.impressions > 0 ? (item.spend / item.impressions) * 1000 : 0,
      }))
      .sort((a: any, b: any) => b.spend - a.spend);
  }, [insights]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(Math.round(value));
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (!syncStatus?.connection || syncStatus.connection.status !== 'connected') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Conexao Necessaria</h3>
          <p className="text-gray-600 mb-4">
            Configure a conexao com o Meta Ads antes de sincronizar dados.
          </p>
          <Button onClick={() => window.location.href = '#meta-admin'}>
            Configurar Conexao
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Meta Ads Sync</h2>
            <p className="text-gray-600">Extraia e visualize metricas das suas campanhas</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center space-x-2">
          <span
            className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
              syncStatus.health_status === 'healthy'
                ? 'bg-green-100 text-green-700'
                : syncStatus.health_status === 'stale'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full mr-2 ${
                syncStatus.health_status === 'healthy'
                  ? 'bg-green-500'
                  : syncStatus.health_status === 'stale'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
            />
            {syncStatus.totals.total_insights_rows} registros
          </span>
        </div>
      </div>

      {/* Filtros e Acoes */}
      <Card className="bg-white">
        <div className="flex flex-wrap items-end gap-4">
          {/* Ad Account */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Conta de Anuncios</label>
            <select
              value={selectedAdAccount}
              onChange={(e) => setSelectedAdAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {syncStatus.ad_accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.meta_id})
                </option>
              ))}
            </select>
          </div>

          {/* Nivel */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Periodo */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {DATE_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {/* Include Today */}
          <div className="flex items-center">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeToday}
                onChange={(e) => setIncludeToday(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Incluir hoje</span>
            </label>
          </div>

          {/* Botao Sincronizar */}
          <Button onClick={handleSync} disabled={syncing} className="flex-shrink-0">
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Extrair Metricas
              </>
            )}
          </Button>
        </div>

        {/* Mensagens de resultado */}
        {syncResult && (
          <div
            className={`mt-4 p-3 rounded-lg ${
              syncResult.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {syncResult.errors.length > 0 ? (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              <span className="text-sm font-medium">
                {syncResult.insights_synced} registros sincronizados de {syncResult.accounts_synced} conta(s)
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="text-center">
          <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Gasto Total</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(kpis.totalSpend)}</p>
        </Card>

        <Card className="text-center">
          <Eye className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Impressoes</p>
          <p className="text-lg font-bold text-gray-900">{formatNumber(kpis.totalImpressions)}</p>
        </Card>

        <Card className="text-center">
          <MousePointer className="w-6 h-6 text-purple-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Cliques</p>
          <p className="text-lg font-bold text-gray-900">{formatNumber(kpis.totalClicks)}</p>
        </Card>

        <Card className="text-center">
          <TrendingUp className="w-6 h-6 text-orange-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Alcance</p>
          <p className="text-lg font-bold text-gray-900">{formatNumber(kpis.totalReach)}</p>
        </Card>

        <Card className="text-center">
          <Percent className="w-6 h-6 text-teal-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">CTR</p>
          <p className="text-lg font-bold text-gray-900">{formatPercent(kpis.avgCtr)}</p>
        </Card>

        <Card className="text-center">
          <DollarSign className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">CPC</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(kpis.avgCpc)}</p>
        </Card>

        <Card className="text-center">
          <DollarSign className="w-6 h-6 text-pink-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">CPM</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(kpis.avgCpm)}</p>
        </Card>
      </div>

      {/* Graficos */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Gasto por Dia</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
                  <YAxis tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Gasto']}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Bar dataKey="spend" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Impressoes e Cliques por Dia</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatNumber(value),
                      name === 'impressions' ? 'Impressoes' : 'Cliques',
                    ]}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Tabela */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            {LEVELS.find((l) => l.value === selectedLevel)?.label} ({tableData.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Nome</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Gasto</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Impressoes</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Cliques</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">CTR</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">CPC</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">CPM</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Nenhum dado encontrado. Clique em "Extrair Metricas" para sincronizar.
                  </td>
                </tr>
              ) : (
                tableData.map((row: any) => (
                  <tr key={row.entity_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-gray-900">{row.entity_name}</span>
                      <span className="block text-xs text-gray-500">{row.entity_id}</span>
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-gray-900">
                      {formatCurrency(row.spend)}
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-gray-600">
                      {formatNumber(row.impressions)}
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-gray-600">
                      {formatNumber(row.clicks)}
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-gray-600">
                      {formatPercent(row.ctr)}
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-gray-600">
                      {formatCurrency(row.cpc)}
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-gray-600">
                      {formatCurrency(row.cpm)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
