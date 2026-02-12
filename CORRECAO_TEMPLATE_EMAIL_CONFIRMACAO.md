# Correção do Template de Email de Confirmação

## Problema Identificado

O erro "Token de confirmação inválido ou ausente" ocorre porque o template de email no Supabase está configurado incorretamente, gerando URLs com tokens truncados ou inválidos.

**Exemplo de URL incorreta:**
```
https://adsops.bolt.host/auth/callback?token_hash=f220b134df9deb0a51ad28050d24ac319c515dc2ba06a7af634b36bf8&type=signup
```

O `token_hash` está incompleto, causando falha na validação.

## Causa Raiz

O template está usando **construção manual da URL** com variáveis como `{{ .TokenHash }}` ao invés de usar a variável pronta `{{ .ConfirmationURL }}` fornecida pelo Supabase.

---

## Solução: Corrigir Template no Supabase Dashboard

### Passo 1: Acessar Email Templates

1. Acesse o [Supabase Dashboard](https://app.supabase.com/)
2. Selecione seu projeto
3. No menu lateral, vá em **Authentication** > **Email Templates**
4. Clique na aba **Confirm signup**

### Passo 2: Substituir o Template

**Substitua o template atual pelo código correto abaixo:**

```html
<h2>Bem-vindo ao AdsOps Analytics!</h2>

<p>Obrigado por se cadastrar na nossa plataforma.</p>

<p>Para ativar sua conta e começar a usar, clique no botão abaixo para confirmar seu email:</p>

<p>
  <a href="{{ .ConfirmationURL }}"
     style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
    Confirmar Email
  </a>
</p>

<p>Ou copie e cole este link no seu navegador:</p>
<p style="word-break: break-all; color: #6b7280;">{{ .ConfirmationURL }}</p>

<p style="margin-top: 32px; color: #6b7280; font-size: 14px;">
  Se você não solicitou este cadastro, ignore este email.
</p>

<p style="color: #6b7280; font-size: 14px;">
  Equipe AdsOps Analytics
</p>
```

### Passo 3: Configurar URLs de Redirecionamento

Ainda no Supabase Dashboard:

1. Vá em **Authentication** > **URL Configuration**
2. Configure os seguintes campos:

**Site URL:**
```
https://adsops.bolt.host
```

**Redirect URLs:** (Adicione uma URL por linha)
```
https://adsops.bolt.host
https://adsops.bolt.host/auth/callback
https://adsops.bolt.host/**
```

3. Clique em **Save** para salvar as configurações

### Passo 4: Testar a Correção

1. **Limpe o cache do navegador:**
   - Pressione `Ctrl+Shift+Del` (Windows/Linux) ou `Cmd+Shift+Del` (Mac)
   - Selecione "Cookies e outros dados do site" e "Imagens e arquivos em cache"
   - Clique em "Limpar dados"

2. **Delete o usuário de teste antigo (opcional):**
   - No Supabase Dashboard, vá em **Authentication** > **Users**
   - Encontre o usuário `groovv.ia@gmail.com`
   - Clique nos três pontos e selecione **Delete user**

3. **Faça um novo cadastro:**
   - Acesse `https://adsops.bolt.host`
   - Clique em "Criar Conta"
   - Preencha o formulário com um email válido
   - Clique em "Cadastrar"

4. **Verifique o email:**
   - Abra sua caixa de entrada
   - Procure o email de confirmação
   - **IMPORTANTE:** Verifique se a URL no email está completa e não truncada
   - Clique no link de confirmação

5. **Resultado esperado:**
   - Você será redirecionado para `/auth/callback`
   - Verá a mensagem "Confirmando seu Email..." (spinner)
   - Após 1-2 segundos: "Email Confirmado com Sucesso!"
   - Redirecionamento automático para o dashboard em 5 segundos

---

## Outros Templates de Email (Opcional)

Para manter a consistência, você também pode corrigir os outros templates:

### Magic Link Template

```html
<h2>Login sem senha</h2>
<p>Clique no link abaixo para fazer login:</p>
<p><a href="{{ .ConfirmationURL }}">Fazer Login</a></p>
<p>Este link expira em 1 hora.</p>
```

### Recovery/Reset Password Template

```html
<h2>Redefinir Senha</h2>
<p>Recebemos uma solicitação para redefinir sua senha.</p>
<p>Clique no link abaixo para criar uma nova senha:</p>
<p><a href="{{ .ConfirmationURL }}">Redefinir Senha</a></p>
<p>Se você não solicitou esta alteração, ignore este email.</p>
<p>Este link expira em 1 hora.</p>
```

### Invite User Template

```html
<h2>Você foi convidado!</h2>
<p>Você foi convidado para se juntar ao AdsOps Analytics.</p>
<p>Clique no link abaixo para aceitar o convite e criar sua conta:</p>
<p><a href="{{ .ConfirmationURL }}">Aceitar Convite</a></p>
```

---

## Variáveis Disponíveis no Supabase

Para referência futura, aqui estão as variáveis que o Supabase disponibiliza nos templates:

| Variável | Descrição |
|----------|-----------|
| `{{ .ConfirmationURL }}` | **Use esta!** URL completa com todos os parâmetros necessários |
| `{{ .Token }}` | Token bruto (não usar diretamente) |
| `{{ .TokenHash }}` | Hash do token (não usar diretamente) |
| `{{ .SiteURL }}` | URL base do site |
| `{{ .Email }}` | Email do usuário |

**IMPORTANTE:** Sempre use `{{ .ConfirmationURL }}` para links de confirmação. Esta variável já inclui todos os parâmetros necessários (token, hash, type, etc.) formatados corretamente.

---

## Por Que Usar {{ .ConfirmationURL }}?

A variável `{{ .ConfirmationURL }}` é gerada pelo Supabase e inclui automaticamente:

- ✅ Token completo e válido
- ✅ Hash correto do token
- ✅ Parâmetros PKCE (quando aplicável)
- ✅ Type correto (signup, recovery, etc.)
- ✅ Redirecionamento para a URL configurada
- ✅ Expiração adequada

Quando você tenta construir a URL manualmente, pode ocorrer:

- ❌ Tokens truncados
- ❌ Parâmetros faltando
- ❌ Hash inválido
- ❌ Type incorreto
- ❌ Problemas com encoding de caracteres

---

## Troubleshooting

### Ainda recebo "Token inválido" após corrigir

1. Verifique se salvou o template no Supabase
2. Delete o usuário antigo e cadastre novamente
3. Limpe completamente o cache do navegador
4. Verifique se a URL de redirecionamento está correta

### O email não chega

1. Verifique a caixa de spam
2. No Supabase, vá em **Settings** > **Project Settings** > **API**
3. Verifique se o email está configurado corretamente
4. Para desenvolvimento, considere usar um serviço de email de teste como Mailtrap

### Email chega mas o link está quebrado

1. Verifique se usou `{{ .ConfirmationURL }}` e não construiu a URL manualmente
2. Verifique se a Site URL está configurada corretamente
3. Verifique se adicionou todas as Redirect URLs

---

## Checklist Final

- [ ] Template de email atualizado com `{{ .ConfirmationURL }}`
- [ ] Site URL configurada: `https://adsops.bolt.host`
- [ ] Redirect URLs adicionadas (incluindo `/auth/callback`)
- [ ] Configurações salvas no Supabase
- [ ] Cache do navegador limpo
- [ ] Novo cadastro testado
- [ ] Email recebido com URL completa
- [ ] Confirmação funcionando corretamente
- [ ] Redirecionamento para dashboard funcionando

---

## Resultado Esperado

Após aplicar as correções, o fluxo completo será:

1. Usuário preenche formulário de cadastro
2. Recebe email de confirmação instantaneamente
3. Clica no link do email
4. É redirecionado para `/auth/callback` com URL completa e válida
5. Vê spinner "Confirmando seu Email..."
6. Vê mensagem de sucesso após 1-2 segundos
7. É redirecionado automaticamente para o dashboard em 5 segundos
8. Está logado e pode usar a plataforma

---

## Suporte

Se após seguir todos os passos ainda houver problemas:

1. Verifique os logs do console do navegador (F12)
2. Verifique se há erros na aba Network (requisições para Supabase)
3. Confirme que está usando a versão mais recente do código
4. Verifique se as variáveis de ambiente estão corretas no `.env`

---

**Última atualização:** 2026-02-12
