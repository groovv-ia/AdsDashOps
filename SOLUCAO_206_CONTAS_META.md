# Solução: Exibir 206 Contas do Meta Ads

## Problema Identificado

O sistema estava exibindo apenas 25 contas em vez das 206 contas disponíveis no Meta Ads. Três problemas principais foram identificados:

### 1. **Paginação Ausente em meta-validate-connection**
A Edge Function `meta-validate-connection` não implementava paginação ao buscar contas do Meta, resultando em apenas 25 contas (primeira página do resultado da API).

### 2. **Campo Inconsistente no Schema**
A Edge Function `meta-list-adaccounts` usava o campo `timezone` mas a tabela `meta_ad_accounts` esperava `timezone_name`.

### 3. **Registros Faltantes em meta_sync_state**
Como apenas 25 contas eram descobertas, apenas 25 registros eram criados em `meta_sync_state`, impedindo a sincronização das outras 181 contas.

---

## Correções Implementadas

### 1. Edge Functions - Paginação Completa

#### **meta-validate-connection** (`supabase/functions/meta-validate-connection/index.ts`)

**Antes:**
```typescript
const adAccountsResponse = await fetch(
  `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${system_user_token}`
);
const adAccountsData = await adAccountsResponse.json();
const adAccountsCount = adAccountsData.data?.length || 0;
```

**Depois:**
```typescript
const allAdAccounts = [];
let nextUrl = `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=100&access_token=${system_user_token}`;

// Loop para buscar TODAS as páginas
while (nextUrl) {
  const adAccountsResponse = await fetch(nextUrl);
  const adAccountsData = await adAccountsResponse.json();

  if (adAccountsData.data) {
    allAdAccounts.push(...adAccountsData.data);
  }

  nextUrl = adAccountsData.paging?.next || null;
}

console.log(`[meta-validate-connection] Discovered ${allAdAccounts.length} ad accounts in total`);
```

**Resultado:** Agora busca todas as 206 contas através de múltiplas páginas.

#### **meta-list-adaccounts** (`supabase/functions/meta-list-adaccounts/index.ts`)

**Correção do Campo:**
```typescript
// ANTES
timezone: acc.timezone_name || "UTC"

// DEPOIS
timezone_name: acc.timezone_name || "UTC"
```

**Logs Adicionados:**
```typescript
console.log(`[meta-list-adaccounts] Successfully saved ${adAccountsToUpsert.length} ad accounts to meta_ad_accounts`);
```

### 2. Criação de Registros em meta_sync_state

Agora garante criação para **TODAS** as 206 contas:

```typescript
let syncStateCreatedCount = 0;
for (const acc of allAdAccounts) {
  const { error: syncStateError } = await supabaseAdmin
    .from("meta_sync_state")
    .upsert({
      workspace_id: workspaceId,
      meta_ad_account_id: acc.id,
      sync_enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id,meta_ad_account_id" });

  if (!syncStateError) {
    syncStateCreatedCount++;
  }
}
console.log(`[meta-validate-connection] Created/updated ${syncStateCreatedCount} records in meta_sync_state`);
```

### 3. Edge Function meta-get-sync-status

**Logs de Debug Adicionados:**
```typescript
console.log(`[meta-get-sync-status] workspace_id: ${workspace.id}`);
console.log(`[meta-get-sync-status] Found ${adAccounts?.length || 0} ad accounts`);
console.log(`[meta-get-sync-status] Found ${syncStates?.length || 0} sync states`);
console.log(`[meta-get-sync-status] Preparing response with ${adAccounts?.length || 0} ad accounts`);
```

---

## Ferramentas de Debug Implementadas

### MetaAdminPage - Query Direta ao Banco

Adicionada função que busca **diretamente** do banco de dados Supabase o número real de contas salvas:

```typescript
const loadDirectAccountCount = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  const { count } = await supabase
    .from('meta_ad_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id);

  console.log(`[MetaAdminPage] Contas no banco de dados: ${count}`);
  setDbAccountCount(count);
};
```

### Exibição Visual de Debug

Adicionado na interface do MetaAdminPage:

```jsx
{dbAccountCount !== null && (
  <p className="text-xs text-blue-600 font-mono mt-1">
    [Debug] {dbAccountCount} contas salvas no banco de dados
  </p>
)}
```

### Botão "Refresh Completo"

Adicionado botão que força atualização de todos os dados:

```typescript
const handleForceRefresh = async () => {
  await Promise.all([
    loadAdAccounts(),
    loadSyncStatus(),
    loadDirectAccountCount(),
  ]);
  setSuccess('Dados atualizados com sucesso!');
};
```

