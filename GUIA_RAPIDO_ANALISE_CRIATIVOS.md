# Guia Rápido: Sistema de Análise de Criativos com IA

## Acessando o Sistema

1. Faça login no AdsOPS
2. No menu lateral (Sidebar), procure pela seção **"Análise com IA"** (ícone de Sparkles ✨)
3. Clique em **"Hub de Análises"** para ver todas as opções disponíveis

## 1. Análise de Carrossel

### Quando Usar
- Anúncios com 2+ slides/cards
- Para otimizar ordem dos slides
- Avaliar storytelling e coerência visual

### O Que Você Recebe
- **Overall Score**: Pontuação geral do carrossel (0-100)
- **Storytelling Score**: Qualidade do fluxo narrativo
- **Coherence Score**: Consistência visual entre slides
- **Análise por Slide**: Score individual + insights específicos
- **Sugestões**: Recomendações de reordenação e melhorias

### Como Usar
```typescript
// No código - exemplo de uso
const analysis = await requestCarouselAnalysis({
  ad_id: 'seu_ad_id',
  meta_ad_account_id: 'act_xxxxx',
  slides: [
    {
      slide_number: 1,
      image_url: 'https://cdn.example.com/slide1.jpg',
      copy_data: { title: 'Título do Slide 1' }
    },
    {
      slide_number: 2,
      image_url: 'https://cdn.example.com/slide2.jpg',
      copy_data: { title: 'Título do Slide 2' }
    }
  ]
});
```

### Interpretando os Resultados
- **Score 80-100**: Excelente, mantém estrutura
- **Score 60-79**: Bom, pequenos ajustes recomendados
- **Score 40-59**: Necessita melhorias significativas
- **Score 0-39**: Requer reestruturação completa

---

## 2. Análise de Vídeo

### Quando Usar
- Anúncios em vídeo no feed/stories
- Para otimizar gancho e retenção
- Avaliar efetividade do CTA

### O Que Você Recebe
- **Overall Score**: Pontuação geral do vídeo
- **Hook Score**: Qualidade dos primeiros 3 segundos (CRÍTICO!)
- **Retention Score**: Capacidade de manter atenção
- **CTA Score**: Efetividade do call-to-action
- **Análise por Frame**: Insights de momentos-chave

### Frames Recomendados para Análise
- **0s**: Primeiro frame (thumb)
- **3s**: Fim do gancho
- **Meio do vídeo**: Desenvolvimento
- **Últimos 3s**: CTA final

### Como Usar
```typescript
const analysis = await requestVideoAnalysis({
  ad_id: 'seu_ad_id',
  meta_ad_account_id: 'act_xxxxx',
  video_url: 'https://video.example.com/video.mp4',
  video_duration_seconds: 30,
  frame_timestamps: [0, 3, 15, 27], // Momentos-chave
  performance_context: {
    video_completion_rate: 0.45 // 45% de conclusão
  }
});
```

### Hook Score - Atenção Especial!
O Hook Score (primeiros 3s) é o mais importante:
- **Score 85+**: Gancho excelente, para o scroll
- **Score 70-84**: Bom gancho, pode melhorar
- **Score <70**: URGENTE - gancho fraco, revisar imediatamente

---

## 3. Análise AIDA de Copy

### Quando Usar
- Para todos os anúncios com texto
- Avaliar efetividade da mensagem
- Otimizar conversão através da copy

### O Framework AIDA
1. **Attention (Atenção)**: O headline captura atenção?
2. **Interest (Interesse)**: O texto mantém interesse?
3. **Desire (Desejo)**: Cria desejo pelo produto?
4. **Action (Ação)**: O CTA é claro e urgente?

### O Que Você Recebe
- **4 Scores AIDA**: Um para cada etapa (0-100)
- **Power Words Analysis**: Palavras de impacto identificadas
- **Gatilhos Emocionais**: Quais foram usados e como
- **Sugestões Específicas**: Para cada etapa AIDA

### Como Usar
```typescript
const analysis = await requestAIDAAnalysis({
  ad_id: 'seu_ad_id',
  meta_ad_account_id: 'act_xxxxx',
  copy_data: {
    headline: 'Economize 50% Hoje - Oferta Relâmpago!',
    body: 'Transforme sua rotina com nosso produto revolucionário...',
    cta: 'Garantir Meu Desconto Agora'
  },
  image_url: 'https://...' // Opcional para sinergia visual-textual
});
```

### Interpretando Power Words Score
- **Score 80+**: Copy com linguagem forte e persuasiva
- **Score 60-79**: Boa copy, adicionar mais power words
- **Score <60**: Copy fraca, reescrever com foco em persuasão

---

## 4. Testes A/B Inteligentes

