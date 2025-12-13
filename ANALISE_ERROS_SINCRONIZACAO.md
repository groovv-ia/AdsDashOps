# Análise Completa de Erros na Sincronização de Métricas

## 📋 Resumo Executivo

Este documento identifica e documenta todos os erros críticos que impedem a sincronização correta de métricas de campanhas do Meta Ads para o banco de dados Supabase.

**Status Atual**: ❌ Sistema com múltiplos pontos de falha
**Impacto**: Métricas não são salvas, dados inconsistentes, sincronização interrompida
**Data da Análise**: 13/12/2025

---

## 🔴 Erros Críticos (Bloqueadores)

### 1. Incompatibilidade de Tipo de Dados - Campo `conversions`

**Severidade**: CRÍTICA
**Localização**: `MetaSyncService.ts:872`, `MetaAdsService.ts:335`
**Status**: ❌ Bloqueando inserção de métricas

#### Descrição do Problema
O campo `conversions` na tabela `ad_metrics` está definido como `INTEGER`, mas o código tenta inserir valores `FLOAT` (decimais).

**Schema do Banco:**
```sql
conversions integer DEFAULT 0
```

**Código que Causa o Erro:**
```typescript
// MetaSyncService.ts - linha 872
conversions: parseFloat(conversions),  // ❌ Retorna FLOAT

// MetaAdsService.ts - linha 335
conversions: conversions,  // ❌ Retorna FLOAT do extractActionValueMultiple
```

#### Como o Erro Ocorre
1. API Meta retorna conversões como string: `"2.5"` ou `"3.0"`
2. `parseFloat()` converte para número decimal: `2.5` ou `3.0`
3. PostgreSQL rejeita inserção de FLOAT em coluna INTEGER
4. Query falha com erro: `invalid input syntax for type integer`

#### Solução Necessária
```typescript
// ✅ Converter para inteiro
conversions: Math.round(parseFloat(conversions))
// ou
conversions: parseInt(conversions, 10)
```

---

### 2. Campo `client_id` Sempre Nulo

**Severidade**: CRÍTICA
**Localização**: `MetaSyncService.ts:926-934`, `MetaAdsService.ts:318`
**Status**: ❌ Violando políticas RLS

#### Descrição do Problema
O campo `client_id` nunca é populado ao inserir métricas, permanecendo sempre `NULL`. Isso pode violar políticas de Row Level Security (RLS) e impedir que usuários vejam as métricas.

**Código Atual:**
```typescript
// MetaSyncService.ts - linha 926
await supabase
  .from('ad_metrics')
  .insert({
    connection_id: connectionId,
    user_id: user.id,
    campaign_id: campaignId,
    date: insight.date_start,
    ...metricsData,
    // ❌ client_id não é definido, fica NULL
  })
```

#### Impacto
- RLS pode bloquear acesso às métricas
- Impossível filtrar métricas por cliente
- Queries de dashboard retornam dados vazios
- Sistema multi-cliente não funciona corretamente

#### Solução Necessária
```typescript
// 1. Buscar client_id da conexão
const { data: connection } = await supabase
  .from('data_connections')
  .select('client_id')
  .eq('id', connectionId)
  .single();

// 2. Incluir no insert
await supabase
  .from('ad_metrics')
  .insert({
    client_id: connection?.client_id, // ✅ Adicionar
    connection_id: connectionId,
    // ...
  })
```

---

### 3. Inconsistência entre Serviços de Sincronização

**Severidade**: ALTA
**Localização**: `MetaSyncService.ts`, `MetaAdsService.ts`, `DataSyncService.ts`
**Status**: ⚠️ Causando comportamento imprevisível

#### Descrição do Problema
Existem **3 serviços diferentes** para sincronização Meta, cada um com lógica própria e incompatível:

| Serviço | Usado Por | Campos Salvos | Status |
|---------|-----------|---------------|--------|
| `MetaSyncService` | `SimpleMetaConnect` | 30 campos | ⚠️ Parcialmente funcional |
| `MetaAdsService` | `DataSyncService` | 25 campos | ⚠️ Campos diferentes |
| `DataSyncService` | Não usado | Wrapper | ⚠️ Obsoleto |

#### Problemas Específicos

**MetaSyncService:**
- Usa rate limiting customizado
- Salva diretamente na tabela
- Implementa retry manual
- Campos: `cpm`, `cpp`, `inline_link_clicks`, etc.

