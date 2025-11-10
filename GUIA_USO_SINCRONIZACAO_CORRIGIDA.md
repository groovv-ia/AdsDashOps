# Guia de Uso - Sistema de Sincronização Corrigido

## Como Sincronizar Dados do Meta Ads

### 1. Primeira Sincronização (Nova Conta)

1. Acesse o Dashboard
2. Vá em "Fontes de Dados" ou "Configurações"
3. Clique em "Conectar Meta Ads"
4. Siga o fluxo OAuth para autorizar o acesso
5. Selecione a conta de anúncios desejada
6. A sincronização iniciará automaticamente

**O que será sincronizado**:
- ✅ Todas as campanhas ativas e dos últimos 90 dias
- ✅ Todos os ad sets de cada campanha
- ✅ Todos os anúncios de cada ad set
- ✅ Métricas dos últimos 7 dias (primeira vez)
- ✅ TODOS os campos disponíveis na API Meta

### 2. Re-sincronização (Atualizar Dados)

Para atualizar os dados de uma conta já conectada:

1. Acesse o Dashboard
2. Encontre a conexão Meta Ads na lista
3. Clique no botão "Sincronizar Agora" (ícone de refresh)
4. Aguarde a conclusão (pode levar alguns minutos)

**Frequência Recomendada**:
- 📅 Diariamente para acompanhamento ativo
- 📅 Semanalmente para análise geral
- 📅 Manual quando fizer alterações nas campanhas

### 3. Progresso da Sincronização

Durante a sincronização, você verá:
- 🔄 Barra de progresso visual
- 📊 Percentual de conclusão
- 📝 Mensagens de status em tempo real
- ⏱️ Estimativa de tempo restante

**Mensagens Típicas**:
```
✓ Validando token de acesso...
✓ Buscando campanhas...
✓ Processando lote 1/3 de campanhas...
✓ Campanha "Verão 2024" salva (1/15)
✓ Buscando ad sets da campanha "Verão 2024"...
✓ Buscando métricas da campanha "Verão 2024"...
✓ Métricas salvas (7/7)
✓ Sincronização concluída com sucesso!
```

## Campos Sincronizados

### Métricas Básicas
- **Impressões** - Quantas vezes seus anúncios foram exibidos
- **Cliques** - Quantas vezes clicaram nos seus anúncios
- **Gasto** - Quanto você gastou
- **Alcance** - Quantas pessoas únicas viram seus anúncios
- **Frequência** - Quantas vezes cada pessoa viu em média

### Métricas de Taxa (Valores Reais da API)
- **CTR (Click-Through Rate)** - Taxa de cliques
- **CPC (Cost Per Click)** - Custo por clique
- **CPM (Cost Per Mille)** - Custo por mil impressões
- **CPP (Cost Per Point)** - Custo por ponto

### Conversões (Valores Reais)
- **Conversões** - Número de conversões rastreadas
- **Valor de Conversão** - Valor real em R$ das conversões
- **ROAS** - Retorno sobre investimento em anúncios
- **Custo por Resultado** - Quanto custou cada conversão

### Cliques Detalhados
- **Cliques Inline** - Cliques em links dentro do anúncio
- **Custo por Clique Inline** - Custo específico desses cliques
- **Cliques Outbound** - Cliques que saem da plataforma

### Vídeo
- **Visualizações de Vídeo** - Quantas pessoas assistiram seus vídeos

### Auditoria
- **Actions Raw** - JSON completo de todas as ações
- **Action Values Raw** - JSON completo de todos os valores

## Verificando os Dados

### No Dashboard

1. **Cards de Métricas** (topo da página)
   - Resumo geral de todas as campanhas
   - Valores totalizados do período selecionado

2. **Gráficos de Performance**
   - Tendências ao longo do tempo
   - Comparação entre métricas

3. **Tabela de Campanhas**
   - Detalhes de cada campanha individualmente
   - Ordenação por qualquer coluna
   - Filtros por status, plataforma, etc.

### Comparando com Meta Ads Manager

Para validar que os dados estão corretos:

1. **Acesse o Gerenciador de Anúncios da Meta**
2. **Selecione o mesmo período** no dashboard
3. **Compare as métricas principais**:
   - Gastos devem ser idênticos
   - Impressões devem ser idênticas
   - Conversões devem ser idênticas
   - **ROAS agora será igual!** (antes era estimado)

### Logs de Sincronização

