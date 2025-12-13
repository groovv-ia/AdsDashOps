# Solução para Erro OAuth 400 (Bad Request) - Meta Ads

## 🔴 Problema

Quando você clica em "Conectar com Meta (OAuth)", a página tenta redirecionar mas retorna:
```
net::ERR_BLOCKED_BY_RESPONSE 400 (Bad Request)
```

## 📋 Causa

O Facebook está bloqueando o redirecionamento porque:
1. **A URL de callback não está autorizada** no Facebook App (causa mais comum)
2. O domínio não está na lista de domínios permitidos
3. As permissões solicitadas não estão configuradas
4. O App não está no modo correto (Development/Live)

## ✅ Solução Passo a Passo

### 1. Acesse o Facebook Developers

Abra: https://developers.facebook.com/apps/4309558585973477

(Substitua `4309558585973477` pelo seu App ID se for diferente)

### 2. Configure Use Cases

1. No menu lateral, clique em **Use cases**
2. Clique em **Customize**
3. Clique em **Add** (adicionar caso de uso)
4. Selecione: **Other** → **Business Management**
5. Clique em **Add** para confirmar

### 3. Configure Domínios e URLs

1. No menu lateral, vá em **Settings** → **Basic**
2. Em **App Domains**, adicione:
   ```
   adsops.bolt.host
   ```
3. Role para baixo e clique em **Add Platform**
4. Selecione **Website**
5. Em **Site URL**, adicione:
   ```
   https://adsops.bolt.host/oauth-callback
   ```
6. Clique em **Save Changes**

### 4. Verifique as Permissões

1. No menu lateral, vá em **App Review** → **Permissions and Features**
2. Certifique-se de que estas permissões estão disponíveis:
   - ✅ `ads_management`
   - ✅ `ads_read`
   - ✅ `business_management`

3. Se alguma não estiver disponível:
   - Volte em **Use cases** e adicione o caso de uso apropriado
   - Para permissões de anúncios, você precisa do caso de uso "Business Management"

### 5. Configure o Modo do App

**Para desenvolvimento/testes:**
1. No topo da página, verifique se há um switch de modo
2. Certifique-se que está em **Development Mode** (modo desenvolvimento)
3. No Development Mode, você não precisa aprovação para as permissões

**Para produção:**
1. Você precisará submeter o app para revisão do Facebook
2. O Facebook precisa aprovar cada permissão solicitada
3. Isso pode levar alguns dias

### 6. Adicione Testadores (Modo Development)

Se o App estiver em modo Development, você precisa adicionar sua conta como testador:

1. Vá em **Roles** → **Test Users** ou **Roles** → **Administrators**
2. Adicione seu usuário do Facebook como Administrador ou Testador
3. Somente contas adicionadas podem autorizar o App em Development Mode

## 🧪 Testar a Configuração

Depois de fazer todas as configurações:

1. Volte para o dashboard da aplicação
2. Abra o Console do navegador (F12)
3. Clique em "Conectar com Meta (OAuth)"
4. Observe os logs no console

### Logs Esperados (Sucesso):
```
🚀 [Meta Connect] Iniciando processo de conexão OAuth
🚀 [Meta Connect] Configurações OAuth: ...
🚀 [Meta Connect] Executando redirecionamento...
✅ [Meta Connect] Redirecionamento iniciado
```

Depois você deve ser redirecionado para a página de autorização do Facebook.

### Logs de Erro:
Se ainda receber erro 400, verifique os logs detalhados no console. Eles mostrarão exatamente qual configuração está faltando.

## 📝 Checklist Completo

Use esta checklist para garantir que tudo está configurado:

- [ ] App ID está correto no arquivo `.env` (`VITE_META_APP_ID`)
- [ ] App Secret está correto no arquivo `.env` (`VITE_META_APP_SECRET`)
- [ ] Use case "Business Management" adicionado
- [ ] Domínio `adsops.bolt.host` adicionado em "App Domains"
- [ ] URL `https://adsops.bolt.host/oauth-callback` adicionada como Website Platform
- [ ] Permissões `ads_read`, `ads_management`, `business_management` estão disponíveis
- [ ] App está em modo "Development" (para testes)
- [ ] Seu usuário é Administrador ou Testador do App
- [ ] Salvou todas as alterações no Facebook Developers

## 🆘 Ainda com Problema?

Se após seguir todos os passos ainda tiver problemas:

1. **Copie todos os logs do console** (F12 → Console)
2. **Tire um print da configuração** do Facebook App (Settings → Basic)
3. **Verifique se o erro mudou** - pode ser um erro diferente agora

### Erros Comuns Alternativos:

**"redirect_uri_mismatch"**
- A URL não corresponde EXATAMENTE à configurada
- Verifique se está usando HTTPS
- Verifique se não há espaços ou caracteres extras

**"access_denied"**
- Você clicou em "Cancelar" na tela de autorização
- Tente novamente e clique em "Continuar"

**"invalid_scope"**
- As permissões solicitadas não estão disponíveis
- Adicione o use case correto

## 🎯 Configuração Alternativa (Usando Token Diretamente)

Se o OAuth continuar com problemas, você pode usar o token diretamente:

1. No Facebook Developers, vá em **Tools** → **Graph API Explorer**
2. Selecione seu App
3. Adicione as permissões: `ads_read`, `ads_management`, `business_management`
4. Clique em "Generate Access Token"
5. Copie o token gerado
6. No arquivo `.env`, adicione:
   ```
   VITE_META_ACCESS_TOKEN=seu_token_aqui
   ```
7. Use o botão "Usar Token Configurado" no dashboard

**⚠️ Atenção:** Tokens do Graph API Explorer expiram em 1-2 horas. Use apenas para testes.

## 📚 Recursos Adicionais

- [Facebook OAuth Documentation](https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow/)
- [Meta Marketing API - Get Started](https://developers.facebook.com/docs/marketing-apis/get-started)
- [App Review Process](https://developers.facebook.com/docs/app-review/)
