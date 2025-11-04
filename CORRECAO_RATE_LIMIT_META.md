# Correção: Rate Limit da Meta Ads API

## 🐛 Problema Identificado

O erro `"User request limit reached"` ocorreu durante a sincronização de dados da Meta Ads API. Este é um erro comum quando muitas requisições são feitas em um curto período de tempo.

## ✅ Soluções Implementadas

### 1. **Sistema de Retry com Backoff Exponencial**

Implementado no `MetaSyncService.ts`:

```typescript
private readonly MAX_RETRIES = 3;
private readonly INITIAL_BACKOFF = 1000; // 1 segundo
private readonly MAX_BACKOFF = 30000; // 30 segundos

private async fetchWithRetry(url: string, retryCount = 0): Promise<any>
```

**Como funciona:**
- Detecta erros de rate limit (códigos 17 e 4 da Meta API)
- Aguarda um tempo crescente entre tentativas: 1s → 2s → 4s
- Máximo de 3 tentativas antes de falhar definitivamente
- Também funciona para erros de rede temporários

### 2. **Delays Entre Requisições**

```typescript
private async rateLimit(ms: number = 500): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}
```

**Aplicado em:**
- 500ms de delay entre requisições normais (ad sets, ads)
- 800ms de delay para requisições de insights (mais pesadas)

### 3. **Tratamento de Erros Amigável**

No componente `SimpleMetaConnect.tsx`:

```typescript
// Detecta tipo de erro e mostra mensagem apropriada
if (error.message.includes('User request limit reached') ||
    error.message.includes('rate limit') ||
    error.message.includes('Code: 17') ||
    error.message.includes('Code: 4')) {
  errorMessage = 'Limite de requisições atingido...';
}
```

**Mensagens de erro específicas para:**
- ✅ Rate limit (aviso amarelo)
- ❌ Token inválido
- ❌ Permissões insuficientes
- ❌ Outros erros

### 4. **UI Melhorada para Erros de Rate Limit**

- **Cor diferente**: Amarelo para rate limit (alerta) vs vermelho para erros críticos
- **Botão "Tentar Novamente"**: Aguarda 5 segundos e tenta automaticamente
- **Mensagem clara**: Explica que é um limite da Meta e não um erro do usuário

## 📊 Fluxo de Sincronização Otimizado

```
Início da Sincronização
    ↓
Busca Campanhas
    ↓
Para cada campanha:
    - Aguarda 500ms
    - Busca Ad Sets (com retry se falhar)
    ↓
    Para cada ad set:
        - Aguarda 500ms
        - Busca Ads (com retry se falhar)
    ↓
    - Aguarda 800ms
    - Busca Insights/Métricas (com retry se falhar)
    ↓
Fim (status: conectado ou erro)
```

## 🎯 Limites da Meta Ads API

A Meta impõe os seguintes limites:

| Tipo de Limite | Valor | Período |
|----------------|-------|---------|
| Chamadas de API | 200 | 1 hora |
| Páginas de Ads | 1000 | 1 hora |
| Rate Limit por App | 200 | 1 hora por usuário |

**Fonte:** [Meta Marketing API - Rate Limiting](https://developers.facebook.com/docs/marketing-api/overview/authorization#limits)

## 🔧 Recomendações

### Para Desenvolvimento:
1. **Use token de longa duração**: Tokens de 60 dias evitam reconexões frequentes
2. **Teste com poucas campanhas**: Comece sincronizando 1-2 campanhas
3. **Monitore logs**: Verifique console para ver tentativas de retry

### Para Produção:
1. **Implemente fila de sincronização**: Para múltiplos usuários simultâneos
2. **Cache de dados**: Reduza requisições desnecessárias
3. **Sincronização incremental**: Busque apenas dados novos/alterados
4. **Webhooks**: Use webhooks da Meta para atualizações em tempo real

## 🧪 Como Testar

1. **Conecte sua conta Meta**
2. **Clique em "Sincronizar Agora"**
3. **Verifique os logs no console** (`F12` → Console)
4. **Aguarde a sincronização** (pode levar alguns minutos)

### Se ocorrer rate limit:
- ✅ Mensagem amarela aparecerá
- ✅ Sistema tentará automaticamente 3 vezes
- ✅ Botão "Tentar novamente em 5s" estará disponível
- ✅ Após 5 minutos, tente novamente manualmente

## 📝 Logs Úteis

Durante a sincronização, você verá logs como:

```
✅ Token validado com sucesso
📊 Buscando campanhas da Meta API
✅ Campanhas encontradas: 5
⚠️  Rate limit atingido - Aguardando 2000ms
🔄 Tentando novamente (tentativa 2 de 3)
✅ Sincronização Meta concluída
```

## 🚀 Melhorias Futuras

1. **Sincronização em background**: Usar Web Workers
2. **Persistência de progresso**: Retomar de onde parou se falhar
3. **Dashboard de status**: Mostrar progresso da sincronização em tempo real
4. **Notificações**: Avisar quando sincronização for concluída
5. **Agendamento inteligente**: Sincronizar em horários de menor tráfego

## 🔗 Links Úteis

- [Meta Marketing API Docs](https://developers.facebook.com/docs/marketing-api)
- [Rate Limiting Best Practices](https://developers.facebook.com/docs/graph-api/overview/rate-limiting)
- [Error Codes Reference](https://developers.facebook.com/docs/graph-api/using-graph-api/error-handling)

---

**Build Status:** ✅ Compilado com sucesso
**Última atualização:** 04/11/2025
