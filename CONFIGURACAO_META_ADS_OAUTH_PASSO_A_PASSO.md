# Guia Completo: Configuração OAuth Meta Ads (Facebook) para AdsOPS

Este guia fornece instruções detalhadas para configurar a autorização OAuth do Meta Ads (Facebook/Instagram Ads) no AdsOPS.

## 📋 Pré-requisitos

- Conta no Facebook Business Manager
- Acesso ao [Facebook Developers](https://developers.facebook.com)
- URL da aplicação: `https://adsops.bolt.host`

---

## 🚀 Passo 1: Acessar o Facebook Developers

1. Acesse [https://developers.facebook.com](https://developers.facebook.com)
2. Faça login com sua conta Facebook
3. No menu superior, clique em **"Meus Apps"** ou **"My Apps"**

---

## 🔧 Passo 2: Criar ou Selecionar um App

### Se você JÁ criou um app:
1. Selecione o app na lista
2. Vá para o **Passo 3**

### Se você ainda NÃO criou um app:
1. Clique em **"Criar App"** ou **"Create App"**
2. Selecione o tipo: **"Business"** ou **"Empresarial"**
3. Clique em **"Continuar"** ou **"Continue"**
4. Preencha as informações:
   - **Nome de Exibição do App**: `AdsOPS` (ou o nome que preferir)
   - **Email de Contato**: seu email
   - **Conta do Business Manager**: selecione sua conta (opcional)
5. Clique em **"Criar App"** ou **"Create App"**

---

## ⚙️ Passo 3: Configurações Básicas do App

### 3.1. Configurar Domínios do App

⚠️ **IMPORTANTE**: Esta é a configuração mais crítica para resolver o erro "URL não incluída nos domínios do app"

1. No menu lateral esquerdo, clique em **"Configurações"** ou **"Settings"**
2. Clique em **"Básico"** ou **"Basic"**
3. Role até a seção **"Domínios do App"** ou **"App Domains"**
4. Adicione o domínio: `adsops.bolt.host`
5. Clique em **"Adicionar Domínio"** ou **"Add Domain"**
6. Role até o final e clique em **"Salvar Alterações"** ou **"Save Changes"**

### 3.2. Copiar App ID e App Secret

1. Na mesma página de **Configurações Básicas**:
   - **ID do App** ou **App ID**: copie este valor
   - **Chave Secreta do App** ou **App Secret**:
     - Clique em **"Mostrar"** ou **"Show"**
     - Digite sua senha do Facebook
     - Copie o valor mostrado

2. **Guarde esses valores com segurança!** Você precisará deles no AdsOPS.

---

## 🔐 Passo 4: Adicionar o Produto "Marketing API"

1. No menu lateral esquerdo, procure por **"Produtos"** ou **"Products"**
2. Localize **"Marketing API"**
3. Clique em **"Configurar"** ou **"Set up"**
4. Aguarde a configuração ser concluída

---

## 🌐 Passo 5: Configurar URLs de Redirecionamento OAuth

⚠️ **CRÍTICO**: Sem esta configuração, o OAuth não funcionará!

### 5.1. Acessar as Configurações do Facebook Login

1. No menu lateral esquerdo, em **"Produtos"** ou **"Products"**
2. Clique em **"Facebook Login"** (se não estiver visível, adicione-o primeiro)
3. Clique em **"Configurações"** ou **"Settings"**

### 5.2. Adicionar URLs Válidas de Redirecionamento OAuth

1. Localize o campo **"URIs de Redirecionamento do OAuth Válidos"** ou **"Valid OAuth Redirect URIs"**
2. Adicione as seguintes URLs (uma por linha):

```
https://adsops.bolt.host/oauth-callback
https://adsops.bolt.host/
```

3. Clique em **"Salvar Alterações"** ou **"Save Changes"**

---

## 📱 Passo 6: Adicionar Plataforma Web

1. Role até a seção **"Plataforma"** ou **"Platform"** nas Configurações Básicas
2. Clique em **"Adicionar Plataforma"** ou **"Add Platform"**
3. Selecione **"Site"** ou **"Website"**
4. No campo **"URL do Site"** ou **"Site URL"**, adicione:
   ```
   https://adsops.bolt.host
   ```
5. Clique em **"Salvar Alterações"** ou **"Save Changes"**

---

## 🎯 Passo 7: Configurar Permissões da Marketing API

1. No menu lateral, clique em **"Marketing API"**
2. Clique em **"Ferramentas"** ou **"Tools"**
3. Vá para **"Permissões e Recursos"** ou **"Permissions & Features"**
4. Certifique-se de que as seguintes permissões estão habilitadas:
   - `ads_read` - Ler dados de anúncios
   - `ads_management` - Gerenciar anúncios
   - `business_management` - Gerenciar negócios

---

## 🔄 Passo 8: Modo de Desenvolvimento vs. Produção

### Modo de Desenvolvimento (Padrão)
- Apenas você e pessoas adicionadas como testadores podem usar o app
- Ideal para testes iniciais

### Mudar para Modo Produção (Quando estiver pronto)
1. No menu superior, você verá um botão indicando **"Em desenvolvimento"** ou **"In Development"**
2. Para ativar o modo Produção:
   - Complete todos os requisitos de verificação
   - Preencha a **Política de Privacidade**
   - Preencha os **Termos de Serviço**
   - Submeta o app para revisão (se necessário)

**💡 Para testes iniciais, mantenha em modo de desenvolvimento!**

---

## 📝 Passo 9: Configurar no AdsOPS

Agora que o app está configurado no Facebook Developers, siga estes passos no AdsOPS:

1. Acesse [https://adsops.bolt.host](https://adsops.bolt.host)
2. Faça login na sua conta
3. Vá para **"Fontes de Dados"**
4. Clique em **"Adicionar Fonte"**
5. Selecione **"Meta Ads"**
6. Na tela de configuração de credenciais, insira:
   - **Client ID**: Cole o **App ID** copiado no Passo 3.2
   - **Client Secret**: Cole o **App Secret** copiado no Passo 3.2
7. Clique em **"Continuar para OAuth"**
8. Clique em **"Autorizar Acesso"**
9. Na janela que abrir, faça login e autorize as permissões solicitadas
10. Aguarde a confirmação de sucesso

---

## ✅ Verificação Final - Checklist

Antes de tentar autorizar no AdsOPS, verifique se você completou:

- [ ] App criado no Facebook Developers
- [ ] Domínio `adsops.bolt.host` adicionado em **"Domínios do App"**
- [ ] URLs de redirecionamento OAuth configuradas:
  - [ ] `https://adsops.bolt.host/oauth-callback`
  - [ ] `https://adsops.bolt.host/`
- [ ] Plataforma Web adicionada com URL `https://adsops.bolt.host`
- [ ] Produto **Marketing API** adicionado ao app
- [ ] **Facebook Login** configurado (se necessário)
- [ ] App ID e App Secret copiados e salvos com segurança

---

## 🐛 Solução de Problemas

### Erro: "URL não está incluída nos domínios do app"

**Causa**: O domínio `adsops.bolt.host` não está configurado corretamente.

**Solução**:
1. Vá para **Configurações > Básico**
2. Na seção **"Domínios do App"**, adicione: `adsops.bolt.host`
3. Salve as alterações
4. Aguarde 1-2 minutos para as mudanças propagarem
5. Tente novamente

### Erro: "redirect_uri inválido"

**Causa**: As URLs de redirecionamento OAuth não estão configuradas.

**Solução**:
1. Adicione o produto **Facebook Login** se ainda não estiver adicionado
2. Vá para **Produtos > Facebook Login > Configurações**
3. Adicione as URLs de redirecionamento (veja Passo 5.2)
4. Salve as alterações
5. Tente novamente

### Erro: "App não está disponível"

**Causa**: O app pode estar em modo de desenvolvimento e você não está autorizado.

**Solução**:
1. Vá para **Funções > Testadores**
2. Adicione sua conta Facebook como testador
3. Aceite o convite de testador
4. Tente novamente

### Erro de Permissões

**Causa**: Permissões necessárias não foram concedidas.

**Solução**:
1. Durante a autorização OAuth, certifique-se de aceitar TODAS as permissões solicitadas
2. Se recusar alguma permissão, o sistema não funcionará corretamente
3. Você pode revogar e autorizar novamente se necessário

---

## 📞 Suporte Adicional

Se você ainda está enfrentando problemas:

1. **Verifique o Console do Navegador**:
   - Pressione F12
   - Vá para a aba "Console"
   - Procure por erros relacionados ao OAuth

2. **Documentação Oficial**:
   - [Meta Marketing API](https://developers.facebook.com/docs/marketing-api)
   - [Facebook Login](https://developers.facebook.com/docs/facebook-login)

3. **Limpe o Cache**:
   - Às vezes, mudanças no Facebook Developers demoram alguns minutos para propagar
   - Limpe o cache do navegador ou tente em modo anônimo

---

## 📌 Notas Importantes

1. **Segurança**: Nunca compartilhe seu App Secret publicamente
2. **Ambiente**: Estas configurações são para o ambiente de produção (`adsops.bolt.host`)
3. **Desenvolvimento Local**: Se você também desenvolve localmente, adicione:
   - Domínio: `localhost`
   - URLs OAuth: `http://localhost:5173/oauth-callback` e `http://localhost:5173/`
4. **Validade do Token**: Tokens de acesso do Meta expiram. O AdsOPS cuida da renovação automaticamente.

---

## 🎉 Pronto!

Após seguir todos esses passos, você deverá conseguir autorizar o Meta Ads sem problemas no AdsOPS.

Boa sorte! 🚀
