import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MessageCircle, 
  Phone, 
  Mail, 
  ExternalLink, 
  ChevronRight, 
  Send,
  ArrowLeft,
  Star,
  ThumbsUp,
  ThumbsDown,
  Book,
  Zap,
  Settings,
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle,
  Users,
  FileText,
  Video,
  Download,
  Globe,
  Headphones,
  Calendar,
  Filter,
  Tag,
  TrendingUp,
  Shield,
  Database
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  helpful?: number;
  notHelpful?: number;
  lastUpdated: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  count: number;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created: string;
  lastUpdate: string;
}

const categories: Category[] = [
  {
    id: 'getting-started',
    name: 'Primeiros Passos',
    icon: <Zap className="w-5 h-5" />,
    description: 'Como começar a usar o AdsOPS',
    color: 'from-green-500 to-emerald-600',
    count: 12
  },
  {
    id: 'campaigns',
    name: 'Campanhas',
    icon: <TrendingUp className="w-5 h-5" />,
    description: 'Gerenciamento de campanhas publicitárias',
    color: 'from-blue-500 to-cyan-600',
    count: 18
  },
  {
    id: 'analytics',
    name: 'Análises e Relatórios',
    icon: <Settings className="w-5 h-5" />,
    description: 'Relatórios e métricas de performance',
    color: 'from-purple-500 to-violet-600',
    count: 15
  },
  {
    id: 'integrations',
    name: 'Integrações',
    icon: <Database className="w-5 h-5" />,
    description: 'Conectar plataformas de publicidade',
    color: 'from-orange-500 to-red-600',
    count: 10
  },
  {
    id: 'billing',
    name: 'Faturamento',
    icon: <CreditCard className="w-5 h-5" />,
    description: 'Planos, pagamentos e faturas',
    color: 'from-pink-500 to-rose-600',
    count: 8
  },
  {
    id: 'troubleshooting',
    name: 'Solução de Problemas',
    icon: <AlertTriangle className="w-5 h-5" />,
    description: 'Resolver problemas comuns',
    color: 'from-yellow-500 to-amber-600',
    count: 14
  },
  {
    id: 'security',
    name: 'Segurança',
    icon: <Shield className="w-5 h-5" />,
    description: 'Configurações de segurança e privacidade',
    color: 'from-red-500 to-pink-600',
    count: 6
  },
  {
    id: 'api',
    name: 'API e Desenvolvedores',
    icon: <FileText className="w-5 h-5" />,
    description: 'Documentação técnica e API',
    color: 'from-gray-500 to-slate-600',
    count: 9
  }
];

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'Como começar a usar o AdsOPS?',
    answer: 'Para começar a usar o AdsOPS, siga estes passos: 1. Faça login em sua conta, 2. Conecte suas contas de publicidade (Meta, Google, TikTok), 3. Configure suas preferências de notificação, 4. Explore o dashboard para entender as métricas, 5. Configure seus primeiros alertas de orçamento. Recomendamos começar com uma campanha de teste para se familiarizar com a interface.',
    category: 'getting-started',
    tags: ['início', 'tutorial', 'configuração'],
    helpful: 89,
    notHelpful: 3,
    lastUpdated: '2024-01-15',
    difficulty: 'beginner',
    estimatedReadTime: 3
  },
  {
    id: '2',
    question: 'Como conectar minha conta do Meta Ads?',
    answer: 'Para conectar sua conta do Meta Ads: 1. Vá até "Fontes de Dados" no menu lateral, 2. Clique em "Adicionar Fonte", 3. Selecione "Meta Ads", 4. Você será redirecionado para fazer login em sua conta do Facebook, 5. Autorize o acesso às suas contas publicitárias, 6. Selecione as contas que deseja sincronizar. A sincronização inicial pode levar alguns minutos. Certifique-se de ter permissões de administrador nas contas publicitárias.',
    category: 'integrations',
    tags: ['meta', 'facebook', 'instagram', 'conexão'],
    helpful: 156,
    notHelpful: 8,
    lastUpdated: '2024-01-20',
    difficulty: 'beginner',
    estimatedReadTime: 4
  },
  {
    id: '3',
    question: 'Como interpretar as métricas de ROAS?',
    answer: 'ROAS (Return on Ad Spend) mostra quantos reais você ganha para cada real investido em publicidade. Como interpretar: ROAS 1.0 = Você recupera exatamente o que gastou, ROAS 2.0 = Para cada R$1 gasto, você ganha R$2, ROAS 4.0 = Para cada R$1 gasto, você ganha R$4. Valores acima de 3.0 são geralmente considerados bons, mas isso varia por setor e margem de lucro. Use o ROAS junto com outras métricas como CTR e CPC para uma análise completa.',
    category: 'analytics',
    tags: ['roas', 'métricas', 'roi', 'performance'],
    helpful: 234,
    notHelpful: 12,
    lastUpdated: '2024-01-18',
    difficulty: 'intermediate',
    estimatedReadTime: 5
  },
  {
    id: '4',
    question: 'Como configurar alertas de orçamento?',
    answer: 'Para configurar alertas de orçamento: 1. Vá em Configurações > Notificações, 2. Na seção "Limites de Alerta", ajuste o percentual de orçamento para receber alertas, 3. Escolha os tipos de notificação (email, push, desktop), 4. Configure horários silenciosos se necessário, 5. Defina regras específicas por campanha se desejar. Recomendamos alertas aos 80% do orçamento para ter tempo de ajustar as campanhas.',
    category: 'billing',
    tags: ['orçamento', 'alertas', 'notificações'],
    helpful: 98,
    notHelpful: 5,
    lastUpdated: '2024-01-22',
    difficulty: 'beginner',
    estimatedReadTime: 3
  },
  {
    id: '5',
    question: 'Por que minha campanha não está sincronizando?',
    answer: 'Problemas de sincronização podem ter várias causas: 1. Token de acesso expirado - reconecte a conta, 2. Permissões insuficientes - verifique se autorizou todas as permissões, 3. Campanha muito nova - aguarde até 24h após criação, 4. Problemas temporários da API - tente novamente em alguns minutos, 5. Limites de API atingidos - aguarde o reset. Se o problema persistir, verifique o status da API da plataforma ou entre em contato com o suporte.',
    category: 'troubleshooting',
    tags: ['sincronização', 'api', 'erro', 'conexão'],
    helpful: 67,
    notHelpful: 18,
    lastUpdated: '2024-01-25',
    difficulty: 'intermediate',
    estimatedReadTime: 4
  },
  {
    id: '6',
    question: 'Como usar a análise com IA?',
    answer: 'A análise com IA oferece insights automáticos sobre suas campanhas: 1. Vá para "Análise com IA" no menu, 2. Selecione as campanhas que deseja analisar, 3. Clique em "Gerar Análise com IA", 4. Aguarde o processamento (1-2 minutos), 5. Revise os insights e recomendações gerados. A IA analisa padrões, detecta anomalias e sugere otimizações baseadas em dados históricos. Configure sua chave da API OpenAI nas configurações para usar este recurso.',
    category: 'analytics',
    tags: ['ia', 'inteligência artificial', 'insights', 'análise'],
    helpful: 145,
    notHelpful: 9,
    lastUpdated: '2024-01-28',
    difficulty: 'advanced',
    estimatedReadTime: 6
  }
];

