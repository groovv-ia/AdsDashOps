/**
 * metaPermissions.ts
 *
 * Definicoes de categorias, descricoes e status (obrigatoria/recomendada)
 * para as permissoes (scopes) da Meta Ads API.
 *
 * Usado pelo componente PermissionsScopeDisplay para agrupar e exibir
 * as permissoes concedidas de forma organizada.
 */

// ============================================================
// TIPOS
// ============================================================

export type PermissionCategory =
  | 'ads'
  | 'pages'
  | 'instagram'
  | 'business'
  | 'messaging'
  | 'other';

export interface CategoryMeta {
  id: PermissionCategory;
  label: string;
  // Nome do icone Lucide (resolvido no componente)
  icon: string;
  // Variante de cor para os badges (compativel com Badge component)
  badgeVariant: 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'default' | 'gray';
}

export interface PermissionInfo {
  scope: string;
  category: PermissionCategory;
  description: string;
}

// ============================================================
// CATEGORIAS
// ============================================================

export const PERMISSION_CATEGORIES: CategoryMeta[] = [
  { id: 'ads', label: 'Anuncios e Insights', icon: 'BarChart3', badgeVariant: 'primary' },
  { id: 'pages', label: 'Paginas', icon: 'FileText', badgeVariant: 'success' },
  { id: 'instagram', label: 'Instagram', icon: 'Camera', badgeVariant: 'warning' },
  { id: 'business', label: 'Negocios e Comercio', icon: 'Building2', badgeVariant: 'info' },
  { id: 'messaging', label: 'Mensagens', icon: 'MessageCircle', badgeVariant: 'default' },
  { id: 'other', label: 'Outros', icon: 'Settings', badgeVariant: 'gray' },
];

// ============================================================
// PERMISSOES OBRIGATORIAS E RECOMENDADAS
// ============================================================

/** Permissoes minimas para que a conexao funcione */
export const REQUIRED_SCOPES: string[] = [
  'ads_read',
  'business_management',
];

/** Permissoes recomendadas para funcionalidade completa */
export const RECOMMENDED_SCOPES: string[] = [
  'ads_management',
  'read_insights',
  'leads_retrieval',
  'pages_show_list',
  'pages_read_engagement',
];

// ============================================================
// MAPEAMENTO DE PERMISSOES
// ============================================================

/** Mapeamento completo de todas as permissoes conhecidas da Meta */
const PERMISSIONS_MAP: Record<string, { category: PermissionCategory; description: string }> = {
  // --- Anuncios e Insights ---
  ads_read: { category: 'ads', description: 'Ler dados de campanhas e metricas' },
  ads_management: { category: 'ads', description: 'Gerenciar campanhas e anuncios' },
  read_insights: { category: 'ads', description: 'Ler insights de performance' },
  attribution_read: { category: 'ads', description: 'Ler dados de atribuicao' },
  pages_manage_ads: { category: 'ads', description: 'Gerenciar anuncios de paginas' },

  // --- Paginas ---
  pages_show_list: { category: 'pages', description: 'Listar paginas gerenciadas' },
  pages_read_engagement: { category: 'pages', description: 'Ler engajamento de paginas' },
  pages_read_user_content: { category: 'pages', description: 'Ler conteudo de usuarios em paginas' },
  pages_manage_cta: { category: 'pages', description: 'Gerenciar call-to-action de paginas' },
  pages_manage_posts: { category: 'pages', description: 'Gerenciar publicacoes de paginas' },
  pages_manage_engagement: { category: 'pages', description: 'Gerenciar engajamento de paginas' },
  pages_manage_metadata: { category: 'pages', description: 'Gerenciar metadados de paginas' },
  pages_manage_instant_articles: { category: 'pages', description: 'Gerenciar Instant Articles' },
  read_page_mailboxes: { category: 'pages', description: 'Ler caixa de entrada de paginas' },
  page_events: { category: 'pages', description: 'Gerenciar eventos de paginas' },
  publish_video: { category: 'pages', description: 'Publicar videos' },
  public_profile: { category: 'pages', description: 'Acessar perfil publico' },

  // --- Instagram ---
  instagram_basic: { category: 'instagram', description: 'Acesso basico ao Instagram' },
  instagram_manage_comments: { category: 'instagram', description: 'Gerenciar comentarios' },
  instagram_manage_insights: { category: 'instagram', description: 'Ler insights do Instagram' },
  instagram_content_publish: { category: 'instagram', description: 'Publicar conteudo' },
  instagram_manage_contents: { category: 'instagram', description: 'Gerenciar conteudos' },
  instagram_manage_messages: { category: 'instagram', description: 'Gerenciar mensagens' },
  instagram_shopping_tag_products: { category: 'instagram', description: 'Marcar produtos em posts' },
  instagram_branded_content_brand: { category: 'instagram', description: 'Conteudo patrocinado (marca)' },
  instagram_branded_content_ads_brand: { category: 'instagram', description: 'Anuncios de conteudo patrocinado' },

  // --- Negocios e Comercio ---
  business_management: { category: 'business', description: 'Gerenciar Business Manager' },
  catalog_management: { category: 'business', description: 'Gerenciar catalogos de produtos' },
  commerce_account_read_settings: { category: 'business', description: 'Ler configuracoes de comercio' },
  commerce_account_manage_orders: { category: 'business', description: 'Gerenciar pedidos' },
  commerce_account_read_orders: { category: 'business', description: 'Ler pedidos' },
  commerce_account_read_reports: { category: 'business', description: 'Ler relatorios de comercio' },
  private_computation_access: { category: 'business', description: 'Acesso a computacao privada' },
  leads_retrieval: { category: 'business', description: 'Recuperar leads de formularios' },
  manage_app_solution: { category: 'business', description: 'Gerenciar solucoes do app' },

  // --- Mensagens ---
  pages_messaging: { category: 'messaging', description: 'Enviar mensagens via paginas' },
  pages_utility_messaging: { category: 'messaging', description: 'Mensagens utilitarias de paginas' },
  whatsapp_business_management: { category: 'messaging', description: 'Gerenciar conta WhatsApp Business' },
  whatsapp_business_messaging: { category: 'messaging', description: 'Enviar mensagens via WhatsApp' },
  whatsapp_business_manage_events: { category: 'messaging', description: 'Gerenciar eventos do WhatsApp' },
  paid_marketing_messages: { category: 'messaging', description: 'Mensagens de marketing pagas' },

  // --- Outros ---
  threads_business_basic: { category: 'other', description: 'Acesso basico ao Threads' },
  facebook_branded_content_ads_brand: { category: 'other', description: 'Anuncios de conteudo patrocinado (Facebook)' },
};

