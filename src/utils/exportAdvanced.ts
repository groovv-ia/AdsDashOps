/**
 * Utilitários avançados de exportação com suporte a Insights de IA
 * Suporta exportação em CSV, Excel (XLSX) e PDF com template profissional
 */

import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import type { ExportDataWithAI } from '../lib/services/ExportWithAIService';
import type { MetricsAIAnalysis } from '../types/metricsAnalysis';
import { formatAIInsightsAsText } from '../lib/services/ExportWithAIService';

/**
 * Exporta dados para CSV com insights de IA (se disponíveis)
 */
export async function exportMetaInsightsToCSV(
  exportData: ExportDataWithAI,
  fileName: string
): Promise<void> {
  const { rawData, metadata, kpis, aiInsights, hasAI } = exportData;

  // Monta seção de metadados
  const metadataSection = [
    ['=== RELATÓRIO ADSOPS - META ADS ==='],
    [''],
    ['Conta:', metadata.accountName],
    ['ID da Conta:', metadata.accountId],
    ['Nível:', getLevelLabel(metadata.entityLevel)],
    ['Período:', `${metadata.periodStart} até ${metadata.periodEnd}`],
    ['Gerado em:', metadata.generatedAt],
    ['Total de Registros:', metadata.totalRecords.toString()],
    [''],
    ['=== KPIs CONSOLIDADOS ==='],
    [''],
    ['Gasto Total:', `R$ ${kpis.totalSpend.toFixed(2)}`],
    ['Total de Impressões:', kpis.totalImpressions.toLocaleString('pt-BR')],
    ['Total de Alcance:', kpis.totalReach.toLocaleString('pt-BR')],
    ['Total de Cliques:', kpis.totalClicks.toLocaleString('pt-BR')],
    ['CTR Médio:', `${kpis.avgCtr.toFixed(2)}%`],
    ['CPC Médio:', `R$ ${kpis.avgCpc.toFixed(2)}`],
    ['CPM Médio:', `R$ ${kpis.avgCpm.toFixed(2)}`],
    ['Frequência Média:', kpis.avgFrequency.toFixed(2)],
    [''],
  ];

  // Se tem insights de IA, adiciona seção
  if (hasAI && aiInsights) {
    const aiText = formatAIInsightsAsText(aiInsights);
    const aiLines = aiText.split('\n').map(line => [line]);
    metadataSection.push(['=== INSIGHTS DE IA ==='], [''], ...aiLines, ['']);
  }

  // Adiciona cabeçalho dos dados
  metadataSection.push(['=== DADOS DETALHADOS ==='], ['']);

  // Prepara dados detalhados
  const detailedData = rawData.map(row => ({
    'ID': row.id || row.entity_id,
    'Nome': row.name || row.entity_name,
    'Status': row.status || '',
    'Data Início': row.start_date || row.date_start || '',
    'Data Fim': row.end_date || row.date_stop || '',
    'Impressões': Number(row.impressions) || 0,
    'Alcance': Number(row.reach) || 0,
    'Cliques': Number(row.clicks) || 0,
    'Gasto': Number(row.spend) || 0,
    'CTR (%)': Number(row.ctr) || 0,
    'CPC': Number(row.cpc) || 0,
    'CPM': Number(row.cpm) || 0,
    'Frequência': Number(row.frequency) || 0,
    'Conversões': Number(row.conversions) || 0,
  }));

  // Converte para CSV
  const metaCsv = Papa.unparse(metadataSection);
  const dataCsv = Papa.unparse(detailedData);
  const fullCsv = metaCsv + '\n\n' + dataCsv;

  // Cria blob e dispara download
  const blob = new Blob(['\ufeff' + fullCsv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, fileName);
}

/**
 * Exporta dados para Excel (XLSX) com múltiplas abas e insights de IA
 */
export async function exportMetaInsightsToExcel(
  exportData: ExportDataWithAI,
  fileName: string
): Promise<void> {
  const { rawData, metadata, kpis, aiInsights, hasAI } = exportData;

  const workbook = XLSX.utils.book_new();

  // === ABA 1: RESUMO EXECUTIVO ===
  const summaryData = [
    ['RELATÓRIO ADSOPS - META ADS'],
    [''],
    ['Conta:', metadata.accountName],
    ['ID da Conta:', metadata.accountId],
    ['Nível:', getLevelLabel(metadata.entityLevel)],
    ['Período:', `${metadata.periodStart} até ${metadata.periodEnd}`],
    ['Gerado em:', metadata.generatedAt],
    [''],
    ['KPIs PRINCIPAIS'],
    ['Métrica', 'Valor'],
    ['Gasto Total', `R$ ${kpis.totalSpend.toFixed(2)}`],
    ['Total de Impressões', kpis.totalImpressions.toLocaleString('pt-BR')],
    ['Total de Alcance', kpis.totalReach.toLocaleString('pt-BR')],
    ['Total de Cliques', kpis.totalClicks.toLocaleString('pt-BR')],
    ['CTR Médio', `${kpis.avgCtr.toFixed(2)}%`],
    ['CPC Médio', `R$ ${kpis.avgCpc.toFixed(2)}`],
    ['CPM Médio', `R$ ${kpis.avgCpm.toFixed(2)}`],
    ['Frequência Média', kpis.avgFrequency.toFixed(2)],
  ];

  // Se tem insights de IA, adiciona score geral
  if (hasAI && aiInsights) {
    summaryData.push(
      [''],
      ['PERFORMANCE GERAL (IA)'],
      ['Score Geral', `${aiInsights.performance_scores.overall_score}/100`]
    );
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo Executivo');

  // === ABA 2: ANÁLISE DE IA (se disponível) ===
  if (hasAI && aiInsights) {
    const aiData = [
      ['ANÁLISE DE IA - INSIGHTS'],
      [''],
      ['SCORES DE PERFORMANCE'],
      ['Score', 'Valor'],
      ['Geral', aiInsights.performance_scores.overall_score],
      ['Eficiência', aiInsights.performance_scores.efficiency_score],
      ['Custo', aiInsights.performance_scores.cost_score],
      ['Alcance', aiInsights.performance_scores.reach_score],
      ['Conversão', aiInsights.performance_scores.conversion_score],
      ['Tendência', aiInsights.performance_scores.trend_score],
      [''],
      ['RESUMO EXECUTIVO'],
      [aiInsights.executive_summary],
      [''],
      ['DIAGNÓSTICO GERAL'],
      [aiInsights.overall_diagnosis],
      [''],
    ];

    // Áreas prioritárias
    if (aiInsights.priority_areas && aiInsights.priority_areas.length > 0) {
      aiData.push(['ÁREAS DE ATENÇÃO PRIORITÁRIA'], ['']);
      aiInsights.priority_areas.forEach((area, idx) => {
        aiData.push([`${idx + 1}. ${area}`]);
      });
      aiData.push(['']);
    }

    // Previsão
    if (aiInsights.short_term_forecast) {
      aiData.push(['PREVISÃO DE CURTO PRAZO'], [aiInsights.short_term_forecast], ['']);
    }

    const aiSheet = XLSX.utils.aoa_to_sheet(aiData);
    XLSX.utils.book_append_sheet(workbook, aiSheet, 'Análise de IA');
  }

  // === ABA 3: DADOS DETALHADOS ===
  const detailedData = rawData.map(row => ({
    'ID': row.id || row.entity_id,
    'Nome': row.name || row.entity_name,
    'Status': row.status || '',
    'Data Início': row.start_date || row.date_start || '',
    'Data Fim': row.end_date || row.date_stop || '',
    'Impressões': Number(row.impressions) || 0,
    'Alcance': Number(row.reach) || 0,
    'Cliques': Number(row.clicks) || 0,
    'Gasto': Number(row.spend) || 0,
    'CTR (%)': Number(row.ctr) || 0,
    'CPC': Number(row.cpc) || 0,
    'CPM': Number(row.cpm) || 0,
    'Frequência': Number(row.frequency) || 0,
    'Conversões': Number(row.conversions) || 0,
  }));

  const detailedSheet = XLSX.utils.json_to_sheet(detailedData);
  XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Dados Detalhados');

  // === ABA 4: RECOMENDAÇÕES (se tiver IA) ===
  if (hasAI && aiInsights && aiInsights.recommendations && aiInsights.recommendations.length > 0) {
    const recData = [
      ['RECOMENDAÇÕES DE OTIMIZAÇÃO'],
      [''],
      ['Prioridade', 'Categoria', 'Título', 'Descrição', 'Impacto Esperado'],
    ];

    aiInsights.recommendations.forEach(rec => {
      recData.push([
        rec.priority.toUpperCase(),
        rec.category,
        rec.title,
        rec.description,
        rec.expected_impact,
      ]);
    });

    const recSheet = XLSX.utils.aoa_to_sheet(recData);
    XLSX.utils.book_append_sheet(workbook, recSheet, 'Recomendações');
  }

  // === ABA 5: TENDÊNCIAS (se tiver IA) ===
  if (hasAI && aiInsights && aiInsights.trends && aiInsights.trends.length > 0) {
    const trendData = [
      ['TENDÊNCIAS IDENTIFICADAS'],
      [''],
      ['Métrica', 'Direção', 'Variação (%)', 'Interpretação', 'Ação Sugerida'],
    ];

    aiInsights.trends.forEach(trend => {
      trendData.push([
        trend.metric,
        trend.direction,
        trend.change_percent.toFixed(2),
        trend.interpretation,
        trend.action_suggested,
      ]);
    });

    const trendSheet = XLSX.utils.aoa_to_sheet(trendData);
    XLSX.utils.book_append_sheet(workbook, trendSheet, 'Tendências');
  }

  // === ABA 6: ANOMALIAS (se tiver IA e houver anomalias) ===
  if (hasAI && aiInsights && aiInsights.anomalies && aiInsights.anomalies.length > 0) {
    const anomalyData = [
      ['ANOMALIAS DETECTADAS'],
      [''],
      ['Métrica', 'Tipo', 'Severidade', 'Descrição'],
    ];

    aiInsights.anomalies.forEach(anomaly => {
      anomalyData.push([
        anomaly.metric,
        anomaly.anomaly_type,
        anomaly.severity,
        anomaly.description,
      ]);
    });

    const anomalySheet = XLSX.utils.aoa_to_sheet(anomalyData);
    XLSX.utils.book_append_sheet(workbook, anomalySheet, 'Anomalias');
  }

  // Gera arquivo e dispara download
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, fileName);
}

/**
 * Exporta dados para PDF com template profissional e insights de IA
 */
export async function exportMetaInsightsToPDF(
  exportData: ExportDataWithAI,
  fileName: string,
  chartImages?: string[] // Base64 images dos gráficos
): Promise<void> {
  const { rawData, metadata, kpis, aiInsights, hasAI } = exportData;

  // Cria PDF com orientação retrato
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Cores da identidade AdsOps
  const colors = {
    primary: [33, 150, 243], // Azul
    secondary: [76, 175, 80], // Verde
    accent: [255, 152, 0], // Laranja
    text: [33, 33, 33], // Cinza escuro
    lightGray: [245, 245, 245],
  };

  let currentPage = 1;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // === CAPA ===
  // Fundo da capa
  pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  pdf.rect(0, 0, pageWidth, pageHeight / 3, 'F');

  // Logo (se disponível)
  // TODO: Adicionar logo quando disponível
  pdf.setFontSize(32);
  pdf.setTextColor(255, 255, 255);
  pdf.text('AdsOps', pageWidth / 2, 40, { align: 'center' });

  // Título do relatório
  pdf.setFontSize(24);
  pdf.text('Relatório de Performance', pageWidth / 2, 60, { align: 'center' });
  pdf.setFontSize(16);
  pdf.text('Meta Ads', pageWidth / 2, 70, { align: 'center' });

  // Informações da conta
  pdf.setFontSize(12);
  pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  const coverY = pageHeight / 3 + 30;
  pdf.text(`Conta: ${metadata.accountName}`, 20, coverY);
  pdf.text(`Nível: ${getLevelLabel(metadata.entityLevel)}`, 20, coverY + 10);
  pdf.text(`Período: ${metadata.periodStart} até ${metadata.periodEnd}`, 20, coverY + 20);
  pdf.text(`Gerado em: ${new Date(metadata.generatedAt).toLocaleString('pt-BR')}`, 20, coverY + 30);

  // Score geral (se tiver IA)
  if (hasAI && aiInsights) {
    const score = aiInsights.performance_scores.overall_score;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Performance Geral:', 20, coverY + 50);
    pdf.setFontSize(36);
    pdf.setTextColor(getScoreColor(score)[0], getScoreColor(score)[1], getScoreColor(score)[2]);
    pdf.text(`${score}/100`, 20, coverY + 65);
  }

  // === PÁGINA 2: RESUMO EXECUTIVO ===
  pdf.addPage();
  currentPage++;
  addPageHeader(pdf, 'Resumo Executivo', currentPage, colors);

  let yPos = 40;

  // KPIs em cards
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('KPIs Principais', 20, yPos);
  yPos += 10;

  const kpiData = [
    { label: 'Gasto Total', value: `R$ ${kpis.totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { label: 'Impressões', value: kpis.totalImpressions.toLocaleString('pt-BR') },
    { label: 'Alcance', value: kpis.totalReach.toLocaleString('pt-BR') },
    { label: 'Cliques', value: kpis.totalClicks.toLocaleString('pt-BR') },
    { label: 'CTR Médio', value: `${kpis.avgCtr.toFixed(2)}%` },
    { label: 'CPC Médio', value: `R$ ${kpis.avgCpc.toFixed(2)}` },
    { label: 'CPM Médio', value: `R$ ${kpis.avgCpm.toFixed(2)}` },
    { label: 'Frequência', value: kpis.avgFrequency.toFixed(2) },
  ];

  kpiData.forEach((kpi, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 20 + col * 90;
    const y = yPos + row * 20;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(kpi.label, x, y);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(kpi.value, x, y + 6);
  });

  yPos += 90;

  // === ANÁLISE DE IA ===
  if (hasAI && aiInsights) {
    // Resumo executivo
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Resumo Executivo (IA)', 20, yPos);
    yPos += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const summaryLines = pdf.splitTextToSize(aiInsights.executive_summary, pageWidth - 40);
    pdf.text(summaryLines, 20, yPos);
    yPos += summaryLines.length * 5 + 5;

    // Verifica se precisa de nova página
    if (yPos > pageHeight - 50) {
      pdf.addPage();
      currentPage++;
      addPageHeader(pdf, 'Análise de IA', currentPage, colors);
      yPos = 40;
    }

    // Scores de performance
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Scores de Performance', 20, yPos);
    yPos += 10;

    const scores = [
      { label: 'Eficiência', value: aiInsights.performance_scores.efficiency_score },
      { label: 'Custo', value: aiInsights.performance_scores.cost_score },
      { label: 'Alcance', value: aiInsights.performance_scores.reach_score },
      { label: 'Conversão', value: aiInsights.performance_scores.conversion_score },
      { label: 'Tendência', value: aiInsights.performance_scores.trend_score },
    ];

    scores.forEach((score, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = 20 + col * 60;
      const y = yPos + row * 15;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(score.label, x, y);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      const scoreColor = getScoreColor(score.value);
      pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      pdf.text(`${score.value}/100`, x, y + 5);
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    });

    yPos += 40;

    // Áreas prioritárias
    if (aiInsights.priority_areas && aiInsights.priority_areas.length > 0) {
      // Verifica se precisa de nova página
      if (yPos > pageHeight - 60) {
        pdf.addPage();
        currentPage++;
        addPageHeader(pdf, 'Análise de IA', currentPage, colors);
        yPos = 40;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('Áreas de Atenção Prioritária', 20, yPos);
      yPos += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      aiInsights.priority_areas.slice(0, 5).forEach((area, idx) => {
        pdf.text(`${idx + 1}. ${area}`, 25, yPos);
        yPos += 6;
      });

      yPos += 5;
    }
  }

  // === PÁGINA: DADOS DETALHADOS ===
  pdf.addPage();
  currentPage++;
  addPageHeader(pdf, 'Dados Detalhados', currentPage, colors);

  // Prepara dados para tabela
  const tableData = rawData.map(row => [
    truncate(row.name || row.entity_name || '', 30),
    row.status || '',
    formatNumber(Number(row.impressions) || 0),
    formatNumber(Number(row.clicks) || 0),
    `R$ ${formatNumber(Number(row.spend) || 0)}`,
    `${(Number(row.ctr) || 0).toFixed(2)}%`,
    `R$ ${(Number(row.cpc) || 0).toFixed(2)}`,
  ]);

  autoTable(pdf, {
    startY: 40,
    head: [['Nome', 'Status', 'Impressões', 'Cliques', 'Gasto', 'CTR', 'CPC']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: colors.primary,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { top: 40, bottom: 20 },
  });

  // === RECOMENDAÇÕES (se tiver IA) ===
  if (hasAI && aiInsights && aiInsights.recommendations && aiInsights.recommendations.length > 0) {
    pdf.addPage();
    currentPage++;
    addPageHeader(pdf, 'Recomendações de Otimização', currentPage, colors);

    yPos = 40;

    aiInsights.recommendations.slice(0, 10).forEach((rec, idx) => {
      // Verifica se precisa de nova página
      if (yPos > pageHeight - 50) {
        pdf.addPage();
        currentPage++;
        addPageHeader(pdf, 'Recomendações de Otimização', currentPage, colors);
        yPos = 40;
      }

      // Badge de prioridade
      const priorityColor = getPriorityColor(rec.priority);
      pdf.setFillColor(priorityColor[0], priorityColor[1], priorityColor[2]);
      pdf.roundedRect(20, yPos - 4, 25, 6, 1, 1, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text(rec.priority.toUpperCase(), 22, yPos);

      // Título
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(`${idx + 1}. ${rec.title}`, 50, yPos);
      yPos += 7;

      // Descrição
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const descLines = pdf.splitTextToSize(rec.description, pageWidth - 45);
      pdf.text(descLines, 25, yPos);
      yPos += descLines.length * 4 + 3;

      // Impacto esperado
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Impacto: ${rec.expected_impact}`, 25, yPos);
      yPos += 8;
    });
  }

  // Adiciona rodapé em todas as páginas
  const totalPages = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addPageFooter(pdf, i, totalPages, colors);
  }

  // Salva PDF
  pdf.save(fileName);
}

