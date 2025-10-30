# AdsOPS - Painel de Analytics de Publicidade

Sistema completo para gerenciamento e análise de campanhas de publicidade digital integrado com Meta Ads, Google Ads e TikTok Ads.

🌐 **Aplicação Publicada**: [https://adsops.bolt.host](https://adsops.bolt.host)

## 🚀 Funcionalidades

- ✅ Dashboard interativo com métricas em tempo real
- ✅ Integração com Meta Ads (Facebook/Instagram)
- ✅ Integração com Google Ads
- ✅ Integração com TikTok Ads
- ✅ Análise de campanhas com IA
- ✅ Exportação de relatórios (CSV e PDF)
- ✅ Sincronização automática de dados
- ✅ Gerenciamento de usuários com Supabase
- ✅ Sistema de notificações
- ✅ Conformidade com LGPD/GDPR

## 📋 Pré-requisitos

- Node.js 18+
- Conta Supabase
- Credenciais de API das plataformas de anúncios

## 🔧 Configuração Rápida

### 1. Clone o repositório
```bash
git clone <seu-repositorio>
cd advertising-analytics-dashboard
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais.

### 4. Execute o projeto
```bash
npm run dev
```

## 🔐 Configuração OAuth Meta Ads

**⚠️ IMPORTANTE**: Se você está tendo problemas com o erro "URL não incluída nos domínios do app", siga estes guias:

### Guia Rápido (5 minutos):
📄 Consulte: [`GUIA_RAPIDO_META_OAUTH.md`](./GUIA_RAPIDO_META_OAUTH.md)

### Guia Completo (Passo a Passo):
📄 Consulte: [`CONFIGURACAO_META_ADS_OAUTH_PASSO_A_PASSO.md`](./CONFIGURACAO_META_ADS_OAUTH_PASSO_A_PASSO.md)

**Resumo da Configuração:**

No painel do Facebook Developers, você precisa:
1. ✅ Adicionar `adsops.bolt.host` em **"Domínios do App"**
2. ✅ Configurar URLs OAuth:
   - `https://adsops.bolt.host/oauth-callback`
   - `https://adsops.bolt.host/`
3. ✅ Adicionar plataforma Web com URL `https://adsops.bolt.host`

## 📚 Documentação Adicional

- [`CONFIGURACAO_GOOGLE_OAUTH.md`](./CONFIGURACAO_GOOGLE_OAUTH.md) - Configuração Google Ads
- [`CONFIGURACAO_SOCIAL_LOGIN.md`](./CONFIGURACAO_SOCIAL_LOGIN.md) - Login Social
- [`INTEGRACAO_APIs.md`](./INTEGRACAO_APIs.md) - Integração com APIs
- [`SECURITY_FIXES.md`](./SECURITY_FIXES.md) - Correções de Segurança

## 🏗️ Estrutura do Projeto

```
src/
├── components/         # Componentes React
│   ├── auth/          # Autenticação
│   ├── dashboard/     # Dashboard e visualizações
│   ├── insights/      # IA e análises
│   ├── legal/         # Políticas e conformidade
│   └── ui/            # Componentes de UI reutilizáveis
├── hooks/             # React Hooks customizados
├── lib/               # Bibliotecas e serviços
│   ├── connectors/    # Conectores de APIs
│   └── services/      # Serviços da aplicação
├── types/             # TypeScript types
└── utils/             # Funções utilitárias
```

## 🔑 Variáveis de Ambiente

```env
# Supabase
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_supabase

# Meta Ads
VITE_META_APP_ID=seu_app_id_meta
VITE_META_APP_SECRET=seu_app_secret_meta

# Google Ads
VITE_GOOGLE_CLIENT_ID=seu_client_id_google
VITE_GOOGLE_CLIENT_SECRET=seu_client_secret_google
VITE_GOOGLE_DEVELOPER_TOKEN=seu_developer_token

# TikTok Ads
VITE_TIKTOK_APP_ID=seu_app_id_tiktok
VITE_TIKTOK_APP_SECRET=seu_app_secret_tiktok

# OAuth
VITE_OAUTH_REDIRECT_URL=https://adsops.bolt.host/oauth-callback

# OpenAI (Opcional)
VITE_OPENAI_API_KEY=sua_chave_openai
```

## 🛠️ Scripts Disponíveis

```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run build    # Build para produção
npm run preview  # Preview do build de produção
npm run lint     # Executa linter
```

## 🌐 Deploy

O projeto está configurado para deploy em qualquer plataforma que suporte Vite:
- Vercel
- Netlify
- Cloudflare Pages
- AWS Amplify

**URL de Produção Atual**: https://adsops.bolt.host

## 🔒 Segurança

- ✅ Criptografia de credenciais de API
- ✅ Row Level Security (RLS) no Supabase
- ✅ Autenticação segura com JWT
- ✅ Proteção contra CSRF
- ✅ Sanitização de dados
- ✅ HTTPS obrigatório

## 📊 Stack Tecnológica

- **Frontend**: React 18 + TypeScript + Vite
- **Estilização**: TailwindCSS
- **Backend/Auth**: Supabase
- **Gráficos**: Recharts
- **Exportação**: jsPDF, PapaParse
- **APIs**: Meta Graph API, Google Ads API, TikTok Business API
- **IA**: OpenAI GPT-4

## 🤝 Suporte

Para problemas ou dúvidas:
1. Consulte a documentação relevante na pasta raiz
2. Verifique os logs do console do navegador (F12)
3. Revise as configurações no painel de desenvolvedor da plataforma

## 📝 Licença

Este projeto é proprietário e confidencial.

---

**Desenvolvido com ❤️ para otimização de campanhas de publicidade digital**
