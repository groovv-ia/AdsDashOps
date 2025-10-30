# Resolver Erro: "Não é possível carregar a URL" - Meta Ads OAuth

## 🔴 O Problema

Você está vendo esta mensagem ao tentar conectar com Meta Ads:

```
Não é possível carregar a URL
O domínio dessa URL não está incluído nos domínios do app. Para
carregar essa URL, adicione todos os domínios e subdomínios ao
campo Domínios do app nas configurações do app.
```

**Causa**: A URL de callback OAuth não está configurada no seu app do Facebook.

---

## ✅ Solução Rápida (5 minutos)

### Passo 1: Abra o Painel do Facebook Developers

1. Vá para: **https://developers.facebook.com/apps/**
2. Faça login com sua conta Facebook
3. Clique no seu aplicativo na lista

### Passo 2: Adicione "Login do Facebook"

Se ainda não adicionou:

1. No menu lateral esquerdo, clique em **"Adicionar produto"** ou **"Add Product"**
2. Encontre **"Login do Facebook"** (Facebook Login)
3. Clique em **"Configurar"** ou **"Set Up"**

### Passo 3: Configure as URIs de Redirecionamento

1. No menu lateral, vá em:
   ```
   Produtos → Login do Facebook → Configurações
   ```
   Ou em inglês:
   ```
   Products → Facebook Login → Settings
   ```

2. Procure a seção:
   ```
   URIs de redirecionamento do OAuth válidos
   Valid OAuth Redirect URIs
   ```

3. Adicione esta URL (copie e cole exatamente):
   ```
   http://localhost:5173/oauth-callback
   ```

4. Clique em **"Salvar alterações"** no final da página

### Passo 4: Configure os Domínios do App

1. No menu lateral, vá em:
   ```
   Configurações → Básico
   Settings → Basic
   ```

2. Role a página até encontrar:
   ```
   Domínios do aplicativo
   App Domains
   ```

3. Adicione:
   ```
   localhost
   ```

4. Clique em **"Salvar alterações"**

### Passo 5: Teste Novamente

