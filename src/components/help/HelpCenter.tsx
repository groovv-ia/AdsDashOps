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
  ThumbsDown
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
  icon: string;
  description: string;
}

const categories: Category[] = [
  {
    id: 'getting-started',
    name: 'Primeiros Passos',
    icon: '🚀',
    description: 'Como começar a usar o AdsOPS'
  },
  {
    id: 'campaigns',
    name: 'Campanhas',
    icon: '📊',
    description: 'Gerenciamento de campanhas publicitárias'
  },
  {
    id: 'analytics',
    name: 'Análises',
    icon: '📈',
    description: 'Relatórios e métricas de performance'
  },
  {
    id: 'integrations',
    name: 'Integrações',
    icon: '🔗',
    description: 'Conectar plataformas de publicidade'
  },
  {
    id: 'billing',
    name: 'Faturamento',
    icon: '💳',
    description: 'Planos, pagamentos e faturas'
  },
  {
    id: 'troubleshooting',
    name: 'Solução de Problemas',
    icon: '🔧',
    description: 'Resolver problemas comuns'
  }
];

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'Boas-vindas ao AdsOPS versão 4',
    answer: 'Bem-vindo à nova versão do AdsOPS! Esta versão inclui melhorias significativas na interface, novos recursos de análise com IA e integração aprimorada com plataformas de publicidade.',
    category: 'getting-started',
    helpful: 45,
    notHelpful: 2
  },
  {
    id: '2',
    question: 'Banner de notificação laranja em minha equipe',
    answer: 'O banner laranja indica que há atualizações importantes ou ações pendentes para sua equipe. Clique no banner para ver os detalhes e resolver as pendências.',
    category: 'troubleshooting',
    helpful: 32,
    notHelpful: 5
  },
  {
    id: '3',
    question: 'O que esperar ao atualizar para a V4: um guia abrangente',
    answer: 'A versão 4 traz uma interface redesenhada, análises avançadas com IA, melhor performance e novos recursos de colaboração. Este guia explica todas as mudanças e como aproveitá-las.',
    category: 'getting-started',
    helpful: 67,
    notHelpful: 3
  },
  {
    id: '4',
    question: 'Uso do aplicativo do AdsOPS para Mac',
    answer: 'O aplicativo nativo para Mac oferece melhor performance e integração com o sistema. Baixe na App Store ou em nosso site oficial para ter acesso a todas as funcionalidades.',
    category: 'integrations',
    helpful: 28,
    notHelpful: 1
  },
  {
    id: '5',
    question: 'Como conectar minha conta do Meta Ads?',
    answer: 'Para conectar sua conta do Meta Ads, vá até "Fontes de Dados" no menu lateral, clique em "Adicionar Fonte" e selecione "Meta Ads". Você será redirecionado para fazer login em sua conta do Facebook e autorizar o acesso.',
    category: 'integrations',
    helpful: 89,
    notHelpful: 4
  },
  {
    id: '6',
    question: 'Como interpretar as métricas de ROAS?',
    answer: 'ROAS (Return on Ad Spend) mostra quantos reais você ganha para cada real investido em publicidade. Um ROAS de 4.0 significa que para cada R$1 gasto, você obtém R$4 em retorno. Valores acima de 3.0 são geralmente considerados bons.',
    category: 'analytics',
    helpful: 156,
    notHelpful: 8
  }
];

const popularQuestions = [
  'Boas-vindas ao AdsOPS versão 4',
  'Banner de notificação laranja em minha equipe',
  'O que esperar ao atualizar para a V4: um guia abrangente',
  'Uso do aplicativo do AdsOPS para Mac'
];