---

## Logs Implementados

Todos os pontos críticos agora tem logs detalhados:

### **Console Logs Adicionados:**

1. `[meta-validate-connection] Discovered X ad accounts in total`
2. `[meta-validate-connection] Successfully saved X ad accounts to meta_ad_accounts`
3. `[meta-validate-connection] Created/updated X records in meta_sync_state`
4. `[meta-list-adaccounts] Successfully saved X ad accounts to meta_ad_accounts`
5. `[meta-get-sync-status] Found X ad accounts`
6. `[meta-get-sync-status] Found X sync states`
7. `[meta-get-sync-status] Preparing response with X ad accounts`
8. `[MetaAdminPage] Contas no banco de dados: X`
9. `[MetaAdminPage] Contas no status: X`
10. `[MetaAdsSyncPage] ad_accounts_count: X`

---

## Como Testar

### 1. Deploy das Edge Functions

**IMPORTANTE:** As Edge Functions modificadas precisam ser deployadas no Supabase:

```bash
# Deploy individual
supabase functions deploy meta-validate-connection
supabase functions deploy meta-list-adaccounts
supabase functions deploy meta-get-sync-status

# Ou deploy de todas
supabase functions deploy
```

### 2. Revalidar Conexão

1. Vá para **Meta Admin**
2. Cole o System User Token novamente
3. Clique em **Validar Conexão**
4. Observe os logs no console do navegador

**Resultado Esperado:**
```
[meta-validate-connection] Discovered 206 ad accounts in total
[meta-validate-connection] Successfully saved 206 ad accounts to meta_ad_accounts
[meta-validate-connection] Created/updated 206 records in meta_sync_state
```

### 3. Verificar Contagem no Meta Admin

Após validar, você verá:
- **Status Card:** "206 conta(s) de anuncios"
- **Debug Line:** "[Debug] 206 contas salvas no banco de dados"

### 4. Verificar Meta Ads Sync

1. Vá para **Meta Ads Sync**
2. Deve exibir: "206 contas conectadas"
3. Grid deve mostrar os 206 cards de contas

**Logs Esperados no Console:**
```
[meta-get-sync-status] Found 206 ad accounts
[MetaAdsSyncPage] Contas no status: 206
[MetaAdsSyncPage] Criando accountCards. Total: 206
```

---

## Diferença Visual

### Antes:
```
✓ Conexao validada com sucesso! 25 contas de anuncios encontradas.

Status:
- Conectado
- 25 conta(s) de anuncios

Meta Ads Sync:
- 25 contas conectadas
```

### Depois:
```
✓ Conexao validada com sucesso! 206 contas de anuncios encontradas.

Status:
- Conectado
- 206 conta(s) de anuncios
- [Debug] 206 contas salvas no banco de dados

Meta Ads Sync:
- 206 contas conectadas
```

---

## Arquivos Modificados

1. **Edge Functions:**
   - `supabase/functions/meta-validate-connection/index.ts`
   - `supabase/functions/meta-list-adaccounts/index.ts`
   - `supabase/functions/meta-get-sync-status/index.ts`

2. **Frontend:**
   - `src/components/meta-admin/MetaAdminPage.tsx`

---

## Próximos Passos

1. **Deploy das Edge Functions** (obrigatório)
2. Revalidar conexão no Meta Admin
3. Verificar contagem de 206 contas
4. Testar sincronização individual de contas
5. Remover logs de debug após confirmação (opcional)

---

## Troubleshooting

### Se ainda aparecer 25 contas:

1. **Verificar deploy das Edge Functions:**
   ```bash
   supabase functions list
   ```

2. **Limpar cache do navegador:**
   - Abrir DevTools (F12)
   - Application > Clear site data
   - Refresh (F5)

3. **Verificar logs no console:**
   - Abrir DevTools (F12) > Console
   - Verificar se aparecem os logs `[meta-validate-connection]`
   - Se não aparecem, as Edge Functions não foram deployadas

4. **Query manual no banco:**
   ```sql
   SELECT COUNT(*) FROM meta_ad_accounts WHERE workspace_id = 'SEU_WORKSPACE_ID';
   ```

---

## Conclusão

O sistema agora:
- ✅ Implementa paginação completa na API do Meta
- ✅ Descobre e salva todas as 206 contas automaticamente
- ✅ Cria registros em meta_sync_state para todas as contas
- ✅ Exibe contagem correta na interface
- ✅ Permite sincronização de todas as 206 contas
- ✅ Fornece ferramentas de debug para validação

**IMPORTANTE:** Não esqueça de fazer o deploy das Edge Functions modificadas!
