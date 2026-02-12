# ✅ Checklist: Configuração de Email no Supabase

Use este checklist para garantir que tudo está configurado corretamente.

---

## 📋 Pré-Requisitos

- [ ] Conta no Supabase criada
- [ ] Projeto AdsOps criado no Supabase
- [ ] Acesso ao Supabase Dashboard

---

## 🔧 Configuração do Template

### 1. Email Templates

- [ ] Acessei Supabase Dashboard → Authentication → Email Templates
- [ ] Selecionei a aba "Confirm signup"
- [ ] Copiei o template de `docs/email-templates/confirmation-simple.html`
- [ ] Colei o template no campo de texto
- [ ] Verifiquei que o link usa `{{ .ConfirmationURL }}`
- [ ] Cliquei em "Save" e vi confirmação de sucesso

### 2. URL Configuration

- [ ] Acessei Authentication → URL Configuration
- [ ] Configurei Site URL: `https://adsops.bolt.host`
- [ ] Adicionei Redirect URL: `https://adsops.bolt.host`
- [ ] Adicionei Redirect URL: `https://adsops.bolt.host/auth/callback`
- [ ] Adicionei Redirect URL: `https://adsops.bolt.host/**`
- [ ] Cliquei em "Save" e vi confirmação de sucesso

---

## 🧪 Testes

### 3. Teste de Cadastro

- [ ] Limpei cache do navegador (CTRL+SHIFT+DEL)
- [ ] Acessei https://adsops.bolt.host
- [ ] Cliquei em "Criar Conta"
- [ ] Preenchi o formulário com email válido
- [ ] Cliquei em "Cadastrar"
- [ ] Vi mensagem de sucesso sobre verificação de email

### 4. Teste de Email

- [ ] Recebi email em até 2 minutos
- [ ] Email está na caixa de entrada (não spam)
- [ ] Assunto do email está correto
- [ ] Design do email está renderizando bem
- [ ] Botão "Confirmar Meu Email" está visível
- [ ] Link alternativo (texto) está presente

### 5. Teste de Confirmação

- [ ] Cliquei no botão de confirmação no email
- [ ] Fui redirecionado para /auth/callback
- [ ] Vi mensagem "Confirmando seu Email..." (spinner)
- [ ] Após 1-2 segundos, vi "Email Confirmado com Sucesso!"
- [ ] Fui redirecionado automaticamente para o dashboard
- [ ] Consigo acessar a plataforma normalmente

---

## 🔍 Verificação Técnica

### 6. Validação da URL no Email

Abra o email e inspecione o link de confirmação:

- [ ] URL começa com `https://adsops.bolt.host/auth/callback`
- [ ] URL contém parâmetro `token_hash=...`
- [ ] Token hash tem 64 caracteres (não está truncado)
- [ ] URL contém parâmetro `type=signup`
- [ ] URL NÃO está quebrada em múltiplas linhas

**Exemplo de URL correta:**
```
https://adsops.bolt.host/auth/callback?token_hash=f220b134df9deb0a51ad28050d24ac319c515dc2ba06a7af634b36bf8&type=signup
```

### 7. Verificação no Console

Abra DevTools (F12) durante o teste:

- [ ] Não há erros no console durante redirect
- [ ] Request para Supabase retorna 200 OK
- [ ] Não há erros de CORS
- [ ] Session é criada com sucesso

---

## 🚨 Resolução de Problemas

Se algo não está funcionando, verifique:

### ❌ Email não chega

- [ ] Verificou pasta de spam/lixo
- [ ] Aguardou pelo menos 2-3 minutos
- [ ] Email usado é válido e está ativo
- [ ] Supabase SMTP está configurado (veja Settings → Project Settings → API)

### ❌ Erro "Token inválido"

- [ ] Template usa `{{ .ConfirmationURL }}` e não construção manual
- [ ] Template foi salvo no Supabase (botão Save clicado)
- [ ] URLs de redirecionamento foram salvas
- [ ] Cache do navegador foi limpo
- [ ] Usuário antigo foi deletado e novo cadastro feito

### ❌ Design do email quebrado

- [ ] Template completo foi copiado (incluindo comentários no topo)
- [ ] Nenhum caractere foi cortado durante o copy/paste
- [ ] Testou em outro cliente de email (Gmail, Outlook)

### ❌ Botão não funciona

- [ ] Clicou com botão direito → "Copiar endereço do link"
- [ ] Colou URL no navegador manualmente
- [ ] URL está completa (não truncada)
- [ ] Testou o link alternativo (texto) no email

---

## 📊 Status Final

Marque ✅ quando tudo estiver funcionando:

- [ ] ✅ Template configurado e salvo
- [ ] ✅ URLs configuradas e salvas
- [ ] ✅ Email chegando corretamente
- [ ] ✅ Link de confirmação funcionando
- [ ] ✅ Redirect para dashboard funcionando
- [ ] ✅ Usuário consegue fazer login após confirmação

---

## 📁 Arquivos de Referência

- `docs/email-templates/confirmation-simple.html` - Template simplificado (recomendado)
- `docs/email-templates/confirmation.html` - Template completo
- `docs/GUIA_RAPIDO_CORRECAO_EMAIL.md` - Guia passo a passo
- `CORRECAO_TEMPLATE_EMAIL_CONFIRMACAO.md` - Documentação detalhada

---

## 🎯 Próximos Passos

Após confirmar que tudo está funcionando:

- [ ] Testar com diferentes provedores de email (Gmail, Outlook, Yahoo)
- [ ] Testar em dispositivos móveis
- [ ] Configurar outros templates (Recovery, Magic Link, Invite)
- [ ] Personalizar mensagens de texto se necessário
- [ ] Configurar Rate Limiting para emails (evitar spam)

---

## 📞 Suporte

Se após seguir todo o checklist ainda houver problemas:

1. Revise a seção "Resolução de Problemas" acima
2. Verifique logs do console do navegador (F12)
3. Verifique logs do Supabase (Dashboard → Logs)
4. Consulte a documentação oficial do Supabase

---

**Data de verificação:** ___/___/______
**Verificado por:** _________________
**Status:** ⬜ Pendente | ⬜ Em Progresso | ⬜ Concluído

---

**Versão:** 1.0
**Última atualização:** 2026-02-12
