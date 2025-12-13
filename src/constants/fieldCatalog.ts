/**
 * Catálogo completo de campos disponíveis para extração do Meta Ads
 * Baseado na interface do Adveronix e na Meta Marketing API
 *
 * Organizado por categorias para facilitar a seleção na UI
 */

import type {
  FieldDefinition,
  BreakdownDefinition,
  StandardConversion,
  FieldCategory,
  DatePreset,
} from '../types/extraction';

// ============================================
// Campos de Dimensão (identificação)
// ============================================

export const DIMENSION_FIELDS: FieldDefinition[] = [
  {
    id: 'campaign_name',
    displayName: 'Campaign Name',
    description: 'Nome da campanha',
    apiField: 'campaign_name',
    category: 'dimension',
    dataType: 'string',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 1,
    isPopular: true,
  },
  {
    id: 'campaign_id',
    displayName: 'Campaign ID',
    description: 'ID único da campanha',
    apiField: 'campaign_id',
    category: 'dimension',
    dataType: 'string',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 2,
  },
  {
    id: 'adset_name',
    displayName: 'Ad Set Name',
    description: 'Nome do conjunto de anúncios',
    apiField: 'adset_name',
    category: 'dimension',
    dataType: 'string',
    platforms: ['meta'],
    availableLevels: ['adset', 'ad'],
    displayOrder: 3,
    isPopular: true,
  },
  {
    id: 'adset_id',
    displayName: 'Ad Set ID',
    description: 'ID único do conjunto de anúncios',
    apiField: 'adset_id',
    category: 'dimension',
    dataType: 'string',
    platforms: ['meta'],
    availableLevels: ['adset', 'ad'],
    displayOrder: 4,
  },
  {
    id: 'ad_name',
    displayName: 'Ad Name',
    description: 'Nome do anúncio',
    apiField: 'ad_name',
    category: 'dimension',
    dataType: 'string',
    platforms: ['meta'],
    availableLevels: ['ad'],
    displayOrder: 5,
    isPopular: true,
  },
  {
    id: 'ad_id',
    displayName: 'Ad ID',
    description: 'ID único do anúncio',
    apiField: 'ad_id',
    category: 'dimension',
    dataType: 'string',
    platforms: ['meta'],
    availableLevels: ['ad'],
    displayOrder: 6,
  },
  {
    id: 'objective',
    displayName: 'Objective',
    description: 'Objetivo da campanha',
    apiField: 'objective',
    category: 'dimension',
    dataType: 'string',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 7,
  },
  {
    id: 'account_name',
    displayName: 'Account Name',
    description: 'Nome da conta de anúncios',
    apiField: 'account_name',
    category: 'dimension',
    dataType: 'string',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 8,
  },
  {
    id: 'account_id',
    displayName: 'Account ID',
    description: 'ID da conta de anúncios',
    apiField: 'account_id',
    category: 'dimension',
    dataType: 'string',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 9,
  },
];

// ============================================
// Campos de Entrega (Delivery)
// ============================================

export const DELIVERY_FIELDS: FieldDefinition[] = [
  {
    id: 'impressions',
    displayName: 'Impressions',
    description: 'Número de vezes que seus anúncios foram exibidos',
    apiField: 'impressions',
    category: 'delivery',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 10,
    isPopular: true,
  },
  {
    id: 'reach',
    displayName: 'Reach',
    description: 'Número de pessoas que viram seus anúncios pelo menos uma vez',
    apiField: 'reach',
    category: 'delivery',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 11,
    isPopular: true,
  },
  {
    id: 'frequency',
    displayName: 'Frequency',
    description: 'Média de vezes que cada pessoa viu seu anúncio',
    apiField: 'frequency',
    category: 'delivery',
    dataType: 'number',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 12,
    isPopular: true,
  },
  {
    id: 'date_start',
    displayName: 'Day',
    description: 'Data do registro (para breakdown diário)',
    apiField: 'date_start',
    category: 'dimension',
    dataType: 'date',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 0,
    isPopular: true,
  },
];

