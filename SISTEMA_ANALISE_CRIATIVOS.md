# Sistema de Análise Avançada de Criativos com IA

Sistema completo de análise de criativos publicitários usando GPT-4 Vision implementado de forma **100% aditiva** (sem modificar funcionalidades existentes).

## Funcionalidades Implementadas

### 1. Análise de Carrosséis
Analisa carrosséis do Meta Ads com foco em:
- **Storytelling Score**: Avalia fluxo narrativo e arco da história
- **Coerência Visual**: Analisa consistência de cores, tipografia e layout
- **Análise Individual**: Score e insights para cada slide
- **Sugestões de Ordem**: Recomendações de reordenação dos slides

**Tabelas:**
- `carousel_analyses`: Análises completas
- `carousel_slide_analyses`: Análises individuais por slide

**Edge Function:** `meta-analyze-carousel-ai`

### 2. Análise de Vídeos
Analisa vídeos publicitários com foco em:
- **Hook Score (3s)**: Análise dos primeiros 3 segundos críticos
- **Retention Score**: Análise de ritmo e retenção ao longo do vídeo
- **CTA Score**: Avaliação da efetividade do call-to-action
- **Frames-Chave**: Análise de frames específicos com timestamps

**Tabelas:**
- `video_analyses`: Análises completas
- `video_frame_analyses`: Análises de frames individuais

**Edge Function:** `meta-analyze-video-ai`

### 3. Análise AIDA de Copy
Analisa textos publicitários usando o framework AIDA:
- **Attention (Atenção)**: Capacidade de capturar atenção
- **Interest (Interesse)**: Manutenção do interesse
- **Desire (Desejo)**: Criação de desejo com gatilhos emocionais
- **Action (Ação)**: Efetividade do CTA

Inclui análise de **Power Words** e gatilhos emocionais.

**Tabelas:**
- `aida_copy_analyses`: Análises completas AIDA

**Edge Function:** `meta-analyze-copy-aida`

### 4. Testes A/B Inteligentes
Sistema de sugestões e tracking de testes A/B:
- **Sugestões com IA**: Hipóteses claras e detalhadas
- **Priorização**: Alta, Média ou Baixa
- **Tracking**: Acompanhamento de implementação e resultados
- **Biblioteca**: Histórico de testes completados com learnings

**Tabelas:**
- `ab_test_suggestions`: Sugestões de testes
- `ab_tests_tracking`: Tracking de resultados

## Estrutura de Arquivos

### Banco de Dados
```
supabase/migrations/
└── create_advanced_creative_analysis_tables.sql (7 novas tabelas)
```

### Tipos TypeScript
```
src/types/
├── carouselAnalysis.ts  # Tipos para análise de carrossel
├── videoAnalysis.ts     # Tipos para análise de vídeo
├── aidaAnalysis.ts      # Tipos para framework AIDA
└── abTestTypes.ts       # Tipos para testes A/B
```

### Serviços
```
src/lib/services/
├── CarouselAnalysisService.ts      # CRUD de análises de carrossel
├── VideoAnalysisService.ts         # CRUD de análises de vídeo
├── AIDACopyAnalysisService.ts      # CRUD de análises AIDA
└── ABTestSuggestionService.ts      # CRUD de testes A/B
```

### Edge Functions
```
supabase/functions/
├── meta-analyze-carousel-ai/       # Análise de carrosséis
├── meta-analyze-video-ai/          # Análise de vídeos
└── meta-analyze-copy-aida/         # Análise AIDA
```

### Componentes React
```
src/components/
├── creative-analysis/
│   ├── CreativeAnalysisHub.tsx     # Página hub central
│   ├── carousel/
│   │   └── CarouselAnalysisView.tsx
│   ├── video/
│   │   └── VideoAnalysisView.tsx
│   ├── aida/
│   │   └── AIDACopyAnalysisView.tsx
│   └── index.ts
└── ab-testing/
    └── ABTestSuggestionsView.tsx
```

## Integração no Sistema

### Menu Sidebar
Nova seção "Análise com IA" com 5 opções:
- Hub de Análises
- Análise de Carrossel
- Análise de Vídeo
- Análise AIDA (Copy)
- Testes A/B