1. **Importante**: Recarregue a página do Facebook Developers
2. Volte para sua aplicação (http://localhost:5173)
3. Tente conectar com Meta Ads novamente

---

## 📋 Checklist de Verificação

Antes de testar, confirme:

- [x] Login do Facebook está adicionado como produto
- [x] URI `http://localhost:5173/oauth-callback` está nas URIs válidas
- [x] Domínio `localhost` está nos domínios do app
- [x] Você clicou em "Salvar alterações"
- [x] Recarregou a página do Facebook Developers
- [x] As credenciais no `.env` estão corretas

---

## 🔍 Como Verificar se Está Correto

### Verificar App ID

No arquivo `.env`, confirme que o App ID está correto:

```env
VITE_META_APP_ID=1234567890123456
```

Para verificar no Facebook:
1. Vá em **Configurações → Básico**
2. Veja o **"ID do aplicativo"** (App ID)
3. Deve ser o mesmo que está no `.env`

### Verificar URL de Callback

A aplicação está configurada para usar:
```
http://localhost:5173/oauth-callback
```

Você pode confirmar abrindo o Console do navegador (F12) e verificando a URL gerada.

---

## 🚨 Problemas Comuns

### Problema 1: Ainda dá erro depois de configurar

**Solução**:
1. Limpe o cache do navegador (Ctrl+Shift+Del)
2. Feche e abra o navegador novamente
3. Certifique-se de que salvou as alterações no Facebook
4. Aguarde 1-2 minutos (às vezes demora para propagar)

### Problema 2: Pop-up é bloqueado

**Solução**:
1. Permita pop-ups para `localhost:5173`
2. Ou veja se há um ícone de bloqueio na barra de endereço
3. Clique e permita pop-ups

### Problema 3: "App ID inválido"

**Solução**:
1. Copie o App ID novamente do Facebook Developers
2. Cole no arquivo `.env` sem espaços extras
3. Reinicie o servidor de desenvolvimento (`npm run dev`)

### Problema 4: "redirect_uri_mismatch"

**Solução**:
A URL deve ser **exatamente**:
```
http://localhost:5173/oauth-callback
```

Verifique:
- Está usando `http://` (não https)
- Porta é `5173`
- Caminho é `/oauth-callback`
- Sem barras extras no final

---

## 🎯 Para Produção (Depois)

Quando fizer deploy da aplicação, você precisará adicionar também:

### URLs de Produção

No Facebook Developers, adicione:

```
https://adsops.bolt.host/oauth-callback
https://seu-dominio.com/oauth-callback
```

### Domínios de Produção

Em "Domínios do aplicativo", adicione:

```
adsops.bolt.host
seu-dominio.com
```

### Importante: HTTPS em Produção

Em produção, use **sempre HTTPS** (não HTTP).

---

## 📱 Captura de Tela das Configurações

### Onde Adicionar as URIs de Redirecionamento:

```
┌─────────────────────────────────────────────┐
│ Login do Facebook - Configurações          │
├─────────────────────────────────────────────┤
│                                             │
│ URIs de redirecionamento do OAuth válidos   │
│ ┌─────────────────────────────────────────┐ │
│ │ http://localhost:5173/oauth-callback    │ │
│ │                                         │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Salvar alterações]                        │
└─────────────────────────────────────────────┘
```

### Onde Adicionar os Domínios:

```
┌─────────────────────────────────────────────┐
│ Configurações Básicas                       │
├─────────────────────────────────────────────┤
│                                             │
│ Domínios do aplicativo                      │
│ ┌─────────────────────────────────────────┐ │
│ │ localhost                               │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Salvar alterações]                        │
└─────────────────────────────────────────────┘
```

---

## 🎓 Entendendo o Fluxo OAuth

1. **Você clica em "Conectar com Meta"**
   - Aplicação gera uma URL de autorização
   - URL inclui seu App ID e redirect_uri

2. **Facebook valida a URL**
   - Verifica se o App ID existe
   - Verifica se redirect_uri está nas URIs válidas
   - Se não estiver → ERRO "Não é possível carregar a URL"

3. **Após autorizar**
   - Facebook redireciona para `http://localhost:5173/oauth-callback`
   - Passa um `code` na URL
   - Aplicação troca o `code` por um `access_token`

4. **Com o access_token**
   - Aplicação busca suas contas de anúncios
   - Sincroniza campanhas, ads, métricas

---

## ✅ Teste Final

Para confirmar que está funcionando:

1. Abra sua aplicação: **http://localhost:5173**
2. Vá em **"Fontes de Dados"** ou **"Data Sources"**
3. Clique em **"Conectar"** no card da Meta
4. Preencha o App ID (se solicitado)
5. Clique em **"Autorizar"**
6. Uma nova janela deve abrir com o Facebook
7. Você deve ver uma tela pedindo permissões
8. Após autorizar, a janela fecha
9. Você vê suas contas de anúncios na aplicação

---

## 🆘 Ainda Não Funcionou?

Se ainda estiver com problemas:

### Debug 1: Veja o Console do Navegador

1. Pressione F12
2. Vá para a aba **"Console"**
3. Procure por erros em vermelho
4. Compartilhe o erro para análise

### Debug 2: Veja a Requisição

1. Pressione F12
2. Vá para a aba **"Network"** (Rede)
3. Clique em "Autorizar" na aplicação
4. Procure pela requisição para `facebook.com`
5. Veja os detalhes da URL gerada

### Debug 3: Teste Manualmente

Copie esta URL e adapte:

```
https://www.facebook.com/v18.0/dialog/oauth?client_id=SEU_APP_ID&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Foauth-callback&scope=ads_read,ads_management,business_management&response_type=code
```

Substitua `SEU_APP_ID` pelo seu App ID real e cole no navegador.

---

## 📞 Links Importantes

- **Painel de Apps**: https://developers.facebook.com/apps/
- **Documentação OAuth**: https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow
- **Status do Facebook**: https://developers.facebook.com/status/

---

**Última atualização**: 30 de Outubro de 2025

**Se seguir estes passos, o erro deve ser resolvido! 🎉**