// ============================================
// Campos de Performance
// ============================================

export const PERFORMANCE_FIELDS: FieldDefinition[] = [
  {
    id: 'clicks',
    displayName: 'Clicks',
    description: 'Número total de cliques no anúncio',
    apiField: 'clicks',
    category: 'performance',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 20,
    isPopular: true,
  },
  {
    id: 'link_clicks',
    displayName: 'Link Clicks',
    description: 'Cliques em links que levam a destinos dentro ou fora do Facebook',
    apiField: 'inline_link_clicks',
    category: 'performance',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 21,
    isPopular: true,
  },
  {
    id: 'outbound_clicks',
    displayName: 'Outbound Clicks',
    description: 'Cliques que levam pessoas para fora do Facebook',
    apiField: 'outbound_clicks',
    category: 'performance',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 22,
  },
  {
    id: 'ctr',
    displayName: 'CTR (All)',
    description: 'Taxa de cliques - porcentagem de impressões que resultaram em clique',
    apiField: 'ctr',
    category: 'performance',
    dataType: 'percentage',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 23,
    isPopular: true,
  },
  {
    id: 'link_ctr',
    displayName: 'CTR (Link Click-Through Rate)',
    description: 'Taxa de cliques em links',
    apiField: 'inline_link_click_ctr',
    category: 'performance',
    dataType: 'percentage',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 24,
    isPopular: true,
  },
  {
    id: 'unique_clicks',
    displayName: 'Unique Clicks',
    description: 'Número de pessoas que clicaram',
    apiField: 'unique_clicks',
    category: 'performance',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 25,
  },
  {
    id: 'unique_ctr',
    displayName: 'Unique CTR',
    description: 'Taxa de cliques únicos',
    apiField: 'unique_ctr',
    category: 'performance',
    dataType: 'percentage',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 26,
  },
];

// ============================================
// Campos de Custo
// ============================================

export const COST_FIELDS: FieldDefinition[] = [
  {
    id: 'spend',
    displayName: 'Amount Spent',
    description: 'Valor total gasto',
    apiField: 'spend',
    category: 'cost',
    dataType: 'currency',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 30,
    isPopular: true,
  },
  {
    id: 'cpc',
    displayName: 'CPC (Cost per Link Click)',
    description: 'Custo médio por clique em link',
    apiField: 'cost_per_inline_link_click',
    category: 'cost',
    dataType: 'currency',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 31,
    isPopular: true,
  },
  {
    id: 'cpc_all',
    displayName: 'CPC (All)',
    description: 'Custo médio por clique (todos os cliques)',
    apiField: 'cpc',
    category: 'cost',
    dataType: 'currency',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 32,
  },
  {
    id: 'cpm',
    displayName: 'CPM (Cost per 1,000 Impressions)',
    description: 'Custo por mil impressões',
    apiField: 'cpm',
    category: 'cost',
    dataType: 'currency',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 33,
    isPopular: true,
  },
  {
    id: 'cpp',
    displayName: 'CPP (Cost per 1,000 People Reached)',
    description: 'Custo por mil pessoas alcançadas',
    apiField: 'cpp',
    category: 'cost',
    dataType: 'currency',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 34,
  },
  {
    id: 'cost_per_result',
    displayName: 'Cost per Result',
    description: 'Custo médio por resultado (baseado no objetivo)',
    apiField: 'cost_per_action_type',
    category: 'cost',
    dataType: 'currency',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 35,
    isPopular: true,
  },
  {
    id: 'cost_per_unique_click',
    displayName: 'Cost per Unique Click',
    description: 'Custo por clique único',
    apiField: 'cost_per_unique_click',
    category: 'cost',
    dataType: 'currency',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 36,
  },
];

// ============================================
// Campos de Conversão
// ============================================