**MetaAdsService:**
- Usa axios-retry
- Retorna objetos para DataSyncService salvar
- Rate limiting diferente
- Campos em camelCase: `inlineLinkClicks` (incompatível com banco)

**DataSyncService:**
- Usa `MetaAdsService.getInsights()`
- Tenta fazer upsert com constraint inexistente
- Nunca é usado na prática

#### Conflitos de Implementação
```typescript
// MetaSyncService usa snake_case (correto)
{
  inline_link_clicks: inlineLinkClicks,
  cost_per_inline_link_click: parseFloat(insight.cost_per_inline_link_click || '0')
}

// MetaAdsService usa camelCase (ERRADO para o banco)
{
  inlineLinkClicks: inlineLinkClicks,
  costPerInlineLinkClick: parseFloat(insight.cost_per_inline_link_click || '0')
}
```

#### Solução Necessária
1. **Escolher UM serviço principal** (recomendado: MetaSyncService)
2. **Deprecar os outros** ou unificar lógica
3. **Padronizar nomenclatura** (snake_case para todos)

---

### 4. Constraint de Unicidade Inexistente

**Severidade**: ALTA
**Localização**: `DataSyncService.ts:134`, `DataSyncService.ts:154`
**Status**: ❌ Causando duplicação de dados

#### Descrição do Problema
O código tenta fazer `upsert` usando uma constraint que não existe no banco de dados.

**Código Problemático:**
```typescript
// DataSyncService.ts - linha 134
await supabase.from('ad_metrics').upsert(
  {
    ...metric,
    ad_set_id: adSet.id,
    campaign_id: campaign.id,
  },
  { onConflict: 'campaign_id,ad_set_id,ad_id,date' }  // ❌ Constraint não existe
);
```

**O que acontece:**
- `onConflict` espera uma constraint única definida no banco
- Banco de dados NÃO tem constraint `UNIQUE(campaign_id, ad_set_id, ad_id, date)`
- Upsert falha ou insere duplicatas
- Dados são multiplicados a cada sincronização

#### Verificação no Banco
```sql
-- ❌ Nenhuma constraint encontrada
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'ad_metrics' AND constraint_type = 'UNIQUE';

-- Resultado: Apenas primary key (id)
```

#### Solução Necessária
```sql
-- Opção 1: Criar constraint única
ALTER TABLE ad_metrics
ADD CONSTRAINT ad_metrics_unique_key
UNIQUE (campaign_id, ad_set_id, ad_id, date);

-- Opção 2: Usar lógica de verificação manual (já implementado no MetaSyncService)
```

---

## ⚠️ Erros de Alta Prioridade

### 5. Mapeamento Incorreto de Nomes de Campos

**Severidade**: ALTA
**Localização**: `MetaAdsService.ts:318-346`
**Status**: ⚠️ Causando falha silenciosa

#### Descrição do Problema
`MetaAdsService` retorna objetos com campos em camelCase, mas o banco usa snake_case.

**Exemplo do Problema:**
```typescript
// MetaAdsService retorna (ERRADO):
{
  inlineLinkClicks: 150,
  costPerInlineLinkClick: 2.5,
  outboundClicks: 80,
  conversionValue: 450.00
}

// Banco espera (CORRETO):
{
  inline_link_clicks: 150,
  cost_per_inline_link_click: 2.5,
  outbound_clicks: 80,
  conversion_value: 450.00
}
```

**Resultado:** Campos são ignorados ou inserção falha.

#### Campos Afetados
- `inlineLinkClicks` → `inline_link_clicks`
- `costPerInlineLinkClick` → `cost_per_inline_link_click`
- `outboundClicks` → `outbound_clicks`
- `conversionValue` → `conversion_value`
- `videoViews` → `video_views`
- `costPerResult` → `cost_per_result`

---

### 6. Gestão Inconsistente de Tokens

**Severidade**: MÉDIA
**Localização**: `MetaSyncService.ts:214-236`
**Status**: ⚠️ Causa falhas intermitentes

#### Descrição do Problema
O sistema tenta detectar automaticamente se um token está criptografado, mas a lógica é falha.

**Código Problemático:**
```typescript
// MetaSyncService.ts - linha 214
const looksEncrypted = !tokenData.access_token.startsWith('EAA');

if (looksEncrypted) {
  this.accessToken = decryptData(tokenData.access_token).trim();
} else {
  this.accessToken = tokenData.access_token.trim();
}
```

