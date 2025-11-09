# Nova Arquitetura do Sistema - Dashboard Baseado em Conexões

## Resumo das Mudanças

O sistema foi completamente reestruturado para garantir que **métricas sejam exibidas apenas quando houver fontes de dados conectadas**. A lógica de dados mockados foi removida, e toda a interface agora depende de conexões reais com plataformas de publicidade.

---

## Arquitetura Anterior vs Nova Arquitetura

### ❌ Arquitetura Anterior

- Dashboard exibia dados mockados por padrão
- Filtros permitiam selecionar plataformas/campanhas inexistentes
- Usuário via métricas mesmo sem conexões ativas
- Confusão entre dados reais e de demonstração
- Fluxo não intuitivo

### ✅ Nova Arquitetura

- Dashboard **exige** conexão ativa antes de exibir dados
- Filtros carregam opções **dinamicamente** do banco de dados
- Dados são **sempre reais**, buscados do Supabase
- Fluxo claro: **Conectar → Sincronizar → Visualizar**
- Seleção de conta única por vez

---

## Componentes Criados

### 1. **Hook: `useDataConnections`**
**Localização:** `src/hooks/useDataConnections.ts`

Gerencia o estado global de todas as conexões do usuário:
- Lista todas as conexões ativas
- Mantém referência à conexão atualmente selecionada
- Persiste seleção no localStorage
- Escuta mudanças em tempo real via Supabase realtime
- Fornece funções para trocar conta ativa

**Uso:**
```typescript
const {
  connections,           // Todas as conexões
  activeConnection,      // Conexão selecionada
  hasConnections,        // boolean: tem conexões?
  setActiveConnection    // Função para trocar conta
} = useDataConnections();
```

### 2. **Hook: `useDashboardDataV2`**
**Localização:** `src/hooks/useDashboardDataV2.ts`

Substitui o `useDashboardData` antigo. **Requer** `connectionId` obrigatório:
- Busca apenas dados da conexão específica
- Não possui fallback para dados mockados
- Retorna `isEmpty` para indicar se há dados
- Fornece hooks auxiliares para filtros hierárquicos:
  - `useCampaignsForConnection`
  - `useAdSetsForCampaign`
  - `useAdsForAdSet`

**Uso:**
```typescript
const {
  campaigns,
  metrics,
  loading,
  isEmpty
} = useDashboardDataV2({
  connectionId: activeConnection.id
});
```

### 3. **Componente: `NoConnectionState`**
**Localização:** `src/components/dashboard/NoConnectionState.tsx`

Tela de boas-vindas exibida quando usuário não possui conexões:
- Explica necessidade de conectar fontes de dados
- Mostra benefícios da plataforma
- Call-to-action para conectar primeira fonte
- Redirecionamento para página de Data Sources

### 4. **Componente: `SyncingState`**
**Localização:** `src/components/dashboard/SyncingState.tsx`

Tela exibida durante sincronização inicial:
- Mostra progresso da importação
- Feedback visual com etapas
- Impede que usuário feche página durante sync
- Informa que processo pode levar alguns minutos

### 5. **Componente: `EmptyMetricsState`**
**Localização:** `src/components/dashboard/EmptyMetricsState.tsx`

Tela exibida quando não há métricas disponíveis:
- **Variant "no-campaigns":** Conta não tem campanhas
- **Variant "no-results":** Filtros não retornam resultados
- **Variant "sync-pending":** Sincronização ainda não foi feita
- Sugestões de ação para cada cenário
- Botões contextuais (Sincronizar, Limpar Filtros)

### 6. **Componente: `AccountSwitcher`**
**Localização:** `src/components/dashboard/AccountSwitcher.tsx`

Dropdown para alternar entre contas conectadas:
- Lista todas as conexões do usuário
- Exibe status em tempo real (conectado, sincronizando, erro)
- Mostra data da última sincronização
- Permite sincronização manual de cada conta
- Persiste seleção entre sessões

### 7. **Componente: `FilterBarV2`**
**Localização:** `src/components/dashboard/FilterBarV2.tsx`

Barra de filtros completamente repensada:
- Carrega opções **dinamicamente** do banco de dados
- Hierarquia: Campanha → Ad Set → Anúncio
- Desabilita filtros subsequentes até seleção do anterior
- Mostra contadores de itens disponíveis
- Usa hooks específicos para cada nível (lazy loading)
- Reseta automaticamente ao trocar de conta

### 8. **Componente: `AppV2`**
**Localização:** `src/AppV2.tsx`

Nova versão do App principal:
- Integra todos os novos componentes
- Implementa guards de acesso
- Gerencia fluxo de onboarding
- Sincroniza dados automaticamente
- Remove completamente lógica de mocks

---

## Fluxo de Uso

### 1. **Primeiro Acesso (Sem Conexões)**
```
Login → NoConnectionState → Clicar "Conectar Meta Ads" → DataSources
```

### 2. **Conectando Primeira Fonte**
```
DataSources → SimpleMetaConnect → OAuth Popup → Selecionar Conta → SyncingState
```

### 3. **Após Sincronização**
```
SyncingState → Dashboard com AccountSwitcher visível → Filtros carregados dinamicamente
```

### 4. **Navegação Normal**
```
Dashboard → Trocar Conta (AccountSwitcher) → Filtros resetam → Dados atualizados
```

### 5. **Sem Dados Disponíveis**
```
Dashboard → EmptyMetricsState → Botão "Sincronizar Agora" → SyncingState
```

---

## Configurações Importantes

### Sincronização de Dados

