/**
 * Meta Ads Insights - Mapeamento de actions[] para metricas semanticas
 *
 * Este modulo centraliza a logica de extracao de metricas a partir do array
 * `actions` retornado pela Meta Insights API, evitando dupla contagem
 * e mantendo compatibilidade com os valores exibidos no Gerenciador de Anuncios.
 */

// Tipo para um item do array actions da Meta
export interface MetaAction {
  action_type: string;
  value: string;
}

/**
 * Extrai conversas iniciadas (messaging_conversation_started)
 *
 * Usa prioridade para nao somar variantes do mesmo evento:
 * 1. onsite_conversion.messaging_conversation_started_7d (padrao do Gerenciador)
 * 2. messaging_conversation_started (fallback generico)
 */
export function extractConversationsStarted(actions: MetaAction[]): number {
  if (!actions || actions.length === 0) return 0;

  const onsite = actions.find(
    (a) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d'
  );
  if (onsite) return parseInt(onsite.value || '0', 10);

  const generic = actions.find(
    (a) => a.action_type === 'messaging_conversation_started'
  );
  if (generic) return parseInt(generic.value || '0', 10);

  return 0;
}

/**
 * Extrai leads SEM dupla contagem
 *
 * Prioridade (usa apenas o primeiro encontrado):
 * 1. onsite_conversion.lead_grouped (Lead Ads nativo)
 * 2. offsite_conversion.fb_pixel_lead (pixel externo)
 * 3. lead (generico)
 */
export function extractLeads(actions: MetaAction[]): number {
  if (!actions || actions.length === 0) return 0;

  const leadGrouped = actions.find(
    (a) => a.action_type === 'onsite_conversion.lead_grouped'
  );
  if (leadGrouped) return parseInt(leadGrouped.value || '0', 10);

  const pixelLead = actions.find(
    (a) => a.action_type === 'offsite_conversion.fb_pixel_lead'
  );
  if (pixelLead) return parseInt(pixelLead.value || '0', 10);

  const genericLead = actions.find((a) => a.action_type === 'lead');
  if (genericLead) return parseInt(genericLead.value || '0', 10);

  return 0;
}

/**
 * Extrai novos seguidores de pagina (page likes)
 *
 * Usa 'like' (curtida na pagina) ou 'page_engagement' como proxy.
 * No Gerenciador, a coluna "Resultados" para campanhas de seguidores mostra 'like'.
 */
export function extractPageFollowers(actions: MetaAction[]): number {
  if (!actions || actions.length === 0) return 0;

  const pageLike = actions.find((a) => a.action_type === 'like');
  if (pageLike) return parseInt(pageLike.value || '0', 10);

  return 0;
}

/**
 * Extrai total de compras (purchases)
 */
export function extractPurchases(actions: MetaAction[]): number {
  if (!actions || actions.length === 0) return 0;

  const purchaseTypes = [
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
    'onsite_conversion.purchase',
  ];
  return actions
    .filter((a) => purchaseTypes.includes(a.action_type))
    .reduce((sum, a) => sum + parseInt(a.value || '0', 10), 0);
}

/**
 * Extrai valor monetario de compras (purchase ROAS value)
 */
export function extractPurchaseValue(actionValues: MetaAction[]): number {
  if (!actionValues || actionValues.length === 0) return 0;

  const valueTypes = [
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
    'onsite_conversion.purchase',
  ];
  return actionValues
    .filter((a) => valueTypes.includes(a.action_type))
    .reduce((sum, a) => sum + parseFloat(a.value || '0'), 0);
}

/**
 * Calcula ROAS. Retorna null quando nao ha evento de compra (campanha sem purchase).
 */
export function calculateRoas(purchaseValue: number, spend: number): number | null {
  if (spend <= 0) return null;
  if (purchaseValue <= 0) return null;
  return purchaseValue / spend;
}

/**
 * Formata ROAS para exibicao. Retorna "—" quando indisponivel.
 */
export function formatRoas(roas: number | null): string {
  if (roas === null) return '—';
  return `${roas.toFixed(2)}x`;
}
