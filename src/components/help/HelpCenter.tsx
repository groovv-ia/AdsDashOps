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
    description: 'Configuração inicial e visão geral'
  },
  {
    id: 'meta-connection',
    name: 'Conexão Meta Ads',
    icon: <Database className="w-5 h-5" />,
    description: 'Configurar System User Token'
  },
  {
    id: 'meta-sync',
    name: 'Meta Ads Sync',
    icon: <RefreshCw className="w-5 h-5" />,
    description: 'Sincronizar e visualizar dados'
  },
  {
    id: 'campaigns',
    name: 'Campanhas',
    icon: <Target className="w-5 h-5" />,
    description: 'Análise de campanhas'
  },
  {
    id: 'workspaces',
    name: 'Workspaces',
    icon: <Layers className="w-5 h-5" />,
    description: 'Gerenciar workspaces e membros'
  },
  {
    id: 'settings',
    name: 'Configurações',
    icon: <Settings className="w-5 h-5" />,
    description: 'Perfil, aparência e preferências'
  },
  {
    id: 'troubleshooting',
    name: 'Solução de Problemas',
    icon: <Shield className="w-5 h-5" />,
    description: 'Resolver erros comuns'
  }
];

const faqData: FAQItem[] = [
  // Getting Started
  {
    id: 'gs1',
    question: 'Bem-vindo ao AdsOPS - O que é o sistema?',
    answer: 'O AdsOPS é uma plataforma especializada em análise de campanhas do Meta Ads (Facebook/Instagram). Recursos principais:\n\n✓ Sincronização completa com Meta Ads via System User\n✓ Visualização detalhada de campanhas, ad sets e anúncios\n✓ Métricas em tempo real (impressões, cliques, gasto, ROAS, etc)\n✓ Sistema multi-workspace para agências e equipes\n✓ Drill-down navegacional por níveis de campanha\n✓ Filtros avançados por período e status\n✓ Exportação de relatórios\n\nPara começar:\n1. Configure sua conexão Meta Ads em "Conexão Meta"\n2. Valide seu System User Token\n3. Sincronize suas contas em "Meta Ads Sync"\n4. Visualize campanhas em "Campanhas"',
    category: 'getting-started',
    helpful: 142,
    notHelpful: 3
  },
  {
    id: 'gs2',
    question: 'Como navegar pela interface do sistema?',
    answer: 'O sistema possui 6 seções principais acessíveis pelo menu lateral:\n\n📌 CONEXÃO META - Configure o token do System User e valide a conexão com o Meta Business Manager\n\n📊 CAMPANHAS - Visualize lista de todas as campanhas sincronizadas com filtros e estatísticas gerais\n\n🔄 META ADS SYNC - Sincronize dados e navegue por contas → campanhas → ad sets → anúncios com drill-down\n\n🏢 WORKSPACES - Gerencie workspaces, adicione membros e faça upload de logo\n\n⚙️ CONFIGURAÇÕES - Atualize perfil, personalize aparência, configure segurança e exporte dados\n\n❓ AJUDA E SUPORTE - Acesse esta central de ajuda\n\nNo topo: seletor de workspace, notificações e perfil do usuário.',
    category: 'getting-started',
    helpful: 98,
    notHelpful: 4
  },
  {
    id: 'gs3',
    question: 'O que é um Workspace e como funciona?',
    answer: 'WORKSPACE é o ambiente de trabalho que isola completamente seus dados:\n\n🔐 ISOLAMENTO TOTAL\n• Cada workspace tem suas próprias contas Meta conectadas\n• Campanhas e métricas são separadas por workspace\n• Membros têm acesso apenas aos workspaces permitidos\n\n👥 ESTRUTURA DE MEMBROS\n• Owner - Criador do workspace, controle total\n• Admin - Pode gerenciar membros e configurações\n• Member - Acesso padrão para visualizar e operar\n\n💡 CASOS DE USO\n• Agências: Um workspace por cliente ou projeto\n• Empresas: Um workspace por departamento\n• Freelancers: Um workspace por conta gerenciada\n\nVocê pode criar múltiplos workspaces e alternar entre eles usando o seletor no topo da tela.',
    category: 'getting-started',
    helpful: 156,
    notHelpful: 2
  },
  {
    id: 'gs4',
    question: 'Primeiros passos após criar a conta',
    answer: 'PASSO A PASSO PARA COMEÇAR:\n\n1️⃣ COMPLETE SEU PERFIL\n• Vá em "Configurações" > aba "Perfil"\n• Preencha nome, email e informações pessoais\n• Adicione foto de perfil (opcional)\n\n2️⃣ CONFIGURE SEU WORKSPACE\n• Acesse "Workspaces"\n• Um workspace padrão é criado automaticamente\n• Adicione logo e convide membros da equipe se necessário\n\n3️⃣ CONECTE O META ADS\n• Vá em "Conexão Meta"\n• Obtenha o Business Manager ID e System User Token\n• Cole as credenciais e clique em "Validar e Conectar"\n\n4️⃣ SINCRONIZE OS DADOS\n• Acesse "Meta Ads Sync"\n• Selecione as contas de anúncios\n• Clique em "Sincronizar" e aguarde (5-10 min)\n\n5️⃣ EXPLORE AS CAMPANHAS\n• Vá em "Campanhas" para ver lista completa\n• Use filtros por período, status e busca\n• Clique em uma campanha para análise detalhada',
    category: 'getting-started',
    helpful: 87,
    notHelpful: 5
  },

  // Meta Connection
  {
    id: 'mc1',
    question: 'O que é System User Token e por que preciso dele?',
    answer: 'SYSTEM USER TOKEN é o método de autenticação profissional do Meta Business:\n\n🔐 POR QUE USAR?\n• Acesso programático sem depender de login de usuário\n• Token não expira com mudanças de senha\n• Ideal para ferramentas e plataformas de análise\n• Maior controle de permissões granulares\n\n⚙️ DIFERENÇA DO OAUTH COMUM\n• OAuth User: Token expira, depende do usuário conectado\n• System User: Token persistente, vinculado ao Business Manager\n\n📋 PERMISSÕES NECESSÁRIAS\n• ads_read - Ler dados de campanhas e métricas\n• business_management - Acessar configurações do Business Manager\n\nSem essas permissões, a conexão falhará.',
    category: 'meta-connection',
    helpful: 189,
    notHelpful: 7
  },
  {
    id: 'mc2',
    question: 'Como obter o Business Manager ID e System User Token?',
    answer: 'PASSO A PASSO COMPLETO:\n\n1️⃣ ACESSAR META BUSINESS SUITE\n• Vá em: https://business.facebook.com/settings\n• Faça login com sua conta administradora\n\n2️⃣ OBTER BUSINESS MANAGER ID\n• Vá em "Business Settings" > "Business Info"\n• Copie o número de ID (exemplo: 123456789012345)\n\n3️⃣ CRIAR SYSTEM USER\n• Vá em "Business Settings" > "System Users"\n• Clique em "Add" para criar novo system user\n• Escolha nome descritivo (ex: "AdsOPS Integration")\n• Selecione "Admin" como role\n\n4️⃣ GERAR TOKEN\n• Clique no system user criado\n• Clique em "Generate New Token"\n• Selecione as permissões:\n  ✓ ads_read\n  ✓ business_management\n• Defina validade (recomendado: 60 dias ou mais)\n• Copie o token gerado (começa com "EAA...")\n\n5️⃣ ATRIBUIR CONTAS\n• Ainda nas configurações do system user\n• Vá em "Assign Assets" > "Ad Accounts"\n• Marque todas as contas que deseja sincronizar\n• Salve as alterações\n\n⚠️ IMPORTANTE: Guarde o token em local seguro. Ele não poderá ser visualizado novamente!',
    category: 'meta-connection',
    helpful: 234,
    notHelpful: 9
  },
  {
    id: 'mc3',
    question: 'Como validar a conexão Meta Ads?',
    answer: 'VALIDAÇÃO DA CONEXÃO:\n\n1️⃣ ACESSAR PÁGINA DE CONEXÃO\n• Vá em "Conexão Meta" no menu lateral\n\n2️⃣ PREENCHER CREDENCIAIS\n• Cole o Business Manager ID no primeiro campo\n• Cole o System User Token no segundo campo\n• Clique no ícone de olho para ver/ocultar o token\n\n3️⃣ CLICAR EM "VALIDAR E CONECTAR"\n• O sistema verificará:\n  - Validade do token\n  - Permissões concedidas\n  - Acesso às contas de anúncios\n\n4️⃣ RESULTADO DA VALIDAÇÃO\n✅ SUCESSO:\n• Status "Conectado" aparecerá em verde\n• Número de contas encontradas será exibido\n• Lista de contas aparecerá na parte inferior\n\n❌ ERRO:\n• Mensagem detalhada do erro será exibida\n• Verifique credenciais e permissões\n• Tente novamente após correção\n\n🔄 APÓS CONECTAR:\n• Token é salvo criptografado no banco de dados\n• Você pode sincronizar dados em "Meta Ads Sync"\n• Contas ficam disponíveis por workspace',
    category: 'meta-connection',
    helpful: 198,
    notHelpful: 11
  },
  {
    id: 'mc4',
    question: 'Erros comuns ao conectar Meta Ads',
    answer: 'SOLUÇÕES PARA ERROS COMUNS:\n\n❌ "Permissões insuficientes"\n• Verifique se selecionou ads_read e business_management\n• Regere o token com as permissões corretas\n\n❌ "Token inválido ou expirado"\n• Gere um novo token no Meta Business Suite\n• Verifique se não há espaços extras ao colar\n• Token deve começar com "EAA"\n\n❌ "Business Manager ID não encontrado"\n• Confirme o ID em Business Settings > Business Info\n• Use apenas números, sem letras ou símbolos\n\n❌ "Nenhuma conta de anúncios encontrada"\n• Atribua contas ao system user em "Assign Assets"\n• Aguarde alguns minutos e tente novamente\n\n❌ "Erro 400: URL não autorizada"\n• Este erro é do OAuth (não se aplica ao System User)\n• Se aparecer, reconecte usando System User Token\n\n🆘 SE NADA FUNCIONAR:\n• Delete o system user antigo no Meta Business\n• Crie um novo system user\n• Gere novo token com permissões corretas\n• Atribua as contas de anúncios\n• Tente conectar novamente',
    category: 'meta-connection',
    helpful: 267,
    notHelpful: 15
  },

  // Meta Sync
  {
    id: 'ms1',
    question: 'Como funciona o Meta Ads Sync?',
    answer: 'META ADS SYNC é a página de sincronização e navegação drill-down:\n\n🔄 SINCRONIZAÇÃO\n• Baixa dados das últimas 7 a 90 dias das contas Meta\n• Captura: campanhas, ad sets, anúncios e métricas diárias\n• Salva no banco de dados para consulta rápida\n• Permite análise histórica e comparação de períodos\n\n📊 NAVEGAÇÃO DRILL-DOWN\nNível 1: CONTAS\n• Visualize todas as contas conectadas\n• Cards com status de sincronização\n• Filtros por status, último sync, ordenação\n\nNível 2: CAMPANHAS (ao clicar em uma conta)\n• Lista de campanhas da conta\n• Gráficos e KPIs agregados\n• Métricas: spend, impressões, cliques, ROAS\n\nNível 3: AD SETS (ao clicar em uma campanha)\n• Conjuntos de anúncios da campanha\n• Performance individual de cada ad set\n\nNível 4: ANÚNCIOS (ao clicar em um ad set)\n• Lista de anúncios do conjunto\n• Thumbnails de criativos\n• Métricas por anúncio individual\n\n🎯 FILTROS DISPONÍVEIS\n• Período: Últimos 7, 14, 30, 90 dias\n• Nível: Campanhas, Ad Sets ou Anúncios\n• Status: Ativas, Pausadas, Todas\n• Busca por nome',
    category: 'meta-sync',
    helpful: 245,
    notHelpful: 8
  },
  {
    id: 'ms2',
    question: 'Como sincronizar dados das contas Meta?',
    answer: 'SINCRONIZAÇÃO PASSO A PASSO:\n\n1️⃣ ACESSAR META ADS SYNC\n• Clique em "Meta Ads Sync" no menu lateral\n\n2️⃣ VISUALIZAR CONTAS\n• Você verá cards de todas as contas conectadas\n• Status indica: Saudável, Aguardando Sync, Desatualizado, Com Erros\n\n3️⃣ SELECIONAR CONTA\n• Clique no card da conta que deseja sincronizar\n• Ou clique no botão "Sincronizar" no card\n\n4️⃣ CONFIGURAR PERÍODO\n• Use o seletor de período: Últimos 7, 14, 30 ou 90 dias\n• Período maior = mais dados, mas sync mais demorada\n\n5️⃣ INICIAR SINCRONIZAÇÃO\n• Clique em "Sincronizar Agora"\n• Aguarde o progresso (barra de progresso aparecerá)\n• Não feche a página durante a sincronização\n\n⏱️ TEMPO ESTIMADO\n• Pequena (< 10 campanhas): 2-5 minutos\n• Média (10-50 campanhas): 5-10 minutos\n• Grande (50+ campanhas): 10-20 minutos\n\n✅ APÓS CONCLUIR\n• Status muda para "Saudável"\n• Dados ficam disponíveis na página "Campanhas"\n• Você pode navegar drill-down pelos níveis\n\n🔄 SINCRONIZAÇÃO AUTOMÁTICA\n• Configure em "Configurações" > "Aparência"\n• Ative "Atualização Automática"\n• Defina intervalo (1min, 5min, 10min, 30min, 1h)',
    category: 'meta-sync',
    helpful: 221,
    notHelpful: 12
  },
  {
    id: 'ms3',
    question: 'Como navegar pelos níveis de campanhas?',
    answer: 'NAVEGAÇÃO DRILL-DOWN DETALHADA:\n\n📍 BREADCRUMB (MIGALHAS DE PÃO)\n• Sempre visível no topo da página\n• Mostra sua posição: Contas > Conta X > Campanha Y > Ad Set Z\n• Clique em qualquer nível para voltar\n\n🎯 NÍVEL 1 - CONTAS\n• Grid de cards com todas as contas\n• Clique em uma conta para ver suas campanhas\n• Filtros: Status (Ativa/Pausada), Sync (Recente/Antiga), Ordenação (Nome/Gasto)\n\n🎯 NÍVEL 2 - CAMPANHAS DA CONTA\n• Lista de campanhas com métricas agregadas\n• KPIs gerais: Total Spend, Impressões, Clicks, ROAS médio\n• Gráfico de linha mostrando tendência do período\n• Clique em uma campanha para ver ad sets\n\n🎯 NÍVEL 3 - AD SETS DA CAMPANHA\n• Tabela com todos os conjuntos de anúncios\n• Colunas: Nome, Status, Orçamento, Spend, Impressões, Clicks, CTR, CPC, ROAS\n• Ordenação por qualquer coluna\n• Clique em um ad set para ver anúncios\n\n🎯 NÍVEL 4 - ANÚNCIOS DO AD SET\n• Grid com cards de anúncios\n• Thumbnails dos criativos (imagem/vídeo)\n• Métricas individuais por anúncio\n• Clique em um anúncio para ver detalhes completos\n\n⬅️ VOLTAR\n• Use o botão "Voltar" no topo\n• Ou clique no breadcrumb\n• Mantém os filtros aplicados',
    category: 'meta-sync',
    helpful: 198,
    notHelpful: 9
  },
  {
    id: 'ms4',
    question: 'O que significam os status de sincronização?',
    answer: 'STATUS DAS CONTAS:\n\n🟢 SAUDÁVEL (Healthy)\n• Última sincronização foi há menos de 24h\n• Dados atualizados e completos\n• Sistema funcionando normalmente\n\n🔵 AGUARDANDO SINCRONIZAÇÃO (Pending First Sync)\n• Conta conectada mas nunca sincronizada\n• Execute primeira sincronização manualmente\n• Clique em "Sincronizar Agora"\n\n🟡 DESATUALIZADO (Stale)\n• Última sincronização foi há mais de 24h\n• Dados podem estar desatualizados\n• Recomendado: sincronizar novamente\n\n🔴 COM ERROS (Error)\n• Erro na última tentativa de sincronização\n• Possíveis causas:\n  - Token expirado\n  - Permissões removidas\n  - Conta deletada no Meta\n  - Limite de API atingido\n• Ação: Clique em "Ver Status" para detalhes do erro\n\n⚪ DESCONECTADO (Disconnected)\n• Sem conexão ativa com o Meta\n• Vá em "Conexão Meta" para reconectar\n\n💡 DICAS\n• Sincronize diariamente para dados atualizados\n• Configure sync automática em "Configurações"\n• Verifique logs em caso de erro persistente',
    category: 'meta-sync',
    helpful: 187,
    notHelpful: 7
  },

  // Campaigns
  {
    id: 'ca1',
    question: 'Como visualizar lista de campanhas?',
    answer: 'PÁGINA DE CAMPANHAS:\n\n📊 ESTATÍSTICAS GERAIS (Cards no topo)\n• Campanhas: Total e quantidade ativas\n• Gasto Total: Soma de spend no período\n• Impressões: Total formatado (1.2M, 340K)\n• Cliques: Total de clicks\n• CTR Médio: Média de taxa de cliques\n• Conversões: Total de conversões\n• ROAS Médio: Retorno sobre investimento\n\n🎴 GRID DE CAMPANHAS\n• Cards responsivos (1, 2 ou 3 colunas)\n• Cada card mostra:\n  - Nome da campanha e objetivo\n  - Status (badge colorido)\n  - Métricas principais em formato compacto\n  - Botão "Ver Análise" para detalhes\n\n🔍 FILTROS DISPONÍVEIS\n• Busca: Digite nome da campanha\n• Período: Hoje, 7, 14, 30, 90 dias, Este mês\n• Status: Todas, Ativa, Pausada, Removida\n• Ordenar: Gasto, Impressões, Conversões, ROAS, CTR, Mais recente\n\n✨ RECURSOS\n• Atualização em tempo real\n• Dados vêm de meta_insights_daily\n• Sincronização automática opcional\n• Exportar relatórios em CSV/PDF',
    category: 'campaigns',
    helpful: 198,
    notHelpful: 6
  },
  {
    id: 'ca2',
    question: 'Quais métricas são exibidas?',
    answer: 'MÉTRICAS COMPLETAS DO META ADS:\n\n📈 MÉTRICAS DE VOLUME\n• Impressões (Impressions) - Vezes que anúncio foi exibido\n• Alcance (Reach) - Pessoas únicas alcançadas\n• Frequência (Frequency) - Média de vezes por pessoa\n\n👆 MÉTRICAS DE ENGAJAMENTO\n• Cliques (Clicks) - Total de cliques no anúncio\n• CTR (Click-Through Rate) - % de cliques por impressão\n• CPC (Cost Per Click) - Custo médio por clique\n• CPM (Cost Per Mille) - Custo por 1000 impressões\n\n💰 MÉTRICAS FINANCEIRAS\n• Gasto (Spend) - Total investido em R$\n• Custo por Resultado (Cost Per Result) - Custo médio do objetivo\n\n🎯 MÉTRICAS DE CONVERSÃO\n• Conversões (Conversions) - Total de conversões\n• Valor de Conversão (Conversion Value) - Receita gerada\n• ROAS (Return on Ad Spend) - Retorno por R$1 gasto\n  Fórmula: (Valor Conversão) ÷ (Gasto)\n\n📊 COMO INTERPRETAR\n• ROAS < 1.0 = Prejuízo\n• ROAS = 1.0 = Break-even\n• ROAS > 2.0 = Lucrativo\n• ROAS > 4.0 = Excelente\n• CTR > 2% = Bom para maioria dos nichos\n• Frequência > 3 = Pode indicar saturação de público\n\nTodas as métricas são calculadas diretamente pela API do Meta, sem estimativas.',
    category: 'campaigns',
    helpful: 289,
    notHelpful: 8
  },
  {
    id: 'ca3',
    question: 'Como analisar uma campanha específica?',
    answer: 'ANÁLISE DETALHADA DE CAMPANHA:\n\n1️⃣ ACESSAR ANÁLISE\n• Na página "Campanhas", clique no card da campanha\n• Ou clique em "Ver Análise"\n\n2️⃣ VISÃO GERAL\n• Header com nome, status e datas\n• Cards de KPIs principais\n• Comparação com período anterior\n\n3️⃣ GRÁFICOS DE TENDÊNCIA\n• Linha do tempo de métricas\n• Eixo X: Datas do período\n• Eixo Y: Valores das métricas\n• Legendas interativas\n• Gráficos de:\n  - Spend ao longo do tempo\n  - Impressões e Alcance\n  - Clicks e CTR\n  - Conversões e ROAS\n\n4️⃣ TABELA DE AD SETS\n• Lista todos os conjuntos da campanha\n• Ordenação por qualquer coluna\n• Métricas individuais por ad set\n• Identifica top performers\n\n5️⃣ TABELA DE ANÚNCIOS\n• Lista todos os anúncios da campanha\n• Thumbnails de criativos\n• Métricas por anúncio\n• Clique para ver criativo completo\n\n6️⃣ COMPARAÇÃO DE PERÍODOS\n• Card mostrando variação percentual\n• Compara período atual vs anterior\n• Setas indicando melhora/piora\n• Cores: verde (positivo), vermelho (negativo)\n\n💡 DICAS DE ANÁLISE\n• Compare CTR entre anúncios para identificar melhores criativos\n• Verifique ROAS por ad set para otimizar orçamento\n• Frequência alta? Atualize criativos ou expanda público\n• CPC aumentando? Público pode estar saturado',
    category: 'campaigns',
    helpful: 256,
    notHelpful: 11
  },

  // Workspaces
  {
    id: 'ws1',
    question: 'Como criar um novo workspace?',
    answer: 'CRIAÇÃO DE WORKSPACE:\n\n1️⃣ ACESSAR PÁGINA DE WORKSPACES\n• Clique em "Workspaces" no menu lateral\n\n2️⃣ CLICAR EM "NOVO WORKSPACE"\n• Botão no canto superior direito\n• Abre formulário de criação\n\n3️⃣ PREENCHER INFORMAÇÕES\n• Nome do Workspace (obrigatório)\n• Descrição (opcional mas recomendado)\n• Logo: Clique para fazer upload\n  - Formatos aceitos: PNG, JPG, WEBP, GIF\n  - Tamanho máximo: 2MB\n  - Dimensões recomendadas: 200x200px\n\n4️⃣ CRIAR\n• Clique em "Criar Workspace"\n• Workspace será criado instantaneamente\n• Você é automaticamente definido como "Owner"\n\n5️⃣ APÓS CRIAR\n• Workspace aparece na lista\n• Você pode alternar para ele usando o seletor no topo\n• Convide membros da equipe\n• Conecte contas Meta Ads específicas para este workspace\n\n💡 BOAS PRÁTICAS\n• Um workspace por cliente (para agências)\n• Um workspace por projeto (para freelancers)\n• Um workspace por departamento (para empresas)\n• Use nomes claros e descritivos\n• Adicione logo para identificação visual rápida',
    category: 'workspaces',
    helpful: 176,
    notHelpful: 7
  },
  {
    id: 'ws2',
    question: 'Como gerenciar membros do workspace?',
    answer: 'GESTÃO DE MEMBROS:\n\n👥 ADICIONAR MEMBRO\n1. Acesse "Workspaces"\n2. Clique no workspace desejado\n3. Vá na aba/seção "Membros"\n4. Clique em "Convidar Membro"\n5. Digite o email do membro\n6. Selecione o papel (role):\n   • Owner - Controle total (não pode ser adicionado, apenas transferido)\n   • Admin - Gerencia membros e configurações\n   • Member - Acesso padrão para operações\n7. Clique em "Convidar"\n8. Membro receberá email de convite\n\n🔐 NÍVEIS DE PERMISSÃO\n\n👑 OWNER (Proprietário)\n• Criador do workspace\n• Acesso total e irrestrito\n• Pode deletar o workspace\n• Pode transferir ownership\n• Apenas 1 owner por workspace\n\n🛡️ ADMIN (Administrador)\n• Adicionar/remover membros\n• Alterar roles de outros membros\n• Gerenciar conexões Meta Ads\n• Configurar workspace\n• Não pode deletar workspace\n\n👤 MEMBER (Membro)\n• Visualizar campanhas e métricas\n• Sincronizar dados\n• Exportar relatórios\n• Não pode gerenciar membros ou configurações\n\n🗑️ REMOVER MEMBRO\n1. Vá em "Membros"\n2. Clique no ícone de lixeira ao lado do membro\n3. Confirme a remoção\n4. Membro perde acesso imediatamente\n\n🔄 ALTERAR ROLE\n1. Vá em "Membros"\n2. Clique no dropdown de role\n3. Selecione novo papel\n4. Mudança é aplicada instantaneamente\n\n⚠️ IMPORTANTE\n• Owner não pode ser removido (apenas transferido)\n• Admin não pode remover o Owner\n• Ao remover membro, ele perde acesso a todos os dados do workspace',
    category: 'workspaces',
    helpful: 234,
    notHelpful: 9
  },
  {
    id: 'ws3',
    question: 'Como alternar entre workspaces?',
    answer: 'ALTERNANDO WORKSPACES:\n\n🔄 USAR O SELETOR\n1. Localize o seletor de workspace no topo da tela\n2. Mostra o nome do workspace atual\n3. Clique no seletor para abrir dropdown\n4. Lista mostra todos os workspaces que você tem acesso\n5. Clique no workspace desejado\n6. Tela recarrega com dados do novo workspace\n\n📊 O QUE MUDA AO TROCAR?\n• Campanhas exibidas\n• Contas Meta Ads conectadas\n• Métricas e estatísticas\n• Membros visíveis\n• Configurações específicas\n• Logs de sincronização\n\n🔐 ISOLAMENTO TOTAL\n• Dados de um workspace não aparecem em outro\n• Membros de um workspace não veem outros workspaces (a menos que sejam convidados)\n• Conexões Meta Ads são exclusivas por workspace\n• System User Tokens são salvos por workspace\n\n💡 DICA DE NAVEGAÇÃO\n• Workspace atual sempre visível no seletor\n• Badge mostra seu papel (Owner, Admin, Member)\n• Você pode ter acesso a vários workspaces simultaneamente\n• Botão "Gerenciar Workspaces" leva à página de gestão\n\n⚙️ ATALHOS\n• Seletor sempre acessível no header\n• Não precisa voltar à página de workspaces para trocar\n• Última seleção é memorizada entre sessões',
    category: 'workspaces',
    helpful: 187,
    notHelpful: 6
  },
  {
    id: 'ws4',
    question: 'Como fazer upload e gerenciar logo do workspace?',
    answer: 'GERENCIAMENTO DE LOGO:\n\n📤 FAZER UPLOAD DE LOGO\n1. Acesse "Workspaces"\n2. Clique no workspace desejado\n3. Você verá um preview do logo (ou ícone padrão)\n4. Clique na área do logo ou no botão "Upload"\n5. Selecione imagem do computador\n6. Aguarde upload (leva segundos)\n7. Logo aparece automaticamente\n\n📋 REQUISITOS DA IMAGEM\n• Formatos aceitos: PNG, JPG, JPEG, WEBP, GIF\n• Tamanho máximo: 2MB\n• Dimensões recomendadas: 200x200px ou superior\n• Imagens quadradas ficam melhores\n• Fundo transparente (PNG) recomendado\n\n✏️ ALTERAR LOGO\n1. Passe o mouse sobre o logo atual\n2. Ícone de câmera aparece\n3. Clique para selecionar nova imagem\n4. Logo anterior é substituído automaticamente\n\n🗑️ REMOVER LOGO\n1. Clique em "Remover" sob o logo\n2. Confirme a remoção\n3. Logo volta para o ícone padrão (Building2 icon)\n\n📍 ONDE O LOGO APARECE\n• Página de Workspaces (lista)\n• Seletor de workspace no header\n• Relatórios exportados (futuro)\n• Emails de convite (futuro)\n\n⚠️ PERMISSÕES\n• Apenas Owner e Admin podem alterar logo\n• Members só visualizam\n\n💡 DICAS DE DESIGN\n• Use logo da empresa ou cliente\n• Mantenha design simples e legível\n• Evite textos pequenos\n• Prefira ícones/símbolos em vez de logotipos complexos\n• Teste visualização em tamanhos menores',
    category: 'workspaces',
    helpful: 145,
    notHelpful: 8
  },

  // Settings
  {
    id: 'set1',
    question: 'Como atualizar meu perfil?',
    answer: 'CONFIGURAÇÕES DE PERFIL:\n\n📸 FOTO DE PERFIL\n1. Vá em "Configurações" > aba "Perfil"\n2. Clique no ícone de câmera sobre a foto\n3. Selecione imagem (JPG, PNG, GIF, máx 5MB)\n4. Upload é automático\n5. Foto aparece no header do sistema\n\n👤 INFORMAÇÕES PESSOAIS\n• Nome Completo\n• Email (email de login)\n• Telefone (com formatação automática)\n• Empresa/Organização\n\n🏠 ENDEREÇO\n• CEP - Digite para buscar automaticamente\n• Logradouro (preenchido automaticamente)\n• Número\n• Complemento (opcional)\n• Bairro (preenchido automaticamente)\n• Cidade (preenchida automaticamente)\n• Estado/UF (preenchido automaticamente)\n• País\n\n🌍 PREFERÊNCIAS DO SISTEMA\n• Fuso Horário - Define horários exibidos\n• Idioma - Interface do sistema (pt-BR, en-US, es-ES, fr-FR)\n\n💾 SALVAR ALTERAÇÕES\n• Botão "Salvar Perfil" no final do formulário\n• Alterações são aplicadas imediatamente\n• Mensagem de sucesso/erro aparece no topo\n\n🔐 BUSCA AUTOMÁTICA DE CEP\n• Digite CEP completo (8 dígitos)\n• Sistema busca em viacep.com.br\n• Preenche automaticamente: rua, bairro, cidade, estado\n• Você só precisa preencher número e complemento',
    category: 'settings',
    helpful: 167,
    notHelpful: 5
  },
  {
    id: 'set2',
    question: 'Como personalizar a aparência do sistema?',
    answer: 'CONFIGURAÇÕES DE APARÊNCIA:\n\nAcesse "Configurações" > aba "Aparência"\n\n🎨 MODO COMPACTO\n• Reduz espaçamento entre elementos\n• Ideal para telas menores\n• Mostra mais informações por tela\n\n👁️ MOSTRAR DICAS (Tooltips)\n• Exibe tooltips explicativos ao passar o mouse\n• Recomendado para novos usuários\n• Desative para interface mais limpa\n\n✨ ANIMAÇÕES\n• Habilita transições suaves\n• Melhora experiência visual\n• Desative para melhor performance em PCs antigos\n\n🎭 ALTO CONTRASTE\n• Aumenta contraste de cores\n• Melhora legibilidade\n• Acessibilidade para baixa visão\n\n🌀 REDUZIR MOVIMENTO\n• Minimiza animações\n• Recomendado para sensibilidade a movimento\n• Acessibilidade\n\n🔄 ATUALIZAÇÃO AUTOMÁTICA\n• Liga/desliga refresh automático de dados\n• Configure intervalo: 1min, 5min, 10min, 30min, 1h\n• Útil para monitoramento em tempo real\n• Desative para economizar recursos\n\n🔧 RESTAURAR PADRÃO\n• Botão "Restaurar Padrão" no topo\n• Volta todas as configurações aos valores iniciais\n• Requer confirmação\n\n💡 TODAS AS CONFIGURAÇÕES\n• São salvas automaticamente\n• Sincronizadas entre dispositivos\n• Aplicadas imediatamente sem reload\n• Específicas por usuário (não por workspace)',
    category: 'settings',
    helpful: 198,
    notHelpful: 7
  },
  {
    id: 'set3',
    question: 'Como exportar meus dados?',
    answer: 'EXPORTAÇÃO DE DADOS:\n\nAcesse "Configurações" > aba "Dados"\n\n📊 EXPORTAR CAMPANHAS (CSV)\n1. Selecione período desejado\n2. Escolha campanhas específicas ou todas\n3. Clique em "Exportar CSV"\n4. Arquivo baixado automaticamente\n5. Contém: Todas as métricas, Dados tabulados, Pronto para Excel\n\n📄 EXPORTAR RELATÓRIOS (PDF)\n1. Selecione campanhas\n2. Clique em "Exportar PDF"\n3. PDF gerado com:\n   • Gráficos de performance\n   • Tabelas de métricas\n   • Logo do workspace\n   • Período selecionado\n\n💾 EXPORTAÇÃO COMPLETA\n• Solicite exportação de TODOS os dados do workspace\n• Inclui:\n  - Todas as campanhas\n  - Todo o histórico de métricas\n  - Configurações\n  - Logs de sincronização\n• Processado em background\n• Link de download enviado por email\n• Prazo: até 24 horas\n\n🔐 SEGURANÇA\n• Apenas Owner e Admin podem exportar dados completos\n• Members podem exportar relatórios específicos\n• Dados exportados não contêm tokens de acesso\n• Criptografia durante download\n\n📂 FORMATOS DISPONÍVEIS\n• CSV - Dados tabulados para análise\n• PDF - Relatórios formatados\n• JSON - Dados estruturados (exportação completa)\n\n⚠️ IMPORTANTE\n• Exportação não remove dados do sistema\n• Dados continuam disponíveis após exportar\n• Use exportação antes de deletar workspace',
    category: 'settings',
    helpful: 176,
    notHelpful: 9
  },
  {
    id: 'set4',
    question: 'Como gerenciar segurança da conta?',
    answer: 'SEGURANÇA DA CONTA:\n\nAcesse "Configurações" > aba "Segurança"\n\n🔐 ALTERAR SENHA\n1. Clique em "Alterar Senha"\n2. Digite senha atual\n3. Digite nova senha (mínimo 8 caracteres)\n4. Confirme nova senha\n5. Clique em "Atualizar Senha"\n\n📧 ALTERAR EMAIL\n1. Novo email deve ser verificado\n2. Link de confirmação enviado ao novo email\n3. Clique no link para confirmar\n4. Login passa a usar novo email\n\n🔒 SESSÕES ATIVAS\n• Visualize dispositivos conectados\n• Veja última atividade de cada sessão\n• Revogue sessões suspeitas\n• Força logout em outros dispositivos\n\n🛡️ RECURSOS DE SEGURANÇA\n• Tokens armazenados criptografados\n• Row Level Security (RLS) no banco\n• Isolamento completo entre workspaces\n• Logs de auditoria de ações\n\n⚠️ DELEÇÃO DE CONTA\n• Opção disponível no final da página\n• ATENÇÃO: Ação permanente e irreversível\n• Todos os dados são deletados\n• Workspaces onde você é Owner são deletados\n• Backups mantidos por 30 dias (recuperação de emergência)\n\n🔔 NOTIFICAÇÕES DE SEGURANÇA\n• Login de novo dispositivo\n• Alteração de senha\n• Alteração de email\n• Adição a novo workspace\n• Mudança de permissões\n\n💡 BOAS PRÁTICAS\n• Use senha forte e única\n• Não compartilhe credenciais\n• Revise sessões ativas regularmente\n• Ative notificações de segurança\n• Faça logout em computadores públicos',
    category: 'settings',
    helpful: 189,
    notHelpful: 6
  },

  // Troubleshooting
  {
    id: 'tr1',
    question: 'Erro: Contas não aparecem no banco de dados',
    answer: 'SOLUÇÃO PARA CONTAS INVISÍVEIS:\n\n❌ SINTOMA\n• Validação diz "X contas encontradas"\n• Mas contagem no banco mostra 0\n• Status exibe contas mas lista está vazia\n\n🔍 CAUSA\n• Políticas RLS (Row Level Security) bloqueando acesso\n• Token da sessão desatualizado\n• Workspace não criado corretamente\n\n✅ SOLUÇÃO IMEDIATA\n1. Faça LOGOUT completo do sistema\n2. Feche todos os abas do navegador\n3. Aguarde 30 segundos\n4. Faça LOGIN novamente\n5. Vá em "Conexão Meta" e verifique status\n6. Contas devem aparecer agora\n\n🔧 SE AINDA NÃO FUNCIONAR\n1. Vá em "Configurações" > "Segurança"\n2. Clique em "Revogar Todas as Sessões"\n3. Faça login novamente\n4. Reconecte o Meta Ads em "Conexão Meta"\n\n⚠️ ÚLTIMO RECURSO\n1. Delete a conexão Meta existente (se houver botão)\n2. Aguarde 1 minuto\n3. Conecte novamente do zero\n4. Cole o System User Token novamente\n5. Valide e conecte\n\n💡 PREVENÇÃO\n• Este erro geralmente ocorre na primeira conexão\n• Após primeiro login/logout, não acontece mais\n• É relacionado à criação inicial do workspace e policies RLS',
    category: 'troubleshooting',
    helpful: 312,
    notHelpful: 18
  },
  {
    id: 'tr2',
    question: 'Erro: Dados não sincronizam ou sincronização falha',
    answer: 'RESOLVER PROBLEMAS DE SINCRONIZAÇÃO:\n\n❌ ERRO: "Token expirado"\n✅ SOLUÇÃO:\n• Vá em "Conexão Meta"\n• Gere novo System User Token no Meta Business\n• Cole o novo token\n• Clique em "Validar e Conectar"\n\n❌ ERRO: "Permissões insuficientes"\n✅ SOLUÇÃO:\n• Verifique se o System User tem permissões:\n  - ads_read\n  - business_management\n• Regere o token com permissões corretas\n• Valide novamente\n\n❌ ERRO: "Nenhuma campanha encontrada"\n✅ SOLUÇÃO:\n• Verifique se a conta tem campanhas ativas\n• Confirme período selecionado (últimos 7-90 dias)\n• Campanhas muito antigas não aparecem\n• Crie ao menos uma campanha no Meta Ads Manager\n\n❌ ERRO: "Rate limit atingido"\n✅ SOLUÇÃO:\n• Meta limita requisições por hora\n• Aguarde 15-30 minutos\n• Tente sincronizar novamente\n• Não force múltiplas tentativas seguidas\n\n❌ ERRO: "Timeout / Tempo esgotado"\n✅ SOLUÇÃO:\n• Conta muito grande (100+ campanhas)\n• Reduza período de sincronização\n• Sincronize 30 dias por vez\n• Aguarde conclusão antes de nova sync\n\n🔄 SINCRONIZAÇÃO TRAVADA (Barra de progresso parada)\n✅ SOLUÇÃO:\n1. Recarregue a página (F5)\n2. Verifique status da conta\n3. Se ainda mostra "sincronizando", aguarde mais tempo\n4. Se status volta a "desatualizado", inicie nova sync\n\n💡 DIAGNÓSTICO\n• Vá em "Meta Ads Sync"\n• Clique em "Ver Status" na conta com problema\n• Logs mostram erro detalhado\n• Use informação do log para identificar causa',
    category: 'troubleshooting',
    helpful: 278,
    notHelpful: 15
  },
  {
    id: 'tr3',
    question: 'Erro: Sessão expirada ou "Permission denied"',
    answer: 'RESOLVER ERROS DE PERMISSÃO:\n\n❌ ERRO: "Permission denied" ao acessar dados\n✅ CAUSA: Row Level Security (RLS) bloqueando\n✅ SOLUÇÃO:\n1. Faça logout e login novamente\n2. Token da sessão será renovado\n3. Permissões RLS serão reaplicadas\n4. Acesso deve funcionar\n\n❌ ERRO: "Sessão expirada"\n✅ SOLUÇÃO RÁPIDA:\n1. Recarregue a página (F5)\n2. Sistema renova sessão automaticamente\n3. Se persistir, faça logout/login\n\n❌ ERRO: "JWT malformed" ou similar\n✅ SOLUÇÃO:\n1. Limpe cache do navegador\n2. Feche todas as abas do sistema\n3. Reabra e faça login\n\n🔐 PREVENÇÃO DE EXPIRAÇÃO\n• Sistema renova sessão automaticamente\n• Sessão válida por 7 dias de inatividade\n• Após 7 dias sem usar, precisa relogar\n• Mantenha aba aberta para auto-refresh\n\n⚠️ ERRO DE WORKSPACE\n• "Workspace não encontrado"\n• "Acesso negado ao workspace"\n\n✅ SOLUÇÃO:\n1. Verifique se workspace existe em "Workspaces"\n2. Confirme que você é membro do workspace\n3. Se removido, não terá mais acesso\n4. Entre em contato com o Owner para ser readicionado\n\n💡 SEGURANÇA RLS\n• RLS garante que você só vê seus dados\n• Impossível ver dados de outros workspaces\n• Impossível ver dados se não é membro\n• Sistema projetado para máxima segurança',
    category: 'troubleshooting',
    helpful: 245,
    notHelpful: 12
  },
  {
    id: 'tr4',
    question: 'Erro: Métricas aparecem zeradas ou incorretas',
    answer: 'RESOLVER DADOS INCORRETOS:\n\n❌ MÉTRICAS ZERADAS\n✅ CAUSAS POSSÍVEIS:\n1. Campanha sem gasto no período selecionado\n2. Período muito antigo (dados além de 90 dias)\n3. Sincronização não completou\n4. Filtros aplicados removendo todos os dados\n\n✅ SOLUÇÃO:\n• Verifique período selecionado\n• Amplie período para últimos 30-90 dias\n• Remova filtros de status\n• Force nova sincronização\n• Verifique no Meta Ads Manager se campanha tem dados\n\n❌ ROAS INCORRETO (Valor estranho)\n✅ CAUSA: Falta de dados de conversão\n• ROAS = Valor de Conversão ÷ Gasto\n• Se não há valor de conversão configurado no Meta, ROAS será 0\n• Se valor está em moeda diferente, pode aparecer errado\n\n✅ SOLUÇÃO:\n• Configure Pixel do Meta corretamente\n• Configure eventos de conversão\n• Defina valor monetário para conversões\n• Aguarde dados aparecerem (pode levar 24-48h)\n• Resincronize após configurar\n\n❌ NÚMEROS DIFERENTES DO META ADS MANAGER\n✅ CAUSAS:\n1. Fuso horário diferente\n2. Período de atribuição diferente\n3. Dados ainda processando no Meta\n4. Cache do Meta Ads Manager\n\n✅ SOLUÇÃO:\n• Verifique fuso horário em "Configurações"\n• Aguarde 2-3 horas e resincronize\n• Limpe cache do navegador\n• Compare períodos exatos\n• Pequenas diferenças (< 5%) são normais\n\n💡 VALIDAÇÃO\n• Sistema puxa dados diretamente da API oficial\n• Não há cálculos manuais ou estimativas\n• Diferenças geralmente são de configuração ou timing\n• Para dados críticos, sempre compare com Meta Ads Manager',
    category: 'troubleshooting',
    helpful: 256,
    notHelpful: 14
  },
  {
    id: 'tr5',
    question: 'Outros problemas e suporte',
    answer: 'CANAIS DE SUPORTE:\n\n💬 CHAT AO VIVO\n• Clique no ícone de chat no canto inferior direito\n• Disponível durante horário comercial\n• Resposta em até 2 horas\n\n📧 EMAIL DE SUPORTE\n• suporte@adsops.com\n• Resposta em até 24 horas úteis\n• Anexe prints de erro se possível\n\n📚 DOCUMENTAÇÃO\n• Esta central de ajuda\n• Pesquise por palavra-chave\n• Navegue por categorias\n• FAQs mais comuns já respondidos\n\n🐛 REPORTAR BUG\n1. Descreva o problema detalhadamente\n2. Informe passos para reproduzir\n3. Anexe print de tela\n4. Informe navegador e sistema operacional\n5. Envie para: suporte@adsops.com\n\n💡 SUGERIR RECURSO\n• Clique em "Sugerir Novo Recurso" no final da página\n• Descreva funcionalidade desejada\n• Explique caso de uso\n• Votamos em features mais solicitadas\n\n🔍 ANTES DE CONTATAR SUPORTE\n✓ Pesquise nesta central de ajuda\n✓ Tente fazer logout/login\n✓ Limpe cache do navegador\n✓ Tente em navegador diferente (Chrome, Firefox, Edge)\n✓ Verifique se não é problema de conexão com internet\n✓ Confirme que credenciais Meta Ads estão corretas\n\n⚡ PROBLEMAS CRÍTICOS\n• Sistema completamente fora do ar\n• Perda de dados\n• Brecha de segurança\n• Contato prioritário: suporte@adsops.com\n• Assunto: [CRÍTICO] + descrição\n\n📊 STATUS DO SISTEMA\n• Verifique status em tempo real (futuro)\n• Manutenções programadas são avisadas com antecedência\n• Incidentes são comunicados por email',
    category: 'troubleshooting',
    helpful: 198,
    notHelpful: 8
  }
];

const popularQuestions = [
  'Bem-vindo ao AdsOPS - O que é o sistema?',
  'Como obter o Business Manager ID e System User Token?',
  'Como sincronizar dados das contas Meta?',
  'Erro: Contas não aparecem no banco de dados',
  'Quais métricas são exibidas?'
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
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="flex items-center space-x-3">
          <img
            src="/logotipo-adsops.webp"
            alt="AdsOPS Logo"
            className="w-10 h-10 rounded-lg bg-white p-1.5"
          />
          <div>
            <h3 className="text-lg font-semibold text-white">Suporte AdsOPS</h3>
            <p className="text-sm text-blue-100">Respondemos em até 2 horas</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50">
        {chatHistory.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <img
                src="/logotipo-adsops.webp"
                alt="AdsOPS Logo"
                className="w-14 h-14"
              />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Como podemos ajudar?</h4>
            <p className="text-sm text-gray-600">Descreva seu problema ou dúvida e nossa equipe ajudará você.</p>
          </div>
        ) : (
          chatHistory.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} items-end space-x-2`}
            >
              {message.sender === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <img
                    src="/logotipo-adsops.webp"
                    alt="AdsOPS"
                    className="w-6 h-6"
                  />
                </div>
              )}
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.message}</p>
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
