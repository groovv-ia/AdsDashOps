# Configuração Google OAuth - Passo a Passo

## ✅ Credenciais Fornecidas
- **Client ID**: `835761463678-6ups9592lsg8do7rt1vno7v88tf6ajj8.apps.googleusercontent.com`
- **Client Secret**: `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`

## 🔧 Configuração no Supabase

### 1. Acesse o Painel do Supabase
1. Vá para [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto **AdAnalytics**
3. No menu lateral, clique em **Authentication** > **Providers**

### 2. Configurar Google Provider
1. Encontre **Google** na lista de provedores
2. Clique no botão **Enable** ou no ícone de configuração
3. Preencha os campos:
   - **Client ID**: `835761463678-6ups9592lsg8do7rt1vno7v88tf6ajj8.apps.googleusercontent.com`
   - **Client Secret**: `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`
4. Clique em **Save**

### 3. Verificar URL de Redirecionamento
Certifique-se de que no Google Cloud Console, nas configurações do OAuth Client, você tem esta URL:
```
https://[SEU-PROJETO-ID].supabase.co/auth/v1/callback
```

**Para encontrar seu Project ID do Supabase:**
- No painel do Supabase, vá em **Settings** > **General**
- Copie o **Reference ID** (este é seu projeto ID)

### 4. URLs para Configurar no Google Cloud Console

**Para Produção:**
```
https://[SEU-PROJETO-ID].supabase.co/auth/v1/callback
```

**Para Desenvolvimento Local (opcional):**
```
http://localhost:5173
```

## 🧪 Testando a Configuração

### 1. Verificar Configuração
1. No painel do Supabase, vá para **Authentication** > **Providers**
2. Verifique se o Google aparece como **Enabled** ✅

### 2. Testar Login
1. Acesse sua aplicação
2. Clique no botão de login com Google
3. Deve abrir uma janela do Google para autenticação
4. Após autorizar, você deve ser redirecionado de volta para a aplicação

### 3. Verificar Usuários
1. No Supabase, vá para **Authentication** > **Users**
2. Após um login bem-sucedido, você deve ver o usuário listado

## 🔍 Troubleshooting

### Erro "redirect_uri_mismatch"
- Verifique se a URL de callback está correta no Google Cloud Console
- Certifique-se de usar HTTPS em produção

### Erro "invalid_client"
- Verifique se o Client ID e Client Secret estão corretos
- Certifique-se de que não há espaços extras

### Login não funciona
1. Abra o Developer Tools (F12)
2. Vá para a aba **Console**
3. Procure por erros durante o processo de login
4. Verifique a aba **Network** para ver se há falhas nas requisições

## 📋 Checklist de Configuração

- [ ] Google OAuth Client criado no Google Cloud Console
- [ ] URLs de redirecionamento configuradas no Google
- [ ] Provider Google habilitado no Supabase
- [ ] Client ID inserido corretamente no Supabase
- [ ] Client Secret inserido corretamente no Supabase
- [ ] Configurações salvas no Supabase
- [ ] Teste de login realizado com sucesso

## 🎯 Próximos Passos

Após configurar o Google OAuth:

1. **Teste o login** para garantir que está funcionando
2. **Configure Facebook OAuth** (se necessário)
3. **Configure Apple OAuth** (se necessário)
4. **Personalize o fluxo pós-login** conforme necessário

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no console do navegador
2. Consulte a documentação do Supabase: [https://supabase.com/docs/guides/auth/social-login/auth-google](https://supabase.com/docs/guides/auth/social-login/auth-google)
3. Verifique se todas as URLs estão corretas