export const CONVERSION_FIELDS: FieldDefinition[] = [
  {
    id: 'results',
    displayName: 'Results',
    description: 'Número de resultados baseado no objetivo da campanha',
    apiField: 'actions',
    category: 'conversion',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 40,
    isPopular: true,
  },
  {
    id: 'purchases',
    displayName: 'Purchases',
    description: 'Número de compras realizadas',
    apiField: 'actions:purchase',
    category: 'conversion',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 41,
    isPopular: true,
  },
  {
    id: 'purchase_value',
    displayName: 'Purchase Conversion Value',
    description: 'Valor total das compras',
    apiField: 'action_values:purchase',
    category: 'conversion',
    dataType: 'currency',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 42,
    isPopular: true,
  },
  {
    id: 'roas',
    displayName: 'ROAS (Return on Ad Spend)',
    description: 'Retorno sobre investimento em anúncios',
    apiField: 'purchase_roas',
    category: 'conversion',
    dataType: 'number',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 43,
    isPopular: true,
  },
  {
    id: 'leads',
    displayName: 'Leads',
    description: 'Número de leads gerados',
    apiField: 'actions:lead',
    category: 'conversion',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 44,
    isPopular: true,
  },
  {
    id: 'cost_per_lead',
    displayName: 'Cost per Lead',
    description: 'Custo médio por lead',
    apiField: 'cost_per_action_type:lead',
    category: 'conversion',
    dataType: 'currency',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 45,
  },
  {
    id: 'add_to_cart',
    displayName: 'Add to Cart',
    description: 'Adições ao carrinho',
    apiField: 'actions:add_to_cart',
    category: 'conversion',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 46,
  },
  {
    id: 'initiate_checkout',
    displayName: 'Initiate Checkout',
    description: 'Checkouts iniciados',
    apiField: 'actions:initiate_checkout',
    category: 'conversion',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 47,
  },
  {
    id: 'complete_registration',
    displayName: 'Complete Registration',
    description: 'Registros completos',
    apiField: 'actions:complete_registration',
    category: 'conversion',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 48,
  },
  {
    id: 'page_view',
    displayName: 'Page Views',
    description: 'Visualizações de página',
    apiField: 'actions:view_content',
    category: 'conversion',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 49,
  },
];

// ============================================
// Campos de Engajamento
// ============================================

export const ENGAGEMENT_FIELDS: FieldDefinition[] = [
  {
    id: 'post_engagement',
    displayName: 'Post Engagement',
    description: 'Total de engajamento no post',
    apiField: 'actions:post_engagement',
    category: 'engagement',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 50,
  },
  {
    id: 'post_reactions',
    displayName: 'Post Reactions',
    description: 'Reações no post',
    apiField: 'actions:post_reaction',
    category: 'engagement',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 51,
  },
  {
    id: 'post_comments',
    displayName: 'Post Comments',
    description: 'Comentários no post',
    apiField: 'actions:comment',
    category: 'engagement',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 52,
  },
  {
    id: 'post_shares',
    displayName: 'Post Shares',
    description: 'Compartilhamentos do post',
    apiField: 'actions:post',
    category: 'engagement',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 53,
  },
  {
    id: 'page_likes',
    displayName: 'Page Likes',
    description: 'Curtidas na página',
    apiField: 'actions:like',
    category: 'engagement',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 54,
  },
  {
    id: 'link_click',
    displayName: 'Link Clicks (Engagement)',
    description: 'Cliques em links',
    apiField: 'actions:link_click',
    category: 'engagement',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 55,
  },
];

// ============================================
// Campos de Vídeo
// ============================================

