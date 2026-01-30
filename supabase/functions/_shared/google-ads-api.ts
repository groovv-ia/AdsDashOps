/**
 * Google Ads API Helper
 *
 * Funcoes utilitarias para interagir com a API REST do Google Ads.
 * Inclui autenticacao OAuth2, refresh de tokens e execucao de queries GAQL.
 *
 * Documentacao: https://developers.google.com/google-ads/api/rest/overview
 */

// Versao da API do Google Ads
const GOOGLE_ADS_API_VERSION = "v18";
const GOOGLE_ADS_API_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

// URL para refresh de tokens OAuth2
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// Interface para tokens OAuth2
export interface GoogleOAuthTokens {
  access_token: string;
  refresh_token: string;
  token_expires_at: Date | null;
}

// Interface para resposta de refresh token
interface TokenRefreshResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

// Interface para resposta de erro da API
interface GoogleAdsError {
  error: {
    code: number;
    message: string;
    status: string;
    details?: Array<{
      "@type": string;
      errors?: Array<{
        errorCode: Record<string, string>;
        message: string;
      }>;
    }>;
  };
}

// Interface para resultado de query GAQL
export interface GAQLQueryResult {
  results: Array<Record<string, unknown>>;
  fieldMask?: string;
  requestId?: string;
}

// Interface para customer info
export interface GoogleCustomerInfo {
  resourceName: string;
  id: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  manager: boolean;
}

// Interface para customer client (sub-contas de MCC)
export interface GoogleCustomerClient {
  resourceName: string;
  clientCustomer: string;
  hidden: boolean;
  level: string;
  id?: string;
  descriptiveName?: string;
  currencyCode?: string;
  timeZone?: string;
  manager?: boolean;
}

/**
 * Faz refresh do access_token usando o refresh_token
 * O access_token do Google expira em ~1 hora
 */
export async function refreshGoogleAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; expiresAt: Date } | null> {
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[google-ads-api] Token refresh failed:", errorText);
      return null;
    }

    const data: TokenRefreshResponse = await response.json();

    // Calcula quando o token expira (usa 50 minutos para ter margem de seguranca)
    const expiresAt = new Date(Date.now() + (data.expires_in - 600) * 1000);

    return {
      accessToken: data.access_token,
      expiresAt,
    };
  } catch (error) {
    console.error("[google-ads-api] Error refreshing token:", error);
    return null;
  }
}

/**
 * Verifica se o access_token esta expirado ou proximo de expirar
 */
export function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  // Considera expirado se faltam menos de 5 minutos
  return new Date() >= new Date(expiresAt.getTime() - 5 * 60 * 1000);
}

/**
 * Executa uma query GAQL (Google Ads Query Language) na API REST
 *
 * @param accessToken - Token OAuth2 de acesso
 * @param developerToken - Developer Token do Google Ads
 * @param customerId - Customer ID da conta (sem hifens)
 * @param query - Query GAQL a executar
 * @param loginCustomerId - Customer ID de login (para MCC, opcional)
 */
export async function executeGAQLQuery(
  accessToken: string,
  developerToken: string,
  customerId: string,
  query: string,
  loginCustomerId?: string
): Promise<{ data: GAQLQueryResult | null; error: string | null }> {
  // Remove hifens do customer ID se houver
  const cleanCustomerId = customerId.replace(/-/g, "");
  const cleanLoginId = loginCustomerId?.replace(/-/g, "");

  const url = `${GOOGLE_ADS_API_BASE}/customers/${cleanCustomerId}/googleAds:searchStream`;

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };

  // Se for acesso via MCC, adiciona o login-customer-id
  if (cleanLoginId && cleanLoginId !== cleanCustomerId) {
    headers["login-customer-id"] = cleanLoginId;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorData = await response.json() as GoogleAdsError;
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;

      // Extrai mensagens detalhadas se disponiveis
      const detailedErrors = errorData.error?.details?.[0]?.errors
        ?.map(e => e.message)
        .join("; ");

      console.error("[google-ads-api] Query failed:", errorMessage, detailedErrors);
      return { data: null, error: detailedErrors || errorMessage };
    }

    // A API retorna um array de resultados (streaming)
    const text = await response.text();

    // Parse da resposta (pode ser NDJSON para streaming)
    const lines = text.trim().split("\n").filter(line => line.trim());
    const allResults: Record<string, unknown>[] = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.results && Array.isArray(parsed.results)) {
          allResults.push(...parsed.results);
        }
      } catch {
        // Ignora linhas que nao sao JSON valido
      }
    }

    return {
      data: { results: allResults },
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[google-ads-api] Request error:", errorMessage);
    return { data: null, error: errorMessage };
  }
}

