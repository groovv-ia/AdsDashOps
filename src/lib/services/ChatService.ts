/**
 * ChatService - Serviço Inteligente de Chat
 *
 * Este serviço fornece respostas automáticas inteligentes baseadas em:
 * - Análise de intenção (intent detection)
 * - Análise de sentimento
 * - Correspondência de palavras-chave
 * - Base de conhecimento (FAQs)
 * - Histórico de conversas
 */

import { supabase } from '../supabase';

// Tipos de intenção que o chat pode detectar
export type ChatIntent =
  | 'conectar_meta'          // Conectar conta Meta Ads
  | 'conectar_google'        // Conectar conta Google Ads
  | 'ver_metricas'           // Ver métricas/resultados
  | 'problema_sincronizacao' // Problema com sincronização
  | 'criar_dashboard'        // Criar/configurar dashboard
  | 'exportar_dados'         // Exportar dados
  | 'ajuda_campanha'         // Ajuda com campanhas
  | 'duvida_cobranca'        // Dúvida sobre cobrança
  | 'sugestao_recurso'       // Sugestão de novo recurso
  | 'saudacao'               // Saudação inicial
  | 'agradecimento'          // Agradecimento
  | 'general';               // Geral/outros

// Tipo de sentimento detectado
export type Sentiment = 'positive' | 'neutral' | 'negative';

// Interface de resposta do chat
export interface ChatResponse {
  message: string;
  intent: ChatIntent;
  sentiment: Sentiment;
  suggestions?: string[];
  relatedFAQs?: { id: string; question: string }[];
  quickActions?: { label: string; action: string }[];
}

// Padrões de intenção com palavras-chave
const INTENT_PATTERNS: Record<ChatIntent, string[]> = {
  conectar_meta: [
    'conectar meta', 'facebook ads', 'meta ads', 'adicionar meta',
    'vincular facebook', 'integrar meta', 'conta meta', 'conta facebook'
  ],
  conectar_google: [
    'conectar google', 'google ads', 'adicionar google', 'vincular google',
    'integrar google', 'conta google'
  ],
  ver_metricas: [
    'ver métricas', 'ver resultados', 'visualizar dados', 'métricas',
    'resultados', 'performance', 'estatísticas', 'números', 'dashboard'
  ],
  problema_sincronizacao: [
    'não sincroniza', 'erro de sincronização', 'sincronização', 'não atualiza',
    'dados desatualizados', 'não carrega', 'erro ao carregar', 'problema conexão'
  ],
  criar_dashboard: [
    'criar dashboard', 'novo dashboard', 'personalizar dashboard',
    'configurar dashboard', 'montar dashboard'
  ],
  exportar_dados: [
    'exportar', 'download', 'baixar dados', 'exportar relatório',
    'gerar relatório', 'salvar dados'
  ],
  ajuda_campanha: [
    'campanha', 'criar campanha', 'editar campanha', 'anúncios',
    'ads', 'otimizar campanha', 'melhorar campanha'
  ],
  duvida_cobranca: [
    'cobrança', 'pagamento', 'plano', 'assinatura', 'fatura',
    'preço', 'valor', 'cancelar', 'upgrade'
  ],
  sugestao_recurso: [
    'sugestão', 'sugerir', 'gostaria de', 'seria bom ter',
    'poderia adicionar', 'novo recurso', 'funcionalidade'
  ],
  saudacao: [
    'oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'e aí'
  ],
  agradecimento: [
    'obrigado', 'obrigada', 'valeu', 'thanks', 'agradeço', 'grato'
  ],
  general: []
};

// Padrões de sentimento
const NEGATIVE_WORDS = [
  'não funciona', 'erro', 'problema', 'bug', 'ruim', 'péssimo',
  'horrível', 'lento', 'travando', 'frustrado', 'decepcionado'
];

const POSITIVE_WORDS = [
  'ótimo', 'excelente', 'maravilhoso', 'perfeito', 'adorei',
  'incrível', 'legal', 'bom', 'funciona bem', 'satisfeito'
];

/**
 * Respostas inteligentes por intenção
 */