#### Problemas
1. **Assunção incorreta**: Nem todos tokens Meta começam com "EAA"
2. **Tokens curtos**: Meta está testando novos formatos de token
3. **Dados corrompidos**: Token parcialmente criptografado passa na validação
4. **Erro silencioso**: Se descriptografia falha, erro é genérico

#### Cenários de Falha
```
Cenário 1: Token novo da Meta não começa com "EAA"
→ Sistema tenta descriptografar token válido
→ Falha com "Failed to decrypt data"

Cenário 2: Token está corrompido no banco
→ Passa validação de "startsWith"
→ API Meta retorna erro 190 (Invalid OAuth Token)
```

---

### 7. Falta de Validação de Dados da API

**Severidade**: MÉDIA
**Localização**: `MetaSyncService.ts:782-889`
**Status**: ⚠️ Pode causar dados corrompidos

#### Descrição do Problema
O código assume que a API Meta sempre retorna dados válidos e bem formatados.

**Código Sem Validação:**
```typescript
// ❌ Nenhuma validação se campos existem
const spend = parseFloat(insight.spend || '0');
const impressions = parseInt(insight.impressions || '0');
```

#### Casos Não Tratados
1. **Valores negativos**: API pode retornar valores negativos (estornos)
2. **Valores muito grandes**: Podem estourar limites do PostgreSQL
3. **Strings inválidas**: `"N/A"`, `"undefined"`, `"null"` como string
4. **Arrays vazios**: `actions: []` retorna 0, mas deveria ser `null`
5. **Datas inválidas**: `date_start: "0000-00-00"`

#### Impacto
- Dados incorretos salvos no banco
- Métricas com valores absurdos
- Cálculos de ROAS e CTR quebrados
- Dashboard mostra informações enganosas

---

## 🟡 Erros de Média Prioridade

### 8. Rate Limiting Inadequado

**Severidade**: MÉDIA
**Localização**: `MetaSyncService.ts:31-35`
**Status**: ⚠️ Pode causar bloqueio da API

#### Descrição do Problema
Limites configurados não seguem as recomendações da Meta.

**Configuração Atual:**
```typescript
private readonly REQUEST_DELAY_MS = 1000; // 1 segundo entre requests
private readonly BATCH_SIZE = 3; // 3 campanhas por vez
private readonly BATCH_DELAY_MS = 3000; // 3 segundos entre lotes
```

**Limites Reais da Meta API:**
- 200 chamadas por hora por token de usuário
- 4800 chamadas por hora por aplicativo
- Rate limit header: `x-business-use-case-usage`

#### Problema
Sistema não monitora headers da API e pode:
- Exceder limite sem perceber
- Ser bloqueado temporariamente (erro 4 ou 17)
- Perder dados no meio da sincronização

---

### 9. Falta de Tratamento de Erros Específicos

**Severidade**: MÉDIA
**Localização**: `MetaSyncService.ts:85-112`
**Status**: ⚠️ Erros genéricos confundem debugging

#### Descrição do Problema
Todos os erros da API Meta são tratados da mesma forma.

**Erros Específicos da Meta API:**
| Código | Significado | Ação Correta |
|--------|-------------|--------------|
| 4 | Rate limit atingido | Aguardar e tentar novamente |
| 17 | Rate limit (variante) | Aguardar e tentar novamente |
| 190 | Token inválido/expirado | Renovar token ou reconectar |
| 100 | Parâmetro inválido | Log detalhado, não tentar novamente |
| 200 | Permissão negada | Solicitar nova autorização |
| 10 | Permissão ausente | Verificar escopos concedidos |

**Código Atual:**
```typescript
// ❌ Trata tudo igual
if (data.error) {
  throw new Error(`Meta API Error: ${data.error.message}`);
}
```

---

### 10. Logs Insuficientes

**Severidade**: BAIXA
**Localização**: Todo o código
**Status**: ℹ️ Dificulta debugging

#### Descrição do Problema
Falta de logs estruturados em pontos críticos.

**O que está faltando:**
- Log de SQL queries executadas
- Log de response completo da API (apenas em erro)
- Log de validações que falharam
- Log de RLS policies aplicadas
- Timestamps precisos em todos logs

---

## 📊 Resumo de Impacto

