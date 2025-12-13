# Métricas em Tempo Real Diretamente da API Meta

## Visão Geral

Este documento descreve a implementação do sistema de métricas em tempo real, onde os dados são buscados **diretamente da API Meta** sem passar pelo banco de dados como intermediário.

## Principais Mudanças

### 1. MetaAdsService - Novos Métodos de Tempo Real

**Arquivo:** `src/lib/connectors/meta/MetaAdsService.ts`

#### Funcionalidades Implementadas:

- **Cache em Memória**: Sistema de cache com TTL de 5 minutos para otimizar performance
- **`getInsightsRealtime()`**: Busca métricas diretamente da API com suporte a cache
- **`getMultipleCampaignInsightsRealtime()`**: Busca métricas de múltiplas campanhas em paralelo
- **`clearCache()`**: Limpa cache manualmente quando necessário

#### Características do Cache:

```typescript
// Cache com TTL de 5 minutos
private metricsCache: Map<string, MetricsCacheEntry> = new Map();
private readonly CACHE_TTL_MS = 5 * 60 * 1000;
```

- Reduz chamadas à API Meta
- Respeita rate limits
- Limpeza automática de entradas expiradas
- Possibilidade de desabilitar cache por chamada (`useCache: false`)

### 2. DashboardDataService - Integração com API

**Arquivo:** `src/lib/services/DashboardDataService.ts`

#### Principais Alterações:

- **`fetchMetrics()`**: Agora busca métricas DIRETAMENTE da API Meta
  - Aceita parâmetros de data (dateStart, dateEnd)
  - Suporte a cache configurável
  - Busca paralela para múltiplas conexões
  - Tratamento de erros robusto

- **`fetchAllDashboardData()`**: Atualizado para buscar métricas em tempo real
  - Campanhas continuam vindo do banco (referência)
  - Métricas vem da API Meta em tempo real
  - Logs detalhados de origem dos dados

- **`clearMetricsCache()`**: Nova função para limpar cache

#### Fluxo de Dados:

```
Campanhas (DB) → DashboardDataService → MetaAdsService → API Meta (Tempo Real)
                                              ↓
                                         Cache (5min)
```

### 3. Hook useDashboardData - Gerenciamento de Estado

**Arquivo:** `src/hooks/useDashboardData.ts`

#### Novos Estados e Funções:

```typescript
interface DashboardData {
  // ... estados existentes
  isUsingRealtimeMetrics: boolean;      // Indica se métricas são da API
  lastMetricsUpdate: Date | null;        // Timestamp da última atualização
  refreshMetrics: () => Promise<void>;   // Atualiza só métricas (força)
  clearCache: () => void;                // Limpa cache
}
```

#### Funcionalidades:

- **`loadData()`**: Carrega campanhas do DB + métricas da API
- **`refresh()`**: Atualiza tudo (campanhas + métricas)
- **`refreshMetrics()`**: Atualiza apenas métricas sem cache
- **`clearCache()`**: Limpa cache de métricas

### 4. Componente MetricsUpdateInfo - UI de Controle

**Arquivo:** `src/components/dashboard/MetricsUpdateInfo.tsx`

Novo componente que exibe:

- **Indicador de Fonte**: Mostra se dados são da API Meta ou demonstração
- **Timestamp**: Exibe "há X minutos" desde última atualização
- **Botões de Controle**:
  - "Atualizar": Busca métricas frescas da API
  - "Limpar Cache": Força nova busca sem cache
- **Badge de Cache**: Indica que cache de 5 minutos está ativo

#### Interface Visual:

```
┌─────────────────────────────────────────────────────────────┐
│ 📡 Dados em Tempo Real  │  🕐 Atualizado há 2 minutos       │
│    Métricas direto da API Meta                              │
│                                        [Limpar Cache] [Atualizar] │
│ ✓ Cache ativo (5 minutos)                                   │
└─────────────────────────────────────────────────────────────┘
```

## Benefícios da Implementação

### Performance
- Cache inteligente reduz chamadas à API
- Busca paralela de múltiplas campanhas
- Rate limiting automático integrado

### Confiabilidade
- Métricas sempre atualizadas da fonte oficial (Meta)
- Fallback para dados mockados se API falhar
- Tratamento robusto de erros