export const VIDEO_FIELDS: FieldDefinition[] = [
  {
    id: 'video_views',
    displayName: 'Video Views',
    description: 'Visualizações de vídeo (3 segundos ou mais)',
    apiField: 'video_views',
    category: 'video',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 60,
    isPopular: true,
  },
  {
    id: 'video_thruplay',
    displayName: 'ThruPlays',
    description: 'Vídeos assistidos por 15s ou até o final',
    apiField: 'video_thruplay_watched_actions',
    category: 'video',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 61,
  },
  {
    id: 'video_p25',
    displayName: 'Video 25% Watched',
    description: 'Vídeos assistidos até 25%',
    apiField: 'video_p25_watched_actions',
    category: 'video',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 62,
  },
  {
    id: 'video_p50',
    displayName: 'Video 50% Watched',
    description: 'Vídeos assistidos até 50%',
    apiField: 'video_p50_watched_actions',
    category: 'video',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 63,
  },
  {
    id: 'video_p75',
    displayName: 'Video 75% Watched',
    description: 'Vídeos assistidos até 75%',
    apiField: 'video_p75_watched_actions',
    category: 'video',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 64,
  },
  {
    id: 'video_p100',
    displayName: 'Video 100% Watched',
    description: 'Vídeos assistidos até o final',
    apiField: 'video_p100_watched_actions',
    category: 'video',
    dataType: 'integer',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 65,
  },
  {
    id: 'video_avg_time',
    displayName: 'Average Video Watch Time',
    description: 'Tempo médio de visualização do vídeo',
    apiField: 'video_avg_time_watched_actions',
    category: 'video',
    dataType: 'number',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 66,
  },
  {
    id: 'cost_per_thruplay',
    displayName: 'Cost per ThruPlay',
    description: 'Custo por ThruPlay',
    apiField: 'cost_per_thruplay',
    category: 'video',
    dataType: 'currency',
    platforms: ['meta'],
    availableLevels: ['campaign', 'adset', 'ad'],
    displayOrder: 67,
  },
];

// ============================================
// Todos os campos combinados
// ============================================

export const ALL_FIELDS: FieldDefinition[] = [
  ...DIMENSION_FIELDS,
  ...DELIVERY_FIELDS,
  ...PERFORMANCE_FIELDS,
  ...COST_FIELDS,
  ...CONVERSION_FIELDS,
  ...ENGAGEMENT_FIELDS,
  ...VIDEO_FIELDS,
].sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));

// ============================================
// Campos por categoria (para UI)
// ============================================

export const FIELDS_BY_CATEGORY: Record<FieldCategory, FieldDefinition[]> = {
  dimension: DIMENSION_FIELDS,
  delivery: DELIVERY_FIELDS,
  performance: PERFORMANCE_FIELDS,
  cost: COST_FIELDS,
  conversion: CONVERSION_FIELDS,
  engagement: ENGAGEMENT_FIELDS,
  video: VIDEO_FIELDS,
  attribution: [], // Meta não tem campos específicos de atribuição na API básica
};

// ============================================
// Nomes das categorias para UI
// ============================================

export const CATEGORY_LABELS: Record<FieldCategory, string> = {
  dimension: 'Dimensões',
  delivery: 'Entrega',
  performance: 'Performance',
  cost: 'Custos',
  conversion: 'Conversões',
  engagement: 'Engajamento',
  video: 'Vídeo',
  attribution: 'Atribuição',
};

// ============================================
// Breakdowns disponíveis
// ============================================

