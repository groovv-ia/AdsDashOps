# Correção da Importação de Métricas de Campanhas

## Problema Identificado

As métricas das campanhas não estavam sendo importadas corretamente durante a sincronização, resultando em campanhas sem dados de performance no dashboard.

## Causas Raiz Identificadas

1. **Período de busca muito curto**: O sistema buscava métricas apenas dos últimos 7 dias, insuficiente para campanhas com histórico mais longo
2. **Falta de logs detalhados**: Dificulta identificar onde exatamente a importação estava falhando
3. **Erros silenciosos**: Falhas em campanhas individuais não eram tratadas adequadamente
4. **Falta de validação**: Não havia confirmação se as métricas foram realmente salvas no banco de dados

## Correções Implementadas

### 1. Aumento do Período de Busca de Métricas

**Arquivo**: `src/lib/services/MetaSyncService.ts`

- **Antes**: Buscava métricas dos últimos 7 dias
- **Depois**: Busca métricas dos últimos 90 dias (3 meses)
- **Impacto**: Garante captura completa do histórico de campanhas ativas

```typescript
// Linha 343-346
const dateEnd = new Date().toISOString().split('T')[0];
const dateStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
```

### 2. Adição de Logs Detalhados

**Locais de logging implementados**:

#### Busca de Métricas da API
- Log antes da requisição com período e campanha
- Log após receber dados com contagem de métricas
- Warning quando nenhuma métrica é retornada

```typescript
// Linhas 348-371
logger.info('Buscando métricas do período', {
  campaignId: campaign.id,
  campaignName: campaign.name,
  dateStart,
  dateEnd,
  totalDays: 90
});
```

#### Salvamento de Métricas
- Log antes de salvar cada métrica com todos os valores
- Log de sucesso após inserção com ID gerado
- Log de erro detalhado com código e hint do banco

```typescript
// Linhas 711-731
logger.info('Preparando para salvar métricas', {
  campaignId,
  date: insight.date_start,
  userId: user.id,
  connectionId,
  metrics: { /* valores detalhados */ }
});
```

### 3. Tratamento Robusto de Erros

**Melhorias implementadas**:

#### Erros em Métricas Individuais
- Try-catch em cada salvamento de métrica
- Contador de sucessos e falhas
- Sincronização continua mesmo com erros parciais

```typescript
// Linhas 373-410
let metricsSaved = 0;
let metricsErrors = 0;

for (let m = 0; m < insights.length; m++) {
  try {
    await this.saveMetrics(connectionId, campaign.id, insight);
    metricsSaved++;
  } catch (metricError: any) {
    metricsErrors++;
    logger.error('Erro ao salvar métrica individual', { /* detalhes */ });
  }
}
```

#### Erros na API Meta
- Try-catch no método fetchInsights
- Retorna array vazio em vez de propagar erro
- Evita interromper sincronização de outras campanhas

```typescript
// Linhas 572-584
catch (error: any) {
  logger.error('Erro ao buscar insights da API Meta', { /* detalhes */ });
  return [];
}
```

### 4. Validação de Dados Salvos

**Verificações implementadas**:

#### Validação de Entrada
- Verifica se date_start existe antes de processar
- Valida resposta da API Meta
- Confirma tipo de dados retornados

```typescript
// Linhas 673-676
if (!insight.date_start) {
  throw new Error('Métrica sem data - campo date_start ausente');
}
```

#### Confirmação de Inserção
- Usa `.select()` para confirmar dados inseridos
- Valida se insertedData contém registros
- Log do ID da métrica criada

```typescript
// Linhas 813-851
const { data: insertedData, error } = await supabase
  .from('ad_metrics')
  .insert({ /* dados */ })
  .select();

if (!insertedData || insertedData.length === 0) {
  throw new Error('Falha ao confirmar inserção da métrica no banco');
}
```