### Experiência do Usuário
- Indicadores visuais claros de fonte de dados
- Controle manual de atualização
- Feedback em tempo real de carregamento
- Timestamp de última atualização

### Manutenção
- Separação clara de responsabilidades
- Logs detalhados para debug
- Código modular e reutilizável

## Como Usar

### Buscar Métricas em Tempo Real

```typescript
// Hook automático no componente
const {
  metrics,                    // Métricas da API Meta
  isUsingRealtimeMetrics,    // true se vem da API
  lastMetricsUpdate,          // Timestamp
  refreshMetrics,             // Força atualização
  clearCache                  // Limpa cache
} = useDashboardData();

// Atualizar manualmente
await refreshMetrics();

// Limpar cache
clearCache();
```

### Buscar Métricas por Período

```typescript
const { metrics, lastUpdate } = useDashboardDataForPeriod(
  startDate,
  endDate,
  campaignIds,  // opcional
  true          // useCache
);
```

### Forçar Busca Sem Cache

```typescript
const service = DashboardDataService.getInstance();
const metrics = await service.fetchMetrics(
  campaignIds,
  startDate,
  endDate,
  false  // useCache = false
);
```

## Configurações

### TTL do Cache
Localização: `src/lib/connectors/meta/MetaAdsService.ts`

```typescript
private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
```

Para alterar, modifique o valor em milissegundos.

### Rate Limiting
Localização: `src/lib/connectors/meta/MetaAdsService.ts`

```typescript
this.rateLimiter = new RateLimiter({
  maxRequests: 200,
  windowMs: 60 * 60 * 1000,  // 1 hora
  platform: 'Meta',
});
```

## Estrutura de Dados

### AdMetrics (Interface)

```typescript
interface AdMetrics {
  connectionId: string;
  userId: string;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  date: string;

  // Métricas principais
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  frequency: number;

  // Taxas
  ctr: number;
  cpc: number;
  cpm: number;
  cpp: number;

  // Conversões
  conversions: number;
  conversionValue: number;
  costPerResult: number;
  roas: number;

  // Cliques detalhados
  inlineLinkClicks: number;
  costPerInlineLinkClick: number;
  outboundClicks: number;

  // Vídeo
  videoViews: number;
}
```

## Logs e Debugging

O sistema inclui logs detalhados em todos os pontos críticos:

```typescript
// Exemplo de logs
logger.info('Buscando métricas da API Meta (realtime)', {
  userId,
  campaignCount,
  period: `${startDate} a ${endDate}`,
  useCache
});

logger.info('Métricas recuperadas da API Meta', {
  count: metrics.length,
  source: 'API Meta (realtime)'
});
```

Verifique o console do navegador para acompanhar o fluxo de dados.

## Tratamento de Erros

O sistema possui tratamento de erros em múltiplas camadas:

1. **MetaAdsService**: Captura erros da API Meta
2. **DashboardDataService**: Trata falhas de busca e retorna array vazio
3. **useDashboardData**: Fallback para dados mockados em caso de erro
4. **Interface**: Exibe estado de erro ao usuário

## Compatibilidade

### Métodos Deprecados

O método `getInsights()` original foi marcado como `@deprecated`:

```typescript
/**
 * @deprecated Use getInsightsRealtime() para buscar métricas direto da API
 * Mantido apenas para compatibilidade com código legado
 */
async getInsights(...) {
  return this.getInsightsRealtime(...);
}
```

### Banco de Dados

As tabelas de métricas no banco continuam existindo para:
- Histórico e auditoria
- Sincronização via MetaSyncService (se necessário)
- Backup de dados

Porém, o dashboard **não as utiliza** mais por padrão.

## Próximos Passos Sugeridos

1. **Monitoramento**: Implementar métricas de uso do cache
2. **Otimização**: Ajustar TTL baseado em padrões de uso
3. **Analytics**: Adicionar tracking de atualização de métricas
4. **Testes**: Criar testes unitários para cache e busca paralela
5. **Documentação**: Adicionar exemplos de uso avançado

## Suporte

Para questões sobre esta implementação:
- Revise os logs no console do navegador
- Verifique o timestamp de atualização no dashboard
- Use o botão "Limpar Cache" se dados parecerem desatualizados
- Consulte `INTEGRACAO_APIs.md` para configuração de credenciais
