# Integração com APIs de Publicidade - Meta Ads e Google Ads

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Configuração Inicial](#configuração-inicial)
3. [Meta Ads (Facebook/Instagram)](#meta-ads)
4. [Google Ads](#google-ads)
5. [Uso dos Serviços](#uso-dos-serviços)
6. [Sincronização de Dados](#sincronização-de-dados)
7. [Estrutura de Dados](#estrutura-de-dados)
8. [Tratamento de Erros](#tratamento-de-erros)
9. [Boas Práticas](#boas-práticas)

---

## Visão Geral

O sistema implementa integração completa e robusta com as APIs oficiais da Meta Ads e Google Ads, utilizando os SDKs oficiais:

- **Meta Ads**: `facebook-nodejs-business-sdk` com Marketing API v19.0
- **Google Ads**: `google-ads-api` com Google Ads API v15

### Funcionalidades Principais

✅ Autenticação OAuth 2.0 segura
✅ Renovação automática de tokens
✅ Sincronização completa de dados (Campanhas, Ad Sets, Anúncios, Métricas)
✅ Rate limiting inteligente
✅ Retry automático com backoff exponencial
✅ Criptografia de credenciais sensíveis
✅ Logging estruturado
✅ Histórico de sincronizações

---

## Configuração Inicial

### 1. Variáveis de Ambiente

Configure o arquivo `.env` com suas credenciais:

```env
# Supabase (já configurado)
VITE_SUPABASE_URL=https://ytpxpdepqwmavjphxwfv.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Meta Ads API
VITE_META_APP_ID=seu_app_id_meta
VITE_META_APP_SECRET=seu_app_secret_meta

# Google Ads API
VITE_GOOGLE_CLIENT_ID=seu_client_id_google
VITE_GOOGLE_CLIENT_SECRET=seu_client_secret_google
VITE_GOOGLE_DEVELOPER_TOKEN=seu_developer_token

# Chave de Criptografia (MUDE EM PRODUÇÃO!)
VITE_ENCRYPTION_KEY=seu_encryption_key_seguro

# OAuth Redirect
VITE_OAUTH_REDIRECT_URL=http://localhost:5173/oauth-callback
```

### 2. Estrutura do Banco de Dados

As seguintes tabelas foram criadas automaticamente pela migration:

- `api_credentials` - Credenciais de API criptografadas
- `oauth_tokens` - Tokens de acesso OAuth
- `sync_jobs` - Histórico de sincronizações
- `campaigns` - Campanhas (expandida com novos campos)
- `ad_sets` - Conjuntos de anúncios (expandida)
- `ads` - Anúncios individuais (expandida)
- `ad_metrics` - Métricas de performance (expandida)
- `ad_creatives` - Criativos de anúncios
- `audience_insights` - Insights de audiência
- `conversion_events` - Eventos de conversão

---

## Meta Ads

### Configuração do App no Meta for Developers

1. Acesse https://developers.facebook.com/apps/
2. Crie um novo app ou use um existente
3. Adicione o produto **Marketing API**
4. Configure as **URLs de redirecionamento OAuth**:
   - Desenvolvimento: `http://localhost:5173/oauth-callback`
   - Produção: `https://seu-dominio.com/oauth-callback`
5. Copie o **App ID** e **App Secret**

### Permissões Necessárias

- `ads_read` - Ler dados de campanhas
- `ads_management` - Gerenciar campanhas
- `business_management` - Acessar Business Manager

### Exemplo de Uso

```typescript
import { MetaAdsService } from '@/lib/connectors/meta/MetaAdsService';
import { DataSyncService } from '@/lib/services/DataSyncService';

// Obter contas de anúncio
const metaService = new MetaAdsService();
const accounts = await metaService.getAdAccounts(accessToken);

// Sincronizar dados completos
const syncService = new DataSyncService();
const result = await syncService.syncConnection(
  connectionId,
  'meta',
  accountId,
  'full' // 'full', 'incremental' ou 'manual'
);

console.log(`Sincronizados: ${result.recordsSynced.campaigns} campanhas`);
```

### Dados Sincronizados

#### Campanhas
- ID, Nome, Status, Objetivo
- Budget diário e lifetime
- Estratégia de lance
- Datas de início/fim

#### Ad Sets
- ID, Nome, Status
- Budget e otimização
- Targeting detalhado (idade, gênero, localização)
- Posicionamentos

#### Anúncios
- ID, Nome, Status
- Criativos (imagens, vídeos)
- Call-to-action
- URLs e textos

#### Métricas (últimos 30 dias por padrão)
- Impressões, Cliques, Gastos
- CTR, CPC, ROAS
- Conversões e valores
- Alcance e frequência
- Visualizações de vídeo

---

## Google Ads

### Configuração no Google Cloud Console

1. Acesse https://console.cloud.google.com/
2. Crie um novo projeto ou use um existente
3. Habilite a **Google Ads API**
4. Crie credenciais OAuth 2.0:
   - **URIs de redirecionamento**:
     - `http://localhost:5173/oauth-callback`
     - `https://seu-dominio.com/oauth-callback`
5. Obtenha o **Developer Token** em https://ads.google.com/aw/apicenter

### Permissões Necessárias

Scope OAuth:
- `https://www.googleapis.com/auth/adwords`

### Exemplo de Uso

```typescript
import { GoogleAdsService } from '@/lib/connectors/google/GoogleAdsService';
import { DataSyncService } from '@/lib/services/DataSyncService';

// Obter clientes acessíveis
const googleService = new GoogleAdsService();
const customers = await googleService.getCustomers(connectionId);

// Sincronizar dados completos
const syncService = new DataSyncService();
const result = await syncService.syncConnection(
  connectionId,
  'google',
  customerId,
  'full'
);

console.log(`Sincronizados: ${result.recordsSynced.adSets} ad groups`);
```

### Dados Sincronizados

#### Campanhas
- ID, Nome, Status
- Tipo de canal (Search, Display, Shopping, etc.)
- Estratégia de lance
- Budget

#### Ad Groups (Ad Sets)
- ID, Nome, Status
- Lance CPC/CPM
- Tipo de grupo

#### Anúncios
- ID, Status, Tipo
- Headlines e descriptions
- URLs finais
- Extensões

#### Métricas (últimos 30 dias por padrão)
- Impressões, Cliques, Custos
- CTR, CPC médio
- Conversões e valor
- Quality Score
- Search Impression Share

---

## Uso dos Serviços

### MetaAdsService

```typescript
import { MetaAdsService } from '@/lib/dataConnectorsV2';

const metaService = new MetaAdsService();

// Obter contas
const accounts = await metaService.getAdAccounts(accessToken);

// Obter campanhas
const campaigns = await metaService.getCampaigns(connectionId, accountId);

// Obter ad sets de uma campanha
const adSets = await metaService.getAdSets(connectionId, campaignId);

// Obter anúncios de um ad set
const ads = await metaService.getAds(connectionId, adSetId);

// Obter insights/métricas
const metrics = await metaService.getInsights(
  connectionId,
  campaignId,
  'campaign', // 'campaign', 'adset' ou 'ad'
  '2024-01-01',
  '2024-01-31'
);

// Obter insights com breakdown demográfico
const insights = await metaService.getInsightsWithBreakdown(
  connectionId,
  accountId,
  '2024-01-01',
  '2024-01-31',
  ['age', 'gender', 'country', 'device_platform']
);
```

### GoogleAdsService

```typescript
import { GoogleAdsService } from '@/lib/dataConnectorsV2';

const googleService = new GoogleAdsService();

// Obter clientes
const customers = await googleService.getCustomers(connectionId);

// Obter campanhas
const campaigns = await googleService.getCampaigns(connectionId, customerId);

// Obter ad groups
const adGroups = await googleService.getAdGroups(connectionId, customerId, campaignId);

// Obter anúncios
const ads = await googleService.getAds(connectionId, customerId, adGroupId);

// Obter métricas
const metrics = await googleService.getMetrics(
  connectionId,
  customerId,
  campaignId,
  'campaign', // 'campaign', 'ad_group' ou 'ad'
  '2024-01-01',
  '2024-01-31'
);
```

### DataSyncService

```typescript
import { DataSyncService } from '@/lib/dataConnectorsV2';

const syncService = new DataSyncService();

// Sincronizar uma conexão
const result = await syncService.syncConnection(
  connectionId,
  'meta', // ou 'google'
  accountId,
  'full' // 'full', 'incremental' ou 'manual'
);

if (result.success) {
  console.log('Campanhas:', result.recordsSynced.campaigns);
  console.log('Ad Sets:', result.recordsSynced.adSets);
  console.log('Anúncios:', result.recordsSynced.ads);
  console.log('Métricas:', result.recordsSynced.metrics);
} else {
  console.error('Erro:', result.error);
}

// Obter histórico de sincronizações
const history = await syncService.getSyncHistory(connectionId, 10);
```

### TokenManager

```typescript
import { TokenManager } from '@/lib/dataConnectorsV2';

const tokenManager = new TokenManager('meta'); // ou 'google'

// Salvar token OAuth
await tokenManager.saveToken(
  connectionId,
  userId,
  accessToken,
  accountId,
  3600, // expiresIn (seconds)
  refreshToken,
  'ads_read,ads_management'
);

// Obter token
const token = await tokenManager.getToken(connectionId);

// Verificar se token é válido
const isValid = await tokenManager.isTokenValid(connectionId);

// Verificar se precisa renovar
const needsRefresh = await tokenManager.needsRefresh(connectionId);

// Renovar token
await tokenManager.refreshToken(connectionId, async (refreshToken) => {
  // Lógica para trocar refresh token por novo access token
  return {
    accessToken: newAccessToken,
    expiresIn: 3600,
    refreshToken: newRefreshToken
  };
});
```

---

## Sincronização de Dados

### Tipos de Sincronização

1. **Full (Completa)**
   - Busca todos os dados históricos
   - Recomendado para primeira sincronização
   - Pode levar mais tempo

2. **Incremental**
   - Busca apenas dados novos/atualizados
   - Mais rápida
   - Requer sincronização anterior

3. **Manual**
   - Iniciada pelo usuário
   - Controle total sobre timing
   - Sem agendamento automático

### Rate Limiting

O sistema implementa controle de rate limiting automático:

#### Meta Ads
- **Limite**: 200 requisições por hora por App
- **Comportamento**: Aguarda automaticamente quando limite é atingido

#### Google Ads
- **Limite**: 15.000 operações por dia por Developer Token
- **Comportamento**: Distribui requisições ao longo do dia

### Retry Automático

Implementado com backoff exponencial:
- 1ª tentativa: imediato
- 2ª tentativa: aguarda 1 segundo
- 3ª tentativa: aguarda 2 segundos
- 4ª tentativa: aguarda 4 segundos

### Logging

Todas as operações são logadas:

```typescript
import { logger } from '@/lib/dataConnectorsV2';

// Logs automáticos incluem:
// - Início/fim de sincronização
// - Chamadas de API
// - Erros e avisos
// - Renovação de tokens
// - Rate limiting

// Você também pode adicionar logs customizados:
logger.info('Operação iniciada', { customData: 'value' });
logger.error('Erro ocorreu', error, { context: 'additional info' });
```

---

## Estrutura de Dados

### Campaign (Campanha)

```typescript
interface Campaign {
  id: string;
  connectionId: string;
  userId: string;
  name: string;
  platform: 'Meta' | 'Google';
  accountId?: string;
  status: string;
  objective?: string;
  createdDate?: string;
  startDate?: string;
  endDate?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  budgetRemaining?: number;
  bidStrategy?: string;
  optimizationGoal?: string;
  buyingType?: string;
}
```

### AdSet (Conjunto de Anúncios / Ad Group)

```typescript
interface AdSet {
  id: string;
  campaignId: string;
  connectionId: string;
  userId: string;
  name: string;
  status: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  targeting?: string;
  optimizationGoal?: string;
  billingEvent?: string;
  bidAmount?: number;
  startTime?: string;
  endTime?: string;
  targetingJson?: Record<string, any>;
}
```

### Ad (Anúncio)

```typescript
interface Ad {
  id: string;
  adSetId: string;
  campaignId: string;
  connectionId: string;
  userId: string;
  name: string;
  status: string;
  adType?: string;
  creativeUrl?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  callToAction?: string;
  linkUrl?: string;
  headline?: string;
  description?: string;
}
```

### AdMetrics (Métricas)

```typescript
interface AdMetrics {
  id?: string;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  connectionId: string;
  userId: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  reach?: number;
  frequency?: number;
  ctr?: number;
  cpc?: number;
  roas?: number;
  costPerResult?: number;
  videoViews?: number;
  videoAvgTimeWatched?: number;
  engagementRate?: number;
  qualityScore?: number;
}
```

---

## Tratamento de Erros

### Tipos de Erro

1. **Autenticação**
   - Token expirado
   - Token inválido
   - Permissões insuficientes

2. **Rate Limiting**
   - Limite de requisições atingido
   - Aguarda automaticamente

3. **Rede**
   - Timeout
   - Conexão perdida
   - Retry automático

4. **API**
   - Recurso não encontrado
   - Dados inválidos
   - Erro do servidor

### Exemplo de Tratamento

```typescript
try {
  const result = await syncService.syncConnection(
    connectionId,
    'meta',
    accountId,
    'full'
  );

  if (!result.success) {
    // Tratar erro específico
    if (result.error?.includes('Token')) {
      // Solicitar nova autenticação
      console.log('Token inválido, faça login novamente');
    } else if (result.error?.includes('Rate limit')) {
      // Aguardar e tentar novamente
      console.log('Aguardando limite de requisições');
    } else {
      // Erro genérico
      console.error('Erro na sincronização:', result.error);
    }
  }
} catch (error) {
  console.error('Erro inesperado:', error);
}
```

---

## Boas Práticas

### Segurança

✅ **NUNCA** exponha App Secrets ou Developer Tokens no frontend
✅ Use variáveis de ambiente para credenciais
✅ Implemente OAuth backend para troca de tokens
✅ Criptografe dados sensíveis no banco
✅ Valide e sanitize inputs do usuário

### Performance

✅ Use sincronização incremental quando possível
✅ Implemente cache local para dados frequentemente acessados
✅ Sincronize apenas o necessário (últimos 30 dias por padrão)
✅ Use batch operations quando disponível
✅ Monitore uso de API quota

### Manutenção

✅ Monitore logs de erro regularmente
✅ Configure alertas para falhas de sincronização
✅ Mantenha tokens atualizados automaticamente
✅ Faça backup regular do banco de dados
✅ Teste mudanças em ambiente de desenvolvimento

### Escalabilidade

✅ Use jobs assíncronos para sincronizações longas
✅ Implemente fila de sincronização
✅ Distribua carga entre múltiplos workers
✅ Use connection pooling no banco
✅ Monitore uso de recursos

---

## Troubleshooting

### Problema: Token expirado

**Solução**: O sistema renova automaticamente. Se falhar:
1. Verifique se refresh token está salvo
2. Verifique credenciais OAuth
3. Solicite nova autenticação do usuário

### Problema: Rate limit atingido

**Solução**: O sistema aguarda automaticamente. Para evitar:
1. Use sincronização incremental
2. Reduza frequência de sincronização
3. Otimize queries de API

### Problema: Dados não aparecem no dashboard

**Solução**:
1. Verifique logs de sincronização em `sync_jobs`
2. Confirme que status da conexão é 'connected'
3. Verifique se há erros na tabela
4. Valide queries RLS no Supabase

### Problema: Erro de permissão na API

**Solução**:
1. Verifique scopes OAuth configurados
2. Confirme que conta tem permissões necessárias
3. Para Meta: verifique se app está em modo de produção
4. Para Google: verifique se API está habilitada

---

## Suporte

Para dúvidas ou problemas:

1. **Documentação Oficial**:
   - Meta Ads API: https://developers.facebook.com/docs/marketing-apis
   - Google Ads API: https://developers.google.com/google-ads/api/docs/start

2. **Logs do Sistema**:
   - Verifique console do navegador
   - Consulte tabela `sync_jobs` no Supabase
   - Revise logs de erro

3. **Status das APIs**:
   - Meta: https://developers.facebook.com/status/
   - Google: https://status.cloud.google.com/

---

**Última atualização**: 30 de Outubro de 2025
**Versão do documento**: 1.0.0
