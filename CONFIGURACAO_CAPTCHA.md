# Como Resolver o Erro "captcha verification process failed"

## 🔴 Problema

Ao tentar fazer login ou criar uma conta, você recebe o erro:
```
captcha verification process failed
```

Este erro ocorre quando o Supabase tem o CAPTCHA habilitado mas não está configurado corretamente na aplicação.

## ✅ Solução: Desabilitar CAPTCHA no Supabase

### Passo 1: Acessar o Dashboard do Supabase

1. Vá para [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto **AdAnalytics** (ou o nome do seu projeto)
3. No menu lateral esquerdo, clique em **Authentication**

### Passo 2: Desabilitar o CAPTCHA

1. Na página de Authentication, clique na aba **Settings** (Configurações)
2. Role a página até encontrar a seção **Bot and Abuse Protection**
3. Você verá uma opção para **Enable Captcha protection**
4. **Desmarque** (desabilite) esta opção
5. Clique em **Save** para salvar as alterações

### Passo 3: Testar Novamente

1. Volte para sua aplicação
2. Tente fazer login ou criar uma conta novamente
3. O erro não deve mais aparecer

## 🔧 Solução Alternativa: Configurar CAPTCHA Corretamente

Se você **QUER** manter o CAPTCHA habilitado por questões de segurança, siga estes passos:

### Opção 1: Google reCAPTCHA v2

1. Vá para [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Crie um novo site com reCAPTCHA v2 (Checkbox)
3. Adicione seu domínio (e localhost para desenvolvimento)
4. Copie a **Site Key** e **Secret Key**
5. No Supabase:
   - Vá para **Authentication** > **Settings**
   - Em **Bot and Abuse Protection**, habilite CAPTCHA
   - Cole a **Site Key** no campo apropriado
   - Cole a **Secret Key** no campo de configuração
   - Salve as alterações

### Opção 2: hCaptcha

1. Vá para [hCaptcha Dashboard](https://dashboard.hcaptcha.com/)
2. Crie uma nova conta se necessário
3. Adicione um novo site
4. Copie a **Site Key** e **Secret Key**
5. Configure no Supabase seguindo os mesmos passos acima

## 📝 Notas Importantes

### Para Desenvolvimento Local

Durante o desenvolvimento, é **recomendado desabilitar o CAPTCHA** para facilitar os testes. Você pode habilitá-lo novamente quando for para produção.

### Para Produção

Em produção, **recomenda-se habilitar o CAPTCHA** para proteger contra:
- Ataques de força bruta
- Criação automatizada de contas falsas
- Bots maliciosos

### Configuração Atual do Código

O código da aplicação já está preparado para funcionar com ou sem CAPTCHA:

```typescript
// No arquivo src/lib/supabase.ts
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
  options: {
    // Desabilita CAPTCHA no lado do cliente
    captchaToken: undefined,
  },
});

// Tratamento específico para erro de CAPTCHA
if (error && error.message.includes('captcha')) {
  throw new Error('Erro de verificação de segurança. Por favor, desabilite o CAPTCHA nas configurações do Supabase.');
}
```

## 🎯 Checklist de Verificação

- [ ] Acessei o dashboard do Supabase
- [ ] Fui em Authentication > Settings
- [ ] Desabilitei o CAPTCHA em Bot and Abuse Protection
- [ ] Salvei as alterações
- [ ] Testei o login novamente
- [ ] Funcionou! ✅

## 🆘 Ainda com Problemas?

Se após desabilitar o CAPTCHA você ainda tiver problemas:

1. **Limpe o cache do navegador**
   - Pressione `Ctrl + Shift + Delete` (Windows/Linux) ou `Cmd + Shift + Delete` (Mac)
   - Selecione "Cookies e outros dados do site"
   - Clique em "Limpar dados"

2. **Tente em uma janela anônima**
   - Abra uma janela anônima/privada no navegador
   - Teste o login novamente

3. **Verifique as credenciais do Supabase**
   - Certifique-se de que as variáveis de ambiente estão corretas no arquivo `.env`
   - Verifique se a `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão corretas

4. **Verifique os logs do Supabase**
   - No dashboard, vá em **Logs** > **Auth logs**
   - Procure por erros relacionados ao login

## 📞 Suporte

Se o problema persistir, entre em contato através da página de Suporte no dashboard da aplicação ou consulte a [documentação oficial do Supabase](https://supabase.com/docs/guides/auth).
