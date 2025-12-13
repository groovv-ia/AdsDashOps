# Sistema de Gestão Meta Ads com System User

## ✅ O que foi implementado

### 1. **Banco de Dados - Novo Schema Completo**

Criadas 6 novas tabelas para o modelo de agência:

#### **workspaces** (Agências)
- Cada usuário tem um workspace criado automaticamente no login
- Nome padrão: "Nome do Usuário's Agency"
- Centraliza todas as operações da agência

#### **meta_connections** (Conexão Meta)
- Armazena a conexão única da agência via System User
- Business Manager ID
- Access Token (criptografado)
- Status: connected | invalid | revoked
- Granted scopes (permissões)

#### **meta_ad_accounts** (Contas de Anúncio)
- Lista de todas as contas Meta acessíveis pelo System User
- ID da conta (act_123456)
- Nome, moeda, timezone, status

#### **client_meta_ad_accounts** (Vínculo Cliente ↔ Conta)
- Relaciona clientes com suas contas de anúncio
- Permite múltiplas contas por cliente
- Status: active | inactive

#### **meta_sync_jobs** (Jobs de Sincronização)
- Registra jobs de sincronização de dados
- Tipos: backfill | daily | fast
- Status, progresso, erros

#### **meta_insights_daily** (Métricas Diárias)
- Armazena métricas consolidadas por dia
- Níveis: account | campaign | adset | ad
- Métricas: spend, impressions, reach, clicks, ctr, cpc, cpm
- Conversões em JSON (actions_json)

**Segurança:**
- RLS habilitado em todas as tabelas
- Usuários só acessam dados do próprio workspace
- Índices para performance

---

### 2. **WorkspaceContext**

Contexto React que gerencia o workspace da agência:

**Localização:** `src/contexts/WorkspaceContext.tsx`

**Funcionalidades:**
- Cria workspace automaticamente no primeiro login
- Disponível em toda aplicação via `useWorkspace()`
- Monitora mudanças de autenticação
- Funções: `refreshWorkspace()`, `updateWorkspace()`

**Como usar:**
```typescript
import { useWorkspace } from '../contexts/WorkspaceContext';

const { workspace, loading } = useWorkspace();
// workspace.id, workspace.name
```

---

### 3. **Página de Conexão Meta**

Interface completa para conectar a agência com Meta Ads via System User.

**Localização:** `src/components/settings/MetaConnectionPage.tsx`

**Como acessar:**
1. Faça login no sistema
2. No menu lateral, clique em **"Conexão Meta"** (ícone de link)

**Funcionalidades:**

#### **Card de Status**
- Mostra se está conectado ou não
- Business Manager ID atual
- Última validação
- Quantidade de ad accounts sincronizadas
- Botão "Validar" para testar conexão existente

#### **Formulário de Configuração**
- **Business Manager ID**: ID do seu Business Manager
- **System User Access Token**: Token do System User com permissões

#### **Botões:**
- **Testar Conexão**: Valida as credenciais antes de salvar
- **Salvar Conexão**: Salva e sincroniza ad accounts automaticamente

#### **Guia Integrado**
- Passo a passo de como obter o System User Token
- Link para documentação oficial da Meta

#### **Card Informativo**
- Explica o modelo de integração
- Uma conexão por agência
- Server-side apenas (tokens seguros)
- Sincronização automática

---

### 4. **Menu Lateral Atualizado**

**Alteração:** Substituído "Fontes de Dados" por "Conexão Meta"

**Novo menu:**
- Dashboard
- Clientes
- Campanhas
- **Conexão Meta** ← NOVO
- Análise com IA
- Ajuda e Suporte
- Configurações

---

## 🔧 Como Testar Agora

### Passo 1: Acesse a aplicação
```bash
npm run dev
```

### Passo 2: Faça login
- O sistema criará automaticamente um workspace para você

### Passo 3: Acesse "Conexão Meta"
- Clique no menu lateral em "Conexão Meta"
- Você verá a página de configuração