**Período padrão:** Últimos **7 dias** (conforme requisito)

Modificado em:
- `src/lib/services/MetaSyncService.ts` linha 118-120
- `src/AppV2.tsx` filtros iniciais linha 73-74

```typescript
// Antes (30 dias)
const dateStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

// Depois (7 dias)
const dateStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
```

### Persistência de Seleção

A conta ativa é salva no `localStorage`:
- Key: `active_connection_id`
- Restaurada automaticamente ao recarregar página
- Validação: conta ainda existe e está conectada

### Realtime Updates

O hook `useDataConnections` escuta mudanças em tempo real:
```typescript
supabase
  .channel('data_connections_changes')
  .on('postgres_changes', { table: 'data_connections' }, handler)
```

---

## Migração do Código Antigo

### Substituições Necessárias

| Antigo | Novo | Observação |
|--------|------|------------|
| `useDashboardData()` | `useDashboardDataV2({ connectionId })` | Requer connectionId |
| `<FilterBar />` | `<FilterBarV2 connectionId={id} />` | Novo prop obrigatório |
| `<App />` | `<AppV2 />` | Nova arquitetura completa |
| `isUsingRealData` | Removido | Sempre usa dados reais |
| `mockCampaigns` | `campaigns` do hook | Sem mais mocks |

### Removidos

- Importações de `mockData.ts` nos componentes de produção
- Lógica condicional baseada em `isUsingRealData`
- Badges de "Modo Demonstração"
- Fallbacks para dados mockados

---

## Como Testar

### 1. Testar Sem Conexões
1. Fazer logout e login novamente (usuário novo)
2. Deve ver `NoConnectionState`
3. Não deve conseguir acessar dashboard

### 2. Testar Primeira Conexão
1. Clicar em "Conectar Meta Ads"
2. Completar OAuth
3. Selecionar conta de anúncios
4. Ver `SyncingState` durante importação
5. Após conclusão, ver dashboard com dados reais

### 3. Testar Múltiplas Contas
1. Ir em Data Sources
2. Conectar segunda conta Meta
3. Ver `AccountSwitcher` no dashboard
4. Trocar entre contas
5. Verificar que filtros resetam e dados mudam

### 4. Testar Estados Vazios
1. Conectar conta sem campanhas ativas
2. Ver `EmptyMetricsState` variant "no-campaigns"
3. Aplicar filtros que não retornam resultados
4. Ver `EmptyMetricsState` variant "no-results"

### 5. Testar Sincronização Manual
1. No `AccountSwitcher`, clicar ícone de sync
2. Ver feedback visual de sincronização
3. Dados devem atualizar após conclusão

---

## Próximos Passos

### Melhorias Sugeridas

1. **Sincronização Agendada**
   - Implementar job diário automático
   - Notificar usuário quando concluída

2. **Expansão de Período Histórico**
   - Adicionar opção para sincronizar 30/60/90 dias
   - Validar limites de API

3. **Suporte a Google Ads e TikTok**
   - Replicar fluxo do Meta Ads
   - Adicionar conectores específicos

4. **Cache e Performance**
   - Implementar cache em memória
   - Lazy loading de campanhas paginadas

5. **Monitoramento**
   - Dashboard de status de sincronizações
   - Alertas para tokens expirando

---

## Troubleshooting

### Dashboard não carrega dados

**Verificar:**
1. Conexão está com status "connected"?
2. `activeConnection` não é null?
3. Última sincronização foi bem-sucedida?
4. Tabela `campaigns` tem dados do user_id?

**Solução:**
- Forçar nova sincronização via AccountSwitcher
- Verificar logs no console do navegador
- Checar tabela `sync_jobs` no Supabase

### Filtros não aparecem

**Verificar:**
1. `connectionId` está sendo passado para FilterBarV2?
2. Campanhas existem no banco para esta conexão?
3. Hook `useCampaignsForConnection` retorna dados?

**Solução:**
- Verificar query do hook no console
- Conferir RLS policies no Supabase
- Tentar sincronizar novamente

### Conta não sincroniza

**Verificar:**
1. Token OAuth ainda é válido?
2. Credenciais da API estão corretas?
3. Conta Meta Ads tem permissões adequadas?

**Solução:**
- Desconectar e reconectar conta
- Verificar logs em `sync_jobs`
- Testar credenciais manualmente

---

## Estrutura de Arquivos

```
src/
├── hooks/
│   ├── useDataConnections.ts          ← Novo: Gerencia conexões
│   └── useDashboardDataV2.ts          ← Novo: Dados por conexão
├── components/
│   └── dashboard/
│       ├── NoConnectionState.tsx      ← Novo: Tela inicial
│       ├── SyncingState.tsx           ← Novo: Durante sync
│       ├── EmptyMetricsState.tsx      ← Novo: Sem dados
│       ├── AccountSwitcher.tsx        ← Novo: Trocar conta
│       └── FilterBarV2.tsx            ← Novo: Filtros dinâmicos
├── AppV2.tsx                          ← Novo: App principal
└── main.tsx                           ← Modificado: Usa AppV2
```

---

## Conclusão

A nova arquitetura transforma completamente o sistema em uma aplicação que trabalha **exclusivamente com dados reais**. O usuário tem um fluxo claro e intuitivo, e não há mais confusão sobre origem dos dados. Todas as métricas são sempre confiáveis, vindas diretamente das plataformas de publicidade conectadas.

**Status:** ✅ Implementação concluída e testada
**Build:** ✅ Sucesso sem erros
**Próximo passo:** Deploy e testes com usuários reais
