# Configuração de Login Social - Supabase

## 1. Acesse o Painel do Supabase

1. Vá para [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. No menu lateral, clique em **Authentication** > **Providers**

## 2. Configurar Google OAuth

### 2.1 Criar Projeto no Google Cloud Console
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá para **APIs & Services** > **Credentials**
4. Clique em **Create Credentials** > **OAuth 2.0 Client IDs**

### 2.2 Configurar OAuth Consent Screen
1. Vá para **OAuth consent screen**
2. Escolha **External** (para uso público)
3. Preencha as informações obrigatórias:
   - App name: `AdAnalytics Pro`
   - User support email: seu email
   - Developer contact information: seu email

### 2.3 Criar OAuth Client ID
1. Volte para **Credentials**
2. Clique em **Create Credentials** > **OAuth 2.0 Client IDs**
3. Tipo de aplicação: **Web application**
4. Nome: `AdAnalytics - Supabase Auth`
5. **Authorized redirect URIs**: 
   ```
   https://[SEU-PROJETO-ID].supabase.co/auth/v1/callback
   ```

### 2.4 Configurar no Supabase
1. No painel do Supabase, vá para **Authentication** > **Providers**
2. Encontre **Google** e clique em **Enable**
3. Cole o **Client ID** e **Client Secret** do Google
4. Salve as configurações

## 3. Configurar Facebook OAuth

### 3.1 Criar App no Facebook Developers
1. Acesse [Facebook Developers](https://developers.facebook.com/)
2. Clique em **My Apps** > **Create App**
3. Escolha **Consumer** como tipo de app
4. Preencha as informações do app

### 3.2 Configurar Facebook Login
1. No painel do app, vá para **Products** > **Facebook Login** > **Settings**
2. Em **Valid OAuth Redirect URIs**, adicione:
   ```
   https://[SEU-PROJETO-ID].supabase.co/auth/v1/callback
   ```

### 3.3 Obter Credenciais
1. Vá para **Settings** > **Basic**
2. Copie o **App ID** e **App Secret**

### 3.4 Configurar no Supabase
1. No painel do Supabase, encontre **Facebook** e clique em **Enable**
2. Cole o **App ID** e **App Secret**
3. Salve as configurações

## 4. Configurar Apple OAuth

### 4.1 Criar App ID na Apple Developer
1. Acesse [Apple Developer Console](https://developer.apple.com/account/)
2. Vá para **Certificates, Identifiers & Profiles**
3. Clique em **Identifiers** > **+** (novo)
4. Selecione **App IDs** e continue
5. Escolha **App** como tipo
6. Preencha:
   - Description: `AdAnalytics Pro`
   - Bundle ID: `com.adanalytics.pro` (ou seu domínio)
7. Em **Capabilities**, marque **Sign In with Apple**

### 4.2 Criar Service ID
1. Ainda em **Identifiers**, clique em **+** novamente
2. Selecione **Services IDs** e continue
3. Preencha:
   - Description: `AdAnalytics Pro Web`
   - Identifier: `com.adanalytics.pro.web`
4. Marque **Sign In with Apple** e clique em **Configure**
5. Selecione o **Primary App ID** criado anteriormente
6. Em **Website URLs**, adicione:
   - Domains: `[SEU-PROJETO-ID].supabase.co`
   - Return URLs: `https://[SEU-PROJETO-ID].supabase.co/auth/v1/callback`

### 4.3 Criar Private Key
1. Vá para **Keys** > **+** (novo)
2. Nome: `AdAnalytics Apple Auth Key`
3. Marque **Sign In with Apple**
4. Configure e selecione o **Primary App ID**
5. Registre e baixe a chave (.p8 file)
6. Anote o **Key ID**

### 4.4 Configurar no Supabase
1. No painel do Supabase, encontre **Apple** e clique em **Enable**
2. Preencha:
   - **Client ID**: Service ID criado (ex: `com.adanalytics.pro.web`)
   - **Client Secret**: Você precisa gerar um JWT usando a private key
   - **Team ID**: Encontre no Apple Developer Console

## 5. URLs de Redirecionamento

Para todos os provedores, use esta URL de callback:
```
https://[SEU-PROJETO-ID].supabase.co/auth/v1/callback
```

Substitua `[SEU-PROJETO-ID]` pelo ID real do seu projeto Supabase.

## 6. Configurações de Desenvolvimento Local

Para testar localmente, adicione também estas URLs nos provedores:
```
http://localhost:5173/auth/callback
```

## 7. Variáveis de Ambiente

Certifique-se de que seu arquivo `.env` contém:
```env
VITE_SUPABASE_URL=https://[SEU-PROJETO-ID].supabase.co
VITE_SUPABASE_ANON_KEY=[SUA-CHAVE-ANONIMA]
```

## 8. Testando a Configuração

1. Reinicie seu servidor de desenvolvimento
2. Tente fazer login com cada provedor
3. Verifique se os usuários aparecem na aba **Authentication** > **Users** do Supabase

## Troubleshooting

### Erro "Invalid redirect URI"
- Verifique se as URLs de redirecionamento estão corretas em todos os provedores
- Certifique-se de usar HTTPS em produção

### Erro "App not approved"
- Para Facebook: publique o app ou adicione testadores
- Para Google: verifique o OAuth consent screen

### Apple Sign In não funciona
- Verifique se o Service ID está configurado corretamente
- Certifique-se de que o JWT para client_secret está válido

## Próximos Passos

Após configurar todos os provedores:
1. Teste cada método de login
2. Configure políticas RLS se necessário
3. Personalize o fluxo pós-login conforme necessário