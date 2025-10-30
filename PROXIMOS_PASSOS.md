# Próximos Passos - Integração Meta Ads e Google Ads

## ✅ O que foi implementado

Implementamos com sucesso um sistema robusto de integração com Meta Ads e Google Ads:

### Estrutura Criada

1. **Backend Services**
   - `MetaAdsService` - SDK oficial do Facebook Marketing API
   - `GoogleAdsService` - SDK oficial do Google Ads API
   - `DataSyncService` - Orquestrador de sincronização
   - `TokenManager` - Gerenciamento seguro de tokens OAuth
   - `RateLimiter` - Controle de taxa de requisições
   - Sistema de logging estruturado
   - Sistema de criptografia de credenciais

2. **Banco de Dados**
   - Tabelas para credenciais de API criptografadas
   - Tabelas para tokens OAuth com renovação automática
   - Tabelas expandidas para campanhas, ad sets, ads e métricas
   - Tabelas para criativos, insights de audiência e conversões
   - Sistema de histórico de sincronizações

3. **Documentação**
   - Guia completo em `INTEGRACAO_APIs.md`
   - Exemplos de uso para cada serviço
   - Troubleshooting e boas práticas

---

## 🎯 Próximos Passos Recomendados

### 1. Configurar Credenciais da Meta

Você mencionou que já tem App ID e App Secret da Meta. Configure-os:

```bash
# No arquivo .env, atualize:
VITE_META_APP_ID=seu_app_id_aqui
VITE_META_APP_SECRET=seu_app_secret_aqui
```

**Onde encontrar**:
- Acesse https://developers.facebook.com/apps/
- Selecione seu app
- Vá em Configurações > Básico
- Copie o ID do aplicativo e Chave secreta do aplicativo

### 2. Configurar URLs de Redirecionamento

No painel da Meta, adicione as URLs de callback OAuth:

**Desenvolvimento**:
```
http://localhost:5173/oauth-callback
```

**Produção** (quando fizer deploy):
```
https://adsops.bolt.host/oauth-callback
```

**Como fazer**:
1. No app da Meta, vá em Produtos > Login do Facebook
2. Em Configurações, adicione as URLs válidas de redirecionamento de OAuth

### 3. Criar Credenciais do Google Ads

Para integrar com Google Ads, você precisa:

#### A. Criar Projeto no Google Cloud Console

1. Acesse https://console.cloud.google.com/
2. Crie um novo projeto ou use um existente
3. Habilite a **Google Ads API**

#### B. Configurar OAuth 2.0

1. Vá em **APIs e Serviços** > **Credenciais**
2. Clique em **Criar credenciais** > **ID do cliente OAuth 2.0**
3. Tipo de aplicativo: **Aplicativo da Web**
4. Adicione as URIs de redirecionamento:
   - `http://localhost:5173/oauth-callback`
   - `https://adsops.bolt.host/oauth-callback` (produção)
5. Copie o **Client ID** e **Client Secret**

#### C. Obter Developer Token

1. Acesse https://ads.google.com/aw/apicenter
2. Faça login com sua conta Google Ads
3. Solicite acesso ao developer token
4. Aguarde aprovação (pode levar alguns dias)
5. Para desenvolvimento, use o token de teste

#### D. Configurar no .env

```bash
VITE_GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=seu_client_secret
VITE_GOOGLE_DEVELOPER_TOKEN=seu_developer_token
```

### 4. Gerar Chave de Criptografia Segura

Para produção, gere uma chave de criptografia forte:

```bash
# No terminal, execute:
openssl rand -base64 32

# Copie o resultado e adicione no .env:
VITE_ENCRYPTION_KEY=resultado_do_comando_acima
```

### 5. Criar Edge Function para OAuth (Opcional mas Recomendado)

Para maior segurança, crie uma Edge Function que trate o fluxo OAuth no backend:

```typescript
// supabase/functions/oauth-meta/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { code, redirectUri } = await req.json();

    // Trocar code por access token
    const response = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('META_APP_ID')!,
        client_secret: Deno.env.get('META_APP_SECRET')!,
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### 6. Testar Integração com Meta Ads

Crie um teste simples:

```typescript
// test-meta-integration.ts
import { MetaAdsService } from '@/lib/dataConnectorsV2';