Para debug avançado, verifique o console do navegador:

```javascript
// Abra DevTools (F12) e procure por:
✅ hasRealData: true (X campanhas encontradas)
✅ X métricas encontradas
✅ Métricas extraídas da API Meta
✅ Progresso da sincronização: Sincronização concluída com sucesso!
```

## Resolução de Problemas

### "Nenhuma métrica encontrada"

**Possíveis causas**:
1. Campanhas muito antigas (fora do período de 90 dias)
2. Campanhas sem dados (nunca rodaram)
3. Primeira sincronização ainda em andamento

**Solução**:
- Aguarde a conclusão da sincronização
- Verifique se as campanhas estão ativas no Meta
- Execute sincronização manual novamente

### "Token inválido"

**Causa**: Token de acesso expirado ou revogado

**Solução**:
1. Desconecte a conta Meta
2. Conecte novamente via OAuth
3. Autorize todas as permissões solicitadas

### "Rate limit atingido"

**Causa**: Muitas requisições em pouco tempo

**Solução**:
- O sistema aguardará automaticamente
- Mensagem: "Aguardando Xs devido ao limite da API..."
- Não cancele a sincronização, deixe continuar

### "Erro ao buscar campanhas"

**Possíveis causas**:
1. Problema de conexão com internet
2. API Meta temporariamente indisponível
3. Permissões insuficientes

**Solução**:
1. Verifique sua conexão de internet
2. Tente novamente em alguns minutos
3. Reconecte a conta se o problema persistir

## Dicas de Uso

### 1. Período de Análise
- Use "Últimos 7 dias" para acompanhamento diário
- Use "Últimos 30 dias" para análise mensal
- Use "Últimos 90 dias" para tendências de longo prazo

### 2. Filtros
- Filtre por plataforma (Meta, Google) para análise específica
- Filtre por status (Ativa, Pausada) para focar no que está rodando
- Use busca por nome para encontrar campanhas específicas

### 3. Exportação
- Exporte dados para análise externa (CSV, Excel)
- Gere relatórios PDF para compartilhar com clientes
- Use dados exportados para análise avançada

### 4. Insights de IA
- Verifique recomendações automáticas
- Analise padrões de performance
- Identifique oportunidades de otimização

## Métricas Mais Importantes

### Para E-commerce
1. **ROAS** - Retorno sobre investimento
2. **Valor de Conversão** - Quanto de receita gerou
3. **Custo por Resultado** - Quanto custou cada venda
4. **CTR** - Qualidade do criativo

### Para Geração de Leads
1. **Custo por Resultado** - Quanto custa cada lead
2. **Conversões** - Quantos leads gerou
3. **CTR** - Qualidade do anúncio
4. **CPM** - Eficiência do alcance

### Para Branding
1. **Alcance** - Quantas pessoas únicas viu
2. **Frequência** - Quantas vezes cada pessoa viu
3. **CPM** - Custo para alcançar mil pessoas
4. **Vídeo Views** - Engajamento com conteúdo

## Melhorias Implementadas

### Antes da Correção
❌ ROAS calculado com estimativa fixa
❌ Campos importantes faltando
❌ Dados inconsistentes entre serviços
❌ Sem validação de qualidade

### Depois da Correção
✅ ROAS com valor real de conversão
✅ TODOS os campos da API Meta
✅ Dados 100% consistentes
✅ Validação automática de qualidade
✅ Logs detalhados para debugging
✅ JSONs brutos salvos para auditoria

## Suporte

Se encontrar problemas:

1. **Verifique os logs** no console do navegador (F12)
2. **Tente sincronizar novamente** manualmente
3. **Reconecte a conta** se o problema persistir
4. **Documente o erro** com screenshots dos logs
5. **Entre em contato** com os detalhes do problema

## Changelog

### Versão Atual (Corrigida)
- ✅ Helper compartilhado de extração de métricas
- ✅ Todos os campos da API Meta sendo sincronizados
- ✅ Valores reais de conversão (não estimados)
- ✅ Validação automática de qualidade
- ✅ Logs detalhados de sincronização
- ✅ JSONs brutos salvos para auditoria
- ✅ Build validado e funcionando

### Próximas Melhorias
- 📅 Sincronização automática agendada
- 📅 Alertas de performance por email
- 📅 Comparação entre períodos
- 📅 Benchmarks de indústria
- 📅 Recomendações automáticas avançadas