export const HelpCenter: React.FC<HelpCenterProps> = ({ isOpen, onClose }) => {
  const [currentView, setCurrentView] = useState<'home' | 'category' | 'search' | 'chat'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{id: string, message: string, sender: 'user' | 'bot', timestamp: Date}>>([]);

  // Prevent body scroll when modal is open
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

    // Simulate bot response
    setTimeout(() => {
      const botResponse = {
        id: (Date.now() + 1).toString(),
        message: 'Obrigado pela sua mensagem! Nossa equipe de suporte analisará sua solicitação e responderá em breve. Enquanto isso, você pode verificar nosso FAQ para respostas rápidas.',
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
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl">
      <div className="flex items-center space-x-3">
        {currentView !== 'home' && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <span className="text-lg font-semibold">frame.io</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">A</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">B</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-red-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">C</span>
          </div>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onClose}
        className="text-white hover:bg-white/20"
      >
        <X className="w-5 h-5" />
      </Button>
    </div>
  );

  const renderHome = () => (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-white mb-2 flex items-center">
          Olá Prime2B 👋
        </h3>
        <p className="text-xl font-semibold text-white">Como podemos ajudar?</p>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Envie uma mensagem"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-4 pr-12 py-4 bg-white/90 backdrop-blur-sm border-0 rounded-xl focus:ring-2 focus:ring-white/50 focus:bg-white text-gray-900 placeholder-gray-600 text-lg"
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:bg-blue-50"
          onClick={() => setCurrentView('chat')}
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-between text-left bg-white/90 backdrop-blur-sm border-0 hover:bg-white text-gray-900 py-4 text-lg"
          onClick={() => window.open('mailto:suporte@adsops.com?subject=Feature Request', '_blank')}
        >
          <span>Submit a Feature Request!</span>
          <ExternalLink className="w-5 h-5" />
        </Button>
      </div>

      {/* Popular Questions */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Search className="w-5 h-5 text-blue-300" />
          <h4 className="font-semibold text-white text-lg">Qual é a sua dúvida?</h4>
        </div>
        <div className="space-y-3">
          {popularQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleSearch(question)}
              className="w-full text-left p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200 text-white"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{question}</span>
                <ChevronRight className="w-4 h-4 text-white/70" />
              </div>
            </button>
          ))}
        </div>
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

      <div className="space-y-4">
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
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Suporte ao Cliente</h3>
        <p className="text-sm text-gray-600">Nossa equipe responde em até 2 horas</p>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-4">
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
                    : 'bg-gray-100 text-gray-900'
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

      <div className="p-6 border-t border-gray-200">
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
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      
      {/* Help Center Widget - Positioned at bottom right */}
      <div className="relative w-96 h-[600px] bg-gradient-to-b from-blue-600 via-purple-600 to-blue-700 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-8 slide-in-from-right-8 duration-300">
        {renderHeader()}
        
        <div className="h-[calc(100%-140px)] overflow-hidden bg-white rounded-b-2xl">
          {currentView === 'home' && (
            <div className="h-full bg-gradient-to-b from-blue-600 via-purple-600 to-blue-700 overflow-y-auto">
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

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 rounded-b-2xl">
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
              <span className="text-xs font-medium">Mensagens</span>
            </button>
            
            <button
              onClick={() => setCurrentView('home')}
              className="flex flex-col items-center space-y-1 p-2 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="text-xs font-medium">Ajuda</span>
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
    // Here you would typically send the feedback to your backend
  };

  return (
    <Card className="p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 pr-4">{faq.question}</h4>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
            isExpanded ? 'rotate-90' : ''
          }`} />
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
          
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Esta resposta foi útil?</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleFeedback('helpful')}
                  className={`p-1 rounded transition-colors ${
                    userFeedback === 'helpful' 
                      ? 'text-green-600 bg-green-50' 
                      : 'text-gray-400 hover:text-green-600'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleFeedback('not-helpful')}
                  className={`p-1 rounded transition-colors ${
                    userFeedback === 'not-helpful' 
                      ? 'text-red-600 bg-red-50' 
                      : 'text-gray-400 hover:text-red-600'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {faq.helpful && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                <span>{faq.helpful} pessoas acharam útil</span>
              </div>
            )}
          </div>

          {userFeedback && (
            <div className={`p-3 rounded-lg text-sm ${
              userFeedback === 'helpful' 
                ? 'bg-green-50 text-green-800' 
                : 'bg-red-50 text-red-800'
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