#### Contagem Final de Métricas
- Consulta ao banco após sincronização
- Compara métricas esperadas vs salvas
- Log detalhado do resultado final

```typescript
// Linhas 443-471
const { count: totalMetrics } = await supabase
  .from('ad_metrics')
  .select('*', { count: 'exact', head: true })
  .eq('connection_id', connectionId);

logger.info('Sincronização Meta concluída com sucesso', {
  campanhasProcessadas: processedCampaigns,
  metricasNoBank: totalMetrics
});
```

### 5. Melhorias no DataSyncService

**Arquivo**: `src/lib/services/DataSyncService.ts`

- Atualizado período de busca de 30 para 90 dias
- Adicionado log do intervalo de datas calculado
- Aplicado para Meta Ads e Google Ads

```typescript
// Linhas 311-332
private getDateRange(days: number = 90): { start: string; end: string } {
  // ... cálculo das datas ...

  logger.info('Calculando intervalo de datas para métricas', {
    days,
    start: dateRange.start,
    end: dateRange.end
  });

  return dateRange;
}
```

## Estrutura de Logs Implementada

### Formato Padrão
Todos os logs seguem estrutura consistente com:
- Mensagem descritiva
- Objeto com dados contextuais
- Identificadores (campaignId, connectionId, userId)
- Valores de métricas quando relevante

### Níveis de Log
- **info**: Operações normais e sucessos
- **warn**: Situações anormais mas não críticas
- **error**: Falhas que requerem atenção

## Benefícios das Correções

1. **Histórico Completo**: 90 dias de métricas importadas vs 7 dias anteriormente
2. **Visibilidade Total**: Logs detalhados em cada etapa da sincronização
3. **Resiliência**: Erros em campanhas individuais não impedem sincronização completa
4. **Confiabilidade**: Validação confirma que dados foram salvos corretamente
5. **Debugging Facilitado**: Identificação rápida de problemas através dos logs
6. **Métricas Precisas**: Valores reais da API Meta sem estimativas

## Como Testar

1. Execute uma nova sincronização de conta Meta
2. Observe os logs no console do navegador
3. Verifique se aparecem logs de:
   - Busca de métricas com período de 90 dias
   - Salvamento individual de cada métrica
   - Contagem final de métricas no banco
4. Acesse a página de Campanhas
5. Confirme que as métricas aparecem corretamente

## Logs Esperados

Durante sincronização bem-sucedida, você verá:

```
✅ Buscando métricas do período: {campaignId: "xxx", totalDays: 90}
✅ Métricas encontradas da API Meta: {count: 90, hasData: true}
✅ Preparando para salvar métricas: {date: "2024-01-01", metrics: {...}}
✅ Métrica inserida com sucesso: {metricId: "uuid", spend: 100, impressions: 5000}
✅ Resumo do salvamento de métricas: {total: 90, saved: 90, errors: 0}
✅ Verificando métricas salvas no banco: {totalMetricsInDatabase: 270}
✅ Sincronização Meta concluída com sucesso
```

## Próximos Passos

Para garantir melhor performance em sincronizações futuras:

1. **Sincronização Incremental**: Implementar busca apenas de métricas novas (últimos 7 dias) em sincronizações subsequentes
2. **Cache de Métricas**: Armazenar métricas agregadas para reduzir queries ao banco
3. **Retry Automático**: Tentar novamente métricas que falharam
4. **Notificações**: Alertar usuário quando sincronização tiver erros
5. **Dashboard de Sync**: Página para visualizar histórico e status de sincronizações

## Arquivos Modificados

- `src/lib/services/MetaSyncService.ts` - Principal arquivo com correções
- `src/lib/services/DataSyncService.ts` - Período de busca atualizado
- `CORRECAO_METRICAS_CAMPANHAS.md` - Este documento

## Versão

- **Data**: 11/12/2024
- **Autor**: Sistema de Correção Automatizada
- **Versão**: 1.0.0