/**
 * Captura gráficos da página como imagens base64
 */
export async function captureChartsForPDF(chartElements: HTMLElement[]): Promise<string[]> {
  const images: string[] = [];

  for (const element of chartElements) {
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      images.push(canvas.toDataURL('image/png'));
    } catch (error) {
      console.error('Erro ao capturar gráfico:', error);
    }
  }

  return images;
}

// ===== FUNÇÕES AUXILIARES =====

/**
 * Adiciona cabeçalho de página
 */
function addPageHeader(pdf: jsPDF, title: string, pageNumber: number, colors: any): void {
  pdf.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 30, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  pdf.text(title, 20, 20);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Página ${pageNumber}`, pdf.internal.pageSize.getWidth() - 30, 20);
}

/**
 * Adiciona rodapé de página
 */
function addPageFooter(pdf: jsPDF, pageNumber: number, totalPages: number, colors: any): void {
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();

  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`Gerado por AdsOps | ${new Date().toLocaleDateString('pt-BR')}`, 20, pageHeight - 10);
  pdf.text(`${pageNumber} / ${totalPages}`, pageWidth - 30, pageHeight - 10);
}

/**
 * Retorna cor baseada no score
 */
function getScoreColor(score: number): [number, number, number] {
  if (score >= 80) return [76, 175, 80]; // Verde
  if (score >= 60) return [33, 150, 243]; // Azul
  if (score >= 40) return [255, 193, 7]; // Amarelo
  return [244, 67, 54]; // Vermelho
}

/**
 * Retorna cor baseada na prioridade
 */
function getPriorityColor(priority: string): [number, number, number] {
  switch (priority) {
    case 'critical':
      return [244, 67, 54]; // Vermelho
    case 'high':
      return [255, 152, 0]; // Laranja
    case 'medium':
      return [255, 193, 7]; // Amarelo
    case 'low':
      return [33, 150, 243]; // Azul
    default:
      return [158, 158, 158]; // Cinza
  }
}

/**
 * Retorna label do nível
 */
function getLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    campaign: 'Campanhas',
    adset: 'Conjuntos de Anúncios',
    ad: 'Anúncios',
    account: 'Conta',
  };
  return labels[level] || level;
}

/**
 * Formata número com separadores
 */
function formatNumber(num: number): string {
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/**
 * Trunca texto
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Dispara download de blob
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