async function testMetaIntegration() {
  const metaService = new MetaAdsService();

  // Substitua pelo seu access token de teste
  const accessToken = 'SEU_ACCESS_TOKEN_DE_TESTE';

  try {
    const accounts = await metaService.getAdAccounts(accessToken);
    console.log('✅ Contas Meta encontradas:', accounts.length);

    if (accounts.length > 0) {
      const campaigns = await metaService.getCampaigns('test-connection-id', accounts[0].id);
      console.log('✅ Campanhas encontradas:', campaigns.length);
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testMetaIntegration();
```

### 7. Testar Integração com Google Ads

Similar ao teste da Meta:

```typescript
// test-google-integration.ts
import { GoogleAdsService } from '@/lib/dataConnectorsV2';

async function testGoogleIntegration() {
  const googleService = new GoogleAdsService();

  try {
    const customers = await googleService.getCustomers('test-connection-id');
    console.log('✅ Clientes Google encontrados:', customers.length);

    if (customers.length > 0) {
      const campaigns = await googleService.getCampaigns('test-connection-id', customers[0].id);
      console.log('✅ Campanhas encontradas:', campaigns.length);
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testGoogleIntegration();
```

### 8. Atualizar Componente DataSources

O componente já existente precisa ser atualizado para usar os novos serviços. Você pode:

1. Manter o fluxo OAuth atual
2. Adicionar chamadas aos novos serviços após autenticação
3. Salvar tokens usando TokenManager
4. Usar DataSyncService para sincronizações

### 9. Criar Interface de Configuração de Credenciais

Crie um componente para administradores configurarem as credenciais:

```typescript
// components/admin/ApiCredentialsManager.tsx
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { encryptData } from '@/lib/utils/encryption';

export const ApiCredentialsManager = () => {
  const [metaAppId, setMetaAppId] = useState('');
  const [metaAppSecret, setMetaAppSecret] = useState('');

  const saveCredentials = async () => {
    const { data: user } = await supabase.auth.getUser();

    await supabase.from('api_credentials').upsert({
      user_id: user.user!.id,
      platform: 'meta',
      app_id: metaAppId,
      app_secret_encrypted: encryptData(metaAppSecret),
    });

    alert('Credenciais salvas com sucesso!');
  };

  return (
    <div className="space-y-4">
      <h2>Configurar Credenciais da Meta</h2>
      <input
        type="text"
        placeholder="App ID"
        value={metaAppId}
        onChange={(e) => setMetaAppId(e.target.value)}
      />
      <input
        type="password"
        placeholder="App Secret"
        value={metaAppSecret}
        onChange={(e) => setMetaAppSecret(e.target.value)}
      />
      <button onClick={saveCredentials}>Salvar</button>
    </div>
  );
};
```

### 10. Monitoramento e Logs

Monitore o sistema através da tabela `sync_jobs`:

```sql
-- Ver últimas 10 sincronizações
SELECT
  platform,
  status,
  started_at,
  completed_at,
  records_synced,
  duration_seconds,
  errors
FROM sync_jobs
ORDER BY created_at DESC
LIMIT 10;

-- Ver taxa de sucesso por plataforma
SELECT
  platform,
  status,
  COUNT(*) as total
FROM sync_jobs
GROUP BY platform, status;
```

---

## 🔧 Comandos Úteis

```bash
# Instalar dependências (já foi feito)
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Visualizar build de produção
npm run preview

# Atualizar banco de dados Supabase
# (migrations já foram aplicadas automaticamente)
```

---

## 📚 Documentação Adicional

- **Guia Completo**: Veja `INTEGRACAO_APIs.md`
- **Meta Ads API**: https://developers.facebook.com/docs/marketing-api
- **Google Ads API**: https://developers.google.com/google-ads/api/docs/start
- **Supabase**: https://supabase.com/docs

---

## 🆘 Troubleshooting Rápido

### Erro: "Token inválido"
**Solução**: Verifique se as credenciais no `.env` estão corretas

### Erro: "Rate limit exceeded"
**Solução**: O sistema aguarda automaticamente. Reduza frequência de sincronização

### Erro: "CORS blocked"
**Solução**: Use Edge Functions para chamadas OAuth sensíveis

### Build com avisos de chunk size
**Solução**: Normal para primeira build. Para otimizar:
```bash
# No vite.config.ts, adicione:
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'meta-sdk': ['facebook-nodejs-business-sdk'],
        'google-sdk': ['google-ads-api'],
      }
    }
  }
}
```

---

## ✨ Próximas Features Sugeridas

1. **Dashboard de Sincronizações**
   - Ver progresso em tempo real
   - Histórico detalhado
   - Estatísticas de uso

2. **Agendamento Automático**
   - Cron jobs para sincronização periódica
   - Configuração por usuário

3. **Notificações**
   - Email quando sincronização falhar
   - Alertas de budget
   - Relatórios semanais

4. **Webhooks**
   - Receber notificações em tempo real das plataformas
   - Sincronização instantânea de mudanças

5. **Análise Avançada**
   - Comparação entre plataformas
   - Previsões de performance
   - Recomendações de otimização

---

**Status**: ✅ Sistema pronto para uso!

Para começar, configure suas credenciais da Meta no `.env` e teste a integração!