/**
 * Busca informacoes da conta do cliente
 */
export async function fetchCustomerInfo(
  accessToken: string,
  developerToken: string,
  customerId: string,
  loginCustomerId?: string
): Promise<{ data: GoogleCustomerInfo | null; error: string | null }> {
  const query = `
    SELECT
      customer.id,
      customer.descriptive_name,
      customer.currency_code,
      customer.time_zone,
      customer.manager,
      customer.resource_name
    FROM customer
    LIMIT 1
  `;

  const result = await executeGAQLQuery(
    accessToken,
    developerToken,
    customerId,
    query,
    loginCustomerId
  );

  if (result.error || !result.data?.results?.length) {
    return { data: null, error: result.error || "Customer not found" };
  }

  const row = result.data.results[0] as { customer?: Record<string, unknown> };
  const customer = row.customer;

  if (!customer) {
    return { data: null, error: "Invalid customer data" };
  }

  return {
    data: {
      resourceName: String(customer.resourceName || ""),
      id: String(customer.id || customerId),
      descriptiveName: String(customer.descriptiveName || `Account ${customerId}`),
      currencyCode: String(customer.currencyCode || "BRL"),
      timeZone: String(customer.timeZone || "America/Sao_Paulo"),
      manager: Boolean(customer.manager),
    },
    error: null,
  };
}

/**
 * Lista todas as contas acessiveis via MCC (Manager Account)
 */
export async function listAccessibleAccounts(
  accessToken: string,
  developerToken: string,
  mccCustomerId: string
): Promise<{ data: GoogleCustomerClient[] | null; error: string | null }> {
  // Query para buscar todas as contas vinculadas ao MCC
  const query = `
    SELECT
      customer_client.client_customer,
      customer_client.hidden,
      customer_client.level,
      customer_client.descriptive_name,
      customer_client.currency_code,
      customer_client.time_zone,
      customer_client.manager,
      customer_client.id,
      customer_client.resource_name
    FROM customer_client
    WHERE customer_client.status = 'ENABLED'
    ORDER BY customer_client.descriptive_name
  `;

  const result = await executeGAQLQuery(
    accessToken,
    developerToken,
    mccCustomerId,
    query,
    mccCustomerId
  );

  if (result.error) {
    return { data: null, error: result.error };
  }

  if (!result.data?.results?.length) {
    return { data: [], error: null };
  }

  const accounts: GoogleCustomerClient[] = result.data.results.map(
    (row: Record<string, unknown>) => {
      const client = row.customerClient as Record<string, unknown> || {};
      return {
        resourceName: String(client.resourceName || ""),
        clientCustomer: String(client.clientCustomer || ""),
        hidden: Boolean(client.hidden),
        level: String(client.level || "1"),
        id: String(client.id || ""),
        descriptiveName: String(client.descriptiveName || ""),
        currencyCode: String(client.currencyCode || "BRL"),
        timeZone: String(client.timeZone || "America/Sao_Paulo"),
        manager: Boolean(client.manager),
      };
    }
  );

  return { data: accounts, error: null };
}

/**
 * Busca campanhas de uma conta
 */