const mockTickets: SupportTicket[] = [
  {
    id: 'TICK-001',
    subject: 'Problema na sincronização do Google Ads',
    status: 'in-progress',
    priority: 'high',
    created: '2024-01-28',
    lastUpdate: '2024-01-29'
  },
  {
    id: 'TICK-002',
    subject: 'Dúvida sobre interpretação de métricas',
    status: 'resolved',
    priority: 'medium',
    created: '2024-01-25',
    lastUpdate: '2024-01-27'
  }
];

export const SupportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'tickets' | 'resources'>('faq');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'helpful'>('relevance');
  const [contactForm, setContactForm] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    message: ''
  });

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = !searchQuery || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    const matchesDifficulty = !selectedDifficulty || faq.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      case 'helpful':
        return (b.helpful || 0) - (a.helpful || 0);
      default:
        return 0;
    }
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would submit the contact form
    alert('Ticket criado com sucesso! Você receberá uma resposta em breve.');
    setContactForm({ subject: '', category: '', priority: 'medium', message: '' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-100';
      case 'in-progress': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderFAQTab = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por perguntas, respostas ou tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas as categorias</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os níveis</option>
              <option value="beginner">Iniciante</option>
              <option value="intermediate">Intermediário</option>
              <option value="advanced">Avançado</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="relevance">Relevância</option>
              <option value="date">Mais recentes</option>
              <option value="helpful">Mais úteis</option>
            </select>
          </div>

          {/* Active Filters */}
          {(selectedCategory || selectedDifficulty || searchQuery) && (
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  Busca: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                  {categories.find(c => c.id === selectedCategory)?.name}
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedDifficulty && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  {selectedDifficulty === 'beginner' ? 'Iniciante' : 
                   selectedDifficulty === 'intermediate' ? 'Intermediário' : 'Avançado'}
                  <button
                    onClick={() => setSelectedDifficulty('')}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Categories Grid */}
      {!selectedCategory && !searchQuery && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Categorias de Ajuda</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className="p-4 rounded-xl bg-white border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left group"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${category.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  {category.icon}
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{category.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{category.count} artigos</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FAQ Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedCategory ? 
              `${categories.find(c => c.id === selectedCategory)?.name} (${filteredFAQs.length})` :
              searchQuery ? 
                `Resultados da busca (${filteredFAQs.length})` :
                `Perguntas Frequentes (${filteredFAQs.length})`
            }
          </h3>
          {(selectedCategory || searchQuery) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCategory('');
                setSearchQuery('');
                setSelectedDifficulty('');
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {filteredFAQs.map((faq) => (
            <FAQItem key={faq.id} faq={faq} />
          ))}
        </div>

        {filteredFAQs.length === 0 && (
          <Card className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum resultado encontrado</h3>
            <p className="text-gray-500 mb-4">
              Tente usar palavras-chave diferentes ou navegue pelas categorias.
            </p>
            <Button onClick={() => setActiveTab('contact')}>
              Entrar em contato
            </Button>
          </Card>
        )}
      </div>
    </div>
  );

  const renderContactTab = () => (
    <div className="space-y-6">
      {/* Contact Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Chat ao Vivo</h3>
          <p className="text-sm text-gray-600 mb-4">Fale conosco em tempo real</p>
          <p className="text-xs text-green-600 mb-4">● Online agora</p>
          <Button className="w-full">Iniciar Chat</Button>
        </Card>

        <Card className="text-center p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
          <p className="text-sm text-gray-600 mb-4">Resposta em até 2 horas</p>
          <p className="text-xs text-gray-500 mb-4">suporte@adsops.com</p>
          <Button variant="outline" className="w-full">Enviar Email</Button>
        </Card>

        <Card className="text-center p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Phone className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Telefone</h3>
          <p className="text-sm text-gray-600 mb-4">Seg-Sex, 9h às 18h</p>
          <p className="text-xs text-gray-500 mb-4">(11) 9999-9999</p>
          <Button variant="outline" className="w-full">Ligar Agora</Button>
        </Card>
      </div>

      {/* Contact Form */}
      <Card>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Criar Ticket de Suporte</h3>
          <p className="text-gray-600">Descreva seu problema e nossa equipe entrará em contato</p>
        </div>

        <form onSubmit={handleContactSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assunto
              </label>
              <input
                type="text"
                required
                value={contactForm.subject}
                onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descreva brevemente o problema"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                required
                value={contactForm.category}
                onChange={(e) => setContactForm({...contactForm, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioridade
            </label>
            <select
              value={contactForm.priority}
              onChange={(e) => setContactForm({...contactForm, priority: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição detalhada
            </label>
            <textarea
              required
              rows={6}
              value={contactForm.message}
              onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descreva o problema em detalhes, incluindo passos para reproduzir se aplicável..."
            />
          </div>

          <Button type="submit" className="w-full">
            <Send className="w-4 h-4 mr-2" />
            Enviar Ticket
          </Button>
        </form>
      </Card>
    </div>
  );

  const renderTicketsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Meus Tickets</h3>
        <Button onClick={() => setActiveTab('contact')}>
          Novo Ticket
        </Button>
      </div>

      <div className="space-y-4">
        {mockTickets.map((ticket) => (
          <Card key={ticket.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-medium text-gray-900">{ticket.subject}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                    {ticket.status === 'open' ? 'Aberto' :
                     ticket.status === 'in-progress' ? 'Em Andamento' :
                     ticket.status === 'resolved' ? 'Resolvido' : 'Fechado'}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority === 'urgent' ? 'Urgente' :
                     ticket.priority === 'high' ? 'Alta' :
                     ticket.priority === 'medium' ? 'Média' : 'Baixa'}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>#{ticket.id}</span>
                  <span>Criado em {new Date(ticket.created).toLocaleDateString('pt-BR')}</span>
                  <span>Atualizado em {new Date(ticket.lastUpdate).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </Card>
        ))}
      </div>

      {mockTickets.length === 0 && (
        <Card className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum ticket encontrado</h3>
          <p className="text-gray-500 mb-4">Você ainda não criou nenhum ticket de suporte.</p>
          <Button onClick={() => setActiveTab('contact')}>
            Criar Primeiro Ticket
          </Button>
        </Card>
      )}
    </div>
  );

  const renderResourcesTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Recursos e Documentação</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <Video className="w-6 h-6 text-blue-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Tutoriais em Vídeo</h4>
          <p className="text-sm text-gray-600 mb-4">Aprenda a usar o AdsOPS com nossos vídeos tutoriais</p>
          <Button variant="outline" className="w-full">
            <ExternalLink className="w-4 h-4 mr-2" />
            Assistir Vídeos
          </Button>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Documentação da API</h4>
          <p className="text-sm text-gray-600 mb-4">Guias técnicos para desenvolvedores</p>
          <Button variant="outline" className="w-full">
            <ExternalLink className="w-4 h-4 mr-2" />
            Ver Documentação
          </Button>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <Download className="w-6 h-6 text-purple-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Downloads</h4>
          <p className="text-sm text-gray-600 mb-4">Templates, guias e recursos para download</p>
          <Button variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Ver Downloads
          </Button>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
            <Globe className="w-6 h-6 text-orange-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Blog</h4>
          <p className="text-sm text-gray-600 mb-4">Dicas, novidades e melhores práticas</p>
          <Button variant="outline" className="w-full">
            <ExternalLink className="w-4 h-4 mr-2" />
            Ler Blog
          </Button>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-red-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Comunidade</h4>
          <p className="text-sm text-gray-600 mb-4">Conecte-se com outros usuários do AdsOPS</p>
          <Button variant="outline" className="w-full">
            <ExternalLink className="w-4 h-4 mr-2" />
            Participar
          </Button>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-yellow-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Webinars</h4>
          <p className="text-sm text-gray-600 mb-4">Participe de nossos webinars ao vivo</p>
          <Button variant="outline" className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            Ver Agenda
          </Button>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'faq', label: 'FAQ', icon: Book },
    { id: 'contact', label: 'Contato', icon: MessageCircle },
    { id: 'tickets', label: 'Meus Tickets', icon: Headphones },
    { id: 'resources', label: 'Recursos', icon: FileText }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
          <Headphones className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Central de Ajuda</h1>
          <p className="text-gray-600">FAQ, suporte e recursos para usar o AdsOPS</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'faq' && renderFAQTab()}
      {activeTab === 'contact' && renderContactTab()}
      {activeTab === 'tickets' && renderTicketsTab()}
      {activeTab === 'resources' && renderResourcesTab()}
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'Iniciante';
      case 'intermediate': return 'Intermediário';
      case 'advanced': return 'Avançado';
      default: return difficulty;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h4 className="font-medium text-gray-900 mb-2">{faq.question}</h4>
            <div className="flex items-center space-x-3 text-sm">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(faq.difficulty)}`}>
                {getDifficultyLabel(faq.difficulty)}
              </span>
              <div className="flex items-center space-x-1 text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{faq.estimatedReadTime} min</span>
              </div>
              <div className="flex items-center space-x-1 text-gray-500">
                <ThumbsUp className="w-3 h-3" />
                <span>{faq.helpful || 0}</span>
              </div>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
            isExpanded ? 'rotate-90' : ''
          }`} />
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
          </div>

          {/* Tags */}
          {faq.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {faq.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md"
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          )}
          
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
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>Atualizado em {new Date(faq.lastUpdated).toLocaleDateString('pt-BR')}</span>
              {faq.helpful && (
                <div className="flex items-center space-x-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span>{faq.helpful} úteis</span>
                </div>
              )}
            </div>
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