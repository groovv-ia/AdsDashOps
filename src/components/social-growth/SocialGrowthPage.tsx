/**
 * SocialGrowthPage
 *
 * Pagina principal de Crescimento de Redes Sociais.
 * Exibe indicadores de seguidores, engajamento, alcance e presenca digital
 * para contas do Instagram e Facebook Business conectadas ao workspace.
 *
 * Layout:
 * - Header com seletores de plataforma, conta e periodo
 * - 4 MetricCards principais
 * - Grafico de tendencia de seguidores + breakdown de engajamento
 * - Score de Presenca Digital + Painel de Metas
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Heart,
  Eye,
  TrendingUp,
  RefreshCw,
  Plus,
  Instagram,
  Facebook,
  AlertCircle,
} from 'lucide-react';
import { MetricCard } from '../ui/MetricCard';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Alert } from '../ui/Alert';
import { Loading } from '../ui/Loading';
import { GrowthTrendChart } from './GrowthTrendChart';
import { EngagementBreakdownChart } from './EngagementBreakdownChart';
import { DigitalPresenceScore } from './DigitalPresenceScore';
import { GoalsPanel } from './GoalsPanel';
import { ConnectAccountsModal } from './ConnectAccountsModal';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useClient } from '../../contexts/ClientContext';
import {
  getActiveConnections,
  getMetrics,
  getGoals,
  syncMetrics,
  requestAIGoals,
  type SocialPageConnection,
  type SocialMetricsResponse,
  type SocialGrowthGoal,
  type AIGoalSuggestion,
} from '../../lib/services/SocialGrowthService';

// Opcoes de periodo disponíveis
const PERIOD_OPTIONS = [
  { value: '7', label: 'Ultimos 7 dias' },
  { value: '28', label: 'Ultimos 28 dias' },
  { value: '90', label: 'Ultimos 90 dias' },
];

export const SocialGrowthPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const { selectedClient } = useClient();

  // Estado de conexoes
  const [connections, setConnections] = useState<SocialPageConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Filtros
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<string>('28');

  // Dados e loading
  const [metrics, setMetrics] = useState<SocialMetricsResponse | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [goals, setGoals] = useState<SocialGrowthGoal[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // IA
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIGoalSuggestion[] | undefined>(undefined);
  const [aiAssessment, setAiAssessment] = useState<string | undefined>(undefined);
  const [aiGrowthPotential, setAiGrowthPotential] = useState<string | undefined>(undefined);

  // Carrega conexoes ao entrar na pagina
  useEffect(() => {
    if (currentWorkspace?.id) {
      loadConnections();
    }
  }, [currentWorkspace?.id]);

  // Carrega metricas e metas quando conexao ou periodo mudam
  useEffect(() => {
    if (selectedConnectionId && currentWorkspace?.id) {
      loadMetricsAndGoals();
    }
  }, [selectedConnectionId, selectedDays, currentWorkspace?.id]);

  const loadConnections = async () => {
    if (!currentWorkspace?.id) return;
    setConnectionsLoading(true);
    const list = await getActiveConnections(currentWorkspace.id);
    setConnections(list);
    setConnectionsLoading(false);

    // Seleciona a primeira conexao automaticamente
    if (list.length > 0 && !selectedConnectionId) {
      setSelectedConnectionId(list[0].id);
    }
  };

  const loadMetricsAndGoals = useCallback(async () => {
    if (!currentWorkspace?.id || !selectedConnectionId) return;
    const conn = connections.find((c) => c.id === selectedConnectionId);
    if (!conn) return;

    setMetricsLoading(true);

    // Determina o account_id correto por plataforma
    const accountId =
      conn.platform === 'instagram' && conn.instagram_account_id
        ? conn.instagram_account_id
        : conn.page_id;

    const [metricsData, goalsData] = await Promise.all([
      getMetrics({
        workspace_id: currentWorkspace.id,
        account_id: accountId,
        platform: conn.platform,
        days: parseInt(selectedDays, 10),
      }),
      getGoals({
        workspace_id: currentWorkspace.id,
        account_id: accountId,
        platform: conn.platform,
      }),
    ]);

    setMetrics(metricsData);
    setGoals(goalsData);
    setMetricsLoading(false);
  }, [currentWorkspace?.id, selectedConnectionId, selectedDays, connections]);

  const handleSync = async () => {
    if (!currentWorkspace?.id) return;
    setSyncing(true);
    setSyncMessage(null);

    const conn = connections.find((c) => c.id === selectedConnectionId);
    const result = await syncMetrics({
      workspace_id: currentWorkspace.id,
      account_id: conn?.page_id,
      days_back: parseInt(selectedDays, 10),
    });

    setSyncing(false);

    if (result.success) {
      setSyncMessage(`${result.total_synced} registros sincronizados com sucesso.`);
      await loadMetricsAndGoals();
    } else {
      setSyncMessage(`Erro na sincronizacao: ${result.error}`);
    }

    setTimeout(() => setSyncMessage(null), 5000);
  };

  const handleRequestAIGoals = async () => {
    if (!currentWorkspace?.id || !selectedConnectionId) return;
    const conn = connections.find((c) => c.id === selectedConnectionId);
    if (!conn) return;

    setAiLoading(true);
    const accountId =
      conn.platform === 'instagram' && conn.instagram_account_id
        ? conn.instagram_account_id
        : conn.page_id;

    const result = await requestAIGoals({
      workspace_id: currentWorkspace.id,
      account_id: accountId,
      platform: conn.platform,
      account_name: conn.platform === 'instagram' ? `@${conn.instagram_username}` : conn.page_name,
    });

    setAiLoading(false);

    if (result?.goals) {
      setAiSuggestions(result.goals.goals || []);
      setAiAssessment(result.goals.overall_assessment);
      setAiGrowthPotential(result.goals.growth_potential);
      // Recarrega metas salvas
      await loadMetricsAndGoals();
    }
  };

  // Opcoes para o select de contas
  const connectionOptions = connections.map((c) => ({
    value: c.id,
    label: c.platform === 'instagram'
      ? `@${c.instagram_username || c.page_name} (Instagram)`
      : `${c.page_name} (Facebook)`,
    icon:
      c.platform === 'instagram' ? (
        <Instagram className="w-3.5 h-3.5 text-pink-500" />
      ) : (
        <Facebook className="w-3.5 h-3.5 text-blue-600" />
      ),
  }));

  const selectedConn = connections.find((c) => c.id === selectedConnectionId);

  // Monta dados para os graficos
  const trendData = (metrics?.time_series || []).map((row) => ({
    date: row.date,
    value: row.followers_count,
  }));

  const engagementData = (metrics?.time_series || []).map((row) => ({
    date: row.date,
    likes: row.likes,
    comments: row.comments,
    shares: row.shares,
    saves: row.saves,
  }));

  // Meta ativa de seguidores (se houver)
  const followerGoal = goals.find((g) => g.metric_name === 'followers_count');

  // -------------------------------------------------------
  // Render: sem workspace
  // -------------------------------------------------------
  if (!currentWorkspace) {
    return (
      <Alert variant="warning" title="Workspace necessario">
        Selecione ou crie um workspace para acessar os indicadores de redes sociais.
      </Alert>
    );
  }

  // -------------------------------------------------------
  // Render: carregando conexoes
  // -------------------------------------------------------
  if (connectionsLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loading text="Carregando contas conectadas..." />
      </div>
    );
  }

  // -------------------------------------------------------
  // Render: sem conexoes (estado vazio com CTA)
  // -------------------------------------------------------
  if (connections.length === 0) {
    return (
      <>
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 to-blue-100 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Crescimento de Redes Sociais</h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
            Conecte suas Pages do Facebook e contas do Instagram para acompanhar
            seguidores, engajamento e evolucao da presenca digital.
          </p>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setShowConnectModal(true)}
          >
            Conectar Primeira Conta
          </Button>
          <p className="text-xs text-gray-400 mt-3">
            Requer conexao Meta configurada em Meta Ads &gt; Conexao Meta
          </p>
        </div>

        <ConnectAccountsModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          workspaceId={currentWorkspace.id}
          clientId={selectedClient?.id}
          onConnected={loadConnections}
        />
      </>
    );
  }

  // -------------------------------------------------------
  // Render principal
  // -------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crescimento de Redes Sociais</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Acompanhe seguidores, engajamento e presenca digital
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={() => setShowConnectModal(true)}
          >
            Adicionar Conta
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={RefreshCw}
            loading={syncing}
            onClick={handleSync}
          >
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Select
              options={connectionOptions}
              value={selectedConnectionId}
              onChange={(v) => setSelectedConnectionId(v as string)}
              placeholder="Selecione uma conta"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              options={PERIOD_OPTIONS}
              value={selectedDays}
              onChange={(v) => setSelectedDays(v as string)}
            />
          </div>
        </div>
      </Card>

      {/* Feedback de sync */}
      {syncMessage && (
        <Alert variant={syncMessage.includes('Erro') ? 'error' : 'success'}>
          {syncMessage}
        </Alert>
      )}

      {/* Estado sem dados */}
      {!metricsLoading && metrics && !metrics.has_data && (
        <Alert variant="info" title="Sem dados para este periodo">
          Clique em "Sincronizar" para buscar as metricas desta conta no periodo selecionado.
        </Alert>
      )}

      {/* Aviso sem conta selecionada */}
      {!selectedConnectionId && (
        <Alert variant="info">
          Selecione uma conta acima para visualizar os indicadores.
        </Alert>
      )}

      {selectedConnectionId && (
        <>
          {/* 4 MetricCards principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Seguidores"
              value={metrics?.totals.followers_count || 0}
              change={
                metrics
                  ? { value: metrics.changes.followers_count, period: `${selectedDays}d anteriores` }
                  : undefined
              }
              icon={Users}
              format="number"
              loading={metricsLoading}
            />
            <MetricCard
              title="Taxa de Engajamento"
              value={metrics?.totals.avg_engagement_rate || 0}
              change={
                metrics
                  ? { value: metrics.changes.engagement_rate, period: `${selectedDays}d anteriores` }
                  : undefined
              }
              icon={Heart}
              format="percentage"
              loading={metricsLoading}
            />
            <MetricCard
              title="Alcance"
              value={metrics?.totals.reach || 0}
              change={
                metrics
                  ? { value: metrics.changes.reach, period: `${selectedDays}d anteriores` }
                  : undefined
              }
              icon={TrendingUp}
              format="number"
              loading={metricsLoading}
            />
            <MetricCard
              title="Visitas ao Perfil"
              value={metrics?.totals.profile_views || 0}
              change={
                metrics
                  ? { value: metrics.changes.profile_views, period: `${selectedDays}d anteriores` }
                  : undefined
              }
              icon={Eye}
              format="number"
              loading={metricsLoading}
            />
          </div>

          {/* Cards secundarios (interacoes) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Curtidas', value: metrics?.totals.likes || 0 },
              { label: 'Comentarios', value: metrics?.totals.comments || 0 },
              { label: 'Impressoes', value: metrics?.totals.impressions || 0 },
              { label: 'Cliques no Link', value: metrics?.totals.website_clicks || 0 },
            ].map((item) => (
              <Card key={item.label} padding="sm">
                <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                <p className="text-lg font-bold text-gray-900">
                  {metricsLoading ? '---' : item.value.toLocaleString('pt-BR')}
                </p>
              </Card>
            ))}
          </div>

          {/* Graficos de tendencia */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GrowthTrendChart
              title="Evolucao de Seguidores"
              data={trendData}
              metricLabel="Seguidores"
              goalValue={followerGoal?.target_value}
              color="#3b82f6"
              loading={metricsLoading}
            />
            <EngagementBreakdownChart
              data={engagementData}
              loading={metricsLoading}
            />
          </div>

          {/* Score de presenca + Metas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DigitalPresenceScore
              score={metrics?.digital_presence_score || 0}
              loading={metricsLoading}
            />
            <GoalsPanel
              goals={goals}
              onRequestAIGoals={handleRequestAIGoals}
              onGoalsChange={loadMetricsAndGoals}
              aiLoading={aiLoading}
              aiSuggestions={aiSuggestions}
              overallAssessment={aiAssessment}
              growthPotential={aiGrowthPotential}
            />
          </div>
        </>
      )}

      {/* Modal de conexao */}
      <ConnectAccountsModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        workspaceId={currentWorkspace.id}
        clientId={selectedClient?.id}
        onConnected={loadConnections}
      />
    </div>
  );
};