export const AVAILABLE_BREAKDOWNS: BreakdownDefinition[] = [
  {
    id: 'age',
    displayName: 'Age',
    description: 'Segmentar por faixa etária',
    apiField: 'age',
    platforms: ['meta'],
    possibleValues: ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
    incompatibleWith: ['hourly_stats_aggregated_by_advertiser_time_zone'],
  },
  {
    id: 'gender',
    displayName: 'Gender',
    description: 'Segmentar por gênero',
    apiField: 'gender',
    platforms: ['meta'],
    possibleValues: ['male', 'female', 'unknown'],
    incompatibleWith: ['hourly_stats_aggregated_by_advertiser_time_zone'],
  },
  {
    id: 'country',
    displayName: 'Country',
    description: 'Segmentar por país',
    apiField: 'country',
    platforms: ['meta'],
  },
  {
    id: 'region',
    displayName: 'Region',
    description: 'Segmentar por região/estado',
    apiField: 'region',
    platforms: ['meta'],
  },
  {
    id: 'dma',
    displayName: 'DMA Region',
    description: 'Designated Market Area (EUA)',
    apiField: 'dma',
    platforms: ['meta'],
  },
  {
    id: 'device_platform',
    displayName: 'Device',
    description: 'Segmentar por dispositivo (mobile, desktop)',
    apiField: 'device_platform',
    platforms: ['meta'],
    possibleValues: ['mobile', 'desktop'],
  },
  {
    id: 'platform_position',
    displayName: 'Placement',
    description: 'Posicionamento (Feed, Stories, Reels, etc)',
    apiField: 'platform_position',
    platforms: ['meta'],
    possibleValues: ['feed', 'story', 'an_classic', 'video_feeds', 'marketplace', 'search', 'reels'],
  },
  {
    id: 'publisher_platform',
    displayName: 'Platform',
    description: 'Plataforma de publicação (Facebook, Instagram, Audience Network)',
    apiField: 'publisher_platform',
    platforms: ['meta'],
    possibleValues: ['facebook', 'instagram', 'audience_network', 'messenger'],
  },
  {
    id: 'impression_device',
    displayName: 'Impression Device',
    description: 'Dispositivo de impressão',
    apiField: 'impression_device',
    platforms: ['meta'],
    possibleValues: ['desktop', 'iphone', 'ipad', 'android_smartphone', 'android_tablet', 'other'],
  },
  {
    id: 'product_id',
    displayName: 'Product ID',
    description: 'ID do produto (para campanhas de catálogo)',
    apiField: 'product_id',
    platforms: ['meta'],
  },
];

// ============================================
// Conversões padrão do Meta
// ============================================

export const STANDARD_CONVERSIONS: StandardConversion[] = [
  {
    id: 'purchase',
    displayName: 'Purchase',
    actionType: 'purchase',
    description: 'Compras realizadas',
    category: 'standard',
  },
  {
    id: 'omni_purchase',
    displayName: 'Omni Purchase',
    actionType: 'omni_purchase',
    description: 'Compras omnichannel',
    category: 'standard',
  },
  {
    id: 'lead',
    displayName: 'Lead',
    actionType: 'lead',
    description: 'Leads gerados',
    category: 'standard',
  },
  {
    id: 'complete_registration',
    displayName: 'Complete Registration',
    actionType: 'complete_registration',
    description: 'Registros completos',
    category: 'standard',
  },
  {
    id: 'add_to_cart',
    displayName: 'Add to Cart',
    actionType: 'add_to_cart',
    description: 'Adições ao carrinho',
    category: 'standard',
  },
  {
    id: 'initiate_checkout',
    displayName: 'Initiate Checkout',
    actionType: 'initiate_checkout',
    description: 'Checkouts iniciados',
    category: 'standard',
  },
  {
    id: 'view_content',
    displayName: 'View Content',
    actionType: 'view_content',
    description: 'Visualizações de conteúdo',
    category: 'standard',
  },
  {
    id: 'search',
    displayName: 'Search',
    actionType: 'search',
    description: 'Pesquisas realizadas',
    category: 'standard',
  },
  {
    id: 'add_payment_info',
    displayName: 'Add Payment Info',
    actionType: 'add_payment_info',
    description: 'Adições de info de pagamento',
    category: 'standard',
  },
  {
    id: 'add_to_wishlist',
    displayName: 'Add to Wishlist',
    actionType: 'add_to_wishlist',
    description: 'Adições à lista de desejos',
    category: 'standard',
  },
  {
    id: 'contact',
    displayName: 'Contact',
    actionType: 'contact',
    description: 'Contatos iniciados',
    category: 'standard',
  },
  {
    id: 'schedule',
    displayName: 'Schedule',
    actionType: 'schedule',
    description: 'Agendamentos realizados',
    category: 'standard',
  },
  {
    id: 'start_trial',
    displayName: 'Start Trial',
    actionType: 'start_trial',
    description: 'Trials iniciados',
    category: 'standard',
  },
  {
    id: 'subscribe',
    displayName: 'Subscribe',
    actionType: 'subscribe',
    description: 'Assinaturas realizadas',
    category: 'standard',
  },
];

// ============================================
// Presets de data
// ============================================

