# 🚀 Guia de Uso: Token Meta Ads

Este guia explica como usar o token Meta Ads fornecido para conectar e sincronizar suas campanhas no AdsOPS.

## 📋 Token Fornecido

```
EAAL6ZAgmhK8ABP9ZCYZBPbOaclGZCp75ZA5y4Q4uU6ZAIuOkSj1UvCyMR5fqmBFaTn40u3qkFsTqBAPZA8z1y0pbdyzIQduksGNIu7Uc14mNP86vdgUnjstfdjeVwHsJQbYlqS22l5rq0ryKtCEliH1wAPUIVutDeXlrAfVz2PrEsyKZBaR3vgPBD5QOY9Fpsgk56gHSI8fDVZCe1K2njIyy6MTd2JhMft4uSVDkp4pZCYYwZC1hwQ74N0fXajQYzcJM8QvzB8XCEzSD5t7z2MBMxnw76uSTdVv1hryqmsZAFY3b5Btq9kYAGfLDX8SQL5MTOIfPDGg871cb
```

## 🎯 Passo a Passo

### 1. Acesse a Página de Integração Meta

1. Faça login na aplicação AdsOPS
2. No menu lateral esquerdo, clique em **"Integração Meta"** (ícone com raio ⚡)
3. Você verá uma página com dois passos principais

### 2. Conectar sua Conta Meta

Na seção **"Passo 1: Conectar Conta"**:

1. Cole o token fornecido no campo "Access Token da Meta"
2. Clique no ícone de olho para visualizar o token (opcional)
3. Clique no botão **"Validar Token"**
4. Aguarde a validação (alguns segundos)

Se o token for válido, você verá:
- ✅ Mensagem de sucesso
- Lista de contas publicitárias encontradas
- Informações de cada conta (nome, ID, moeda, timezone)

### 3. Selecionar Conta Publicitária

1. Na lista de contas exibida, selecione a conta que deseja conectar
2. Cada conta mostra:
   - Nome da conta
   - ID da conta
   - Moeda
   - Timezone
   - Status (Ativa/Inativa)
3. Clique no botão **"Salvar Conexão"**

✅ Sua conta agora está conectada!

### 4. Sincronizar Dados

Na seção **"Passo 2: Sincronizar Dados"**:

1. Selecione o período de dados que deseja importar:
   - Últimos 7 dias
   - Últimos 30 dias (recomendado)
   - Últimos 60 dias
   - Últimos 90 dias

2. Clique no botão **"Iniciar Sincronização"**

3. Acompanhe o progresso da sincronização:
   - Barra de progresso visual
   - Mensagens de status em tempo real
   - Estatísticas ao concluir

### 5. Visualizar Dados no Dashboard

Após a sincronização:

1. Clique em **"Dashboard"** no menu lateral
2. Você verá:
   - Métricas totais (impressões, cliques, gastos, conversões)
   - Gráfico de performance ao longo do tempo
   - Tabela com todas as campanhas importadas
   - Filtros por plataforma, campanha, período

## 📊 O que é Sincronizado

A integração importa automaticamente:

### Campanhas
- Nome da campanha
- Status (ativa, pausada, etc)
- Objetivo
- Orçamento diário e vitalício
- Datas de início e fim

### Métricas (por dia)
- **Impressões**: Quantas vezes seus anúncios foram exibidos
- **Cliques**: Quantos cliques seus anúncios receberam
- **Gastos**: Quanto você gastou em anúncios
- **Alcance**: Quantas pessoas únicas viram seus anúncios
- **CTR** (Click-Through Rate): Taxa de cliques
- **CPC** (Cost Per Click): Custo por clique
- **Conversões**: Ações completadas (compras, cadastros, etc)
- **ROAS** (Return on Ad Spend): Retorno sobre investimento

## 🔄 Sincronização Regular

### Frequência Recomendada
- **Diariamente**: Para acompanhamento ativo de campanhas
- **Semanalmente**: Para análises de tendências
- **Mensalmente**: Para relatórios gerais

### Como Sincronizar Novamente
1. Acesse **"Integração Meta"** no menu
2. Role até **"Passo 2: Sincronizar Dados"**
3. Clique em **"Iniciar Sincronização"**

⚠️ **Nota**: A sincronização substitui dados antigos pelos novos. Não há risco de duplicação.

## 🔒 Segurança

- ✅ Seu token é armazenado **criptografado** no banco de dados
- ✅ Apenas você pode acessar seus dados
- ✅ O token nunca é exposto no frontend
- ✅ Todas as comunicações são via HTTPS

## 🆘 Resolução de Problemas

### "Token inválido"
**Causa**: Token expirado ou incorreto
**Solução**:
1. Verifique se copiou o token completo
2. Gere um novo token no Facebook Graph API Explorer
3. Cole o novo token

### "Nenhuma conta encontrada"
**Causa**: Token não tem permissões ou conta sem acesso
**Solução**:
1. Verifique se o token tem permissões `ads_read` e `ads_management`
2. Confirme que você tem acesso às contas publicitárias no Facebook Business

### "Erro ao buscar campanhas"
**Causa**: Problemas de conectividade ou API da Meta indisponível
**Solução**:
1. Verifique sua conexão com a internet
2. Aguarde alguns minutos e tente novamente
3. Verifique o status da API da Meta: [Facebook Status](https://developers.facebook.com/status)

### "Sincronização lenta"
**Causa**: Muitas campanhas ou grande volume de dados
**Solução**:
1. Normal para contas com muitas campanhas
2. Aguarde a conclusão (pode levar alguns minutos)
3. Reduza o período de sincronização (ex: 30 dias em vez de 90)

## 📞 Suporte

Precisa de ajuda?

1. Acesse **"Ajuda e Suporte"** no menu lateral
2. Consulte a documentação oficial da Meta:
   - [Meta Marketing API](https://developers.facebook.com/docs/marketing-api)
   - [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
3. Verifique os logs de sincronização na própria interface

## ✨ Próximos Passos

Após conectar e sincronizar:

1. **Explore o Dashboard**
   - Visualize métricas consolidadas
   - Analise performance por campanha
   - Compare períodos

2. **Use a Análise com IA**
   - Obtenha insights automáticos
   - Receba recomendações de otimização
   - Identifique tendências

3. **Configure Notificações**
   - Receba alertas de performance
   - Monitore budget em tempo real
   - Acompanhe conversões

4. **Exporte Relatórios**
   - Gere relatórios em PDF
   - Exporte dados em CSV
   - Compartilhe com sua equipe

---

**Status do Sistema**: ✅ Pronto para uso
**Última atualização**: 31/10/2025
**Versão**: 1.0.0
