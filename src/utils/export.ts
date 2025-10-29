import { jsPDF } from 'jspdf';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { Metric, Campaign } from '../types/advertising';

// Função para exportar dados para CSV usando PapaParse
export const exportToCSV = (metrics: Metric[], campaigns: Campaign[]) => {
  try {
    // Cria um mapa de campanhas para lookup rápido
    const campaignMap = new Map(campaigns.map(c => [c.id, c]));

    // Prepara os dados para exportação com informações enriquecidas
    const exportData = metrics.map(metric => {
      const campaign = campaignMap.get(metric.campaign_id);
      return {
        Data: format(new Date(metric.date), 'dd/MM/yyyy'),
        Campanha: campaign?.name || 'N/A',
        Plataforma: campaign?.platform || 'N/A',
        Impressões: metric.impressions,
        Cliques: metric.clicks,
        'Gasto (R$)': metric.spend.toFixed(2),
        Conversões: metric.conversions,
        Alcance: metric.reach,
        Frequência: metric.frequency.toFixed(2),
        'CTR (%)': (metric.ctr * 100).toFixed(2),
        'CPC (R$)': metric.cpc.toFixed(2),
        ROAS: metric.roas.toFixed(2),
        'Custo por Resultado (R$)': metric.cost_per_result.toFixed(2),
      };
    });

    // Converte para CSV usando PapaParse
    const csv = Papa.unparse(exportData, {
      delimiter: ',',
      header: true,
    });

    // Cria um blob e trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `metricas_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('CSV exportado com sucesso!');
  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    throw new Error('Falha ao exportar dados para CSV');
  }
};

// Função para exportar dados para PDF usando jsPDF
export const exportToPDF = (metrics: Metric[], campaigns: Campaign[]) => {
  try {
    // Cria um novo documento PDF
    const doc = new jsPDF();

    // Configurações de layout
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Adiciona título
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Métricas de Publicidade', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Adiciona data de geração
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Calcula totais
    const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
    const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0);
    const totalSpend = metrics.reduce((sum, m) => sum + m.spend, 0);
    const totalConversions = metrics.reduce((sum, m) => sum + m.conversions, 0);
    const avgCTR = metrics.reduce((sum, m) => sum + m.ctr, 0) / metrics.length;
    const avgROAS = metrics.reduce((sum, m) => sum + m.roas, 0) / metrics.length;

    // Adiciona resumo executivo
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Executivo', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const summaryLines = [
      `Total de Impressões: ${totalImpressions.toLocaleString('pt-BR')}`,
      `Total de Cliques: ${totalClicks.toLocaleString('pt-BR')}`,
      `Gasto Total: R$ ${totalSpend.toFixed(2).replace('.', ',')}`,
      `Total de Conversões: ${totalConversions}`,
      `CTR Médio: ${(avgCTR * 100).toFixed(2)}%`,
      `ROAS Médio: ${avgROAS.toFixed(2)}`,
    ];

    summaryLines.forEach(line => {
      doc.text(line, margin, yPosition);
      yPosition += 7;
    });

    yPosition += 10;

    // Adiciona informações de campanhas
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Campanhas Analisadas', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Cria um mapa de campanhas para contar métricas
    const campaignMetrics = new Map<string, number>();
    metrics.forEach(m => {
      const count = campaignMetrics.get(m.campaign_id) || 0;
      campaignMetrics.set(m.campaign_id, count + 1);
    });

    campaigns.slice(0, 10).forEach(campaign => {
      const metricCount = campaignMetrics.get(campaign.id) || 0;
      const line = `${campaign.name} (${campaign.platform}) - ${metricCount} registros`;

      // Verifica se precisa adicionar nova página
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      doc.text(line, margin, yPosition);
      yPosition += 6;
    });

    // Adiciona rodapé
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Salva o PDF
    doc.save(`relatorio_metricas_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);

    console.log('PDF exportado com sucesso!');
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    throw new Error('Falha ao exportar dados para PDF');
  }
};

// Função helper para formatar valores monetários
export const formatCurrency = (value: number, currency: string = 'BRL'): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
};

// Função helper para formatar porcentagens
export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

// Função helper para formatar números grandes
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};
