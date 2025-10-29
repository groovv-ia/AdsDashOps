import { Campaign, Metric, AdSet, Ad } from '../types/advertising';

// Dados mock de campanhas para demonstração
export const mockCampaigns: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Campanha de Verão 2024 - Produtos Premium',
    platform: 'Meta',
    status: 'active',
    budget: 15000,
    spend: 12340.50,
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    created_at: '2024-01-01T00:00:00Z',
    user_id: 'user-1',
  },
  {
    id: 'camp-2',
    name: 'Black Friday 2024 - Ofertas Relâmpago',
    platform: 'Google Ads',
    status: 'active',
    budget: 25000,
    spend: 18765.80,
    start_date: '2024-11-01',
    end_date: '2024-11-30',
    created_at: '2024-11-01T00:00:00Z',
    user_id: 'user-1',
  },
  {
    id: 'camp-3',
    name: 'Lançamento Primavera - Coleção Nova',
    platform: 'TikTok',
    status: 'active',
    budget: 8000,
    spend: 5420.30,
    start_date: '2024-09-01',
    end_date: '2024-10-31',
    created_at: '2024-09-01T00:00:00Z',
    user_id: 'user-1',
  },
  {
    id: 'camp-4',
    name: 'Retargeting - Carrinho Abandonado',
    platform: 'Meta',
    status: 'active',
    budget: 5000,
    spend: 3890.25,
    start_date: '2024-01-15',
    created_at: '2024-01-15T00:00:00Z',
    user_id: 'user-1',
  },
  {
    id: 'camp-5',
    name: 'Awareness - Marca Nacional',
    platform: 'Google Ads',
    status: 'paused',
    budget: 20000,
    spend: 8450.00,
    start_date: '2024-06-01',
    end_date: '2024-08-31',
    created_at: '2024-06-01T00:00:00Z',
    user_id: 'user-1',
  },
];

// Dados mock de conjuntos de anúncios
export const mockAdSets: AdSet[] = [
  {
    id: 'adset-1',
    name: 'Público Feminino 25-34',
    campaign_id: 'camp-1',
    status: 'active',
    budget: 7500,
    spend: 6234.20,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'adset-2',
    name: 'Público Masculino 35-44',
    campaign_id: 'camp-1',
    status: 'active',
    budget: 7500,
    spend: 6106.30,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'adset-3',
    name: 'Interesse: Compras Online',
    campaign_id: 'camp-2',
    status: 'active',
    budget: 12500,
    spend: 9543.40,
    created_at: '2024-11-01T00:00:00Z',
  },
  {
    id: 'adset-4',
    name: 'Lookalike - Melhores Clientes',
    campaign_id: 'camp-2',
    status: 'active',
    budget: 12500,
    spend: 9222.40,
    created_at: '2024-11-01T00:00:00Z',
  },
  {
    id: 'adset-5',
    name: 'Geração Z - TikTok',
    campaign_id: 'camp-3',
    status: 'active',
    budget: 8000,
    spend: 5420.30,
    created_at: '2024-09-01T00:00:00Z',
  },
];

// Dados mock de anúncios individuais
export const mockAds: Ad[] = [
  {
    id: 'ad-1',
    name: 'Anúncio Carrossel - Verão',
    ad_set_id: 'adset-1',
    campaign_id: 'camp-1',
    status: 'active',
    creative_url: 'https://example.com/creative1.jpg',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'ad-2',
    name: 'Vídeo 15s - Produtos Premium',
    ad_set_id: 'adset-1',
    campaign_id: 'camp-1',
    status: 'active',
    creative_url: 'https://example.com/video1.mp4',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'ad-3',
    name: 'Imagem Estática - Masculino',
    ad_set_id: 'adset-2',
    campaign_id: 'camp-1',
    status: 'active',
    creative_url: 'https://example.com/creative2.jpg',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'ad-4',
    name: 'Black Friday - Countdown',
    ad_set_id: 'adset-3',
    campaign_id: 'camp-2',
    status: 'active',
    creative_url: 'https://example.com/bf-countdown.jpg',
    created_at: '2024-11-01T00:00:00Z',
  },
  {
    id: 'ad-5',
    name: 'TikTok Challenge - Primavera',
    ad_set_id: 'adset-5',
    campaign_id: 'camp-3',
    status: 'active',
    creative_url: 'https://example.com/tiktok-challenge.mp4',
    created_at: '2024-09-01T00:00:00Z',
  },
];