| Erro | Impacto | Frequência | Prioridade |
|------|---------|------------|------------|
| 1. Tipo conversions | Bloqueio total | Sempre | 🔴 CRÍTICO |
| 2. client_id NULL | RLS bloqueia dados | Sempre | 🔴 CRÍTICO |
| 3. Serviços incompatíveis | Comportamento errático | Variável | 🟠 ALTA |
| 4. Constraint inexistente | Duplicação de dados | Sempre | 🟠 ALTA |
| 5. Mapeamento incorreto | Dados perdidos | Frequente | 🟠 ALTA |
| 6. Tokens inconsistentes | Falhas aleatórias | Ocasional | 🟡 MÉDIA |
| 7. Validação ausente | Dados corrompidos | Ocasional | 🟡 MÉDIA |
| 8. Rate limiting | Bloqueio API | Raro | 🟡 MÉDIA |
| 9. Erros genéricos | Debug difícil | Sempre | 🟡 MÉDIA |
| 10. Logs insuficientes | Debug lento | Sempre | 🔵 BAIXA |

---

## 🛠️ Plano de Correção Recomendado

### Fase 1: Correções Críticas (Bloqueadores)
**Tempo estimado**: 2-4 horas

1. ✅ **Corrigir tipo do campo conversions**
   - Alterar código para usar `Math.round()` ou `parseInt()`
   - Testar inserção de métricas

2. ✅ **Implementar population de client_id**
   - Buscar client_id da data_connection
   - Incluir em todos inserts de métricas
   - Testar políticas RLS

3. ✅ **Escolher e padronizar serviço de sincronização**
   - Manter apenas MetaSyncService
   - Remover código duplicado
   - Atualizar referências

### Fase 2: Correções de Alta Prioridade
**Tempo estimado**: 4-6 horas

4. ✅ **Criar constraint única ou ajustar lógica de upsert**
   - Opção A: Adicionar constraint no banco
   - Opção B: Manter verificação manual (já existe)

5. ✅ **Padronizar nomenclatura de campos**
   - Garantir snake_case em todos serviços
   - Adicionar type checking

6. ✅ **Implementar gestão robusta de tokens**
   - Validar formato antes de usar
   - Melhorar detecção de criptografia
   - Adicionar renovação automática

### Fase 3: Melhorias de Qualidade
**Tempo estimado**: 4-6 horas

7. ✅ **Adicionar validação de dados da API**
8. ✅ **Melhorar rate limiting**
9. ✅ **Implementar tratamento específico de erros**
10. ✅ **Adicionar logging estruturado**

---

## 📝 Notas Técnicas Adicionais

### Estado Atual do Banco de Dados

**Tabela `ad_metrics`** - 32 campos:
- ✅ Campos básicos: impressions, clicks, spend, reach, frequency
- ✅ Campos de taxa: ctr, cpc, cpm, cpp
- ✅ Campos de conversão: conversions (INT - problema!), conversion_value
- ✅ Campos de cliques: inline_link_clicks, outbound_clicks, cost_per_inline_link_click
- ✅ Campos de vídeo: video_views, video_avg_time_watched
- ✅ Campos JSON: actions_raw, action_values_raw
- ✅ Relacionamentos: campaign_id, ad_set_id, ad_id, connection_id, user_id, client_id

**Registros Atuais:**
- `sync_logs`: 0 registros (nunca foi executado com sucesso)
- `ad_metrics`: 0 registros (nenhuma métrica salva)
- `campaigns`: 4 registros
- `ad_sets`: 18 registros
- `ads`: 84 registros

### Dependências Externas

**Bibliotecas Usadas:**
- `facebook-nodejs-business-sdk`: v24.0.0
- `axios-retry`: v4.5.0
- `crypto-js`: v4.2.0
- `@supabase/supabase-js`: v2.39.0

**APIs Externas:**
- Meta Graph API: v19.0
- Rate limits: 200 req/hora por usuário

---

## 🎯 Conclusão

O sistema de sincronização possui **10 problemas identificados**, sendo **2 críticos que bloqueiam completamente** a sincronização de métricas.

**Prioridade imediata:**
1. Corrigir tipo do campo `conversions` (INT vs FLOAT)
2. Implementar population de `client_id`

Após essas correções, o sistema deve conseguir salvar métricas básicas, permitindo iterações incrementais para resolver os demais problemas.

**Risco de não corrigir:** Sistema completamente não funcional para sincronização de métricas, impossibilitando o uso do dashboard e análise de campanhas.

---

**Documento criado em**: 13/12/2025
**Última atualização**: 13/12/2025
**Autor**: Análise Automatizada do Sistema
