# Templates de Email - AdsOps Analytics

Este diretório contém os templates de email otimizados para usar no Supabase Authentication.

## 📁 Arquivos Disponíveis

### `confirmation.html`
Template completo e profissional para confirmação de email de cadastro.

**Características:**
- Design moderno com gradiente azul
- Header com branding
- Ícone visual de email
- Botão CTA destacado
- Link alternativo para fallback
- Boxes de aviso (expiração e segurança)
- Lista de benefícios da plataforma
- Footer com links úteis
- Responsivo para mobile

**Quando usar:** Para produção, quando você quer uma experiência de email premium.

---

### `confirmation-simple.html` ⭐ **RECOMENDADO**
Template simplificado e fácil de implementar.

**Características:**
- Design limpo e profissional
- Header com gradiente azul
- Botão CTA claro
- Link alternativo
- Avisos de expiração e segurança
- Mais leve e rápido de carregar

**Quando usar:** Para começar rapidamente ou quando você prefere simplicidade.

---

### `confirmation-corrected.html`
Template com HTML de email otimizado usando tables (compatibilidade máxima).

**Características:**
- Usa estrutura de tables HTML para máxima compatibilidade
- Funciona em todos os clientes de email (Gmail, Outlook, etc.)
- Suporte para Outlook com código condicional MSO
- Design profissional e robusto

**Quando usar:** Se você precisa garantir que o email renderize perfeitamente em clientes antigos.

---

### Outros Templates

- `invite.html` - Template para convites de equipe
- `magic-link.html` - Template para login sem senha
- `recovery.html` - Template para recuperação de senha

---

## 🚀 Como Usar

### Passo 1: Escolha o Template

Recomendamos começar com `confirmation-simple.html`.

### Passo 2: Copie o Conteúdo

Abra o arquivo e copie todo o conteúdo HTML.

### Passo 3: Cole no Supabase

1. Acesse [Supabase Dashboard](https://app.supabase.com/)
2. Vá em **Authentication** → **Email Templates**
3. Selecione o tipo de template (ex: **Confirm signup**)
4. Cole o HTML no campo de texto
5. Clique em **Save**

### Passo 4: Configure URLs

Em **Authentication** → **URL Configuration**:

- **Site URL:** `https://adsops.bolt.host`
- **Redirect URLs:**
  - `https://adsops.bolt.host`
  - `https://adsops.bolt.host/auth/callback`
  - `https://adsops.bolt.host/**`

---

## ⚠️ Importante: Use {{ .ConfirmationURL }}

**SEMPRE use a variável `{{ .ConfirmationURL }}` no link de confirmação!**

### ✅ Correto:
```html
<a href="{{ .ConfirmationURL }}">Confirmar Email</a>
```

### ❌ Incorreto:
```html
<!-- NÃO faça isso: -->
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}">Confirmar</a>
<a href="{{ .SiteURL }}/auth/callback?token={{ .Token }}">Confirmar</a>
```

**Por quê?**
- `{{ .ConfirmationURL }}` já inclui todos os parâmetros necessários
- Construir a URL manualmente pode gerar tokens truncados ou inválidos
- O Supabase gerencia automaticamente PKCE, expiração e outros detalhes de segurança

---

## 🎨 Personalização

### Cores da Marca

Os templates usam a paleta de cores do AdsOps:

- **Primária:** `#3b82f6` (Azul vibrante)
- **Secundária:** `#2563eb` (Azul escuro)
- **Texto:** `#111827` (Cinza muito escuro)
- **Texto secundário:** `#6b7280` (Cinza médio)
- **Sucesso:** `#10b981` (Verde)
- **Aviso:** `#f59e0b` (Amarelo/Laranja)

### Modificando o Template

Para personalizar:

1. Abra o arquivo HTML no seu editor
2. Busque por cores hexadecimais (ex: `#3b82f6`)
3. Substitua pelas cores desejadas
4. Ajuste textos e mensagens
5. Salve e teste enviando um email de teste

**Dica:** Teste sempre em diferentes clientes de email (Gmail, Outlook, Apple Mail).

---

## 🧪 Como Testar

### Teste Básico

1. Faça um novo cadastro no app
2. Verifique se o email chega
3. Confira se o design está correto
4. Clique no link de confirmação
5. Verifique se funciona

### Teste Completo

Use ferramentas como:
- [Litmus](https://litmus.com/) - Preview em vários clientes
- [Email on Acid](https://www.emailonacid.com/) - Testes de compatibilidade
- [Mailtrap](https://mailtrap.io/) - Email testing para desenvolvimento

---

## 📱 Compatibilidade

Os templates foram testados e funcionam em:

- ✅ Gmail (Web, iOS, Android)
- ✅ Outlook (Web, Desktop, Mobile)
- ✅ Apple Mail (macOS, iOS)
- ✅ Yahoo Mail
- ✅ ProtonMail
- ✅ Thunderbird
- ✅ Outros clientes modernos

---

## 🔧 Variáveis do Supabase

Variáveis disponíveis nos templates:

| Variável | Descrição | Quando Usar |
|----------|-----------|-------------|
| `{{ .ConfirmationURL }}` | URL completa de confirmação | **SEMPRE para links** |
| `{{ .Email }}` | Email do usuário | Para personalização |
| `{{ .SiteURL }}` | URL base do site | Links para o site |
| `{{ .Token }}` | Token bruto | ❌ Não use diretamente |
| `{{ .TokenHash }}` | Hash do token | ❌ Não use diretamente |

---

## 📚 Recursos Adicionais

- [Supabase Email Templates Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [HTML Email Best Practices](https://www.campaignmonitor.com/dev-resources/guides/coding/)
- [Can I Email](https://www.caniemail.com/) - Compatibilidade de CSS em emails

---

## 🐛 Solução de Problemas

### Email não chega
- Verifique spam/lixo eletrônico
- Confirme SMTP settings no Supabase
- Teste com diferentes provedores (Gmail, Outlook)

### Link não funciona
- Certifique-se de usar `{{ .ConfirmationURL }}`
- Verifique se as Redirect URLs estão configuradas
- Confirme que salvou o template no Supabase

### Design quebrado
- Evite CSS avançado (flexbox, grid)
- Use tables para layout
- Teste inline styles
- Use o template `confirmation-corrected.html` para máxima compatibilidade

---

## 📝 Notas

- Todos os templates usam inline CSS para máxima compatibilidade
- Imagens devem ser hospedadas externamente (não use base64)
- Links sempre devem usar URLs absolutas (https://...)
- Evite JavaScript (não funciona em emails)
- Mantenha o HTML leve (< 100KB recomendado)

---

**Última atualização:** 2026-02-12
**Versão:** 1.0
**Mantido por:** AdsOps Team
