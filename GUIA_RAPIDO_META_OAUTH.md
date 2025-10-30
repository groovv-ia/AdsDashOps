# ⚡ Guia Rápido: Resolver Erro OAuth Meta Ads

## 🚨 Erro: "Não é possível carregar a URL - O domínio dessa URL não está incluído nos domínios do app"

### Solução em 3 Passos:

#### 1️⃣ Adicione o domínio no Facebook Developers

1. Acesse: [https://developers.facebook.com](https://developers.facebook.com)
2. Selecione seu app
3. Vá em: **Configurações > Básico**
4. Na seção **"Domínios do App"**, adicione:
   ```
   adsops.bolt.host
   ```
5. Clique em **"Salvar Alterações"**

#### 2️⃣ Configure URLs de Redirecionamento OAuth

1. No menu lateral: **Produtos > Facebook Login > Configurações**
2. No campo **"URIs de Redirecionamento do OAuth Válidos"**, adicione:
   ```
   https://adsops.bolt.host/oauth-callback
   https://adsops.bolt.host/
   ```
3. Clique em **"Salvar Alterações"**

#### 3️⃣ Adicione Plataforma Web (se ainda não tiver)

1. Em **Configurações > Básico**
2. Role até **"Plataforma"**
3. Clique em **"Adicionar Plataforma" > Site**
4. No campo **"URL do Site"**, adicione:
   ```
   https://adsops.bolt.host
   ```
5. Clique em **"Salvar Alterações"**

---

## ✅ Checklist Rápido

Antes de tentar novamente no AdsOPS, confirme:

- [ ] Domínio `adsops.bolt.host` adicionado em "Domínios do App"
- [ ] URLs OAuth configuradas (ambas as URLs)
- [ ] Plataforma Web adicionada
- [ ] Produto "Marketing API" adicionado ao app
- [ ] Aguardou 1-2 minutos após salvar as configurações

---

## 🔍 Onde Encontrar Cada Configuração:

| Configuração | Localização |
|-------------|-------------|
| **Domínios do App** | Configurações > Básico > Domínios do App |
| **URLs OAuth** | Produtos > Facebook Login > Configurações > URIs de Redirecionamento do OAuth Válidos |
| **Plataforma Web** | Configurações > Básico > Plataforma (no final da página) |
| **App ID/Secret** | Configurações > Básico (no topo da página) |

---

## 📝 Valores Corretos para Copiar:

**Domínio:**
```
adsops.bolt.host
```

**URLs OAuth (adicionar ambas, uma por linha):**
```
https://adsops.bolt.host/oauth-callback
https://adsops.bolt.host/
```

**URL do Site:**
```
https://adsops.bolt.host
```

---

## ⏰ Tempo de Propagação

Após salvar as configurações:
- Aguarde **1-2 minutos** para as mudanças propagarem
- Limpe o cache do navegador se necessário
- Tente novamente a autorização no AdsOPS

---

## 🆘 Ainda com problemas?

Consulte o guia completo: `CONFIGURACAO_META_ADS_OAUTH_PASSO_A_PASSO.md`
