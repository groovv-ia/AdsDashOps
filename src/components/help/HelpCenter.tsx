/**
 * HelpCenter Component
 *
 * Centro de ajuda completo com FAQ, documentação e suporte
 * Paleta de cores simplificada (azul/cinza) para manter consistência com o sistema
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Send,
  Home,
  HelpCircle,
  ArrowLeft,
  Star,
  ThumbsUp,
  ThumbsDown,
  Book,
  Zap,
  Settings,
  Database,
  Users,
  Target,
  BarChart3,
  Shield,
  RefreshCw,
  Layers
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful?: number;
  notHelpful?: number;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const categories: Category[] = [
  {
    id: 'getting-started',
    name: 'Primeiros Passos',
    icon: <Zap className="w-5 h-5" />,
    description: 'Configuração inicial e onboarding'
  },
  {
    id: 'workspaces',
    name: 'Workspaces',
    icon: <Layers className="w-5 h-5" />,
    description: 'Gestão de workspaces e equipes'
  },
  {
    id: 'clients',
    name: 'Clientes',
    icon: <Users className="w-5 h-5" />,
    description: 'Gerenciar múltiplos clientes'
  },
  {
    id: 'campaigns',
    name: 'Campanhas',
    icon: <Target className="w-5 h-5" />,
    description: 'Visualizar e analisar campanhas'
  },
  {
    id: 'integrations',
    name: 'Integrações',
    icon: <Database className="w-5 h-5" />,
    description: 'Conectar plataformas de anúncios'
  },
  {
    id: 'analytics',
    name: 'Análises',
    icon: <BarChart3 className="w-5 h-5" />,
    description: 'Métricas e insights com IA'
  },
  {
    id: 'sync',
    name: 'Sincronização',
    icon: <RefreshCw className="w-5 h-5" />,
    description: 'Sincronizar dados das plataformas'
  },
  {
    id: 'security',
    name: 'Segurança',
    icon: <Shield className="w-5 h-5" />,
    description: 'Privacidade e proteção de dados'
  }
];

const faqData: FAQItem[] = [
  // Getting Started
  {
    id: 'gs1',
    question: 'Bem-vindo ao AdsOPS - Primeiros Passos',
    answer: 'O AdsOPS é uma plataforma completa de gerenciamento de campanhas publicitárias com análise avançada e IA. Principais recursos: Dashboard unificado com métricas em tempo real, Sincronização automática com Meta Ads, Google Ads e TikTok Ads, Análise de criativos com IA, Sistema multi-workspace para agências, Gestão de múltiplos clientes, Relatórios personalizáveis e exportáveis. Para começar: 1. Crie seu workspace, 2. Conecte suas contas de anúncios, 3. Sincronize seus dados, 4. Explore as análises e insights.',
    category: 'getting-started',
    helpful: 142,
    notHelpful: 3
  },
  {
    id: 'gs2',
    question: 'Como configurar minha conta pela primeira vez?',
    answer: 'Após criar sua conta: 1. Complete seu perfil com nome e informações básicas, 2. Crie seu primeiro workspace (ou será criado automaticamente), 3. Convide membros da equipe se necessário, 4. Conecte suas primeiras contas de anúncios em "Fontes de Dados", 5. Configure suas preferências de notificação em Configurações. O sistema guiará você através desses passos na primeira vez que acessar.',
    category: 'getting-started',
    helpful: 98,
    notHelpful: 4
  },
  {
    id: 'gs3',
    question: 'Qual a diferença entre usuário, workspace e cliente?',
    answer: 'Estrutura hierárquica do sistema: USUÁRIO - Sua conta individual com email e senha. WORKSPACE - Ambiente de trabalho que você gerencia. Pode ter múltiplos membros da equipe. CLIENTE - Clientes individuais dentro de um workspace. Cada cliente pode ter suas próprias contas de anúncios. Exemplo: Você (usuário) gerencia uma agência (workspace) que atende 10 clientes (clients), cada um com suas próprias campanhas no Meta Ads.',
    category: 'getting-started',
    helpful: 156,
    notHelpful: 2
  },

  // Workspaces
  {
    id: 'ws1',
    question: 'Como criar e gerenciar workspaces?',
    answer: 'Workspaces isolam dados e permitem organização multi-tenant. Para criar: 1. Acesse "Workspaces" no menu superior, 2. Clique em "Novo Workspace", 3. Defina nome e logo (opcional), 4. Convide membros da equipe. Cada workspace tem dados completamente isolados: campanhas, clientes, conexões e métricas são separados. Você pode ser membro de múltiplos workspaces.',
    category: 'workspaces',
    helpful: 87,
    notHelpful: 5
  },
  {
    id: 'ws2',
    question: 'Como convidar membros para meu workspace?',
    answer: 'Para adicionar membros: 1. Acesse seu workspace, 2. Vá em "Configurações" > "Membros", 3. Clique em "Convidar Membro", 4. Digite o email do membro, 5. Defina o papel (Admin, Editor, Viewer). Papéis: ADMIN - Acesso total, pode gerenciar membros e configurações. EDITOR - Pode editar campanhas e dados. VIEWER - Apenas visualização, sem edição.',
    category: 'workspaces',
    helpful: 73,
    notHelpful: 3
  },
  {
    id: 'ws3',
    question: 'Como alternar entre workspaces?',
    answer: 'Use o seletor de workspace no canto superior direito. Clique no nome do workspace atual para ver a lista de workspaces disponíveis. Ao trocar de workspace, todos os dados exibidos mudam automaticamente: campanhas, clientes, métricas e configurações são filtrados pelo workspace selecionado.',
    category: 'workspaces',
    helpful: 91,
    notHelpful: 1
  },

  // Clients
  {
    id: 'cl1',
    question: 'O que são Clientes e quando usá-los?',
    answer: 'Clientes permitem segmentar dados dentro de um workspace. Ideal para: Agências que gerenciam múltiplas marcas, Freelancers com vários projetos, Empresas com múltiplas unidades de negócio. Cada cliente pode ter: Suas próprias contas de anúncios conectadas, Campanhas isoladas, Métricas separadas, Relatórios individuais. Os dados são filtrados por cliente automaticamente.',
    category: 'clients',
    helpful: 134,
    notHelpful: 8
  },
  {
    id: 'cl2',
    question: 'Como criar e gerenciar clientes?',
    answer: 'Para criar um cliente: 1. Acesse "Clientes" no menu lateral, 2. Clique em "Novo Cliente", 3. Preencha nome, email e informações, 4. Ao conectar contas de anúncios, selecione o cliente correspondente. Para alternar entre clientes, use o seletor no topo da página. Você pode visualizar dados consolidados de todos os clientes ou filtrar por cliente específico.',
    category: 'clients',
    helpful: 102,
    notHelpful: 6
  },

  // Campaigns
  {
    id: 'ca1',
    question: 'Como visualizar minhas campanhas?',
    answer: 'Acesse "Campanhas" no menu lateral. A página mostra: Grid de cards com todas as campanhas, Estatísticas gerais (gasto, impressões, conversões), Filtros por período, status e plataforma, Ordenação por múltiplos critérios. Clique em uma campanha para ver análise detalhada com: Métricas completas, Gráficos de tendência, Performance de ad sets e anúncios, Análises com IA.',
    category: 'campaigns',
    helpful: 119,
    notHelpful: 4
  },
  {
    id: 'ca2',
    question: 'Quais métricas estão disponíveis?',
    answer: 'Métricas completas da API das plataformas: BÁSICAS: Impressões, Cliques, Gasto, Alcance, Frequência. TAXAS: CTR (taxa de cliques), CPC (custo por clique), CPM (custo por mil impressões). CONVERSÕES: Total de conversões, Valor de conversão, Custo por resultado. PERFORMANCE: ROAS (retorno sobre investimento), ROI, Taxa de conversão. VÍDEO: Visualizações, Tempo médio assistido, Taxas de conclusão. Todas as métricas são sincronizadas diretamente das APIs sem estimativas.',
    category: 'campaigns',
    helpful: 176,
    notHelpful: 5
  },

  // Integrations
  {
    id: 'int1',
    question: 'Como conectar minha conta do Meta Ads?',
    answer: 'Processo completo de conexão: 1. Acesse "Fontes de Dados" no menu, 2. Clique em "Conectar Meta Ads", 3. Selecione o cliente (se aplicável), 4. Será redirecionado para login do Facebook, 5. Autorize as permissões solicitadas (ads_read, ads_management), 6. Selecione as contas de anúncios a sincronizar, 7. Aguarde a sincronização inicial (5-10 minutos). IMPORTANTE: Use uma conta com permissões de Admin nas contas de anúncios.',
    category: 'integrations',
    helpful: 203,
    notHelpful: 7
  },
  {
    id: 'int2',
    question: 'Quais plataformas são suportadas?',
    answer: 'ATUALMENTE INTEGRADO: Meta Ads (Facebook/Instagram) - Totalmente funcional com sincronização automática. EM DESENVOLVIMENTO: Google Ads - Em fase de testes. TikTok Ads - Planejado para próxima versão. RECURSOS POR PLATAFORMA: Meta Ads - Campanhas, Ad Sets, Anúncios, Métricas detalhadas, Insights diários, Análise de criativos com IA.',
    category: 'integrations',
    helpful: 167,
    notHelpful: 12
  },
  {
    id: 'int3',
    question: 'Como funcionam os tokens de acesso?',
    answer: 'Segurança e gerenciamento de tokens: Os tokens OAuth são armazenados criptografados no banco de dados, Cada conexão tem seu próprio token isolado por workspace, Tokens são renovados automaticamente quando possível, Se um token expirar, você será notificado para reconectar. Para reconectar: Vá em "Fontes de Dados", Clique em "Reconectar" na conta desejada, Autorize novamente. Os tokens NUNCA são compartilhados entre workspaces ou clientes.',
    category: 'integrations',
    helpful: 89,
    notHelpful: 4
  },

  // Analytics
  {
    id: 'an1',
    question: 'Como funciona a análise com IA?',
    answer: 'O sistema analisa automaticamente suas campanhas usando IA: ANÁLISE DE CRIATIVOS: Detecta padrões visuais em anúncios, Identifica elementos de melhor performance, Sugere otimizações de criativo. ANÁLISE DE MÉTRICAS: Identifica anomalias e tendências, Compara performance entre períodos, Sugere ajustes de orçamento e segmentação. Para usar: Vá em "Campanhas", Selecione uma campanha, A análise é gerada automaticamente se houver dados suficientes.',
    category: 'analytics',
    helpful: 198,
    notHelpful: 9
  },
  {
    id: 'an2',
    question: 'Como interpretar ROAS e outras métricas?',
    answer: 'GUIA DE MÉTRICAS: ROAS (Return on Ad Spend) - Quanto você ganha para cada R$1 gasto. ROAS 1.0 = Break-even, ROAS 2.0+ = Lucrativo, ROAS 4.0+ = Excelente. CTR (Click-Through Rate) - Percentual de cliques por impressão. Bom: 1-3%, Excelente: 3%+. CPC (Cost Per Click) - Quanto você paga por clique. Varia muito por nicho, compare com histórico. CPM (Cost Per Mille) - Custo por 1000 impressões. Indica competitividade do público. Todas as métricas devem ser analisadas em conjunto, não isoladamente.',
    category: 'analytics',
    helpful: 234,
    notHelpful: 6
  },

  // Sync
  {
    id: 'sy1',
    question: 'Como funciona a sincronização de dados?',
    answer: 'PROCESSO DE SINCRONIZAÇÃO: Dados são baixados diretamente das APIs das plataformas, Sincronização captura últimos 90 dias de dados, Dados são salvos em tabelas otimizadas para consulta rápida, Sistema usa rate limiting para evitar bloqueios de API. FREQUÊNCIA: Primeira sincronização: Manual ao conectar conta, Sincronizações subsequentes: Configure em Configurações. Para sincronizar manualmente: Vá em "Meta Ads Sync", Selecione as contas, Clique em "Sincronizar Agora".',
    category: 'sync',
    helpful: 145,
    notHelpful: 11
  },
  {
    id: 'sy2',
    question: 'Por que minha sincronização falhou?',
    answer: 'CAUSAS COMUNS: Token expirado - Solução: Reconecte a conta em "Fontes de Dados". Permissões insuficientes - Solução: Verifique se concedeu permissão "ads_read". Limite de API atingido - Solução: Aguarde 15 minutos e tente novamente. Conta sem dados - Solução: Verifique se a conta tem campanhas ativas. Para debugar: Vá em "Meta Ads Sync", Clique em "Ver Status", Verifique os logs de sincronização. Se o erro persistir, reconecte a conta completamente.',
    category: 'sync',
    helpful: 178,
    notHelpful: 15
  },

  // Security
  {
    id: 'se1',
    question: 'Como meus dados são protegidos?',
    answer: 'SEGURANÇA MULTI-CAMADA: Row Level Security (RLS) - Cada workspace vê apenas seus dados no banco. Tokens criptografados - Todos os tokens OAuth são criptografados em repouso. Isolamento de workspace - Dados completamente separados entre workspaces. Autenticação segura - Sistema de auth do Supabase com verificação de email. Logs de auditoria - Todas as ações são registradas. COMPLIANCE: Dados hospedados em infraestrutura certificada, Conformidade com LGPD/GDPR, Backups automáticos diários.',
    category: 'security',
    helpful: 112,
    notHelpful: 3
  },
  {
    id: 'se2',
    question: 'Posso exportar meus dados?',
    answer: 'SIM, você tem controle total dos seus dados: EXPORTAÇÃO DE RELATÓRIOS: Vá em "Campanhas" ou "Análises", Clique em "Exportar", Escolha formato (CSV, Excel, PDF). EXPORTAÇÃO EM MASSA: Acesse "Configurações" > "Dados", Solicite exportação completa de todos os dados, Receba link de download por email em até 24h. RETENÇÃO: Dados são mantidos enquanto sua conta estiver ativa, Ao deletar workspace, dados são removidos permanentemente após 30 dias.',
    category: 'security',
    helpful: 94,
    notHelpful: 2
  },

  // Settings
  {
    id: 'set1',
    question: 'Como configurar preferências e notificações?',
    answer: 'Acesse "Configurações" no menu: PREFERÊNCIAS GERAIS: Idioma, Fuso horário, Formato de moeda, Tema (claro/escuro). NOTIFICAÇÕES: Configure alertas de orçamento, Notificações de sincronização, Alertas de performance. PERFIL: Atualize foto e informações, Altere senha, Configure autenticação de dois fatores.',
    category: 'getting-started',
    helpful: 67,
    notHelpful: 4
  }
];

const popularQuestions = [
  'Bem-vindo ao AdsOPS - Primeiros Passos',
  'Como conectar minha conta do Meta Ads?',
  'Como interpretar ROAS e outras métricas?',
  'Qual a diferença entre usuário, workspace e cliente?',
  'Como funciona a sincronização de dados?'
];

export const HelpCenter: React.FC<HelpCenterProps> = ({ isOpen, onClose }) => {
  const [currentView, setCurrentView] = useState<'home' | 'category' | 'search' | 'chat'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{id: string, message: string, sender: 'user' | 'bot', timestamp: Date}>>([]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentView('home');
      setSelectedCategory('');
      setSearchQuery('');
      setChatMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredFAQs = faqData.filter(faq => {
    if (currentView === 'category' && selectedCategory) {
      return faq.category === selectedCategory;
    }
    if (currentView === 'search' && searchQuery) {
      return faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
             faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentView('category');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setCurrentView('search');
    } else {
      setCurrentView('home');
    }
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      message: chatMessage,
      sender: 'user' as const,
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, userMessage]);

    setTimeout(() => {
      const botResponse = {
        id: (Date.now() + 1).toString(),
        message: 'Obrigado pela sua mensagem! Nossa equipe de suporte analisará sua solicitação e responderá em breve. Para respostas mais rápidas, verifique nosso FAQ com as perguntas mais comuns.',
        sender: 'bot' as const,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, botResponse]);
    }, 1000);

    setChatMessage('');
  };

  const handleBack = () => {
    if (currentView === 'category' || currentView === 'search') {
      setCurrentView('home');
      setSelectedCategory('');
      setSearchQuery('');
    } else if (currentView === 'chat') {
      setCurrentView('home');
    }
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-2xl">
      <div className="flex items-center space-x-3">
        {currentView !== 'home' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-5 h-5" />
          <span className="text-lg font-semibold">Central de Ajuda</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="text-white hover:bg-white/10"
      >
        <X className="w-5 h-5" />
      </Button>
    </div>
  );

  const renderHome = () => (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          Como podemos ajudar?
        </h3>
        <p className="text-gray-600">
          Encontre respostas e aprenda a usar o AdsOPS
        </p>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Pesquisar na central de ajuda..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
      </div>

      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-between text-left bg-white hover:bg-gray-50 text-gray-700 py-3"
          onClick={() => setCurrentView('chat')}
        >
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <span>Falar com o Suporte</span>
          </div>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div>
        <h4 className="font-semibold text-gray-800 text-sm mb-3">CATEGORIAS</h4>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              className="p-4 rounded-lg bg-white border border-gray-200 hover:border-blue-500 hover:shadow-sm transition-all duration-200 text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-blue-50 flex items-center justify-center mb-2 text-gray-600 group-hover:text-blue-600 transition-colors">
                {category.icon}
              </div>
              <h5 className="font-semibold text-sm text-gray-800 mb-1">{category.name}</h5>
              <p className="text-xs text-gray-500">{category.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-800 text-sm mb-3">PERGUNTAS POPULARES</h4>
        <div className="space-y-2">
          {popularQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleSearch(question)}
              className="w-full text-left p-3 rounded-lg bg-white border border-gray-200 hover:border-blue-500 hover:shadow-sm transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 group-hover:text-blue-600">{question}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          className="w-full justify-center bg-white hover:bg-gray-50 text-gray-700"
          onClick={() => window.open('mailto:suporte@adsops.com?subject=Sugestão de Recurso', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Sugerir Novo Recurso
        </Button>
      </div>
    </div>
  );

  const renderFAQList = () => (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {currentView === 'search' ? `Resultados para "${searchQuery}"` :
           categories.find(c => c.id === selectedCategory)?.name}
        </h3>
        <p className="text-sm text-gray-600">
          {filteredFAQs.length} {filteredFAQs.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
        </p>
      </div>

      <div className="space-y-3">
        {filteredFAQs.map((faq) => (
          <FAQItem key={faq.id} faq={faq} />
        ))}
      </div>

      {filteredFAQs.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum resultado encontrado</h3>
          <p className="text-gray-500 mb-4">Tente usar palavras-chave diferentes ou navegue pelas categorias.</p>
          <Button onClick={() => setCurrentView('chat')}>
            Falar com suporte
          </Button>
        </div>
      )}
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Suporte ao Cliente</h3>
        <p className="text-sm text-gray-600">Nossa equipe responde em até 2 horas</p>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50">
        {chatHistory.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-medium text-gray-900 mb-2">Inicie uma conversa</h4>
            <p className="text-sm text-gray-600">Descreva seu problema ou dúvida e nossa equipe ajudará você.</p>
          </div>
        ) : (
          chatHistory.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <p className="text-sm">{message.message}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-6 border-t border-gray-200 bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Button onClick={handleSendMessage} disabled={!chatMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-end p-4">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-96 h-[600px] bg-white rounded-2xl shadow-2xl animate-in slide-in-from-bottom-8 slide-in-from-right-8 duration-300 flex flex-col">
        {renderHeader()}

        <div className="flex-1 overflow-hidden bg-gray-50">
          {currentView === 'home' && (
            <div className="h-full overflow-y-auto">
              {renderHome()}
            </div>
          )}
          {(currentView === 'category' || currentView === 'search') && (
            <div className="h-full overflow-y-auto">
              {renderFAQList()}
            </div>
          )}
          {currentView === 'chat' && (
            <div className="h-full">
              {renderChat()}
            </div>
          )}
        </div>

        <div className="bg-white border-t border-gray-200 p-3 rounded-b-2xl">
          <div className="flex justify-around">
            <button
              onClick={() => setCurrentView('home')}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                currentView === 'home' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs font-medium">Início</span>
            </button>

            <button
              onClick={() => setCurrentView('chat')}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                currentView === 'chat' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-xs font-medium">Suporte</span>
            </button>

            <button
              onClick={() => window.open('https://docs.adsops.com', '_blank')}
              className="flex flex-col items-center space-y-1 p-2 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Book className="w-5 h-5" />
              <span className="text-xs font-medium">Docs</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FAQItem: React.FC<{ faq: FAQItem }> = ({ faq }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [userFeedback, setUserFeedback] = useState<'helpful' | 'not-helpful' | null>(null);

  const handleFeedback = (type: 'helpful' | 'not-helpful') => {
    setUserFeedback(type);
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow bg-white border border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 pr-4">{faq.question}</h4>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
            isExpanded ? 'rotate-90' : ''
          }`} />
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{faq.answer}</p>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Esta resposta foi útil?</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleFeedback('helpful')}
                  className={`p-1 rounded transition-colors ${
                    userFeedback === 'helpful'
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-400 hover:text-blue-600'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleFeedback('not-helpful')}
                  className={`p-1 rounded transition-colors ${
                    userFeedback === 'not-helpful'
                      ? 'text-gray-600 bg-gray-100'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {faq.helpful && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Star className="w-3 h-3 text-gray-400 fill-current" />
                <span>{faq.helpful} útil</span>
              </div>
            )}
          </div>

          {userFeedback && (
            <div className={`p-3 rounded-lg text-sm ${
              userFeedback === 'helpful'
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : 'bg-gray-50 text-gray-800 border border-gray-200'
            }`}>
              {userFeedback === 'helpful'
                ? 'Obrigado pelo seu feedback!'
                : 'Obrigado pelo feedback. Nossa equipe revisará esta resposta.'}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