const INTENT_RESPONSES: Record<ChatIntent, {
  message: string;
  suggestions?: string[];
  quickActions?: { label: string; action: string }[];
}> = {
  conectar_meta: {
    message: 'Para conectar sua conta Meta Ads, siga estes passos:\n\n1. Vá em **Configurações > Fontes de Dados**\n2. Clique em "Conectar Meta Ads"\n3. Faça login com sua conta do Facebook\n4. Autorize o acesso às suas contas de anúncios\n\nPosso te ajudar com algum problema específico na conexão?',
    suggestions: [
      'Estou tendo erro ao conectar',
      'Não vejo minhas contas de anúncio',
      'Preciso reconectar minha conta'
    ],
    quickActions: [
      { label: 'Ir para Configurações', action: 'navigate:/settings' }
    ]
  },
  conectar_google: {
    message: 'Para conectar sua conta Google Ads:\n\n1. Acesse **Configurações > Fontes de Dados**\n2. Clique em "Conectar Google Ads"\n3. Faça login com sua conta Google\n4. Selecione as contas que deseja sincronizar\n\nEm breve teremos o Google Ads totalmente integrado! Precisa de mais informações?',
    suggestions: [
      'Quando estará disponível?',
      'Posso conectar várias contas?',
      'Como funciona a sincronização?'
    ]
  },
  ver_metricas: {
    message: 'Você pode visualizar suas métricas de várias formas:\n\n📊 **Dashboard Principal** - Visão geral de todas campanhas\n📈 **Análise de Campanhas** - Métricas detalhadas por campanha\n📉 **Relatórios Customizados** - Crie dashboards personalizados\n\nO que você gostaria de visualizar especificamente?',
    suggestions: [
      'Ver métricas de hoje',
      'Comparar últimos 7 dias',
      'Criar relatório customizado'
    ],
    quickActions: [
      { label: 'Ir para Dashboard', action: 'navigate:/dashboard' }
    ]
  },
  problema_sincronizacao: {
    message: 'Entendo que você está tendo problemas com a sincronização. Vamos resolver isso!\n\n**Verificações rápidas:**\n✓ Sua conta está conectada corretamente?\n✓ Tem dados nas últimas 24h?\n✓ As permissões estão corretas?\n\nPosso te ajudar a diagnosticar melhor. Qual o erro específico que está vendo?',
    suggestions: [
      'Dados não aparecem',
      'Erro ao sincronizar',
      'Dados desatualizados',
      'Reconectar conta'
    ],
    quickActions: [
      { label: 'Verificar Status', action: 'navigate:/settings/data-sources' }
    ]
  },
  criar_dashboard: {
    message: 'Criar um dashboard personalizado é fácil!\n\n1. Vá em **Dashboards > Criar Novo**\n2. Selecione as métricas que deseja acompanhar\n3. Escolha o período e filtros\n4. Personalize a visualização\n5. Salve seu dashboard\n\nQue tipo de dados você quer visualizar?',
    suggestions: [
      'Dashboard de campanhas ativas',
      'Dashboard de ROI',
      'Dashboard comparativo',
      'Dashboard por período'
    ],
    quickActions: [
      { label: 'Criar Dashboard', action: 'navigate:/dashboards/new' }
    ]
  },
  exportar_dados: {
    message: 'Você pode exportar seus dados em vários formatos:\n\n📄 **CSV** - Para análise no Excel/Google Sheets\n📊 **PDF** - Relatórios formatados\n📈 **JSON** - Integração com outras ferramentas\n\nVá em qualquer dashboard e clique no botão "Exportar" no canto superior direito.',
    suggestions: [
      'Como exportar em CSV?',
      'Posso agendar exportações?',
      'Exportar dados históricos'
    ]
  },
  ajuda_campanha: {
    message: 'Posso te ajudar com suas campanhas!\n\n**Recursos disponíveis:**\n🎯 Análise detalhada de campanhas\n💡 Sugestões de otimização com IA\n📊 Comparação de performance\n🔍 Análise de criativos\n\nO que você precisa fazer com suas campanhas?',
    suggestions: [
      'Analisar performance',
      'Ver sugestões de otimização',
      'Comparar campanhas',
      'Verificar criativos'
    ],
    quickActions: [
      { label: 'Ver Campanhas', action: 'navigate:/campaigns' }
    ]
  },
  duvida_cobranca: {
    message: 'Para questões sobre cobrança e assinatura:\n\n💳 Acesse **Configurações > Assinatura e Cobrança**\n\nLá você pode:\n- Ver seu plano atual\n- Atualizar forma de pagamento\n- Fazer upgrade/downgrade\n- Ver histórico de faturas\n- Cancelar assinatura\n\nPrecisa de ajuda específica com cobrança?',
    suggestions: [
      'Ver meu plano',
      'Atualizar plano',
      'Problemas com pagamento',
      'Cancelar assinatura'
    ],
    quickActions: [
      { label: 'Ir para Cobrança', action: 'navigate:/settings/billing' }
    ]
  },
  sugestao_recurso: {
    message: 'Adoramos receber sugestões! 🎉\n\nSua opinião é muito importante para melhorarmos o AdsOPS.\n\n**Como sugerir:**\n1. Descreva o recurso que você gostaria\n2. Explique como isso te ajudaria\n3. Envie para: suporte@adsops.com\n\nOu use o botão abaixo para enviar diretamente!',
    suggestions: [],
    quickActions: [
      { label: 'Enviar Sugestão', action: 'email:suporte@adsops.com?subject=Sugestão de Recurso' }
    ]
  },
  saudacao: {
    message: 'Olá! 👋 Bem-vindo ao suporte AdsOPS!\n\nSou seu assistente virtual e estou aqui para ajudar.\n\n**Como posso te ajudar hoje?**',
    suggestions: [
      'Conectar Meta Ads',
      'Ver minhas métricas',
      'Problema com sincronização',
      'Criar dashboard personalizado'
    ]
  },
  agradecimento: {
    message: 'Por nada! 😊 Fico feliz em ajudar!\n\nSe precisar de mais alguma coisa, é só chamar. Estou aqui para isso!',
    suggestions: [
      'Tenho outra dúvida',
      'Ver perguntas frequentes'
    ]
  },
  general: {
    message: 'Entendi sua mensagem. Para te ajudar melhor, você pode:\n\n📚 Explorar nossa **Central de Ajuda**\n❓ Ver **Perguntas Frequentes**\n📧 Enviar email para: **suporte@adsops.com**\n\nOu me diga mais sobre o que você precisa, vou tentar ajudar!',
    suggestions: [
      'Ver perguntas frequentes',
      'Falar com humano',
      'Enviar email'
    ]
  }
};