### Quando Usar
- Após receber análises de criativos
- Para validar hipóteses de otimização
- Criar cultura de testes contínuos

### Tipos de Teste Sugeridos
- **Visual**: Cores, imagens, layouts
- **Copy**: Headlines, body text, CTA
- **CTA**: Texto do botão, posicionamento
- **Carousel Order**: Ordem dos slides
- **Video Length**: Duração do vídeo

### O Que Você Recebe em Cada Sugestão
- **Hipótese Clara**: "Mudar X para Y aumentará Z"
- **Prioridade**: Alta, Média ou Baixa
- **Impacto Esperado**: Ex: "+15-25% no CTR"
- **Métricas para Acompanhar**: Quais KPIs observar
- **Dificuldade**: Fácil, Média ou Difícil de implementar

### Workflow de Teste A/B
1. **Receber Sugestão**: IA analisa e sugere teste
2. **Planejar**: Marcar como "Planejado"
3. **Implementar**: Criar variante no Meta Ads Manager
4. **Acompanhar**: Registrar ID da variante
5. **Analisar**: Comparar resultados após período mínimo
6. **Aprender**: Documentar learnings

### Como Criar Sugestão Manual
```typescript
const suggestion = await createABTestSuggestion({
  ad_id: 'seu_ad_id',
  meta_ad_account_id: 'act_xxxxx',
  test_type: 'cta',
  priority: 'high',
  hypothesis: 'Trocar CTA de "Saiba Mais" para "Garantir Desconto" aumentará conversões',
  variant_description: 'Usar CTA com urgência e benefício claro',
  what_to_change: 'Texto do botão CTA',
  expected_outcome: 'Aumento de 20-30% na taxa de conversão',
  expected_impact_percentage: '+20-30%',
  metrics_to_track: ['Conversion Rate', 'Cost Per Conversion'],
  implementation_difficulty: 'easy'
});
```

---

## Boas Práticas

### Frequência de Análise
- **Carrosséis Novos**: Analisar antes de lançar
- **Vídeos**: Analisar na criação E após 1 semana de veiculação
- **Copy**: Analisar variações antes de A/B test
- **Testes A/B**: Revisar sugestões semanalmente

### Ordem Recomendada
1. Comece com **Análise AIDA** (mais rápida e barata)
2. Se houver vídeo, faça **Análise de Vídeo** (foco no hook!)
3. Se houver carrossel, faça **Análise de Carrossel**
4. Com resultados, revise **Sugestões de Teste A/B**

### Dicas de Otimização
- **Hook de Vídeo < 70**: URGENTE - É a métrica mais crítica
- **AIDA Action Score < 60**: CTA fraco, ajustar imediatamente
- **Carousel Storytelling < 60**: Revisar ordem dos slides
- **Power Words Score < 50**: Reescrever copy com linguagem mais persuasiva

### Interpretando Scores Gerais
- **90-100**: Criativo excepcional, referência
- **75-89**: Criativo forte, pequenos ajustes
- **60-74**: Criativo médio, melhorias necessárias
- **45-59**: Criativo fraco, revisão urgente
- **0-44**: Criativo problemático, refazer

---

## Custos e Performance

### Tempo de Análise
- **AIDA (só texto)**: ~15-30 segundos
- **AIDA (com imagem)**: ~30-45 segundos
- **Carrossel (3 slides)**: ~45-60 segundos
- **Vídeo (4 frames)**: ~60-90 segundos

### Custo Aproximado
- **AIDA texto**: $0.02-0.05
- **AIDA com imagem**: $0.08-0.12
- **Carrossel**: $0.15-0.25
- **Vídeo**: $0.20-0.30

---

## Solução de Problemas

### "Análise falhou"
- Verifique se as URLs das imagens/vídeos estão acessíveis
- Confirme que o workspace está configurado corretamente
- Tente novamente (pode ser erro temporário da API)

### "Score muito baixo inesperado"
- Revise as sugestões específicas (elas explicam o porquê)
- Compare com benchmarks do seu nicho
- Considere contexto: às vezes criativos "feios" convertem bem

### "Sugestões de teste não aparecem"
- Certifique-se que há análises concluídas
- Verifique filtros (prioridade, status)
- Aguarde: sugestões podem levar alguns minutos para gerar

---

## Suporte

Para dúvidas ou problemas:
1. Acesse **Ajuda e Suporte** no menu lateral
2. Consulte a documentação técnica: `SISTEMA_ANALISE_CRIATIVOS.md`
3. Entre em contato com o time de suporte

---

**Lembre-se**: Análises são ferramentas, não verdades absolutas. Use os insights para guiar decisões, mas sempre valide com testes reais e resultados de performance.
