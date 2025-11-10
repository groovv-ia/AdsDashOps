import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Play, Pause } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Campaign, AdMetrics } from '../../types/advertising';

interface CampaignTableProps {
  campaigns: Campaign[];
  metrics: AdMetrics[];
}

export const CampaignTable: React.FC<CampaignTableProps> = ({
  campaigns,
  metrics
}) => {
  const [sortField, setSortField] = useState<string>('spend');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const getCampaignMetrics = (campaignId: string) => {
    const campaignMetrics = metrics.filter(m => m.campaign_id === campaignId);
    
    return campaignMetrics.reduce((acc, metric) => ({
      impressions: acc.impressions + metric.impressions,
      clicks: acc.clicks + metric.clicks,
      spend: acc.spend + metric.spend,
      conversions: acc.conversions + metric.conversions,
      ctr: acc.ctr + metric.ctr,
      cpc: acc.cpc + metric.cpc,
      roas: acc.roas + metric.roas,
    }), {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      roas: 0,
    });
  };

  const campaignsWithMetrics = campaigns.map(campaign => ({
    ...campaign,
    metrics: getCampaignMetrics(campaign.id)
  }));

  const sortedCampaigns = [...campaignsWithMetrics].sort((a, b) => {
    let aValue, bValue;

    if (sortField === 'name') {
      aValue = a.name;
      bValue = b.name;
    } else if (sortField === 'status') {
      aValue = a.status;
      bValue = b.status;
    } else {
      aValue = a.metrics[sortField as keyof typeof a.metrics] || 0;
      bValue = b.metrics[sortField as keyof typeof b.metrics] || 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc' 
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortHeader: React.FC<{ field: string; children: React.ReactNode }> = ({ field, children }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
        )}
      </div>
    </th>
  );

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'Meta': return 'bg-blue-100 text-blue-800';
      case 'TikTok': return 'bg-pink-100 text-pink-800';
      case 'Google': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    // Normaliza o status para maiúsculas para comparar
    const normalizedStatus = status?.toUpperCase();

    switch (normalizedStatus) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'ENDED':
      case 'ARCHIVED':
      case 'DELETED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    // Normaliza o status para maiúsculas para comparar
    const normalizedStatus = status?.toUpperCase();

    switch (normalizedStatus) {
      case 'ACTIVE':
        return 'Ativo';
      case 'PAUSED':
        return 'Pausado';
      case 'ENDED':
      case 'ARCHIVED':
        return 'Finalizado';
      case 'DELETED':
        return 'Deletado';
      default:
        // Retorna o status original se não reconhecido
        return status;
    }
  };

  const getObjectiveText = (objective: string) => {
    switch (objective) {
      case 'Conversions': return 'Conversões';
      case 'Reach': return 'Alcance';
      case 'Traffic': return 'Tráfego';
      case 'Engagement': return 'Engajamento';
      default: return objective;
    }
  };

  return (
    <Card padding="none">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Performance das Campanhas</h3>
        <p className="text-sm text-gray-600">Visão detalhada de todas as suas campanhas</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader field="name">Campanha</SortHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plataforma
              </th>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="impressions">Impressões</SortHeader>
              <SortHeader field="clicks">Cliques</SortHeader>
              <SortHeader field="spend">Gasto</SortHeader>
              <SortHeader field="conversions">Conversões</SortHeader>
              <SortHeader field="ctr">CTR</SortHeader>
              <SortHeader field="roas">ROAS</SortHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedCampaigns.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                    <div className="text-sm text-gray-500">{getObjectiveText(campaign.objective)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlatformColor(campaign.platform)}`}>
                    {campaign.platform}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                    {getStatusText(campaign.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {campaign.metrics.impressions.toLocaleString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {campaign.metrics.clicks.toLocaleString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  R${campaign.metrics.spend.toLocaleString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {campaign.metrics.conversions.toLocaleString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(campaign.metrics.ctr / campaigns.length).toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(campaign.metrics.roas / campaigns.length).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <Button variant="ghost" size="sm" title={campaign.status === 'Active' ? 'Pausar' : 'Ativar'}>
                    {campaign.status === 'Active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" title="Ver detalhes">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedCampaigns.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhuma campanha encontrada com os filtros selecionados.</p>
        </div>
      )}
    </Card>
  );
};