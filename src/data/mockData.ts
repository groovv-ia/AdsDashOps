import { Campaign, AdMetrics, AdAccount, AdSet, Ad } from '../types/advertising';

export const mockAdAccounts: AdAccount[] = [
  {
    id: '1',
    name: 'Marca de Moda - Meta',
    platform: 'Meta',
    account_id: 'meta_123456',
    is_active: true,
  },
  {
    id: '2',
    name: 'Marca de Moda - TikTok',
    platform: 'TikTok',
    account_id: 'tiktok_789012',
    is_active: true,
  },
  {
    id: '3',
    name: 'Marca de Moda - Google',
    platform: 'Google',
    account_id: 'google_345678',
    is_active: true,
  },
];

export const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Coleção Verão 2024',
    platform: 'Meta',
    account_id: 'meta_123456',
    status: 'Active',
    objective: 'Conversões',
    created_date: '2024-01-15',
    start_date: '2024-01-20',
  },
  {
    id: '2',
    name: 'Conhecimento de Marca - Geração Z',
    platform: 'TikTok',
    account_id: 'tiktok_789012',
    status: 'Active',
    objective: 'Alcance',
    created_date: '2024-01-10',
    start_date: '2024-01-15',
  },
  {
    id: '3',
    name: 'Busca - Sapatos de Grife',
    platform: 'Google',
    account_id: 'google_345678',
    status: 'Active',
    objective: 'Conversões',
    created_date: '2024-01-05',
    start_date: '2024-01-10',
  },
  {
    id: '4',
    name: 'Campanha de Retargeting',
    platform: 'Meta',
    account_id: 'meta_123456',
    status: 'Active',
    objective: 'Conversões',
    created_date: '2024-01-12',
    start_date: '2024-01-18',
  },
  {
    id: '5',
    name: 'Promoção Black Friday',
    platform: 'Google',
    account_id: 'google_345678',
    status: 'Paused',
    objective: 'Tráfego',
    created_date: '2024-01-08',
    start_date: '2024-01-12',
  },
  {
    id: '6',
    name: 'Viral Challenge - Dança',
    platform: 'TikTok',
    account_id: 'tiktok_789012',
    status: 'Active',
    objective: 'Engajamento',
    created_date: '2024-01-20',
    start_date: '2024-01-25',
  },
];

export const mockAdSets: AdSet[] = [
  // Meta Ad Sets
  {
    id: 'adset_1',
    name: 'Mulheres 25-35 - Interesse em Moda',
    campaign_id: '1',
    status: 'Active',
    daily_budget: 100,
    targeting: 'Mulheres, 25-35 anos, Interesse: Moda, Roupas femininas',
  },
  {
    id: 'adset_2',
    name: 'Homens 30-45 - Lookalike',
    campaign_id: '1',
    status: 'Active',
    daily_budget: 150,
    targeting: 'Homens, 30-45 anos, Lookalike de compradores',
  },
  {
    id: 'adset_3',
    name: 'Retargeting - Visitantes do Site',
    campaign_id: '4',
    status: 'Active',
    daily_budget: 80,
    targeting: 'Visitantes do site nos últimos 30 dias',
  },
  
  // TikTok Ad Sets
  {
    id: 'adset_4',
    name: 'Gen Z - Tendências de Moda',
    campaign_id: '2',
    status: 'Active',
    daily_budget: 120,
    targeting: 'Idade: 16-24, Interesses: Moda, Tendências',
  },
  {
    id: 'adset_5',
    name: 'Millennials - Lifestyle',
    campaign_id: '2',
    status: 'Active',
    daily_budget: 90,
    targeting: 'Idade: 25-35, Interesses: Lifestyle, Moda sustentável',
  },
  {
    id: 'adset_6',
    name: 'Criadores de Conteúdo',
    campaign_id: '6',
    status: 'Active',
    daily_budget: 200,
    targeting: 'Criadores de conteúdo, Influenciadores de moda',
  },
  
  // Google Ad Sets
  {
    id: 'adset_7',
    name: 'Palavras-chave: Sapatos Femininos',
    campaign_id: '3',
    status: 'Active',
    daily_budget: 180,
    targeting: 'Palavras-chave: sapatos femininos, calçados de grife',
  },
  {
    id: 'adset_8',
    name: 'Palavras-chave: Sapatos Masculinos',
    campaign_id: '3',
    status: 'Active',
    daily_budget: 160,
    targeting: 'Palavras-chave: sapatos masculinos, calçados sociais',
  },
  {
    id: 'adset_9',
    name: 'Shopping - Promoções',
    campaign_id: '5',
    status: 'Paused',
    daily_budget: 250,
    targeting: 'Google Shopping, Produtos em promoção',
  },
];

