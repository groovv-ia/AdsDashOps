# 🔑 Como Obter Access Token da Meta com Permissões Corretas

## ⚠️ Problema Comum: Missing Permissions (#200)

Se você recebeu o erro **"(#200) Missing Permissions"**, significa que o token não tem as permissões necessárias para acessar dados de anúncios.

---

## ✅ Solução: Gerar Token com Permissões Corretas

### Passo 1: Acesse o Graph API Explorer

Abra o navegador e acesse:
👉 https://developers.facebook.com/tools/explorer/

### Passo 2: Selecione seu App

1. No topo da página, clique no dropdown **"Meta App"**
2. Selecione seu aplicativo (ID: **838266108586944**)
3. Se não aparecer, você precisa criar ou ter acesso ao app

### Passo 3: Adicione as Permissões Necessárias

**MUITO IMPORTANTE**: Você precisa adicionar as seguintes permissões:

1. Clique no botão **"Permissions"** ou **"Add a permission"**
2. Na caixa de busca, digite e adicione uma por vez:

   ✅ **ads_read** - Permite ler dados de anúncios
   ✅ **ads_management** - Permite gerenciar campanhas
   ✅ **read_insights** - Permite ler métricas e insights

### Passo 4: Gere o Access Token

1. Após adicionar todas as 3 permissões acima
2. Clique no botão **"Generate Access Token"**
3. Uma janela popup aparecerá pedindo permissão
4. Clique em **"Continue"** ou **"Continuar"**
5. Selecione as contas publicitárias que deseja conectar
6. Clique em **"Done"** ou **"Concluído"**

### Passo 5: Copie o Token

1. O novo token aparecerá no campo **"Access Token"**
2. Clique no ícone de copiar ao lado do token
3. O token será copiado para sua área de transferência

### Passo 6: Use o Token na Aplicação

1. Volte para o AdsOPS
2. Acesse **"Integração Meta"** no menu
3. Cole o novo token no campo
4. Clique em **"Validar Token"**

---

## 🔍 Como Verificar se o Token Tem as Permissões

### No Graph API Explorer:

1. Cole seu token no campo "Access Token"
2. Clique no ícone **"ℹ️"** ao lado do token
3. Procure a seção **"Scopes"**
4. Confirme que aparecem:
   - `ads_read`
   - `ads_management`
   - `read_insights`

### Na Aplicação AdsOPS:

Após validar o token, a mensagem de erro deve desaparecer e você verá suas contas publicitárias listadas.

---

## 📋 Checklist de Verificação

Antes de tentar novamente, confirme:

- [ ] Acessei o Graph API Explorer correto da Meta
- [ ] Selecionei meu App (ID: 838266108586944)
- [ ] Adicionei a permissão `ads_read`
- [ ] Adicionei a permissão `ads_management`
- [ ] Adicionei a permissão `read_insights`
- [ ] Cliquei em "Generate Access Token"
- [ ] Aceitei as permissões no popup
- [ ] Copiei o token completo (começa com "EAAL...")
- [ ] Colei o token na aplicação sem espaços extras

---

## 🎯 Exemplo Visual

```
┌─────────────────────────────────────────────────────────────┐
│ Meta for Developers - Graph API Explorer                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Meta App: [Seu App ▼]          User or Page: [User ▼]     │
│                                                              │
│  Add a permission...                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✅ ads_read                                    [X]   │   │
│  │ ✅ ads_management                              [X]   │   │
│  │ ✅ read_insights                               [X]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  [Generate Access Token]                                     │
│                                                              │
│  Access Token: EAAL6ZAgmhK8A... [Copy] [i]                 │
│                                                              │
│  GET v19.0/me                                               │
│  [Submit]                                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚨 Erros Comuns e Soluções

### Erro: "App not found"
**Solução**: Você precisa ter acesso ao App da Meta. Peça ao administrador para adicionar você como desenvolvedor.

### Erro: "Invalid OAuth access token"
**Solução**:
1. Certifique-se de copiar o token completo
2. Não adicione espaços antes ou depois
3. O token deve começar com "EAAL"

### Erro: "Token is expired"
**Solução**: Gere um novo token. Tokens de curta duração expiram em 1-2 horas.

### Erro: "Permissions not granted"
**Solução**:
1. Você precisa ser admin ou ter permissões no Business Manager
2. Confirme que tem acesso às contas publicitárias

---

## 🔄 Token de Longa Duração (Recomendado)

Tokens gerados no Graph API Explorer expiram rapidamente. Para um token de longa duração (60 dias):

### Opção 1: Usar a API (Avançado)

```bash
curl -X GET "https://graph.facebook.com/v19.0/oauth/access_token?\
grant_type=fb_exchange_token&\
client_id=SEU_APP_ID&\
client_secret=SEU_APP_SECRET&\
fb_exchange_token=SEU_TOKEN_CURTO"
```

### Opção 2: Business Manager (Mais Fácil)

1. Acesse: https://business.facebook.com/settings/system-users
2. Crie um "System User"
3. Gere um token que não expira
4. Adicione as permissões necessárias
5. Adicione o usuário às contas publicitárias

---

## 📞 Precisa de Ajuda?

### Documentação Oficial da Meta:
- **Marketing API**: https://developers.facebook.com/docs/marketing-api
- **Permissions**: https://developers.facebook.com/docs/permissions/reference
- **Access Tokens**: https://developers.facebook.com/docs/facebook-login/guides/access-tokens

### Status da API:
- Verifique se a API está funcionando: https://developers.facebook.com/status/

### Suporte AdsOPS:
- Acesse o menu "Ajuda e Suporte" na aplicação
- Envie os detalhes do erro (sem incluir o token!)

---

## ✨ Após Resolver

Quando conseguir gerar o token com as permissões corretas:

1. ✅ Valide o token no AdsOPS
2. ✅ Selecione sua conta publicitária
3. ✅ Salve a conexão
4. ✅ Execute a sincronização
5. ✅ Visualize seus dados no Dashboard

**Parabéns!** 🎉 Sua integração com Meta Ads estará funcionando perfeitamente.

---

**Última atualização**: 31/10/2025
**Versão da API Meta**: v19.0