### Rotas
Todas as rotas foram adicionadas no App.tsx:
- `/creative-analysis` - Hub central
- `/carousel-analysis` - Análise de carrosséis
- `/video-analysis` - Análise de vídeos
- `/aida-analysis` - Análise AIDA
- `/ab-tests` - Testes A/B

## Segurança

### Row Level Security (RLS)
Todas as 7 tabelas possuem RLS habilitado com políticas completas:
- Usuários só acessam dados de seus workspaces
- Políticas separadas para SELECT, INSERT, UPDATE, DELETE
- Verificação de ownership e membership

### Autenticação
- Todas as Edge Functions validam JWT
- Verificação de workspace ownership
- Tokens são passados via Authorization header

## Como Usar

### 1. Análise de Carrossel
```typescript
import { requestCarouselAnalysis } from '@/lib/services/CarouselAnalysisService';

const result = await requestCarouselAnalysis({
  ad_id: 'ad_123',
  meta_ad_account_id: 'act_456',
  slides: [
    { slide_number: 1, image_url: 'https://...' },
    { slide_number: 2, image_url: 'https://...' },
  ]
});
```

### 2. Análise de Vídeo
```typescript
import { requestVideoAnalysis } from '@/lib/services/VideoAnalysisService';

const result = await requestVideoAnalysis({
  ad_id: 'ad_123',
  meta_ad_account_id: 'act_456',
  video_url: 'https://...',
  video_duration_seconds: 30,
  frame_timestamps: [0, 3, 15, 30]
});
```

### 3. Análise AIDA
```typescript
import { requestAIDAAnalysis } from '@/lib/services/AIDACopyAnalysisService';

const result = await requestAIDAAnalysis({
  ad_id: 'ad_123',
  meta_ad_account_id: 'act_456',
  copy_data: {
    headline: 'Seu headline aqui',
    body: 'Texto completo do anúncio...',
    cta: 'Compre Agora'
  }
});
```

### 4. Sugestões de Teste A/B
```typescript
import { createABTestSuggestion } from '@/lib/services/ABTestSuggestionService';

const suggestion = await createABTestSuggestion({
  ad_id: 'ad_123',
  meta_ad_account_id: 'act_456',
  test_type: 'visual',
  priority: 'high',
  hypothesis: 'Mudar cor do botão de verde para vermelho aumentará CTR em 15%',
  variant_description: 'Botão vermelho com urgência visual',
  what_to_change: 'Cor do botão CTA',
  expected_outcome: 'Aumento de 15% no CTR',
  metrics_to_track: ['CTR', 'Conversion Rate']
});
```

## Modelos de IA Utilizados

- **GPT-4o**: Para análises com imagens/vídeos (carrossel, vídeo)
- **GPT-4o-mini**: Para análises apenas de texto (AIDA sem imagem)

## Custos Aproximados

- Análise de Carrossel (3-5 slides): ~$0.15-0.25
- Análise de Vídeo (4-6 frames): ~$0.20-0.30
- Análise AIDA (só texto): ~$0.02-0.05
- Análise AIDA (com imagem): ~$0.08-0.12

## Performance

Todas as tabelas possuem índices otimizados:
- `workspace_id` para filtros por workspace
- `ad_id` para busca por anúncio
- Foreign keys para joins eficientes
- `status` em ab_test_suggestions para filtros

## Próximos Passos Sugeridos

1. **Integração com Criativos Existentes**: Conectar análises aos anúncios já sincronizados do Meta
2. **Análise em Lote**: Implementar análise de múltiplos anúncios simultaneamente
3. **Dashboard de Insights**: Página agregando insights de todas as análises
4. **Alertas Automáticos**: Notificações quando análise detecta oportunidades
5. **Biblioteca de Templates**: Salvar e reusar estruturas de análise que funcionam
6. **Comparação Temporal**: Comparar análises do mesmo anúncio ao longo do tempo

## Build Status

✅ Projeto compila sem erros
✅ Todas as tabelas criadas com sucesso
✅ Edge Functions implantadas
✅ Componentes React funcionais
✅ Integração com menu e rotas completa
