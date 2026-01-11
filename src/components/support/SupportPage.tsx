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
  Database,
  Trash2
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
    count: 4
  },
  {
    id: 'workspaces',
    name: 'Workspaces',
    icon: <Users className="w-5 h-5" />,
    description: 'Gerenciar workspaces e equipes',
    color: 'from-indigo-500 to-blue-600',
    count: 3
  },
  {
    id: 'clients',
    name: 'Clientes',
    icon: <Users className="w-5 h-5" />,
    description: 'Gestão de clientes e contas',
    color: 'from-teal-500 to-cyan-600',
    count: 2
  },
  {
    id: 'campaigns',
    name: 'Campanhas',
    icon: <TrendingUp className="w-5 h-5" />,
    description: 'Gerenciamento de campanhas publicitárias',
    color: 'from-blue-500 to-cyan-600',
    count: 2
  },
  {
    id: 'analytics',
    name: 'Análises e Relatórios',
    icon: <Settings className="w-5 h-5" />,
    description: 'Relatórios e métricas de performance',
    color: 'from-purple-500 to-violet-600',
    count: 3
  },
  {
    id: 'integrations',
    name: 'Integrações',
    icon: <Database className="w-5 h-5" />,
    description: 'Conectar plataformas de publicidade',
    color: 'from-orange-500 to-red-600',
    count: 3
  },
  {
    id: 'billing',
    name: 'Faturamento',
    icon: <CreditCard className="w-5 h-5" />,
    description: 'Planos, pagamentos e faturas',
    color: 'from-pink-500 to-rose-600',
    count: 2
  },
  {
    id: 'troubleshooting',
    name: 'Solução de Problemas',
    icon: <AlertTriangle className="w-5 h-5" />,
    description: 'Resolver problemas comuns',
    color: 'from-yellow-500 to-amber-600',
    count: 3
  },
  {
    id: 'security',
    name: 'Segurança',
    icon: <Shield className="w-5 h-5" />,
    description: 'Configurações de segurança e privacidade',
    color: 'from-red-500 to-pink-600',
    count: 2
  },
  {
    id: 'api',
    name: 'API e Desenvolvedores',
    icon: <FileText className="w-5 h-5" />,
    description: 'Documentação técnica e API',
    color: 'from-gray-500 to-slate-600',
    count: 2
  }
];