export const mockAds: Ad[] = [
  // Meta Ads
  {
    id: 'ad_1',
    name: 'Vestido Verão - Imagem Única',
    ad_set_id: 'adset_1',
    campaign_id: '1',
    status: 'Active',
    ad_type: 'single_image',
    creative_url: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg',
  },
  {
    id: 'ad_2',
    name: 'Vestido Verão - Carrossel',
    ad_set_id: 'adset_1',
    campaign_id: '1',
    status: 'Active',
    ad_type: 'carousel',
    creative_url: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg',
  },
  {
    id: 'ad_3',
    name: 'Sapatos Masculinos - Vídeo',
    ad_set_id: 'adset_2',
    campaign_id: '1',
    status: 'Active',
    ad_type: 'video',
    creative_url: 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg',
  },
  {
    id: 'ad_4',
    name: 'Retargeting - Oferta Especial',
    ad_set_id: 'adset_3',
    campaign_id: '4',
    status: 'Active',
    ad_type: 'single_image',
    creative_url: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg',
  },

  // TikTok Ads
  {
    id: 'ad_5',
    name: 'Trend Dance Challenge',
    ad_set_id: 'adset_4',
    campaign_id: '2',
    status: 'Active',
    ad_type: 'video',
    creative_url: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg',
  },
  {
    id: 'ad_6',
    name: 'Sustainable Fashion Story',
    ad_set_id: 'adset_5',
    campaign_id: '2',
    status: 'Active',
    ad_type: 'video',
    creative_url: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg',
  },
  {
    id: 'ad_7',
    name: 'Influencer Collaboration',
    ad_set_id: 'adset_6',
    campaign_id: '6',
    status: 'Active',
    ad_type: 'video',
    creative_url: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg',
  },

  // Google Ads
  {
    id: 'ad_8',
    name: 'Sapatos Femininos - Texto',
    ad_set_id: 'adset_7',
    campaign_id: '3',
    status: 'Active',
    ad_type: 'text',
    creative_url: '',
  },
  {
    id: 'ad_9',
    name: 'Sapatos Femininos - Shopping',
    ad_set_id: 'adset_7',
    campaign_id: '3',
    status: 'Active',
    ad_type: 'shopping',
    creative_url: 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg',
  },
  {
    id: 'ad_10',
    name: 'Sapatos Masculinos - Texto',
    ad_set_id: 'adset_8',
    campaign_id: '3',
    status: 'Active',
    ad_type: 'text',
    creative_url: '',
  },
  {
    id: 'ad_11',
    name: 'Black Friday - Banner',
    ad_set_id: 'adset_9',
    campaign_id: '5',
    status: 'Paused',
    ad_type: 'display',
    creative_url: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg',
  },
];

// Generate mock metrics data for the last 30 days
export const generateMockMetrics = (): AdMetrics[] => {
  const metrics: AdMetrics[] = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    mockCampaigns.forEach((campaign, index) => {
      const baseImpressions = 10000 + Math.random() * 5000;
      const clicks = Math.floor(baseImpressions * (0.01 + Math.random() * 0.03));
      const spend = 500 + Math.random() * 300;
      const conversions = Math.floor(clicks * (0.02 + Math.random() * 0.08));
      const reach = Math.floor(baseImpressions * (0.7 + Math.random() * 0.2));
      
      metrics.push({
        id: `${campaign.id}-${i}`,
        campaign_id: campaign.id,
        date: date.toISOString().split('T')[0],
        impressions: Math.floor(baseImpressions),
        clicks,
        spend: Math.round(spend * 100) / 100,
        conversions,
        reach,
        frequency: Math.round((baseImpressions / reach) * 100) / 100,
        ctr: Math.round((clicks / baseImpressions) * 10000) / 100,
        cpc: Math.round((spend / clicks) * 100) / 100,
        roas: conversions > 0 ? Math.round((conversions * 50 / spend) * 100) / 100 : 0,
        cost_per_result: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0,
      });
    });
  }
  
  return metrics;
};

export const mockMetrics = generateMockMetrics();