### Passo 4: Configure a conexão (ainda não funcional)
**IMPORTANTE:** Os botões "Testar Conexão" e "Salvar" ainda **NÃO funcionarão** porque faltam as Edge Functions do backend.

---

## ⚠️ O que AINDA NÃO funciona

### Edge Functions (Backend) - NÃO IMPLEMENTADAS
Precisam ser criadas:

1. **meta-test-connection**
   - Testa conexão com Meta API
   - Lista ad accounts acessíveis
   - Valida Business Manager ID + Token

2. **meta-sync-ad-accounts**
   - Busca todas as ad accounts do Business Manager
   - Salva na tabela `meta_ad_accounts`

3. **meta-validate-connection**
   - Valida conexão existente
   - Atualiza status (connected/invalid)

4. **meta-sync-insights**
   - Sincroniza métricas diárias
   - Backfill, Daily e Fast sync

### Interface de Vinculação - NÃO IMPLEMENTADA
- Página para vincular ad accounts aos clientes
- Listagem de contas disponíveis
- Seleção múltipla
- Salvar vínculos

### Dashboard Atualizado - NÃO IMPLEMENTADO
- Dashboard ainda usa dados antigos (oauth_tokens)
- Precisa consultar `meta_insights_daily`
- Filtrar por workspace e cliente

---

## 📋 Próximos Passos

### 1. Criar Edge Functions (Crítico)
Sem elas, a página de Conexão Meta não funciona.

### 2. Criar Interface de Vinculação
Para conectar clientes às ad accounts.

### 3. Atualizar Dashboard
Para usar o novo modelo de dados.

### 4. Remover Componentes Antigos
- DataSources
- OAuth de usuário
- ClientMetaConnect

---

## 🎯 Modelo de Negócio Implementado

### Conceitos:
- **Workspace** = Agência (você)
- **Client** = Cliente da agência
- **Meta Connection** = Conexão única via System User
- **Ad Accounts** = Contas Meta gerenciadas pela agência
- **Vínculo** = Client ↔ Ad Accounts

### Fluxo:
1. Agência conecta via System User (uma vez)
2. System User tem acesso a N ad accounts
3. Agência vincula ad accounts específicas a cada cliente
4. Dashboard mostra dados consolidados por cliente

### Segurança:
- Tokens nunca no frontend
- Todas chamadas Meta via backend
- Dados criptografados
- RLS no banco

---

## 📂 Arquivos Criados/Modificados

### Novos Arquivos:
- `supabase/migrations/[timestamp]_create_meta_system_user_schema.sql`
- `src/contexts/WorkspaceContext.tsx`
- `src/components/settings/MetaConnectionPage.tsx`
- `SISTEMA_META_SYSTEM_USER.md` (este arquivo)

### Arquivos Modificados:
- `src/App.tsx` - Adicionado WorkspaceProvider e rota meta-connection
- `src/components/dashboard/Sidebar.tsx` - Substituído "Fontes de Dados" por "Conexão Meta"

---

## 🚀 Status do Projeto

### ✅ Completo (40%)
- Schema do banco de dados
- WorkspaceContext
- Interface de conexão Meta
- Integração no menu

### 🔄 Em Desenvolvimento (60%)
- Edge Functions backend
- Vinculação de ad accounts
- Dashboard atualizado
- Remoção de código legado

---

## 💡 Para Desenvolvedores

### Como adicionar uma Edge Function:

```bash
# Será implementado via ferramenta mcp__supabase__deploy_edge_function
# Exemplo de estrutura:

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Validar token de autenticação
  // Descriptografar access_token do banco
  // Chamar Meta API
  // Retornar resultado
})
```

### Como testar localmente:
```bash
npm run dev
# Acesse http://localhost:5173
# Login → Menu "Conexão Meta"
```

---

**Próximo passo recomendado:** Criar as Edge Functions para tornar a página funcional.
