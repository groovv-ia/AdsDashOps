import Papa from 'papaparse';
import jsPDF from 'jspdf';
import { AdMetrics, Campaign } from '../types/advertising';

export const exportToCSV = (data: AdMetrics[], campaigns: Campaign[]) => {
  const csvData = data.map(metric => {
    const campaign = campaigns.find(c => c.id === metric.campaign_id);
    return {
      Data: metric.date,
      Campanha: campaign?.name || 'Desconhecida',
      Plataforma: campaign?.platform || 'Desconhecida',
      Impressões: metric.impressions,
      Cliques: metric.clicks,
      Gasto: metric.spend,
      Conversões: metric.conversions,
      CTR: metric.ctr,
      CPC: metric.cpc,
      ROAS: metric.roas,
      'Custo por Resultado': metric.cost_per_result,
    };
  });

  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `performance-anuncios-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (data: AdMetrics[], campaigns: Campaign[]) => {
  const pdf = new jsPDF();
  
  // Title
  pdf.setFontSize(20);
  pdf.text('Relatório de Performance de Publicidade', 20, 30);
  
  // Date
  pdf.setFontSize(12);
  pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 45);
  
  // Summary
  const totalImpressions = data.reduce((sum, metric) => sum + metric.impressions, 0);
  const totalClicks = data.reduce((sum, metric) => sum + metric.clicks, 0);
  const totalSpend = data.reduce((sum, metric) => sum + metric.spend, 0);
  const totalConversions = data.reduce((sum, metric) => sum + metric.conversions, 0);
  
  pdf.setFontSize(14);
  pdf.text('Resumo', 20, 65);
  
  pdf.setFontSize(10);
  pdf.text(`Total de Impressões: ${totalImpressions.toLocaleString('pt-BR')}`, 20, 80);
  pdf.text(`Total de Cliques: ${totalClicks.toLocaleString('pt-BR')}`, 20, 90);
  pdf.text(`Gasto Total: R$${totalSpend.toLocaleString('pt-BR')}`, 20, 100);
  pdf.text(`Total de Conversões: ${totalConversions.toLocaleString('pt-BR')}`, 20, 110);
  pdf.text(`CTR Médio: ${((totalClicks / totalImpressions) * 100).toFixed(2)}%`, 20, 120);
  
  // Campaign breakdown
  pdf.setFontSize(14);
  pdf.text('Detalhamento por Campanha', 20, 140);
  
  let yPosition = 155;
  campaigns.forEach((campaign, index) => {
    const campaignMetrics = data.filter(m => m.campaign_id === campaign.id);
    const campaignImpressions = campaignMetrics.reduce((sum, m) => sum + m.impressions, 0);
    const campaignSpend = campaignMetrics.reduce((sum, m) => sum + m.spend, 0);
    
    pdf.setFontSize(10);
    pdf.text(`${campaign.name} (${campaign.platform})`, 20, yPosition);
    pdf.text(`Impressões: ${campaignImpressions.toLocaleString('pt-BR')}`, 20, yPosition + 10);
    pdf.text(`Gasto: R$${campaignSpend.toLocaleString('pt-BR')}`, 20, yPosition + 20);
    
    yPosition += 35;
    
    // Add new page if needed
    if (yPosition > 250 && index < campaigns.length - 1) {
      pdf.addPage();
      yPosition = 30;
    }
  });
  
  pdf.save(`performance-anuncios-${new Date().toISOString().split('T')[0]}.pdf`);
};