// ============================================================
// FUNCOES AUXILIARES
// ============================================================

/**
 * Retorna informacoes de uma permissao, incluindo sua categoria e descricao.
 * Para permissoes desconhecidas, infere a categoria pelo prefixo.
 */
export function getPermissionInfo(scope: string): PermissionInfo {
  const known = PERMISSIONS_MAP[scope];
  if (known) {
    return { scope, ...known };
  }

  // Infere categoria pelo prefixo para permissoes nao mapeadas
  const category = inferCategory(scope);
  return {
    scope,
    category,
    description: formatScopeName(scope),
  };
}

/**
 * Agrupa um array de scopes por categoria.
 * Retorna um Map<PermissionCategory, PermissionInfo[]> ordenado por
 * quantidade de permissoes (maior primeiro).
 */
export function categorizeScopes(
  scopes: string[]
): Map<PermissionCategory, PermissionInfo[]> {
  const grouped = new Map<PermissionCategory, PermissionInfo[]>();

  // Inicializa todas as categorias
  for (const cat of PERMISSION_CATEGORIES) {
    grouped.set(cat.id, []);
  }

  // Distribui as permissoes
  for (const scope of scopes) {
    const info = getPermissionInfo(scope);
    const list = grouped.get(info.category) || [];
    list.push(info);
    grouped.set(info.category, list);
  }

  // Remove categorias vazias e ordena por quantidade
  const sorted = new Map<PermissionCategory, PermissionInfo[]>(
    [...grouped.entries()]
      .filter(([, perms]) => perms.length > 0)
      .sort((a, b) => b[1].length - a[1].length)
  );

  return sorted;
}

/**
 * Verifica quais permissoes obrigatorias estao faltando
 */
export function getMissingRequired(scopes: string[]): string[] {
  return REQUIRED_SCOPES.filter(r => !scopes.includes(r));
}

/**
 * Verifica quais permissoes recomendadas estao faltando
 */
export function getMissingRecommended(scopes: string[]): string[] {
  return RECOMMENDED_SCOPES.filter(r => !scopes.includes(r));
}

/**
 * Retorna os metadados de uma categoria pelo ID
 */
export function getCategoryMeta(categoryId: PermissionCategory): CategoryMeta {
  return PERMISSION_CATEGORIES.find(c => c.id === categoryId) || PERMISSION_CATEGORIES[5];
}

// ============================================================
// HELPERS INTERNOS
// ============================================================

/** Infere a categoria de uma permissao desconhecida pelo prefixo */
function inferCategory(scope: string): PermissionCategory {
  if (scope.startsWith('ads_') || scope.includes('insight')) return 'ads';
  if (scope.startsWith('instagram_')) return 'instagram';
  if (scope.startsWith('pages_') || scope.startsWith('page_')) return 'pages';
  if (scope.startsWith('business_') || scope.startsWith('catalog_') || scope.startsWith('commerce_')) return 'business';
  if (scope.includes('messaging') || scope.includes('whatsapp') || scope.includes('marketing_messages')) return 'messaging';
  return 'other';
}

/** Converte nome tecnico do scope em formato legivel */
function formatScopeName(scope: string): string {
  return scope
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