class ChatService {
  private static instance: ChatService;

  private constructor() {}

  /**
   * Singleton instance
   */
  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Detecta a intenção da mensagem do usuário
   */
  private detectIntent(message: string): ChatIntent {
    const lowerMessage = message.toLowerCase().trim();

    // Verifica cada padrão de intenção
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (lowerMessage.includes(pattern)) {
          return intent as ChatIntent;
        }
      }
    }

    return 'general';
  }

  /**
   * Analisa o sentimento da mensagem
   */
  private analyzeSentiment(message: string): Sentiment {
    const lowerMessage = message.toLowerCase();

    // Verifica palavras negativas
    const hasNegative = NEGATIVE_WORDS.some(word => lowerMessage.includes(word));
    if (hasNegative) return 'negative';

    // Verifica palavras positivas
    const hasPositive = POSITIVE_WORDS.some(word => lowerMessage.includes(word));
    if (hasPositive) return 'positive';

    return 'neutral';
  }

  /**
   * Gera resposta inteligente baseada na mensagem
   */
  async generateResponse(userMessage: string, workspaceId?: string): Promise<ChatResponse> {
    // Detecta intenção e sentimento
    const intent = this.detectIntent(userMessage);
    const sentiment = this.analyzeSentiment(userMessage);

    // Busca resposta pré-definida
    const responseData = INTENT_RESPONSES[intent];

    // Personaliza resposta baseado no sentimento
    let message = responseData.message;
    if (sentiment === 'negative' && intent !== 'problema_sincronizacao') {
      message = 'Percebo que você está frustrado. Vou fazer o meu melhor para ajudar!\n\n' + message;
    }

    return {
      message,
      intent,
      sentiment,
      suggestions: responseData.suggestions || [],
      quickActions: responseData.quickActions || []
    };
  }

  /**
   * Salva conversa no banco de dados
   */
  async saveConversation(
    userId: string,
    workspaceId: string | null,
    userMessage: string,
    botResponse: ChatResponse
  ): Promise<void> {
    try {
      if (!supabase) {
        console.warn('Supabase não disponível, conversa não será salva');
        return;
      }

      const { error } = await supabase
        .from('chat_conversations')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          message: userMessage,
          response: botResponse.message,
          intent: botResponse.intent,
          sentiment: botResponse.sentiment,
          context: {
            suggestions: botResponse.suggestions,
            quickActions: botResponse.quickActions
          }
        });

      if (error) {
        console.error('Erro ao salvar conversa:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar conversa:', error);
    }
  }

  /**
   * Busca histórico de conversas do usuário
   */
  async getConversationHistory(
    userId: string,
    limit: number = 50
  ): Promise<Array<{
    id: string;
    message: string;
    response: string;
    intent: string;
    sentiment: string;
    created_at: string;
  }>> {
    try {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao buscar histórico:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  }

  /**
   * Busca FAQs relacionadas baseado na intenção
   */
  async getRelatedFAQs(intent: ChatIntent): Promise<Array<{ id: string; question: string }>> {
    // Mapeamento de intenção para categorias de FAQ
    const intentToCategory: Record<ChatIntent, string> = {
      conectar_meta: 'connections',
      conectar_google: 'connections',
      ver_metricas: 'metrics',
      problema_sincronizacao: 'troubleshooting',
      criar_dashboard: 'dashboards',
      exportar_dados: 'export',
      ajuda_campanha: 'campaigns',
      duvida_cobranca: 'billing',
      sugestao_recurso: 'features',
      saudacao: 'general',
      agradecimento: 'general',
      general: 'general'
    };

    // Aqui você pode buscar FAQs reais do banco
    // Por enquanto, retorna FAQs mockadas
    const mockFAQs: Record<string, Array<{ id: string; question: string }>> = {
      connections: [
        { id: '1', question: 'Como conectar minha conta Meta Ads?' },
        { id: '2', question: 'Posso conectar múltiplas contas?' }
      ],
      troubleshooting: [
        { id: '3', question: 'Por que meus dados não aparecem?' },
        { id: '4', question: 'Como resolver erro de sincronização?' }
      ],
      dashboards: [
        { id: '5', question: 'Como criar um dashboard personalizado?' },
        { id: '6', question: 'Posso salvar meus dashboards?' }
      ]
    };

    const category = intentToCategory[intent];
    return mockFAQs[category] || [];
  }
}

export default ChatService;
