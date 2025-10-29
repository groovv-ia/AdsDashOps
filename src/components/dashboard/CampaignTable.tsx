import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Campaign, Metric } from '../../types/advertising';
import { formatCurrency, formatNumber } from '../../utils/export';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CampaignTableProps {
  campaigns: Campaign[];
  metrics: Metric[];
}

export const CampaignTable: React.FC<CampaignTableProps> = ({ campaigns, metrics }) => {
  const [sortField, setSortField] = useState<string>('spend');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const campaignMetrics = campaigns.map(campaign => {
    const campaignMetricsData = metrics.filter(m => m.campaign_id === campaign.id);
    const totalSpend = campaignMetricsData.reduce((sum, m) => sum + m.spend, 0);
    const totalImpressions = campaignMetricsData.reduce((sum, m) => sum + m.impressions, 0);
    const totalClicks = campaignMetricsData.reduce((sum, m) => sum + m.clicks, 0);
    const totalConversions = campaignMetricsData.reduce((sum, m) => sum + m.conversions, 0);
    const avgCTR = campaignMetricsData.reduce((sum, m) => sum + m.ctr, 0) / campaignMetricsData.length || 0;

    return {
      ...campaign,
      totalSpend,
      totalImpressions,
      totalClicks,
      totalConversions,
      avgCTR,
    };
  });

  const sortedCampaigns = [...campaignMetrics].sort((a, b) => {
    const aValue = a[sortField as keyof typeof a];
    const bValue = b[sortField as keyof typeof b];
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <Card title="Campanhas" padding="none">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campanha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plataforma</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('totalImpressions')}>
                <div className="flex items-center">Impressões {sortField === 'totalImpressions' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}</div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('totalClicks')}>
                <div className="flex items-center">Cliques {sortField === 'totalClicks' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}</div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('totalSpend')}>
                <div className="flex items-center">Gasto {sortField === 'totalSpend' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}</div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedCampaigns.map(campaign => (
              <tr key={campaign.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{campaign.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{campaign.platform}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(campaign.totalImpressions)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(campaign.totalClicks)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(campaign.totalSpend)}</td>
                <td className="px-6 py-4 whitespace-nowrap"><span className={'px-2 py-1 text-xs font-semibold rounded-full ' + (campaign.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>{campaign.status === 'active' ? 'Ativa' : 'Pausada'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
