# Guia Rápido: Corrigir Template de Email no Supabase

## 🎯 Objetivo

Corrigir o erro **"Token de confirmação inválido ou ausente"** atualizando o template de email no Supabase Dashboard.

---

## ⚡ Passos Rápidos (3 minutos)

### 1️⃣ Acesse o Supabase Dashboard

- URL: https://app.supabase.com/
- Selecione seu projeto: **AdsOps Analytics**
- Vá em: **Authentication** → **Email Templates** → **Confirm signup**

### 2️⃣ Copie o Template Correto

Abra o arquivo do projeto:
```
docs/email-templates/confirmation-simple.html
```

Ou copie diretamente daqui: [Template no final deste documento](#template-corrigido)

### 3️⃣ Cole no Supabase

1. Selecione TODO o conteúdo do campo (CTRL+A)
2. Delete o conteúdo antigo
3. Cole o novo template
4. Clique em **Save**

### 4️⃣ Configure URLs

Ainda no Supabase, vá em **Authentication** → **URL Configuration**:

**Site URL:**
```
https://adsops.bolt.host
```

**Redirect URLs** (adicione estas 3 linhas):
```
https://adsops.bolt.host
https://adsops.bolt.host/auth/callback
https://adsops.bolt.host/**
```

Clique em **Save**

### 5️⃣ Teste

1. Limpe o cache do navegador (CTRL+SHIFT+DEL)
2. Faça um novo cadastro
3. Verifique o email
4. Clique no link de confirmação
5. Deve funcionar!

---

## 🔍 Como Saber se Está Correto?

### ✅ Template CORRETO usa:

```html
<a href="{{ .ConfirmationURL }}">Confirmar Email</a>
```

### ❌ Template INCORRETO usa:

```html
<!-- NÃO use nada disso: -->
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}">...</a>
<a href="{{ .SiteURL }}/auth/callback?token={{ .Token }}">...</a>
```

**Regra de ouro:** Use APENAS `{{ .ConfirmationURL }}` no link!

---

## 🚨 Troubleshooting

### Problema: "Email não chega"
- Verifique spam
- Aguarde até 2 minutos
- Tente reenviar o email de confirmação

### Problema: "Token ainda inválido"
- Certifique-se que salvou o template
- Limpe completamente o cache do navegador
- Delete o usuário antigo no Supabase e cadastre novamente
- Verifique se as URLs estão corretas

### Problema: "Botão não funciona no email"
- Use o link alternativo (texto) que aparece no email
- Copie e cole no navegador manualmente

---

## 📝 Checklist Final

Antes de testar, certifique-se:

- [ ] Template atualizado com `{{ .ConfirmationURL }}`
- [ ] Template salvo no Supabase (botão "Save" clicado)
- [ ] Site URL: `https://adsops.bolt.host`
- [ ] Redirect URLs adicionadas (3 URLs)
- [ ] URLs salvas (botão "Save" clicado)
- [ ] Cache do navegador limpo
- [ ] Pronto para testar novo cadastro!

---

## 📄 Template Corrigido

<details>
<summary><strong>Clique aqui para ver o template completo (copie este código)</strong></summary>

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">
      AdsOps Analytics
    </h1>
    <p style="color: #e0e7ff; font-size: 13px; margin: 8px 0 0 0;">
      Plataforma de Análise de Campanhas
    </p>
  </div>

  <!-- Conteúdo -->
  <div style="padding: 30px 20px; background-color: #f9fafb;">

    <h2 style="color: #111827; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
      Bem-vindo ao AdsOps! 🎉
    </h2>

    <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">
      Obrigado por se cadastrar na nossa plataforma.
    </p>

    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
      Para ativar sua conta e começar a usar todas as funcionalidades, clique no botão abaixo para confirmar seu email:
    </p>

    <!-- Botão CTA -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}"
         style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
        ✓ Confirmar Meu Email
      </a>
    </div>

    <!-- Separador -->
    <div style="border-top: 1px solid #e5e7eb; margin: 25px 0;"></div>

    <!-- Link Alternativo -->
    <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0 0 10px 0; text-align: center;">
      Se o botão não funcionar, copie e cole este link no navegador:
    </p>
    <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin: 0 0 24px 0;">
      <p style="color: #3b82f6; font-size: 12px; line-height: 1.5; margin: 0; word-break: break-all; text-align: center; font-family: monospace;">
        {{ .ConfirmationURL }}
      </p>
    </div>

    <!-- Avisos -->
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 6px 6px 0; margin: 0 0 16px 0;">
      <p style="color: #92400e; font-size: 13px; line-height: 1.5; margin: 0;">
        <strong>⏱️ Importante:</strong> Este link expira em 24 horas.
      </p>
    </div>

    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 0 6px 6px 0; margin: 0;">
      <p style="color: #065f46; font-size: 13px; line-height: 1.5; margin: 0;">
        <strong>🔒 Segurança:</strong> Se você não criou esta conta, ignore este email.
      </p>
    </div>

  </div>

  <!-- Footer -->
  <div style="padding: 20px; text-align: center; background-color: #f3f4f6; border-radius: 0 0 12px 12px;">
    <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 0 0 6px 0;">
      <strong>AdsOps Analytics</strong> - Plataforma de Análise de Campanhas
    </p>
    <p style="color: #9ca3af; font-size: 11px; line-height: 1.4; margin: 0;">
      Este é um email automático. Não responda a esta mensagem.
    </p>
  </div>

</div>
```

</details>

---

## 📞 Suporte

Se após seguir todos os passos ainda houver problemas:

1. Verifique os logs do console (F12 no navegador)
2. Confirme que as variáveis de ambiente estão corretas
3. Tente usar outro email para testar
4. Verifique se o email não está sendo bloqueado pelo provedor

---

**Última atualização:** 2026-02-12
**Tempo estimado:** 3-5 minutos
**Dificuldade:** Fácil