export async function fetchCampaigns(
  accessToken: string,
  developerToken: string,
  customerId: string,
  loginCustomerId?: string
): Promise<{
  data: Array<{
    campaignId: string;
    name: string;
    status: string;
    advertisingChannelType: string;
    biddingStrategyType: string;
    budgetAmountMicros: number;
  }> | null;
  error: string | null;
}> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type,
      campaign_budget.amount_micros
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name
  `;

  const result = await executeGAQLQuery(
    accessToken,
    developerToken,
    customerId,
    query,
    loginCustomerId
  );

  if (result.error) {
    return { data: null, error: result.error };
  }

  if (!result.data?.results?.length) {
    return { data: [], error: null };
  }

  const campaigns = result.data.results.map((row: Record<string, unknown>) => {
    const campaign = row.campaign as Record<string, unknown> || {};
    const budget = row.campaignBudget as Record<string, unknown> || {};

    return {
      campaignId: String(campaign.id || ""),
      name: String(campaign.name || ""),
      status: String(campaign.status || "UNKNOWN"),
      advertisingChannelType: String(campaign.advertisingChannelType || "UNKNOWN"),
      biddingStrategyType: String(campaign.biddingStrategyType || "UNKNOWN"),
      budgetAmountMicros: Number(budget.amountMicros || 0),
    };
  });

  return { data: campaigns, error: null };
}

/**
 * Busca ad groups de uma campanha
 */
export async function fetchAdGroups(
  accessToken: string,
  developerToken: string,
  customerId: string,
  campaignId: string,
  loginCustomerId?: string
): Promise<{
  data: Array<{
    adGroupId: string;
    campaignId: string;
    name: string;
    status: string;
    type: string;
    cpcBidMicros: number;
  }> | null;
  error: string | null;
}> {
  const query = `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group.type,
      ad_group.cpc_bid_micros,
      campaign.id
    FROM ad_group
    WHERE campaign.id = ${campaignId}
      AND ad_group.status != 'REMOVED'
    ORDER BY ad_group.name
  `;

  const result = await executeGAQLQuery(
    accessToken,
    developerToken,
    customerId,
    query,
    loginCustomerId
  );

  if (result.error) {
    return { data: null, error: result.error };
  }

  if (!result.data?.results?.length) {
    return { data: [], error: null };
  }

  const adGroups = result.data.results.map((row: Record<string, unknown>) => {
    const adGroup = row.adGroup as Record<string, unknown> || {};
    const campaign = row.campaign as Record<string, unknown> || {};

    return {
      adGroupId: String(adGroup.id || ""),
      campaignId: String(campaign.id || campaignId),
      name: String(adGroup.name || ""),
      status: String(adGroup.status || "UNKNOWN"),
      type: String(adGroup.type || "UNKNOWN"),
      cpcBidMicros: Number(adGroup.cpcBidMicros || 0),
    };
  });

  return { data: adGroups, error: null };
}

/**
 * Busca anuncios de um ad group
 */
export async function fetchAds(
  accessToken: string,
  developerToken: string,
  customerId: string,
  adGroupId: string,
  loginCustomerId?: string
): Promise<{
  data: Array<{
    adId: string;
    adGroupId: string;
    name: string;
    status: string;
    type: string;
    finalUrls: string[];
    headlines: string[];
    descriptions: string[];
  }> | null;
  error: string | null;
}> {
  const query = `
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      ad_group_ad.status,
      ad_group_ad.ad.type,
      ad_group_ad.ad.final_urls,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.responsive_search_ad.descriptions,
      ad_group.id
    FROM ad_group_ad
    WHERE ad_group.id = ${adGroupId}
      AND ad_group_ad.status != 'REMOVED'
  `;

  const result = await executeGAQLQuery(
    accessToken,
    developerToken,
    customerId,
    query,
    loginCustomerId
  );

  if (result.error) {
    return { data: null, error: result.error };
  }

  if (!result.data?.results?.length) {
    return { data: [], error: null };
  }

  const ads = result.data.results.map((row: Record<string, unknown>) => {
    const adGroupAd = row.adGroupAd as Record<string, unknown> || {};
    const ad = adGroupAd.ad as Record<string, unknown> || {};
    const rsa = ad.responsiveSearchAd as Record<string, unknown> || {};
    const adGroup = row.adGroup as Record<string, unknown> || {};

    // Extrai headlines e descriptions de RSA
    const headlines = (rsa.headlines as Array<{ text?: string }> || [])
      .map(h => h.text || "")
      .filter(Boolean);
    const descriptions = (rsa.descriptions as Array<{ text?: string }> || [])
      .map(d => d.text || "")
      .filter(Boolean);

    return {
      adId: String(ad.id || ""),
      adGroupId: String(adGroup.id || adGroupId),
      name: String(ad.name || `Ad ${ad.id}`),
      status: String(adGroupAd.status || "UNKNOWN"),
      type: String(ad.type || "UNKNOWN"),
      finalUrls: (ad.finalUrls as string[]) || [],
      headlines,
      descriptions,
    };
  });

  return { data: ads, error: null };
}

/**
 * Busca keywords de um ad group
 */
export async function fetchKeywords(
  accessToken: string,
  developerToken: string,
  customerId: string,
  adGroupId: string,
  loginCustomerId?: string
): Promise<{
  data: Array<{
    keywordId: string;
    adGroupId: string;
    text: string;
    matchType: string;
    status: string;
    qualityScore: number | null;
    cpcBidMicros: number;
  }> | null;
  error: string | null;
}> {
  const query = `
    SELECT
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      ad_group_criterion.quality_info.quality_score,
      ad_group_criterion.cpc_bid_micros,
      ad_group.id
    FROM ad_group_criterion
    WHERE ad_group.id = ${adGroupId}
      AND ad_group_criterion.status != 'REMOVED'
      AND ad_group_criterion.type = 'KEYWORD'
  `;

  const result = await executeGAQLQuery(
    accessToken,
    developerToken,
    customerId,
    query,
    loginCustomerId
  );

  if (result.error) {
    return { data: null, error: result.error };
  }

  if (!result.data?.results?.length) {
    return { data: [], error: null };
  }

  const keywords = result.data.results.map((row: Record<string, unknown>) => {
    const criterion = row.adGroupCriterion as Record<string, unknown> || {};
    const keyword = criterion.keyword as Record<string, unknown> || {};
    const qualityInfo = criterion.qualityInfo as Record<string, unknown> || {};
    const adGroup = row.adGroup as Record<string, unknown> || {};

    return {
      keywordId: String(criterion.criterionId || ""),
      adGroupId: String(adGroup.id || adGroupId),
      text: String(keyword.text || ""),
      matchType: String(keyword.matchType || "BROAD"),
      status: String(criterion.status || "UNKNOWN"),
      qualityScore: qualityInfo.qualityScore ? Number(qualityInfo.qualityScore) : null,
      cpcBidMicros: Number(criterion.cpcBidMicros || 0),
    };
  });

  return { data: keywords, error: null };
}

/**
 * Busca metricas diarias de campanhas
 */
export async function fetchCampaignMetrics(
  accessToken: string,
  developerToken: string,
  customerId: string,
  dateFrom: string,
  dateTo: string,
  loginCustomerId?: string
): Promise<{
  data: Array<{
    date: string;
    campaignId: string;
    campaignName: string;
    adGroupId: string | null;
    adGroupName: string | null;
    adId: string | null;
    adName: string | null;
    impressions: number;
    clicks: number;
    costMicros: number;
    conversions: number;
    conversionsValue: number;
  }> | null;
  error: string | null;
}> {
  // Query para metricas no nivel de campanha
  const query = `
    SELECT
      segments.date,
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND campaign.status != 'REMOVED'
    ORDER BY segments.date, campaign.name
  `;

  const result = await executeGAQLQuery(
    accessToken,
    developerToken,
    customerId,
    query,
    loginCustomerId
  );

  if (result.error) {
    return { data: null, error: result.error };
  }

  if (!result.data?.results?.length) {
    return { data: [], error: null };
  }

  const metrics = result.data.results.map((row: Record<string, unknown>) => {
    const segments = row.segments as Record<string, unknown> || {};
    const campaign = row.campaign as Record<string, unknown> || {};
    const metricsData = row.metrics as Record<string, unknown> || {};

    return {
      date: String(segments.date || ""),
      campaignId: String(campaign.id || ""),
      campaignName: String(campaign.name || ""),
      adGroupId: null,
      adGroupName: null,
      adId: null,
      adName: null,
      impressions: Number(metricsData.impressions || 0),
      clicks: Number(metricsData.clicks || 0),
      costMicros: Number(metricsData.costMicros || 0),
      conversions: Number(metricsData.conversions || 0),
      conversionsValue: Number(metricsData.conversionsValue || 0),
    };
  });

  return { data: metrics, error: null };
}

/**
 * Busca metricas diarias no nivel de ad group
 */
export async function fetchAdGroupMetrics(
  accessToken: string,
  developerToken: string,
  customerId: string,
  dateFrom: string,
  dateTo: string,
  loginCustomerId?: string
): Promise<{
  data: Array<{
    date: string;
    campaignId: string;
    campaignName: string;
    adGroupId: string;
    adGroupName: string;
    impressions: number;
    clicks: number;
    costMicros: number;
    conversions: number;
    conversionsValue: number;
  }> | null;
  error: string | null;
}> {
  const query = `
    SELECT
      segments.date,
      campaign.id,
      campaign.name,
      ad_group.id,
      ad_group.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM ad_group
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND campaign.status != 'REMOVED'
      AND ad_group.status != 'REMOVED'
    ORDER BY segments.date, campaign.name, ad_group.name
  `;

  const result = await executeGAQLQuery(
    accessToken,
    developerToken,
    customerId,
    query,
    loginCustomerId
  );

  if (result.error) {
    return { data: null, error: result.error };
  }

  if (!result.data?.results?.length) {
    return { data: [], error: null };
  }

  const metrics = result.data.results.map((row: Record<string, unknown>) => {
    const segments = row.segments as Record<string, unknown> || {};
    const campaign = row.campaign as Record<string, unknown> || {};
    const adGroup = row.adGroup as Record<string, unknown> || {};
    const metricsData = row.metrics as Record<string, unknown> || {};

    return {
      date: String(segments.date || ""),
      campaignId: String(campaign.id || ""),
      campaignName: String(campaign.name || ""),
      adGroupId: String(adGroup.id || ""),
      adGroupName: String(adGroup.name || ""),
      impressions: Number(metricsData.impressions || 0),
      clicks: Number(metricsData.clicks || 0),
      costMicros: Number(metricsData.costMicros || 0),
      conversions: Number(metricsData.conversions || 0),
      conversionsValue: Number(metricsData.conversionsValue || 0),
    };
  });

  return { data: metrics, error: null };
}

/**
 * Busca metricas diarias no nivel de anuncio
 */
export async function fetchAdMetrics(
  accessToken: string,
  developerToken: string,
  customerId: string,
  dateFrom: string,
  dateTo: string,
  loginCustomerId?: string
): Promise<{
  data: Array<{
    date: string;
    campaignId: string;
    campaignName: string;
    adGroupId: string;
    adGroupName: string;
    adId: string;
    adName: string;
    impressions: number;
    clicks: number;
    costMicros: number;
    conversions: number;
    conversionsValue: number;
  }> | null;
  error: string | null;
}> {
  const query = `
    SELECT
      segments.date,
      campaign.id,
      campaign.name,
      ad_group.id,
      ad_group.name,
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM ad_group_ad
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND campaign.status != 'REMOVED'
      AND ad_group.status != 'REMOVED'
      AND ad_group_ad.status != 'REMOVED'
    ORDER BY segments.date, campaign.name, ad_group.name
  `;

  const result = await executeGAQLQuery(
    accessToken,
    developerToken,
    customerId,
    query,
    loginCustomerId
  );

  if (result.error) {
    return { data: null, error: result.error };
  }

  if (!result.data?.results?.length) {
    return { data: [], error: null };
  }

  const metrics = result.data.results.map((row: Record<string, unknown>) => {
    const segments = row.segments as Record<string, unknown> || {};
    const campaign = row.campaign as Record<string, unknown> || {};
    const adGroup = row.adGroup as Record<string, unknown> || {};
    const adGroupAd = row.adGroupAd as Record<string, unknown> || {};
    const ad = adGroupAd.ad as Record<string, unknown> || {};
    const metricsData = row.metrics as Record<string, unknown> || {};

    return {
      date: String(segments.date || ""),
      campaignId: String(campaign.id || ""),
      campaignName: String(campaign.name || ""),
      adGroupId: String(adGroup.id || ""),
      adGroupName: String(adGroup.name || ""),
      adId: String(ad.id || ""),
      adName: String(ad.name || `Ad ${ad.id}`),
      impressions: Number(metricsData.impressions || 0),
      clicks: Number(metricsData.clicks || 0),
      costMicros: Number(metricsData.costMicros || 0),
      conversions: Number(metricsData.conversions || 0),
      conversionsValue: Number(metricsData.conversionsValue || 0),
    };
  });

  return { data: metrics, error: null };
}

/**
 * Busca metricas diarias no nivel de keyword
 */
export async function fetchKeywordMetrics(
  accessToken: string,
  developerToken: string,
  customerId: string,
  dateFrom: string,
  dateTo: string,
  loginCustomerId?: string
): Promise<{
  data: Array<{
    date: string;
    campaignId: string;
    campaignName: string;
    adGroupId: string;
    adGroupName: string;
    keywordId: string;
    keywordText: string;
    impressions: number;
    clicks: number;
    costMicros: number;
    conversions: number;
    conversionsValue: number;
  }> | null;
  error: string | null;
}> {
  const query = `
    SELECT
      segments.date,
      campaign.id,
      campaign.name,
      ad_group.id,
      ad_group.name,
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM keyword_view
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND campaign.status != 'REMOVED'
      AND ad_group.status != 'REMOVED'
      AND ad_group_criterion.status != 'REMOVED'
    ORDER BY segments.date, campaign.name, ad_group.name
  `;

  const result = await executeGAQLQuery(
    accessToken,
    developerToken,
    customerId,
    query,
    loginCustomerId
  );

  if (result.error) {
    return { data: null, error: result.error };
  }

  if (!result.data?.results?.length) {
    return { data: [], error: null };
  }

  const metrics = result.data.results.map((row: Record<string, unknown>) => {
    const segments = row.segments as Record<string, unknown> || {};
    const campaign = row.campaign as Record<string, unknown> || {};
    const adGroup = row.adGroup as Record<string, unknown> || {};
    const criterion = row.adGroupCriterion as Record<string, unknown> || {};
    const keyword = criterion.keyword as Record<string, unknown> || {};
    const metricsData = row.metrics as Record<string, unknown> || {};

    return {
      date: String(segments.date || ""),
      campaignId: String(campaign.id || ""),
      campaignName: String(campaign.name || ""),
      adGroupId: String(adGroup.id || ""),
      adGroupName: String(adGroup.name || ""),
      keywordId: String(criterion.criterionId || ""),
      keywordText: String(keyword.text || ""),
      impressions: Number(metricsData.impressions || 0),
      clicks: Number(metricsData.clicks || 0),
      costMicros: Number(metricsData.costMicros || 0),
      conversions: Number(metricsData.conversions || 0),
      conversionsValue: Number(metricsData.conversionsValue || 0),
    };
  });

  return { data: metrics, error: null };
}

/**
 * Converte custo em micros para valor decimal
 * Google Ads API retorna custos em micros (1.000.000 = 1 unidade de moeda)
 */
export function microsToDecimal(micros: number): number {
  return micros / 1_000_000;
}

/**
 * Formata Customer ID para exibicao (XXX-XXX-XXXX)
 */
export function formatCustomerId(customerId: string): string {
  const clean = customerId.replace(/\D/g, "");
  if (clean.length !== 10) return customerId;
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
}

/**
 * Remove formatacao do Customer ID (retorna apenas numeros)
 */
export function cleanCustomerId(customerId: string): string {
  return customerId.replace(/\D/g, "");
}
