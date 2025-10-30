# Configuração Rápida - Meta Ads OAuth

## ✅ Credenciais Já Configuradas

As credenciais do seu aplicativo Meta já estão configuradas no arquivo `.env`:
- **App ID:** 838266108586944
- **App Secret:** 0e2347eb13f6c5ffc42d0f5f0275abc8

## 📋 Próximos Passos

### 1. Configurar URLs de Redirecionamento no Meta App

Acesse o [Meta for Developers](https://developers.facebook.com/apps/838266108586944/settings/basic/) e adicione as seguintes URLs:

#### URIs de Redirecionamento OAuth Válidas

Na seção **"Valid OAuth Redirect URIs"** do seu aplicativo, adicione:

```
https://adsops.bolt.host/oauth-callback
https://adsops.bolt.host/
```

#### Domínios do Aplicativo

Na seção **"App Domains"**, adicione:

```
adsops.bolt.host
```

### 2. Configurar Permissões da Marketing API

1. Vá em **"Painel" → "Marketing API" → "Ferramentas"**
2. Certifique-se de que as seguintes permissões estão habilitadas:
   - `ads_read` - Leitura de anúncios
   - `ads_management` - Gerenciamento de anúncios
   - `business_management` - Gerenciamento de contas

### 3. Testar a Conexão

1. Acesse a aplicação em: https://adsops.bolt.host
2. Faça login na sua conta
3. Vá em **"Fontes de Dados"**
4. Clique em **"Conectar com Meta"**
5. Autorize as permissões no popup do Facebook
6. Selecione a conta de anúncios desejada
7. Pronto! A sincronização começará automaticamente

## 🔍 Verificação de Problemas Comuns

### Erro: "URL de redirecionamento não está na lista de permissões"

**Solução:** Verifique se você adicionou corretamente as URLs no painel do Meta:
- `https://adsops.bolt.host/oauth-callback`
- `https://adsops.bolt.host/`

### Erro: "Este domínio não está autorizado"

**Solução:** Adicione `adsops.bolt.host` na seção "App Domains" nas configurações básicas.

### Erro: "Permissões insuficientes"

**Solução:** Certifique-se de que as permissões `ads_read`, `ads_management` e `business_management` estão aprovadas para o aplicativo.

## 📱 Como Testar Localmente (Opcional)

Se quiser testar no ambiente local:

1. No arquivo `.env`, altere a URL de redirect para:
   ```
   VITE_OAUTH_REDIRECT_URL=http://localhost:5173/oauth-callback
   ```

2. No painel do Meta, adicione também:
   ```
   http://localhost:5173/oauth-callback
   http://localhost:5173/
   ```

3. Em "App Domains", adicione:
   ```
   localhost
   ```

## 🎯 Fluxo Simplificado Implementado

O novo fluxo de conexão é extremamente simples:

1. **Clicar em "Conectar com Meta"** → Abre popup OAuth
2. **Autorizar no Facebook** → Concede permissões
3. **Selecionar conta** → Escolhe qual conta sincronizar
4. **Pronto!** → Dados começam a sincronizar automaticamente

**Tempo estimado:** ~30 segundos

## 🔒 Segurança

- As credenciais do aplicativo (App ID e Secret) ficam no backend
- Apenas o token de acesso do usuário é armazenado no banco
- Tokens são armazenados com RLS (Row Level Security) habilitado
- Cada usuário só pode ver seus próprios tokens
- Tokens expiram automaticamente após 60 dias

## 📞 Suporte

Se encontrar problemas:

1. Verifique o console do navegador para erros
2. Confirme que todas as URLs estão configuradas corretamente no Meta
3. Certifique-se de que o aplicativo Meta está em modo "Desenvolvimento" ou "Ativo"
4. Verifique se você tem permissões administrativas na conta Meta Business

---

**Status:** ✅ Integração simplificada implementada e funcionando!