export const DATE_PRESETS: { id: DatePreset; label: string; days?: number }[] = [
  { id: 'today', label: 'Hoje', days: 0 },
  { id: 'yesterday', label: 'Ontem', days: 1 },
  { id: 'last_7_days', label: 'Últimos 7 dias', days: 7 },
  { id: 'last_14_days', label: 'Últimos 14 dias', days: 14 },
  { id: 'last_30_days', label: 'Últimos 30 dias', days: 30 },
  { id: 'last_90_days', label: 'Últimos 90 dias', days: 90 },
  { id: 'this_week', label: 'Esta semana' },
  { id: 'last_week', label: 'Semana passada' },
  { id: 'this_month', label: 'Este mês' },
  { id: 'last_month', label: 'Mês passado' },
  { id: 'this_quarter', label: 'Este trimestre' },
  { id: 'last_quarter', label: 'Trimestre passado' },
  { id: 'this_year', label: 'Este ano' },
  { id: 'last_year', label: 'Ano passado' },
  { id: 'lifetime', label: 'Todo o período' },
  { id: 'custom', label: 'Personalizado' },
];

// ============================================
// Templates padrão pré-definidos
// ============================================

export const DEFAULT_TEMPLATES = [
  {
    name: 'Performance Básica',
    description: 'Métricas essenciais de performance',
    level: 'campaign' as const,
    fields: ['campaign_name', 'impressions', 'reach', 'clicks', 'ctr', 'spend', 'cpc'],
    breakdowns: [],
  },
  {
    name: 'Análise de Conversões',
    description: 'Foco em resultados e ROI',
    level: 'campaign' as const,
    fields: ['campaign_name', 'results', 'cost_per_result', 'spend', 'purchases', 'purchase_value', 'roas'],
    breakdowns: [],
  },
  {
    name: 'Métricas de Vídeo',
    description: 'Performance de anúncios em vídeo',
    level: 'ad' as const,
    fields: ['ad_name', 'impressions', 'video_views', 'video_thruplay', 'video_p25', 'video_p50', 'video_p75', 'video_p100', 'spend'],
    breakdowns: [],
  },
  {
    name: 'Análise por Idade e Gênero',
    description: 'Performance demográfica',
    level: 'campaign' as const,
    fields: ['campaign_name', 'impressions', 'reach', 'clicks', 'spend', 'results'],
    breakdowns: ['age', 'gender'],
  },
  {
    name: 'Performance por Posicionamento',
    description: 'Comparar Feed, Stories, Reels, etc',
    level: 'campaign' as const,
    fields: ['campaign_name', 'impressions', 'clicks', 'ctr', 'spend', 'cpc', 'results'],
    breakdowns: ['publisher_platform', 'platform_position'],
  },
  {
    name: 'Análise Diária Completa',
    description: 'Dados diários com todas as métricas principais',
    level: 'campaign' as const,
    fields: ['date_start', 'campaign_name', 'impressions', 'reach', 'frequency', 'clicks', 'link_clicks', 'ctr', 'spend', 'cpc', 'cpm', 'results', 'cost_per_result'],
    breakdowns: [],
  },
];

// ============================================
// Helper: Obter campo por ID
// ============================================

export function getFieldById(fieldId: string): FieldDefinition | undefined {
  return ALL_FIELDS.find(f => f.id === fieldId);
}

// ============================================
// Helper: Obter breakdown por ID
// ============================================

export function getBreakdownById(breakdownId: string): BreakdownDefinition | undefined {
  return AVAILABLE_BREAKDOWNS.find(b => b.id === breakdownId);
}

// ============================================
// Helper: Filtrar campos por nível
// ============================================

export function getFieldsForLevel(level: 'campaign' | 'adset' | 'ad'): FieldDefinition[] {
  return ALL_FIELDS.filter(f => f.availableLevels.includes(level));
}

// ============================================
// Helper: Obter campos populares
// ============================================

export function getPopularFields(): FieldDefinition[] {
  return ALL_FIELDS.filter(f => f.isPopular);
}