// Função helper para gerar métricas diárias com variação realista
const generateDailyMetrics = (
  campaignId: string,
  startDate: Date,
  days: number,
  baseImpressions: number
): Metric[] => {
  const metrics: Metric[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Adiciona variação aleatória às métricas (±30%)
    const variation = 0.7 + Math.random() * 0.6;
    const impressions = Math.floor(baseImpressions * variation);
    const clicks = Math.floor(impressions * (0.01 + Math.random() * 0.04)); // CTR 1-5%
    const spend = clicks * (0.5 + Math.random() * 2); // CPC R$0.50-2.50
    const conversions = Math.floor(clicks * (0.01 + Math.random() * 0.09)); // Taxa conversão 1-10%
    const reach = Math.floor(impressions * (0.6 + Math.random() * 0.3)); // Reach 60-90% impressões
    const frequency = impressions / reach;
    const ctr = clicks / impressions;
    const cpc = spend / clicks;
    const revenue = conversions * (50 + Math.random() * 200); // Valor médio pedido R$50-250
    const roas = revenue / spend;
    const costPerResult = spend / (conversions || 1);

    metrics.push({
      id: `metric-${campaignId}-${i}`,
      campaign_id: campaignId,
      date: date.toISOString().split('T')[0],
      impressions,
      clicks,
      spend: parseFloat(spend.toFixed(2)),
      conversions,
      reach,
      frequency: parseFloat(frequency.toFixed(2)),
      ctr: parseFloat(ctr.toFixed(4)),
      cpc: parseFloat(cpc.toFixed(2)),
      roas: parseFloat(roas.toFixed(2)),
      cost_per_result: parseFloat(costPerResult.toFixed(2)),
      created_at: date.toISOString(),
    });
  }

  return metrics;
};

// Gera métricas mock para os últimos 30 dias para cada campanha
const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(today.getDate() - 30);

export const mockMetrics: Metric[] = [
  ...generateDailyMetrics('camp-1', thirtyDaysAgo, 30, 25000), // Meta - alto volume
  ...generateDailyMetrics('camp-2', thirtyDaysAgo, 30, 35000), // Google Ads - volume muito alto
  ...generateDailyMetrics('camp-3', thirtyDaysAgo, 30, 15000), // TikTok - volume médio
  ...generateDailyMetrics('camp-4', thirtyDaysAgo, 30, 8000),  // Retargeting - volume menor
  ...generateDailyMetrics('camp-5', thirtyDaysAgo, 30, 20000), // Awareness - alto volume
];

// Dados mock para demonstrar diferentes plataformas
export const platformOptions = [
  { value: 'meta', label: 'Meta (Facebook/Instagram)', icon: '/meta-icon.svg' },
  { value: 'tiktok', label: 'TikTok Ads', icon: '/tiktok-icon.svg' },
  { value: 'google', label: 'Google Ads', icon: '/google-ads-icon.svg' },
];

// Opções de moeda para configurações
export const currencyOptions = [
  { value: 'BRL', label: 'Real Brasileiro (R$)', symbol: 'R$' },
  { value: 'USD', label: 'Dólar Americano ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
];

// Opções de idioma
export const languageOptions = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español (España)' },
];

// Opções de fuso horário
export const timezoneOptions = [
  { value: 'America/Sao_Paulo', label: '(UTC-3) Brasília' },
  { value: 'America/New_York', label: '(UTC-5) New York' },
  { value: 'Europe/London', label: '(UTC+0) London' },
  { value: 'Asia/Tokyo', label: '(UTC+9) Tokyo' },
];