const faqData: FAQItem[] = [
  // PRIMEIROS PASSOS
  {
    id: '1',
    question: 'Bem-vindo ao AdsOPS - Como começar?',
    answer: 'O AdsOPS é sua plataforma completa para gerenciar campanhas publicitárias. Para começar: 1) Após o login, você será guiado pelo processo de onboarding. 2) Crie seu primeiro workspace (ambiente de trabalho) onde você gerenciará suas campanhas. 3) Configure seu perfil e preferências básicas. 4) Convide membros da equipe se necessário. 5) Conecte sua primeira conta de anúncios (Meta Ads, Google Ads ou TikTok Ads). 6) Aguarde a sincronização inicial dos dados. 7) Explore o dashboard principal para ver suas métricas. Dica: Comece com uma conta de testes para se familiarizar com a plataforma antes de conectar contas de produção.',
    category: 'getting-started',
    tags: ['início', 'onboarding', 'tutorial', 'configuração'],
    helpful: 245,
    notHelpful: 5,
    lastUpdated: '2024-01-15',
    difficulty: 'beginner',
    estimatedReadTime: 4
  },
  {
    id: '2',
    question: 'Qual a diferença entre Workspace, Cliente e Conta Publicitária?',
    answer: 'O AdsOPS organiza seus dados em três níveis hierárquicos: 1) WORKSPACE - É o nível mais alto, representa sua empresa ou agência. Cada usuário pode ter acesso a múltiplos workspaces. 2) CLIENTE - Dentro de um workspace, você pode criar diferentes clientes (empresas que você atende). Isso é útil para agências que gerenciam múltiplas marcas. 3) CONTA PUBLICITÁRIA - Cada cliente pode ter uma ou mais contas publicitárias conectadas (Meta Ads, Google Ads, TikTok Ads). Esta estrutura permite organização clara, relatórios separados por cliente, e controle de acesso granular por workspace ou cliente específico.',
    category: 'getting-started',
    tags: ['workspace', 'cliente', 'organização', 'estrutura'],
    helpful: 189,
    notHelpful: 12,
    lastUpdated: '2024-01-16',
    difficulty: 'beginner',
    estimatedReadTime: 5
  },
  {
    id: '3',
    question: 'Como navegar pela interface do AdsOPS?',
    answer: 'A interface do AdsOPS é dividida em áreas principais: MENU LATERAL ESQUERDO - Dashboard (visão geral), Campanhas (análise detalhada), Fontes de Dados (conexões), Análise com IA (insights automáticos), Extração de Dados (relatórios customizados), Clientes (gestão de clientes), Workspaces (gestão de ambientes). TOPO DA TELA - Seletor de workspace e cliente, notificações, configurações de usuário. ÁREA PRINCIPAL - Conteúdo dinâmico conforme a seção selecionada. BARRA DE FILTROS - Presente em várias telas para filtrar por período, status, plataforma. Dica: Use atalhos de teclado - "?" para ver todos os atalhos disponíveis.',
    category: 'getting-started',
    tags: ['interface', 'navegação', 'menu', 'layout'],
    helpful: 156,
    notHelpful: 8,
    lastUpdated: '2024-01-17',
    difficulty: 'beginner',
    estimatedReadTime: 4
  },
  {
    id: '4',
    question: 'Primeiros passos após conectar minha conta de anúncios',
    answer: 'Após conectar sua primeira conta de anúncios, siga estas etapas: 1) AGUARDE A SINCRONIZAÇÃO INICIAL - Pode levar de 5 a 30 minutos dependendo do volume de dados. 2) VERIFIQUE O STATUS DA SINCRONIZAÇÃO - Vá em "Fontes de Dados" e confira se a sincronização foi concluída com sucesso. 3) EXPLORE O DASHBOARD - Visualize as métricas principais: gastos, impressões, cliques, conversões. 4) ANALISE SUAS CAMPANHAS - Acesse a seção "Campanhas" para ver detalhes de cada campanha. 5) CONFIGURE ALERTAS - Defina alertas de orçamento e performance nas configurações. 6) EXPERIMENTE A ANÁLISE COM IA - Gere insights automáticos sobre suas campanhas. 7) PERSONALIZE SEUS RELATÓRIOS - Use a "Extração de Dados" para criar relatórios customizados.',
    category: 'getting-started',
    tags: ['primeiros passos', 'sincronização', 'dashboard'],
    helpful: 198,
    notHelpful: 6,
    lastUpdated: '2024-01-18',
    difficulty: 'beginner',
    estimatedReadTime: 5
  },

  // WORKSPACES
  {
    id: '5',
    question: 'Como criar e gerenciar workspaces?',
    answer: 'WORKSPACES são ambientes isolados para organizar suas operações. Para criar: 1) Clique no seletor de workspace no topo da tela. 2) Clique em "Novo Workspace". 3) Preencha: nome (ex: "Agência XYZ"), descrição opcional, e faça upload de uma logo. 4) Defina configurações de timezone e moeda padrão. 5) Convide membros da equipe se necessário. GERENCIAMENTO: Acesse "Workspaces" no menu para: editar informações, gerenciar membros e permissões, ver estatísticas de uso, configurar preferências específicas do workspace, excluir workspace (cuidado: exclui todos os dados). PERMISSÕES: Owner (dono) - controle total; Admin - pode gerenciar tudo exceto excluir workspace; Editor - pode editar campanhas e configurações; Viewer - apenas visualização.',
    category: 'workspaces',
    tags: ['workspace', 'criar', 'gerenciar', 'permissões'],
    helpful: 178,
    notHelpful: 10,
    lastUpdated: '2024-01-19',
    difficulty: 'intermediate',
    estimatedReadTime: 6
  },
  {
    id: '6',
    question: 'Como adicionar e gerenciar membros no workspace?',
    answer: 'Para gerenciar equipes no workspace: 1) Acesse "Workspaces" no menu lateral. 2) Selecione o workspace desejado. 3) Vá na aba "Membros". 4) Clique em "Convidar Membro". 5) Digite o email do usuário. 6) Selecione o nível de permissão (Owner, Admin, Editor, Viewer). 7) Opcionalmente, restrinja acesso a clientes específicos. 8) Envie o convite. GERENCIAR MEMBROS EXISTENTES: Alterar permissões, remover acesso, ver histórico de atividades. DICA DE SEGURANÇA: Use o princípio do menor privilégio - conceda apenas as permissões necessárias. Para freelancers ou parceiros temporários, use a permissão "Viewer" ou "Editor" com acesso restrito a clientes específicos.',
    category: 'workspaces',
    tags: ['membros', 'equipe', 'convites', 'permissões', 'colaboração'],
    helpful: 145,
    notHelpful: 7,
    lastUpdated: '2024-01-20',
    difficulty: 'intermediate',
    estimatedReadTime: 5
  },
  {
    id: '7',
    question: 'Posso ter múltiplos workspaces?',
    answer: 'Sim! O AdsOPS suporta múltiplos workspaces na mesma conta. Casos de uso: 1) AGÊNCIAS - Um workspace para cada divisão ou vertical (ex: "E-commerce", "Saúde", "Educação"). 2) EMPRESAS COM MÚLTIPLAS MARCAS - Um workspace por marca para separação completa de dados. 3) AMBIENTES DE TESTE E PRODUÇÃO - Workspace de testes para experimentar recursos sem afetar dados reais. 4) SEPARAÇÃO GEOGRÁFICA - Workspaces por região (ex: "Brasil", "América Latina", "EUA"). Para alternar entre workspaces, use o seletor no topo da tela. Cada workspace mantém seus próprios: clientes, contas publicitárias conectadas, membros e permissões, configurações e preferências, dados históricos e relatórios.',
    category: 'workspaces',
    tags: ['múltiplos workspaces', 'organização', 'estrutura'],
    helpful: 167,
    notHelpful: 9,
    lastUpdated: '2024-01-21',
    difficulty: 'beginner',
    estimatedReadTime: 4
  },

  // CLIENTES
  {
    id: '8',
    question: 'Como criar e organizar clientes no sistema?',
    answer: 'CLIENTES representam as empresas ou marcas que você gerencia dentro de um workspace. Para criar: 1) Acesse "Clientes" no menu lateral. 2) Clique em "Novo Cliente". 3) Preencha os dados: nome do cliente, informações de contato, segmento/indústria, notas e observações. 4) Faça upload do logo do cliente (opcional). 5) Salve o cliente. ORGANIZAÇÃO: Use tags para categorizar clientes (ex: "E-commerce", "B2B", "Alto Volume"). Defina cores personalizadas para identificação visual rápida. Associe contas publicitárias ao cliente após criação. BENEFÍCIOS: Relatórios separados por cliente, faturamento individual, acesso controlado (membros podem ter acesso apenas a clientes específicos), histórico completo de atividades por cliente.',
    category: 'clients',
    tags: ['clientes', 'criar', 'organizar', 'gestão'],
    helpful: 134,
    notHelpful: 8,
    lastUpdated: '2024-01-22',
    difficulty: 'beginner',
    estimatedReadTime: 5
  },
  {
    id: '9',
    question: 'Como associar contas publicitárias a um cliente?',
    answer: 'Após criar um cliente, você pode associar contas de anúncios: 1) Acesse "Fontes de Dados" no menu. 2) Clique em "Adicionar Fonte". 3) Escolha a plataforma (Meta Ads, Google Ads, TikTok Ads). 4) Complete o processo de autenticação OAuth. 5) Quando as contas forem listadas, selecione a qual cliente cada conta pertence. 6) Confirme a sincronização. DEPOIS DA CONEXÃO: Você pode alterar a associação de cliente em "Fontes de Dados", clicando em "Editar" na conta desejada. Uma conta publicitária pode pertencer a apenas um cliente por vez. Se precisar compartilhar dados entre clientes, use a funcionalidade de "Relatórios Consolidados".',
    category: 'clients',
    tags: ['clientes', 'contas', 'associação', 'conexão'],
    helpful: 156,
    notHelpful: 11,
    lastUpdated: '2024-01-23',
    difficulty: 'intermediate',
    estimatedReadTime: 4
  },

  // CAMPANHAS
  {
    id: '10',
    question: 'Como visualizar e analisar minhas campanhas?',
    answer: 'A seção "Campanhas" oferece análise detalhada: VISUALIZAÇÃO PRINCIPAL: Lista todas as campanhas ativas com métricas chave (gastos, impressões, cliques, conversões, ROAS). Use filtros para refinar: plataforma (Meta/Google/TikTok), status (ativa/pausada/encerrada), período, cliente, nome da campanha. ANÁLISE DETALHADA: Clique em qualquer campanha para ver: gráficos de performance ao longo do tempo, métricas por conjunto de anúncios, desempenho de anúncios individuais, análise de criativos, comparação de períodos, recomendações de otimização. RECURSOS AVANÇADOS: Exportar dados para Excel/CSV, agendar relatórios automáticos, configurar alertas de performance, analisar com IA.',
    category: 'campaigns',
    tags: ['campanhas', 'análise', 'visualização', 'métricas'],
    helpful: 223,
    notHelpful: 8,
    lastUpdated: '2024-01-24',
    difficulty: 'beginner',
    estimatedReadTime: 6
  },
  {
    id: '11',
    question: 'Como comparar performance entre diferentes períodos?',
    answer: 'O AdsOPS oferece várias formas de comparação temporal: 1) COMPARAÇÃO RÁPIDA - Na tela de campanhas, use os filtros de data e ative "Comparar com período anterior". Você verá variações em % para todas as métricas. 2) GRÁFICOS DE TENDÊNCIA - Visualize a evolução de métricas específicas ao longo do tempo com linhas de tendência. 3) ANÁLISE DE SAZONALIDADE - Compare mesmo período do ano anterior para identificar padrões sazonais. 4) PERÍODOS PERSONALIZADOS - Selecione períodos específicos para comparação (ex: "Black Friday 2023" vs "Black Friday 2024"). MÉTRICAS COMPARADAS: Gastos, impressões, cliques, CTR, CPC, conversões, taxa de conversão, ROAS, CPM. As variações são destacadas com cores (verde para melhoria, vermelho para piora).',
    category: 'campaigns',
    tags: ['comparação', 'períodos', 'tendências', 'performance'],
    helpful: 189,
    notHelpful: 12,
    lastUpdated: '2024-01-25',
    difficulty: 'intermediate',
    estimatedReadTime: 5
  },

  // ANÁLISES E RELATÓRIOS
  {
    id: '12',
    question: 'Como interpretar as principais métricas de publicidade?',
    answer: 'Guia completo das métricas principais: IMPRESSÕES - Quantas vezes seu anúncio foi exibido. ALCANCE - Número de pessoas únicas que viram seu anúncio. CLIQUES - Quantas vezes clicaram no anúncio. CTR (Click-Through Rate) - Taxa de cliques = (Cliques / Impressões) × 100. CTR acima de 2% é considerado bom. CPC (Custo Por Clique) - Quanto você paga por cada clique. Menor é melhor. CPM (Custo Por Mil Impressões) - Custo para alcançar 1000 pessoas. CONVERSÕES - Ações valiosas realizadas (compra, cadastro, etc). TAXA DE CONVERSÃO - (Conversões / Cliques) × 100. Varia muito por setor. ROAS (Return on Ad Spend) - Retorno sobre investimento. ROAS de 4:1 significa R$4 de receita para cada R$1 gasto. CPA (Custo Por Aquisição) - Quanto você gasta para conseguir uma conversão.',
    category: 'analytics',
    tags: ['métricas', 'kpi', 'análise', 'performance', 'roas', 'ctr', 'cpc'],
    helpful: 312,
    notHelpful: 15,
    lastUpdated: '2024-01-26',
    difficulty: 'beginner',
    estimatedReadTime: 7
  },
  {
    id: '13',
    question: 'Como criar relatórios personalizados?',
    answer: 'Use a seção "Extração de Dados" para relatórios customizados: 1) SELECIONE DIMENSÕES - Escolha como agrupar dados: por campanha, conjunto de anúncios, anúncio, data, dispositivo, localização, idade, gênero. 2) ESCOLHA MÉTRICAS - Selecione quais métricas exibir: gastos, impressões, cliques, conversões, ROAS, etc. 3) APLIQUE FILTROS - Filtre por: período específico, plataforma, status, clientes, campanhas específicas. 4) CONFIGURE VISUALIZAÇÃO - Escolha entre: tabela detalhada, gráficos (linha, barra, pizza), cards de KPI. 5) SALVE OU EXPORTE - Salve como dashboard customizado, exporte para Excel/CSV/PDF, agende envio automático por email. CASOS DE USO: Relatório mensal para cliente, análise de ROI por produto, comparação entre regiões geográficas.',
    category: 'analytics',
    tags: ['relatórios', 'customização', 'extração', 'dados'],
    helpful: 267,
    notHelpful: 18,
    lastUpdated: '2024-01-27',
    difficulty: 'intermediate',
    estimatedReadTime: 6
  },
  {
    id: '14',
    question: 'O que é a Análise com IA e como usar?',
    answer: 'A Análise com IA usa inteligência artificial para gerar insights automáticos: COMO FUNCIONA: 1) Acesse "Análise com IA" no menu. 2) Selecione campanhas, período e tipo de análise. 3) Clique em "Gerar Análise com IA". 4) A IA processa dados históricos (leva 1-3 minutos). 5) Receba relatório com insights e recomendações. TIPOS DE ANÁLISE: Detecção de anomalias (identifica picos ou quedas incomuns), otimização de orçamento (sugere redistribuição de investimento), análise de criativos (avalia performance de imagens/vídeos), previsão de performance (projeta resultados futuros), benchmarking (compara com médias do setor). CONFIGURAÇÃO: Requer chave de API da OpenAI (configure em "Configurações > Integrações > OpenAI"). Custos de API da OpenAI são por sua conta.',
    category: 'analytics',
    tags: ['ia', 'inteligência artificial', 'insights', 'análise', 'automação'],
    helpful: 198,
    notHelpful: 22,
    lastUpdated: '2024-01-28',
    difficulty: 'advanced',
    estimatedReadTime: 6
  },

  // INTEGRAÇÕES
  {
    id: '15',
    question: 'Como conectar minha conta do Meta Ads (Facebook e Instagram)?',
    answer: 'Passo a passo para conectar Meta Ads: PRÉ-REQUISITOS: Ter uma conta no Facebook Business Manager, ter permissão de Administrador nas contas publicitárias, ter campanhas ativas ou históricas. PROCESSO DE CONEXÃO: 1) Acesse "Fontes de Dados" no menu. 2) Clique em "Adicionar Fonte" > "Meta Ads". 3) Você será redirecionado para login do Facebook. 4) Faça login com sua conta. 5) Autorize o AdsOPS a acessar suas contas publicitárias (precisamos de: ads_read, ads_management, business_management). 6) Selecione quais contas publicitárias deseja sincronizar. 7) Associe cada conta a um cliente. 8) Aguarde a sincronização inicial (5-30 minutos). PROBLEMAS COMUNS: "Permissões insuficientes" - certifique-se de ser Admin da conta; "Conta não encontrada" - verifique se a conta está no Business Manager.',
    category: 'integrations',
    tags: ['meta', 'facebook', 'instagram', 'conexão', 'oauth'],
    helpful: 278,
    notHelpful: 14,
    lastUpdated: '2024-01-29',
    difficulty: 'beginner',
    estimatedReadTime: 5
  },
  {
    id: '16',
    question: 'Como conectar minha conta do Google Ads?',
    answer: 'Guia para conectar Google Ads: PRÉ-REQUISITOS: Conta Google Ads ativa, permissões de administrador ou padrão, MCC (My Client Center) configurado se gerencia múltiplas contas. PASSOS: 1) "Fontes de Dados" > "Adicionar Fonte" > "Google Ads". 2) Faça login com sua conta Google. 3) Autorize o AdsOPS (precisamos acessar: campanhas, métricas, relatórios). 4) Se usa MCC, selecione a conta gerente. 5) Escolha contas individuais para sincronizar. 6) Associe cada conta a um cliente do AdsOPS. 7) Configure conversões (opcional mas recomendado). 8) Aguarde sincronização inicial. DIFERENÇAS DO META: Google Ads tem estrutura Campanha > Grupo de Anúncios > Anúncios (vs Meta: Campanha > Conjunto de Anúncios > Anúncios). O AdsOPS normaliza ambas estruturas para visualização unificada.',
    category: 'integrations',
    tags: ['google', 'google ads', 'conexão', 'oauth', 'mcc'],
    helpful: 234,
    notHelpful: 19,
    lastUpdated: '2024-01-30',
    difficulty: 'beginner',
    estimatedReadTime: 5
  },
  {
    id: '17',
    question: 'Como conectar minha conta do TikTok Ads?',
    answer: 'Conectando TikTok Ads ao AdsOPS: REQUISITOS: Conta TikTok Ads ativa, ser administrador da conta publicitária. PROCESSO: 1) "Fontes de Dados" > "Adicionar Fonte" > "TikTok Ads". 2) Faça login no TikTok. 3) Autorize as permissões solicitadas. 4) Selecione contas publicitárias para sincronizar. 5) Associe a clientes. 6) Aguarde sincronização (5-20 minutos). PARTICULARIDADES DO TIKTOK: TikTok usa estrutura de campanhas similar ao Facebook. Métricas específicas do TikTok incluem: taxa de visualização completa do vídeo, engajamento (likes, comentários, compartilhamentos), tempo médio de visualização. DICA: TikTok tem forte foco em vídeos curtos - use análise de criativos do AdsOPS para identificar quais vídeos performam melhor.',
    category: 'integrations',
    tags: ['tiktok', 'tiktok ads', 'conexão', 'vídeo'],
    helpful: 189,
    notHelpful: 16,
    lastUpdated: '2024-01-31',
    difficulty: 'beginner',
    estimatedReadTime: 4
  },

  // FATURAMENTO
  {
    id: '18',
    question: 'Quais são os planos disponíveis do AdsOPS?',
    answer: 'O AdsOPS oferece planos flexíveis: PLANO FREE: Até 1 workspace, até 2 clientes, até 3 contas publicitárias conectadas, sincronização a cada 24h, histórico de 30 dias, suporte por email. PLANO STARTER ($49/mês): Até 3 workspaces, até 10 clientes, até 15 contas publicitárias, sincronização a cada 6h, histórico de 6 meses, análise com IA (100 análises/mês), suporte prioritário. PLANO PROFESSIONAL ($149/mês): Workspaces ilimitados, até 50 clientes, até 50 contas publicitárias, sincronização a cada 1h, histórico ilimitado, análise com IA ilimitada, relatórios automatizados, API access, suporte 24/7. PLANO ENTERPRISE (customizado): Tudo do Professional, contas ilimitadas, sincronização em tempo real, ambiente dedicado, SLA garantido, gerente de conta dedicado, treinamento personalizado.',
    category: 'billing',
    tags: ['planos', 'preços', 'faturamento', 'assinatura'],
    helpful: 201,
    notHelpful: 12,
    lastUpdated: '2024-02-01',
    difficulty: 'beginner',
    estimatedReadTime: 5
  },
  {
    id: '19',
    question: 'Como configurar alertas de orçamento e performance?',
    answer: 'Configure alertas para monitorar gastos e resultados: ALERTAS DE ORÇAMENTO: 1) "Configurações" > "Notificações" > "Alertas de Orçamento". 2) Defina limite percentual (ex: alertar aos 80% do orçamento). 3) Escolha canais de notificação (email, push, SMS). 4) Configure horários de silêncio se necessário. 5) Defina regras por campanha ou global. ALERTAS DE PERFORMANCE: Configure alertas para: ROAS abaixo de X, CPA acima de Y, CTR abaixo de Z, gastos diários acima de limite, campanhas sem conversões por X dias. ALERTAS INTELIGENTES: Use IA para detectar anomalias automaticamente (quedas ou picos súbitos em qualquer métrica). GERENCIAMENTO: Visualize histórico de alertas em "Notificações", pause alertas temporariamente, ajuste sensibilidade.',
    category: 'billing',
    tags: ['alertas', 'orçamento', 'notificações', 'limites'],
    helpful: 167,
    notHelpful: 9,
    lastUpdated: '2024-02-02',
    difficulty: 'intermediate',
    estimatedReadTime: 5
  },

  // SOLUÇÃO DE PROBLEMAS
  {
    id: '20',
    question: 'Minha campanha não está sincronizando - O que fazer?',
    answer: 'Checklist para resolver problemas de sincronização: 1) VERIFIQUE O STATUS - Vá em "Fontes de Dados" e veja se há erros na conexão. 2) TOKEN EXPIRADO - Se ver "Token expirado", clique em "Reconectar" e autorize novamente. 3) PERMISSÕES - Confirme que autorizou todas as permissões solicitadas. 4) CAMPANHA MUITO NOVA - Campanhas criadas há menos de 24h podem não aparecer imediatamente. 5) LIMITES DE API - Plataformas têm limites de requisições. Se atingido, aguarde reset automático. 6) FORÇAR SINCRONIZAÇÃO - Clique em "Sincronizar Agora" na conta publicitária. 7) VERIFIQUE LOGS - Acesse "Configurações" > "Logs de Sincronização" para ver detalhes técnicos do erro. 8) STATUS DA API - Verifique se a plataforma (Meta/Google/TikTok) está com problemas em seus status pages.',
    category: 'troubleshooting',
    tags: ['sincronização', 'erro', 'troubleshooting', 'conexão'],
    helpful: 245,
    notHelpful: 23,
    lastUpdated: '2024-02-03',
    difficulty: 'intermediate',
    estimatedReadTime: 6
  },
  {
    id: '21',
    question: 'Os números no AdsOPS estão diferentes da plataforma original',
    answer: 'Diferenças nos dados podem ocorrer por vários motivos: JANELA DE ATRIBUIÇÃO: Plataformas usam diferentes janelas de atribuição. Meta Ads: padrão 7 dias clique / 1 dia visualização. Google Ads: padrão 30 dias clique. AdsOPS usa a mesma configuração da plataforma, mas diferenças podem ocorrer se você alterou nas configurações. CONVERSÕES ATRASADAS: Conversões reportadas após sincronização aparecem na próxima atualização. TIMEZONE: Certifique-se de que o timezone configurado no AdsOPS corresponde ao da plataforma. CACHE: Dados em plataformas podem estar em cache. No AdsOPS, force sincronização para dados mais recentes. FILTROS APLICADOS: Verifique se não há filtros ativos que estejam excluindo dados. Se diferenças persistirem >5%, contate o suporte com prints comparativos.',
    category: 'troubleshooting',
    tags: ['discrepância', 'dados', 'métricas', 'diferenças'],
    helpful: 198,
    notHelpful: 31,
    lastUpdated: '2024-02-04',
    difficulty: 'intermediate',
    estimatedReadTime: 5
  },
  {
    id: '22',
    question: 'Erro ao exportar relatório - Como resolver?',
    answer: 'Problemas comuns ao exportar dados: ERRO "ARQUIVO MUITO GRANDE": Se seu relatório tem mais de 100.000 linhas, divida o período ou aplique filtros para reduzir o volume. Tente exportar em partes (ex: mês por mês). ERRO "TEMPO ESGOTADO": Relatórios muito complexos podem exceder timeout. Simplifique: reduza dimensões, use menos métricas, filtre dados desnecessários. ERRO DE PERMISSÃO: Verifique se seu usuário tem permissão de exportação (requer role Editor ou superior). FORMATO NÃO ABRINDO: Excel - certifique-se de ter Microsoft Excel 2016+; CSV - use ";" como delimitador se usar Excel em português; PDF - verifique se Adobe Reader está atualizado. ALTERNATIVAS: Use "Extração de Dados" para relatórios complexos, agende exportação automática que processa em background.',
    category: 'troubleshooting',
    tags: ['exportação', 'relatório', 'erro', 'download'],
    helpful: 134,
    notHelpful: 18,
    lastUpdated: '2024-02-05',
    difficulty: 'intermediate',
    estimatedReadTime: 5
  },

  // SEGURANÇA
  {
    id: '23',
    question: 'Como o AdsOPS protege meus dados?',
    answer: 'Segurança é nossa prioridade máxima: CRIPTOGRAFIA: Todos os dados em trânsito usam TLS 1.3. Dados em repouso são criptografados com AES-256. Tokens de acesso OAuth são criptografados e armazenados com segurança. INFRAESTRUTURA: Hospedagem em Supabase (AWS) com certificações ISO 27001, SOC 2. Backups automáticos diários com retenção de 30 dias. Redundância geográfica para alta disponibilidade. ACESSO: Autenticação segura com senhas criptografadas (bcrypt). Suporte a autenticação de dois fatores (2FA). Sessões expiram após 7 dias de inatividade. Logs de auditoria de todas as ações sensíveis. COMPLIANCE: LGPD - Política de privacidade completa. GDPR - Direito de exclusão e portabilidade de dados. Termos de serviço transparentes.',
    category: 'security',
    tags: ['segurança', 'privacidade', 'criptografia', 'lgpd', 'proteção'],
    helpful: 212,
    notHelpful: 8,
    lastUpdated: '2024-02-06',
    difficulty: 'intermediate',
    estimatedReadTime: 6
  },
  {
    id: '24',
    question: 'Como habilitar autenticação de dois fatores (2FA)?',
    answer: 'Adicione camada extra de segurança com 2FA: HABILITANDO 2FA: 1) Acesse "Configurações" > "Segurança". 2) Clique em "Habilitar Autenticação de Dois Fatores". 3) Escolha método: Aplicativo autenticador (recomendado) - use Google Authenticator, Authy, ou similar; SMS - receba códigos por mensagem de texto. 4) Para aplicativo: escaneie QR code com seu app autenticador; anote códigos de recuperação (guarde em local seguro!). 5) Digite código de confirmação. 6) 2FA está ativo! USANDO 2FA: Após login normal, digite código de 6 dígitos do aplicativo. Marque "Confiar neste dispositivo por 30 dias" para não pedir sempre. RECUPERAÇÃO: Use códigos de recuperação se perder acesso ao autenticador. Cada código pode ser usado apenas uma vez. Se perder códigos, entre em contato com suporte.',
    category: 'security',
    tags: ['2fa', 'autenticação', 'segurança', 'login'],
    helpful: 178,
    notHelpful: 12,
    lastUpdated: '2024-02-07',
    difficulty: 'intermediate',
    estimatedReadTime: 5
  },

  // API E DESENVOLVEDORES
  {
    id: '25',
    question: 'O AdsOPS tem API? Como acessar?',
    answer: 'Sim! O AdsOPS oferece API RESTful completa: ACESSO À API: Disponível para planos Professional e Enterprise. Gere sua chave de API em "Configurações" > "API" > "Gerar Nova Chave". Guarde a chave com segurança (não será mostrada novamente!). AUTENTICAÇÃO: Use Bearer token no header: Authorization: Bearer YOUR_API_KEY. ENDPOINTS PRINCIPAIS: GET /api/v1/campaigns - listar campanhas; GET /api/v1/campaigns/{id}/metrics - métricas de campanha; GET /api/v1/clients - listar clientes; POST /api/v1/exports - criar exportação; GET /api/v1/workspaces - listar workspaces. LIMITES: Plano Professional: 1000 requisições/hora; Plano Enterprise: 10000 requisições/hora. DOCUMENTAÇÃO: Acesse docs.adsops.com/api para documentação completa com exemplos em várias linguagens.',
    category: 'api',
    tags: ['api', 'desenvolvedor', 'integração', 'rest', 'endpoints'],
    helpful: 145,
    notHelpful: 15,
    lastUpdated: '2024-02-08',
    difficulty: 'advanced',
    estimatedReadTime: 6
  },
  {
    id: '26',
    question: 'Como integrar o AdsOPS com outras ferramentas?',
    answer: 'O AdsOPS se integra com diversas ferramentas: INTEGRAÇÕES NATIVAS: Zapier - conecte com 5000+ apps sem código; Google Sheets - exporte dados automaticamente; Slack - receba alertas no seu canal; Looker Studio - visualizações avançadas; Webhooks - envie dados em tempo real. CONFIGURANDO WEBHOOKS: 1) "Configurações" > "Integrações" > "Webhooks". 2) Clique em "Novo Webhook". 3) Escolha eventos para monitorar: nova campanha criada, orçamento excedido, anomalia detectada, sincronização concluída. 4) Digite URL do endpoint que receberá os dados. 5) Configure autenticação se necessário. 6) Teste o webhook. VIA API: Use nossa API REST para criar integrações customizadas. Exemplos disponíveis em Python, JavaScript, PHP.',
    category: 'api',
    tags: ['integração', 'webhooks', 'zapier', 'automação'],
    helpful: 167,
    notHelpful: 11,
    lastUpdated: '2024-02-09',
    difficulty: 'advanced',
    estimatedReadTime: 5
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

      {/* Seção de Informações Legais */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Legais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">Política de Privacidade</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Saiba como coletamos, usamos e protegemos seus dados pessoais
                </p>
                <a
                  href="/politica-de-privacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ler Política de Privacidade
                  <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">Termos de Uso</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Conheça os termos e condições para usar nossos serviços
                </p>
                <a
                  href="/termos-de-uso"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  Ler Termos de Uso
                  <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">Exclusão de Dados</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Solicite a exclusão permanente dos seus dados pessoais
                </p>
                <a
                  href="/exclusao-de-dados"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Solicitar Exclusão
                  <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </div>
            </div>
          </Card>
        </div>
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