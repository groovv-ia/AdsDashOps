/**
 * CreativeQualityDashboard Component
 *
 * Dashboard completo para visualização e análise de qualidade de criativos.
 * Exibe estatísticas agregadas, rankings, distribuição de scores e métricas de custo.
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Award,
  AlertTriangle,
  Eye,
  Filter,
  Download,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Loading } from '../ui/Loading';
import type { ClaudeCreativeAnalysis } from '../../lib/services/ClaudeAnalysisService';
import { AdCreativeThumbnail } from '../ad-analysis/AdCreativeThumbnail';

/**
 * Interface para estatísticas agregadas
 */
interface QualityStats {
  totalAnalyzed: number;
  averageScore: number;
  totalCost: number;
  scoreDistribution: {
    excellent: number; // 90-100
    good: number; // 70-89
    average: number; // 50-69
    poor: number; // 0-49
  };
}

/**
 * Interface para item ranqueado
 */
interface RankedCreative {
  analysis: ClaudeCreativeAnalysis;
  creative: {
    id: string;
    ad_id: string;
    image_url: string | null;
    thumbnail_url: string | null;
    title: string | null;
    body: string | null;
  } | null;
}

/**
 * Componente principal do dashboard
 */
export const CreativeQualityDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [topCreatives, setTopCreatives] = useState<RankedCreative[]>([]);
  const [bottomCreatives, setBottomCreatives] = useState<RankedCreative[]>([]);
  const [allCreatives, setAllCreatives] = useState<RankedCreative[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [scoreFilter, setScoreFilter] = useState<{ min: number; max: number }>({ min: 0, max: 100 });

  /**
   * Carrega dados do dashboard
   */
  useEffect(() => {
    loadDashboardData();
  }, [scoreFilter]);

  /**
   * Função para carregar todos os dados
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Busca todas as análises
      const { data: analyses, error: analysesError } = await supabase
        .from('claude_creative_analyses')
        .select('*')
        .gte('overall_score', scoreFilter.min)
        .lte('overall_score', scoreFilter.max)
        .order('overall_score', { ascending: false });

      if (analysesError) throw analysesError;

      if (!analyses || analyses.length === 0) {
        setStats({
          totalAnalyzed: 0,
          averageScore: 0,
          totalCost: 0,
          scoreDistribution: { excellent: 0, good: 0, average: 0, poor: 0 },
        });
        setTopCreatives([]);
        setBottomCreatives([]);
        setAllCreatives([]);
        setLoading(false);
        return;
      }

      // Busca criativos relacionados
      const creativeIds = analyses.map(a => a.creative_id);
      const { data: creatives } = await supabase
        .from('meta_ad_creatives')
        .select('id, ad_id, image_url, thumbnail_url, title, body')
        .in('id', creativeIds);

      // Monta dados ranqueados
      const ranked: RankedCreative[] = analyses.map(analysis => {
        const creative = creatives?.find(c => c.id === analysis.creative_id) || null;
        return { analysis, creative };
      });

      // Calcula estatísticas
      const totalAnalyzed = analyses.length;
      const averageScore = analyses.reduce((sum, a) => sum + (a.overall_score || 0), 0) / totalAnalyzed;
      const totalCost = analyses.reduce((sum, a) => sum + (a.estimated_cost || 0), 0);

      const scoreDistribution = {
        excellent: analyses.filter(a => (a.overall_score || 0) >= 90).length,
        good: analyses.filter(a => (a.overall_score || 0) >= 70 && (a.overall_score || 0) < 90).length,
        average: analyses.filter(a => (a.overall_score || 0) >= 50 && (a.overall_score || 0) < 70).length,
        poor: analyses.filter(a => (a.overall_score || 0) < 50).length,
      };

      setStats({ totalAnalyzed, averageScore, totalCost, scoreDistribution });
      setTopCreatives(ranked.slice(0, 5));
      setBottomCreatives(ranked.slice(-5).reverse());
      setAllCreatives(ranked);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Exporta dados em CSV
   */
  const exportToCSV = () => {
    if (!allCreatives.length) return;

    const headers = ['Rank', 'Ad ID', 'Title', 'Score', 'AIDA Attention', 'AIDA Interest', 'AIDA Desire', 'AIDA Action', 'Cost (USD)', 'Date'];
    const rows = allCreatives.map((item, index) => [
      index + 1,
      item.analysis.creative_id,
      item.creative?.title || 'N/A',
      item.analysis.overall_score || 0,
      item.analysis.aida_analysis?.attention?.score || 0,
      item.analysis.aida_analysis?.interest?.score || 0,
      item.analysis.aida_analysis?.desire?.score || 0,
      item.analysis.aida_analysis?.action?.score || 0,
      (item.analysis.estimated_cost || 0).toFixed(4),
      new Date(item.analysis.created_at).toLocaleDateString('pt-BR'),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `creative-quality-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" message="Carregando dashboard de qualidade..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md p-6">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Erro ao Carregar</h3>
          <p className="text-gray-600 text-center">{error}</p>
          <Button onClick={loadDashboardData} variant="primary" className="w-full mt-4">
            Tentar Novamente
          </Button>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-600" />
            Qualidade de Criativos
          </h1>
          <p className="text-gray-600 mt-1">Análise completa de performance criativa com IA</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" disabled={!allCreatives.length}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Analisado</span>
            <Eye className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalAnalyzed}</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Score Médio</span>
            <Award className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.averageScore.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-1">de 100</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-white border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Custo Total</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">${stats.totalCost.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">em análises</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-amber-50 to-white border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Custo Médio</span>
            <BarChart3 className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${stats.totalAnalyzed > 0 ? (stats.totalCost / stats.totalAnalyzed).toFixed(4) : '0'}
          </p>
          <p className="text-xs text-gray-500 mt-1">por análise</p>
        </Card>
      </div>

      {/* Distribuição de Scores */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Distribuição de Scores
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-3xl font-bold text-green-700">{stats.scoreDistribution.excellent}</p>
            <p className="text-sm text-gray-600 mt-1">Excelente (90-100)</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-3xl font-bold text-blue-700">{stats.scoreDistribution.good}</p>
            <p className="text-sm text-gray-600 mt-1">Bom (70-89)</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-3xl font-bold text-yellow-700">{stats.scoreDistribution.average}</p>
            <p className="text-sm text-gray-600 mt-1">Regular (50-69)</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-3xl font-bold text-red-700">{stats.scoreDistribution.poor}</p>
            <p className="text-sm text-gray-600 mt-1">Ruim (0-49)</p>
          </div>
        </div>
      </Card>

      {/* Top 5 Criativos */}
      {topCreatives.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            Top 5 Criativos
          </h2>
          <div className="space-y-3">
            {topCreatives.map((item, index) => (
              <CreativeRankItem key={item.analysis.id} item={item} rank={index + 1} />
            ))}
          </div>
        </Card>
      )}

      {/* Bottom 5 Criativos */}
      {bottomCreatives.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-red-600" />
            Bottom 5 Criativos (Precisam de Atenção)
          </h2>
          <div className="space-y-3">
            {bottomCreatives.map((item, index) => (
              <CreativeRankItem
                key={item.analysis.id}
                item={item}
                rank={allCreatives.length - index}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Todos os Criativos - Tabela completa */}
      {allCreatives.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="w-6 h-6 text-gray-600" />
              Todos os Criativos ({allCreatives.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase">Rank</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase">Preview</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase">Título</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase">Score</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase">AIDA</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-600 uppercase">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allCreatives.map((item, index) => (
                  <tr key={item.analysis.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">#{index + 1}</td>
                    <td className="px-4 py-3">
                      <AdCreativeThumbnail
                        creative={item.creative as any}
                        size="sm"
                        showAiScoreBadge={false}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {item.creative?.title || 'Sem título'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-semibold ${getScoreBadgeClass(item.analysis.overall_score || 0)}`}>
                        {item.analysis.overall_score || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 text-center">
                      A:{item.analysis.aida_analysis?.attention?.score || 0} I:{item.analysis.aida_analysis?.interest?.score || 0} D:{item.analysis.aida_analysis?.desire?.score || 0} A:{item.analysis.aida_analysis?.action?.score || 0}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 text-center">
                      {new Date(item.analysis.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Mensagem de vazio */}
      {stats.totalAnalyzed === 0 && (
        <Card className="p-12 text-center">
          <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma Análise Encontrada</h3>
          <p className="text-gray-600">
            Comece analisando seus criativos para ver estatísticas e rankings aqui.
          </p>
        </Card>
      )}
    </div>
  );
};

/**
 * Componente para item ranqueado individual
 */
interface CreativeRankItemProps {
  item: RankedCreative;
  rank: number;
}

const CreativeRankItem: React.FC<CreativeRankItemProps> = ({ item, rank }) => {
  const { analysis, creative } = item;

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-white rounded-full border-2 border-gray-200">
        <span className="text-lg font-bold text-gray-900">#{rank}</span>
      </div>
      <AdCreativeThumbnail
        creative={creative as any}
        size="md"
        showAiScoreBadge={false}
      />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-900 truncate">
          {creative?.title || 'Sem título'}
        </h4>
        <p className="text-xs text-gray-600 truncate">{creative?.body || 'Sem descrição'}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${getScoreBadgeClass(analysis.overall_score || 0)}`}>
          <Sparkles className="w-3 h-3" />
          {analysis.overall_score || 0}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          AIDA: {Math.round(((analysis.aida_analysis?.attention?.score || 0) + (analysis.aida_analysis?.interest?.score || 0) + (analysis.aida_analysis?.desire?.score || 0) + (analysis.aida_analysis?.action?.score || 0)) / 4)}
        </p>
      </div>
    </div>
  );
};

/**
 * Helper para obter classe CSS do badge de score
 */
function getScoreBadgeClass(score: number): string {
  if (score >= 90) return 'bg-green-100 text-green-800';
  if (score >= 70) return 'bg-blue-100 text-blue-800';
  if (score >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

export default CreativeQualityDashboard;
