import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Users,
  UserCheck,
  Briefcase,
  Home,
  Rss,
  Sparkles,
  Wallet,
  ShieldCheck,
  Check,
  Star,
  PlayCircle,
  Quote,
  ChevronRight,
  Bell,
  MessageCircle,
  Zap,
  Globe2,
  TrendingUp,
  KeyRound,
  Heart,
  MapPin,
  BedDouble,
  Bath,
  Square,
  BadgeCheck,
  CircleDollarSign,
  Coins,
  Rocket,
  Crown,
  Gem,
  ChevronDown,
  Linkedin,
  Instagram,
  Youtube,
  Twitter,
} from 'lucide-react';

/* ------------------------------------------------------------ */
/* Helpers                                                       */
/* ------------------------------------------------------------ */

const Section: React.FC<React.PropsWithChildren<{ id?: string; className?: string }>> = ({
  id,
  className = '',
  children,
}) => (
  <section id={id} className={`relative ${className}`}>
    {children}
  </section>
);

const Eyebrow: React.FC<{ children: React.ReactNode; tone?: 'light' | 'dark' }> = ({
  children,
  tone = 'light',
}) => (
  <span
    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${
      tone === 'light'
        ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200/70'
        : 'bg-white/10 text-teal-200 ring-1 ring-white/15'
    }`}
  >
    <span className="relative flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75 captalo-anim-pulse-ring" />
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500" />
    </span>
    {children}
  </span>
);

/* ------------------------------------------------------------ */
/* Logo                                                          */
/* ------------------------------------------------------------ */

const Logo: React.FC<{ inverted?: boolean }> = ({ inverted = false }) => (
  <div className="flex items-center gap-2.5">
    <div className="relative w-9 h-9">
      <div className="absolute inset-0 rounded-xl captalo-conic captalo-anim-spin-slow opacity-90" />
      <div className="absolute inset-[2px] rounded-[10px] bg-white flex items-center justify-center">
        <div className="w-4 h-4 rounded-md bg-gradient-to-br from-teal-500 to-cyan-500 shadow-inner" />
      </div>
    </div>
    <div className="flex flex-col leading-none">
      <span className={`text-lg font-bold tracking-tight ${inverted ? 'text-white' : 'text-slate-900'}`}>
        captalo
      </span>
      <span className={`text-[10px] uppercase tracking-[0.2em] ${inverted ? 'text-teal-300' : 'text-teal-600'}`}>
        real estate
      </span>
    </div>
  </div>
);

/* ------------------------------------------------------------ */
/* Navbar                                                        */
/* ------------------------------------------------------------ */

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: 'Recursos', href: '#funcionalidades' },
    { label: 'Como Funciona', href: '#como-funciona' },
    { label: 'Para Quem', href: '#para-quem' },
    { label: 'Planos', href: '#planos' },
    { label: 'Depoimentos', href: '#depoimentos' },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_2px_30px_-15px_rgba(13,148,136,0.25)]'
          : 'py-5 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center justify-between">
        <Logo />
        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-teal-700 rounded-lg hover:bg-teal-50/70 transition"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-3">
          <a
            href="#login"
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition"
          >
            Entrar
          </a>
          <a
            href="#cta"
            className="group relative inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:-translate-y-0.5 transition overflow-hidden"
          >
            <span className="relative z-10">Criar Conta Grátis</span>
            <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-0.5 transition-transform" />
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/30 to-white/0 captalo-anim-shine" />
          </a>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden p-2 rounded-lg bg-white/70 backdrop-blur border border-slate-200"
          aria-label="Menu"
        >
          <div className="w-5 h-3 flex flex-col justify-between">
            <span className={`block h-0.5 bg-slate-700 transition ${open ? 'rotate-45 translate-y-[5px]' : ''}`} />
            <span className={`block h-0.5 bg-slate-700 transition ${open ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 bg-slate-700 transition ${open ? '-rotate-45 -translate-y-[5px]' : ''}`} />
          </div>
        </button>
      </div>

      {open && (
        <div className="lg:hidden mx-5 mt-3 rounded-2xl border border-slate-200 bg-white shadow-xl p-4 flex flex-col gap-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 text-sm font-medium text-slate-700 rounded-lg hover:bg-teal-50"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#cta"
            className="mt-2 px-4 py-3 text-sm font-semibold text-white text-center rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500"
          >
            Criar Conta Grátis
          </a>
        </div>
      )}
    </header>
  );
};

/* ------------------------------------------------------------ */
/* Hero                                                          */
/* ------------------------------------------------------------ */

const Hero: React.FC = () => {
  return (
    <Section className="pt-32 lg:pt-40 pb-24 overflow-hidden">
      {/* Background mesh + grid */}
      <div className="absolute inset-0 captalo-mesh" />
      <div className="absolute inset-0 captalo-grid-bg" />
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-teal-300/40 blur-3xl captalo-anim-blob" />
      <div
        className="absolute top-10 right-0 w-[460px] h-[460px] rounded-full bg-indigo-300/40 blur-3xl captalo-anim-blob"
        style={{ animationDelay: '4s' }}
      />
      <div className="absolute inset-0 captalo-noise opacity-[0.03] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 lg:px-8 grid lg:grid-cols-12 gap-10 items-center">
        {/* Left – copy */}
        <div className="lg:col-span-6 captalo-anim-fade-up">
          <Eyebrow>São José do Rio Preto · SP</Eyebrow>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-slate-900">
            A plataforma de
            <span className="block captalo-text-gradient captalo-anim-gradient">conexão imobiliária</span>
            que move toda uma cidade.
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-xl leading-relaxed">
            O Captalo é o ecossistema de captação inteligente do mercado de Rio Preto. Conecta
            proprietários, corretores e imobiliárias em uma rede social transparente, verificada e
            cheia de oportunidades.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#cta"
              className="group relative inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500 shadow-xl shadow-teal-500/30 hover:shadow-teal-500/50 hover:-translate-y-0.5 transition overflow-hidden"
            >
              <span className="relative z-10">Começar Grátis</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/30 to-white/0 captalo-anim-shine" />
            </a>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold text-slate-700 rounded-full bg-white/70 backdrop-blur border border-slate-200 hover:border-teal-300 hover:bg-white transition"
            >
              <PlayCircle className="w-4 h-4 text-teal-600" />
              Ver Perfil Modelo
            </a>
          </div>

          {/* Trust strip */}
          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-500">
            <div className="flex -space-x-2">
              {[
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop',
                'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop',
                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop',
              ].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt="Avatar de usuário Captalo"
                  className="w-9 h-9 rounded-full ring-2 ring-white object-cover"
                />
              ))}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 ring-2 ring-white text-white text-xs font-bold flex items-center justify-center">
                +9k
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
              <span className="ml-1 font-semibold text-slate-700">4.9/5</span>
              <span>· +9.000 usuários ativos</span>
            </div>
          </div>
        </div>

        {/* Right – animated 3D illustration */}
        <div className="lg:col-span-6 relative h-[520px] lg:h-[600px]">
          <HeroIllustration />
        </div>
      </div>
    </Section>
  );
};

/* ------------------------------------------------------------ */
/* Hero Illustration – animated "3D" stacked cards               */
/* ------------------------------------------------------------ */

const HeroIllustration: React.FC = () => {
  return (
    <div className="relative w-full h-full">
      {/* Glow */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-teal-400/40 via-cyan-400/30 to-indigo-400/30 blur-3xl" />

      {/* Orbiting dots */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px]">
        <div className="absolute inset-0 rounded-full border border-teal-300/40" />
        <div className="absolute inset-8 rounded-full border border-teal-300/30" />
        <div className="absolute inset-16 rounded-full border border-teal-300/20" />
        <div className="absolute left-1/2 top-1/2 captalo-anim-orbit">
          <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/50" />
        </div>
        <div
          className="absolute left-1/2 top-1/2 captalo-anim-orbit"
          style={{ animationDuration: '20s', animationDirection: 'reverse' }}
        >
          <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50" />
        </div>
      </div>

      {/* Main property card */}
      <div className="absolute top-10 left-4 lg:left-10 w-[300px] captalo-anim-tilt">
        <div className="captalo-glass rounded-2xl p-3 shadow-2xl shadow-teal-900/10 captalo-glow">
          <div className="relative h-44 rounded-xl overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop"
              alt="Imóvel destaque"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 text-xs font-semibold text-teal-700 flex items-center gap-1">
              <BadgeCheck className="w-3.5 h-3.5" /> Verificado
            </div>
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 flex items-center justify-center">
              <Heart className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          <div className="p-2 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Apartamento Moderno</p>
              <p className="text-sm font-bold text-teal-600">R$ 685.000</p>
            </div>
            <p className="flex items-center gap-1 text-xs text-slate-500 mt-1">
              <MapPin className="w-3 h-3" /> Redentora · São José do Rio Preto
            </p>
            <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <BedDouble className="w-3.5 h-3.5" /> 3
              </span>
              <span className="flex items-center gap-1">
                <Bath className="w-3.5 h-3.5" /> 2
              </span>
              <span className="flex items-center gap-1">
                <Square className="w-3.5 h-3.5" /> 102m²
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Captador chat bubble */}
      <div
        className="absolute top-2 right-0 lg:right-4 w-[260px] captalo-anim-float-slow"
        style={{ animationDelay: '0.6s' }}
      >
        <div className="bg-white rounded-2xl p-4 shadow-2xl shadow-indigo-900/10 border border-slate-100">
          <div className="flex items-center gap-2.5">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop"
              alt="Avatar"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-teal-200"
            />
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-900">Júlia Mendes</p>
              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Captadora · online
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-3 text-xs text-slate-700 leading-relaxed">
            “Tenho um cliente buscando 3 dorms na Redentora. Posso visitar?”
          </p>
        </div>
      </div>

      {/* KPI stat card */}
      <div
        className="absolute bottom-10 left-0 lg:left-2 w-[230px] captalo-anim-float"
        style={{ animationDelay: '1.2s' }}
      >
        <div className="bg-slate-900 rounded-2xl p-4 shadow-2xl shadow-slate-900/30 text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-teal-500/30 blur-2xl" />
          <div className="flex items-center gap-2 text-xs text-teal-300">
            <TrendingUp className="w-3.5 h-3.5" />
            Captações no mês
          </div>
          <p className="mt-2 text-3xl font-bold">+38%</p>
          <div className="mt-3 flex items-end gap-1.5 h-10">
            {[40, 60, 35, 75, 55, 90, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-teal-500 to-cyan-400 captalo-anim-bar"
                style={{ height: `${h}%`, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Token / wallet card */}
      <div
        className="absolute bottom-2 right-2 lg:right-10 w-[230px] captalo-anim-float-slow"
        style={{ animationDelay: '0.3s' }}
      >
        <div className="rounded-2xl p-4 bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-2xl shadow-teal-500/40 relative overflow-hidden">
          <div className="absolute inset-0 captalo-noise opacity-20" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <Coins className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-wider opacity-80">Wallet</span>
            </div>
            <p className="mt-3 text-2xl font-bold">42 Tokens</p>
            <p className="text-[10px] opacity-80 mt-0.5">Saldo disponível</p>
            <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full w-3/4 rounded-full bg-white relative">
                <span className="absolute inset-0 captalo-anim-shine bg-gradient-to-r from-white/0 via-white/60 to-white/0" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center floating verified badge */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 captalo-anim-float">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full captalo-conic captalo-anim-spin-slow" />
          <div className="absolute inset-1 rounded-full bg-white flex items-center justify-center shadow-2xl">
            <ShieldCheck className="w-10 h-10 text-teal-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ */
/* Para Quem é o Captalo                                         */
/* ------------------------------------------------------------ */

const personas = [
  {
    icon: UserCheck,
    title: 'Corretores',
    desc: 'Capture imóveis com exclusividade e agilidade. Construa autoridade com perfil verificado.',
    tag: '+12k cadastros',
    accent: 'from-teal-500 to-cyan-500',
  },
  {
    icon: Home,
    title: 'Proprietários',
    desc: 'Anuncie e receba propostas qualificadas com transparência total e zero burocracia.',
    tag: '+38k imóveis',
    accent: 'from-cyan-500 to-indigo-500',
  },
  {
    icon: Building2,
    title: 'Imobiliárias',
    desc: 'Organize sua equipe e ofertas em uma interface moderna, com analytics em tempo real.',
    tag: '+450 empresas',
    accent: 'from-indigo-500 to-violet-500',
  },
  {
    icon: Briefcase,
    title: 'Captadores Independentes',
    desc: 'Trabalhe de forma autônoma, com renda própria e benefícios.',
    tag: 'Renda extra',
    accent: 'from-amber-500 to-rose-500',
  },
  {
    icon: Users,
    title: 'Administradores de Imóveis',
    desc: 'Gerencie carteiras, mantenha históricos e acompanhe transações.',
    tag: 'Gestão simples',
    accent: 'from-rose-500 to-pink-500',
  },
];

const ParaQuem: React.FC = () => (
  <Section id="para-quem" className="py-24">
    <div className="max-w-7xl mx-auto px-5 lg:px-8">
      <div className="text-center max-w-2xl mx-auto">
        <Eyebrow>Para Quem</Eyebrow>
        <h2 className="mt-4 text-3xl lg:text-5xl font-bold tracking-tight text-slate-900">
          Construído para todo o ecossistema imobiliário
        </h2>
        <p className="mt-4 text-slate-600">
          Uma plataforma completa que conecta todos os profissionais do mercado imobiliário em um só lugar.
        </p>
      </div>

      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 captalo-stagger">
        {personas.map((p) => (
          <div
            key={p.title}
            className="group relative rounded-3xl bg-white p-6 border border-slate-100 hover:border-transparent shadow-sm hover:shadow-2xl hover:shadow-teal-900/10 transition captalo-card-3d overflow-hidden"
          >
            <div
              className={`absolute -top-20 -right-20 w-48 h-48 rounded-full bg-gradient-to-br ${p.accent} opacity-10 blur-2xl group-hover:opacity-25 transition`}
            />
            <div
              className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${p.accent} flex items-center justify-center text-white shadow-lg`}
            >
              <p.icon className="w-6 h-6" />
            </div>
            <h3 className="mt-5 text-lg font-bold text-slate-900">{p.title}</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{p.desc}</p>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{p.tag}</span>
              <span className="text-teal-600 group-hover:translate-x-1 transition">
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </Section>
);

/* ------------------------------------------------------------ */
/* Connection / Dark Section                                     */
/* ------------------------------------------------------------ */

const Connection: React.FC = () => (
  <Section className="py-28 overflow-hidden">
    <div className="absolute inset-0 captalo-mesh-dark" />
    <div className="absolute inset-0 captalo-grid-bg opacity-40" />
    <div className="absolute -top-32 left-1/4 w-[400px] h-[400px] rounded-full bg-teal-500/30 blur-3xl captalo-anim-blob" />
    <div
      className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/30 blur-3xl captalo-anim-blob"
      style={{ animationDelay: '6s' }}
    />

    <div className="relative max-w-5xl mx-auto px-5 lg:px-8 text-center">
      <Eyebrow tone="dark">Conexão Real</Eyebrow>

      <h2 className="mt-5 text-4xl lg:text-6xl font-bold tracking-tight text-white leading-[1.05]">
        Porque toda captação{' '}
        <span className="captalo-text-gradient captalo-anim-gradient">começa com uma boa conexão</span>
      </h2>
      <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
        Uma rede social profissional onde cada conexão é verificada, cada conversa é segura e cada
        match é transparente.
      </p>

      {/* Floating chat bubbles */}
      <div className="relative mt-16 h-[280px] hidden md:block">
        <div className="absolute left-2 top-2 captalo-anim-float">
          <ChatBubble name="Carlos R." role="Corretor" msg="Perfil verificado · 5 estrelas" avatar="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop" />
        </div>
        <div className="absolute left-1/4 bottom-0 captalo-anim-float" style={{ animationDelay: '1s' }}>
          <ChatBubble name="Mariana" role="Proprietária" msg="“Conectada com 3 corretores hoje”" avatar="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop" />
        </div>
        <div className="absolute right-2 top-4 captalo-anim-float-slow">
          <ChatBubble name="Imobiliária Prime" role="Empresa" msg="2 novos imóveis captados" avatar="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop" />
        </div>
        <div className="absolute right-1/4 bottom-2 captalo-anim-float-slow" style={{ animationDelay: '0.6s' }}>
          <ChatBubble name="João" role="Captador" msg="“+ 12% de match qualificado”" avatar="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop" />
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 rounded-full bg-teal-500/30 blur-2xl captalo-anim-pulse-ring" />
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-teal-500 via-cyan-500 to-indigo-500 flex items-center justify-center captalo-glow-strong">
              <Globe2 className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap justify-center gap-3">
        {[
          { icon: ShieldCheck, label: 'Verificação real' },
          { icon: Zap, label: 'Match instantâneo' },
          { icon: MessageCircle, label: 'Chat seguro' },
        ].map((b) => (
          <div
            key={b.label}
            className="captalo-glass-dark rounded-full px-4 py-2 text-sm font-medium text-white flex items-center gap-2"
          >
            <b.icon className="w-4 h-4 text-teal-300" />
            {b.label}
          </div>
        ))}
      </div>
    </div>
  </Section>
);

const ChatBubble: React.FC<{ name: string; role: string; msg: string; avatar: string }> = ({
  name,
  role,
  msg,
  avatar,
}) => (
  <div className="captalo-glass-dark rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 max-w-[260px]">
    <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover ring-2 ring-white/20" />
    <div className="text-left">
      <p className="text-xs font-bold text-white leading-tight">{name}</p>
      <p className="text-[10px] text-teal-300">{role}</p>
      <p className="text-[11px] text-slate-300 mt-0.5">{msg}</p>
    </div>
  </div>
);

/* ------------------------------------------------------------ */
/* Funcionalidades                                               */
/* ------------------------------------------------------------ */

const features = [
  {
    icon: Rss,
    title: 'Feed Social Imobiliário',
    desc: 'Conecte-se e compartilhe oportunidades com a comunidade local.',
    accent: 'from-teal-500 to-cyan-500',
  },
  {
    icon: Sparkles,
    title: 'Match Inteligente',
    desc: 'Algoritmo de IA conecta corretores e imóveis compatíveis.',
    accent: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Wallet,
    title: 'Wallet com Tokens',
    desc: 'Sistema de créditos para captação, planos e recompensas.',
    accent: 'from-indigo-500 to-violet-500',
  },
  {
    icon: ShieldCheck,
    title: 'Perfis Públicos Verificados',
    desc: 'Reputação, histórico de captações e selos de confiança.',
    accent: 'from-emerald-500 to-teal-500',
  },
];

const Features: React.FC = () => (
  <Section id="funcionalidades" className="py-28 relative overflow-hidden">
    <div className="absolute inset-0 captalo-grid-bg opacity-50" />
    <div className="max-w-7xl mx-auto px-5 lg:px-8 relative">
      <div className="text-center max-w-2xl mx-auto">
        <Eyebrow>Recursos</Eyebrow>
        <h2 className="mt-4 text-3xl lg:text-5xl font-bold tracking-tight text-slate-900">
          Principais Funcionalidades
        </h2>
        <p className="mt-4 text-slate-600">
          Tudo que você precisa para revolucionar sua captação no mercado imobiliário.
        </p>
      </div>

      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 captalo-stagger">
        {features.map((f) => (
          <div
            key={f.title}
            className="group relative rounded-3xl p-6 bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-teal-900/10 transition captalo-card-3d overflow-hidden"
          >
            <div
              className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${f.accent} opacity-10 blur-2xl group-hover:opacity-30 transition`}
            />
            <div
              className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${f.accent} text-white flex items-center justify-center shadow-lg captalo-glow`}
            >
              <f.icon className="w-7 h-7" />
            </div>
            <h3 className="mt-5 text-lg font-bold text-slate-900">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            <div className="mt-5 inline-flex items-center text-xs font-semibold text-teal-700 group-hover:gap-2 gap-1 transition-all">
              Saiba mais <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </Section>
);

/* ------------------------------------------------------------ */
/* Como Funciona                                                 */
/* ------------------------------------------------------------ */

const steps = [
  {
    n: '01',
    title: 'Crie seu perfil',
    desc: 'Cadastro rápido com verificação para construir sua autoridade na rede.',
    icon: UserCheck,
  },
  {
    n: '02',
    title: 'Construa sua credibilidade',
    desc: 'Valide seu CRECI e crie um portfólio bonito com seus contatos e propriedades.',
    icon: ShieldCheck,
  },
  {
    n: '03',
    title: 'Conecte e capte',
    desc: 'Use o feed e o match inteligente para encontrar imóveis e clientes.',
    icon: Sparkles,
  },
  {
    n: '04',
    title: 'Cresça com tokens',
    desc: 'Ganhe e gaste tokens em recursos premium e alavanque suas captações.',
    icon: Coins,
  },
];

const ComoFunciona: React.FC = () => {
  const [active, setActive] = useState(1);
  return (
    <Section id="como-funciona" className="py-28">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <Eyebrow>Jornada</Eyebrow>
          <h2 className="mt-4 text-3xl lg:text-5xl font-bold tracking-tight text-slate-900">
            Como Funciona
          </h2>
          <p className="mt-4 text-slate-600">
            Explore nossa metodologia em 4 passos estratégicos.
          </p>
        </div>

        {/* Timeline */}
        <div className="mt-16 relative">
          <div className="absolute left-0 right-0 top-7 h-[2px] bg-slate-200" />
          <div
            className="absolute left-0 top-7 h-[2px] bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-700"
            style={{ width: `${(active / steps.length) * 100}%` }}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative">
            {steps.map((s, i) => {
              const idx = i + 1;
              const isActive = idx <= active;
              return (
                <button
                  key={s.n}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => setActive(idx)}
                  className="text-left group"
                >
                  <div
                    className={`relative w-14 h-14 mx-auto rounded-2xl flex items-center justify-center font-bold text-sm transition ${
                      isActive
                        ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30'
                        : 'bg-white border border-slate-200 text-slate-500'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute inset-0 rounded-2xl bg-teal-500/30 blur-md captalo-anim-pulse-ring" />
                    )}
                    <span className="relative">{s.n}</span>
                  </div>
                  <p
                    className={`mt-4 text-center text-sm font-bold transition ${
                      isActive ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {s.title}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active step card */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="relative rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-900/5 p-8 lg:p-10 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br from-teal-300 to-cyan-300 opacity-30 blur-3xl" />
            <div className="relative flex items-start gap-6">
              <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white items-center justify-center shadow-lg shrink-0">
                {React.createElement(steps[active - 1].icon, { className: 'w-8 h-8' })}
              </div>
              <div className="flex-1">
                <Eyebrow>Passo {steps[active - 1].n}</Eyebrow>
                <h3 className="mt-3 text-2xl lg:text-3xl font-bold text-slate-900">
                  {steps[active - 1].title}
                </h3>
                <p className="mt-3 text-slate-600 leading-relaxed">{steps[active - 1].desc}</p>
                <div className="mt-5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-700"
                    style={{ width: `${(active / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};

/* ------------------------------------------------------------ */
/* Feed de Imóveis                                                */
/* ------------------------------------------------------------ */

const properties = [
  {
    img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    title: 'Cobertura Duplex Premium',
    location: 'Bairro Jardim Tarraf · 240m²',
    price: 'R$ 2.350.000',
    badges: ['3 Suítes', '4 Vagas'],
    agent: 'Marina Santos',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop',
  },
  {
    img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop',
    title: 'Casa com Piscina e Jardim',
    location: 'Vila Boa · 320m²',
    price: 'R$ 1.290.000',
    badges: ['4 Quartos', 'Piscina'],
    agent: 'Roberto Lima',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop',
  },
];

const Feed: React.FC = () => (
  <Section className="py-28 relative overflow-hidden">
    <div className="absolute -left-40 top-1/3 w-[420px] h-[420px] rounded-full bg-teal-200/40 blur-3xl" />
    <div className="max-w-7xl mx-auto px-5 lg:px-8 grid lg:grid-cols-12 gap-12 items-center">
      <div className="lg:col-span-5">
        <Eyebrow>Feed Inteligente</Eyebrow>
        <h2 className="mt-4 text-3xl lg:text-5xl font-bold tracking-tight text-slate-900">
          Feed de Imóveis Inteligente
        </h2>
        <p className="mt-4 text-slate-600">
          Encontre imóveis disponíveis e perfis ativos na sua região. Feed social inteligente, com
          recomendações personalizadas baseadas em suas preferências.
        </p>

        <ul className="mt-6 space-y-3">
          {[
            'Algoritmo de IA orientado a contexto',
            'Filtros avançados por localização e preço',
            'Interação social: curtir, comentar e compartilhar',
            'Notificações de match em tempo real',
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-slate-700">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" />
              </span>
              <span className="text-sm">{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#cta"
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/30 hover:-translate-y-0.5 transition"
          >
            Explorar feed <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#funcionalidades"
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 rounded-full bg-white border border-slate-200 hover:border-teal-300 transition"
          >
            Criar perfil grátis
          </a>
        </div>
      </div>

      <div className="lg:col-span-7 space-y-5">
        {properties.map((p, i) => (
          <div
            key={p.title}
            className="captalo-anim-fade-up bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-900/5 overflow-hidden hover:shadow-2xl transition group"
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            <div className="grid sm:grid-cols-5">
              <div className="sm:col-span-2 relative h-48 sm:h-auto">
                <img
                  src={p.img}
                  alt={p.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-700"
                />
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 text-[10px] font-bold text-teal-700">
                  <BadgeCheck className="w-3 h-3" /> Verificado
                </span>
              </div>
              <div className="sm:col-span-3 p-5">
                <div className="flex items-center gap-2.5">
                  <img src={p.avatar} alt={p.agent} className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{p.agent}</p>
                    <p className="text-[10px] text-slate-500">Corretora · 4.9 ★</p>
                  </div>
                  <span className="ml-auto text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                    Ativo agora
                  </span>
                </div>
                <h4 className="mt-4 text-lg font-bold text-slate-900">{p.title}</h4>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {p.location}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.badges.map((b) => (
                    <span key={b} className="text-[10px] font-semibold text-slate-600 bg-slate-100 rounded-full px-2.5 py-1">
                      {b}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xl font-bold text-slate-900">{p.price}</span>
                  <div className="flex items-center gap-2 text-slate-400">
                    <button className="w-9 h-9 rounded-full bg-slate-50 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center transition">
                      <Heart className="w-4 h-4" />
                    </button>
                    <button className="w-9 h-9 rounded-full bg-slate-50 hover:bg-teal-50 hover:text-teal-600 flex items-center justify-center transition">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </Section>
);

/* ------------------------------------------------------------ */
/* Perfis Públicos                                               */
/* ------------------------------------------------------------ */

const profiles = [
  {
    name: 'Carla Ribeiro',
    role: 'Corretora · CRECI 41.288',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop',
    stats: { captacoes: 86, rating: 4.9, anos: 8 },
  },
  {
    name: 'Imobiliária Prime',
    role: 'Empresa · CRECI-J 5.412',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop',
    stats: { captacoes: 312, rating: 4.8, anos: 14 },
  },
  {
    name: 'Adriel P. Rocha',
    role: 'Captador · Independente',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    stats: { captacoes: 54, rating: 4.7, anos: 3 },
  },
];

const Perfis: React.FC = () => (
  <Section className="py-28">
    <div className="max-w-7xl mx-auto px-5 lg:px-8">
      <div className="text-center max-w-2xl mx-auto">
        <Eyebrow>Reputação</Eyebrow>
        <h2 className="mt-4 text-3xl lg:text-5xl font-bold tracking-tight text-slate-900">
          Perfis Públicos Verificados
        </h2>
        <p className="mt-4 text-slate-600">
          Cada usuário tem reputação pública, com captações, avaliações e histórico transparente.
        </p>
      </div>

      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 captalo-stagger">
        {profiles.map((p) => (
          <div
            key={p.name}
            className="group relative rounded-3xl bg-white border border-slate-100 p-6 shadow-sm hover:shadow-2xl hover:shadow-teal-900/10 transition captalo-card-3d overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-teal-100 via-cyan-100 to-indigo-100" />
            <div className="relative">
              <img
                src={p.avatar}
                alt={p.name}
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-lg"
              />
              <div className="mt-3 flex items-center gap-1.5">
                <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                <BadgeCheck className="w-4 h-4 text-teal-500" />
              </div>
              <p className="text-xs text-slate-500">{p.role}</p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Stat label="Captações" value={p.stats.captacoes.toString()} />
                <Stat label="Rating" value={`${p.stats.rating}★`} />
                <Stat label="Anos" value={`${p.stats.anos}+`} />
              </div>

              <a
                href="#cta"
                className="mt-5 w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition"
              >
                Ver Perfil
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  </Section>
);

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 px-2 py-2 text-center">
    <p className="text-sm font-bold text-slate-900">{value}</p>
    <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
  </div>
);

/* ------------------------------------------------------------ */
/* Economia / Tokens                                              */
/* ------------------------------------------------------------ */

const Economia: React.FC = () => (
  <Section className="py-28">
    <div className="max-w-7xl mx-auto px-5 lg:px-8 grid lg:grid-cols-12 gap-12 items-center">
      <div className="lg:col-span-6">
        <Eyebrow>Tokenomics</Eyebrow>
        <h2 className="mt-4 text-3xl lg:text-5xl font-bold tracking-tight text-slate-900">
          A Nova Economia do{' '}
          <span className="captalo-text-gradient captalo-anim-gradient">Mercado Imobiliário</span>
        </h2>
        <p className="mt-4 text-slate-600">
          Compre, troque e desbloqueie recursos premium com nosso sistema de tokens. Modelo
          transparente de créditos que se adapta ao seu ritmo de trabalho.
        </p>

        <ul className="mt-6 space-y-3">
          {[
            'Recompensas automáticas por engajamento',
            'Conversão fácil entre planos',
            'Boost em destaques de captação',
            'Marketplace simples e direto',
          ].map((item) => (
            <li key={item} className="flex items-center gap-3 text-slate-700">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" />
              </span>
              <span className="text-sm">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:col-span-6 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-300/30 to-indigo-300/30 blur-3xl rounded-full" />
        <div className="relative captalo-anim-tilt">
          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-2xl shadow-slate-900/30 captalo-glow-strong relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-teal-500/30 blur-3xl" />
            <div className="absolute -bottom-32 -left-20 w-72 h-72 rounded-full bg-indigo-500/30 blur-3xl" />
            <div className="absolute inset-0 captalo-noise opacity-10" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400">Saldo Disponível</p>
                    <p className="text-3xl font-bold mt-0.5">42 Tokens</p>
                  </div>
                </div>
                <KeyRound className="w-5 h-5 text-teal-300" />
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                  <p className="text-xs text-slate-400">Recebidos</p>
                  <p className="text-base font-bold text-emerald-400">+18 ↑</p>
                </div>
                <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                  <p className="text-xs text-slate-400">Gastos</p>
                  <p className="text-base font-bold text-rose-400">−6 ↓</p>
                </div>
                <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                  <p className="text-xs text-slate-400">Boost</p>
                  <p className="text-base font-bold text-amber-400">+8 ★</p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Próximo nível</span>
                  <span>78%</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 relative">
                    <span className="absolute inset-0 captalo-anim-shine bg-gradient-to-r from-white/0 via-white/60 to-white/0" />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <CircleDollarSign className="w-4 h-4 text-teal-300" />
                  Última transação
                </div>
                <span className="font-mono">+5 TKN · há 2min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Section>
);

/* ------------------------------------------------------------ */
/* Planos                                                        */
/* ------------------------------------------------------------ */

type Plan = {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  cta: string;
};

const plans: Plan[] = [
  {
    name: 'Free',
    price: 'R$ 0',
    period: 'para sempre',
    desc: 'Comece a captar com o básico.',
    features: ['Perfil verificado', '5 captações/mês', 'Feed local', 'Suporte por chat'],
    icon: Sparkles,
    accent: 'from-slate-200 to-slate-100',
    cta: 'Começar Grátis',
  },
  {
    name: 'Starter',
    price: 'R$ 49',
    period: '/mês',
    desc: 'Para corretores em ascensão.',
    features: ['Tudo do Free', '20 captações/mês', 'Match inteligente', 'Tokens grátis'],
    icon: Rocket,
    accent: 'from-teal-100 to-cyan-100',
    cta: 'Começar Agora',
  },
  {
    name: 'Pro',
    price: 'R$ 99',
    period: '/mês',
    desc: 'O plano dos top performers.',
    features: ['Tudo do Starter', '∞ captações', 'Boost de perfil', 'Insights de IA', 'Selo Pro'],
    highlighted: true,
    badge: 'Mais Popular',
    icon: Crown,
    accent: 'from-teal-500 to-cyan-500',
    cta: 'Começar Agora',
  },
  {
    name: 'Power',
    price: 'R$ 199',
    period: '/mês',
    desc: 'Para times em alta performance.',
    features: ['Tudo do Pro', 'Multi-usuário (3)', 'Painel avançado', 'API integrações'],
    icon: Zap,
    accent: 'from-indigo-200 to-violet-200',
    cta: 'Começar Agora',
  },
  {
    name: 'Imobiliária',
    price: 'R$ 399',
    period: '/mês',
    desc: 'Para empresas e gestores.',
    features: ['Tudo do Power', 'Multi-usuário (∞)', 'Marca personalizada', 'Suporte dedicado'],
    badge: 'Empresas',
    icon: Gem,
    accent: 'from-amber-100 to-rose-100',
    cta: 'Falar com vendas',
  },
];

const Planos: React.FC = () => {
  const [billing, setBilling] = useState<'mensal' | 'anual'>('mensal');
  return (
    <Section id="planos" className="py-28 relative overflow-hidden">
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-teal-200/40 blur-3xl rounded-full" />
      <div className="max-w-7xl mx-auto px-5 lg:px-8 relative">
        <div className="text-center max-w-2xl mx-auto">
          <Eyebrow>Planos</Eyebrow>
          <h2 className="mt-4 text-3xl lg:text-5xl font-bold tracking-tight text-slate-900">
            Planos que funcionam para o{' '}
            <span className="captalo-text-gradient captalo-anim-gradient">seu Negócio</span>
          </h2>
          <p className="mt-4 text-slate-600">
            Comece grátis e cresça. Cancele a qualquer momento.
          </p>

          <div className="mt-8 inline-flex items-center bg-white border border-slate-200 rounded-full p-1 shadow-sm">
            {(['mensal', 'anual'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`px-5 py-2 text-sm font-semibold rounded-full transition ${
                  billing === b
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md'
                    : 'text-slate-600'
                }`}
              >
                {b === 'mensal' ? 'Mensal' : 'Anual · -20%'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-5 gap-5 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-6 transition group flex flex-col ${
                plan.highlighted
                  ? 'bg-gradient-to-br from-teal-500 via-cyan-500 to-indigo-500 text-white shadow-2xl shadow-teal-500/40 lg:scale-[1.04] z-10'
                  : 'bg-white border border-slate-100 hover:shadow-xl shadow-sm'
              }`}
            >
              {plan.badge && (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                    plan.highlighted
                      ? 'bg-white text-teal-700'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  {plan.badge}
                </span>
              )}

              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  plan.highlighted
                    ? 'bg-white/20 text-white backdrop-blur'
                    : `bg-gradient-to-br ${plan.accent} text-slate-700`
                }`}
              >
                <plan.icon className="w-5 h-5" />
              </div>
              <h3 className={`mt-4 text-lg font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                {plan.name}
              </h3>
              <p className={`text-xs ${plan.highlighted ? 'text-white/80' : 'text-slate-500'}`}>
                {plan.desc}
              </p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className={`text-3xl font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                  {plan.price}
                </span>
                <span className={`text-xs ${plan.highlighted ? 'text-white/70' : 'text-slate-500'}`}>
                  {plan.period}
                </span>
              </div>

              <a
                href="#cta"
                className={`mt-5 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition ${
                  plan.highlighted
                    ? 'bg-white text-teal-700 hover:bg-slate-100'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {plan.cta}
              </a>

              <ul className={`mt-5 space-y-2.5 text-sm ${plan.highlighted ? 'text-white/90' : 'text-slate-600'}`}>
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        plan.highlighted ? 'text-white' : 'text-teal-600'
                      }`}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-slate-500">
          Todos os planos incluem 14 dias de teste grátis · Cancele quando quiser
        </p>
      </div>
    </Section>
  );
};

/* ------------------------------------------------------------ */
/* Depoimentos                                                   */
/* ------------------------------------------------------------ */

const testimonials = [
  {
    name: 'Renata Alves',
    role: 'Corretora · 6 anos no mercado',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop',
    text: 'O Captalo transformou a forma como capturo imóveis. A plataforma é prática, intuitiva e me trouxe resultados em menos de 30 dias.',
  },
  {
    name: 'Lucas Martins',
    role: 'Captador independente',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop',
    text: 'O algoritmo de match é absurdo. Em uma semana eu fechei 2 captações exclusivas direto pelo feed.',
  },
  {
    name: 'Daniela Costa',
    role: 'Diretora · Imobiliária Prime',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop',
    text: 'Centralizamos 45 corretores e migramos toda nossa operação. O ROI apareceu já no segundo mês.',
  },
];

const Depoimentos: React.FC = () => (
  <Section id="depoimentos" className="py-28">
    <div className="max-w-7xl mx-auto px-5 lg:px-8">
      <div className="text-center max-w-2xl mx-auto">
        <Eyebrow>Provas Sociais</Eyebrow>
        <h2 className="mt-4 text-3xl lg:text-5xl font-bold tracking-tight text-slate-900">
          O Que Nossos Usuários Dizem
        </h2>
        <p className="mt-4 text-slate-600">
          Histórias reais de profissionais que transformaram suas carreiras com o Captalo.
        </p>
      </div>

      <div className="mt-14 grid md:grid-cols-3 gap-5 captalo-stagger">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="relative rounded-3xl bg-white border border-slate-100 shadow-sm p-7 hover:shadow-2xl hover:shadow-teal-900/10 transition captalo-card-3d"
          >
            <Quote className="w-8 h-8 text-teal-200 absolute top-5 right-5" />
            <div className="flex items-center gap-1.5 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <p className="mt-4 text-slate-700 leading-relaxed text-sm">“{t.text}”</p>
            <div className="mt-6 flex items-center gap-3 pt-5 border-t border-slate-100">
              <img src={t.avatar} alt={t.name} className="w-11 h-11 rounded-full object-cover" />
              <div>
                <p className="text-sm font-bold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-500">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </Section>
);

/* ------------------------------------------------------------ */
/* CTA Final                                                     */
/* ------------------------------------------------------------ */

const CTA: React.FC = () => (
  <Section id="cta" className="py-28 relative overflow-hidden">
    <div className="absolute inset-0 captalo-mesh-dark" />
    <div className="absolute inset-0 captalo-grid-bg opacity-40" />
    <div className="absolute -top-32 left-1/3 w-[500px] h-[500px] rounded-full bg-teal-500/30 blur-3xl captalo-anim-blob" />
    <div
      className="absolute -bottom-40 right-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/30 blur-3xl captalo-anim-blob"
      style={{ animationDelay: '4s' }}
    />

    <div className="relative max-w-4xl mx-auto px-5 lg:px-8 text-center">
      <div className="inline-flex items-center gap-2 captalo-glass-dark rounded-full px-4 py-1.5 text-sm text-teal-300">
        <Bell className="w-4 h-4" />
        Junte-se à maior rede social imobiliária de Rio Preto
      </div>
      <h2 className="mt-6 text-4xl lg:text-6xl font-bold tracking-tight text-white leading-[1.05]">
        Pronto para entrar na maior rede{' '}
        <span className="captalo-text-gradient captalo-anim-gradient">social do mercado imobiliário?</span>
      </h2>
      <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
        Crie seu perfil grátis agora e comece a se conectar com milhares de profissionais hoje mesmo.
      </p>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <a
          href="#"
          className="group relative inline-flex items-center gap-2 px-7 py-4 text-sm font-semibold text-slate-900 rounded-full bg-white shadow-2xl hover:-translate-y-0.5 transition overflow-hidden"
        >
          <span className="relative z-10">Criar Meu Perfil Grátis</span>
          <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition" />
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-teal-200/50 to-transparent captalo-anim-shine" />
        </a>
        <a
          href="#planos"
          className="inline-flex items-center gap-2 px-6 py-4 text-sm font-semibold text-white rounded-full captalo-glass-dark hover:bg-white/10 transition"
        >
          Ver Planos
        </a>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <Check className="w-4 h-4 text-teal-400" /> 100% gratuito para começar
        </span>
        <span className="flex items-center gap-2">
          <Check className="w-4 h-4 text-teal-400" /> Sem cartão de crédito
        </span>
        <span className="flex items-center gap-2">
          <Check className="w-4 h-4 text-teal-400" /> Cancele quando quiser
        </span>
      </div>
    </div>
  </Section>
);

/* ------------------------------------------------------------ */
/* Footer                                                        */
/* ------------------------------------------------------------ */

const Footer: React.FC = () => (
  <footer className="bg-slate-950 text-slate-400 pt-20 pb-10 border-t border-slate-800/60">
    <div className="max-w-7xl mx-auto px-5 lg:px-8">
      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4">
          <Logo inverted />
          <p className="mt-5 text-sm leading-relaxed max-w-xs">
            A plataforma de conexão imobiliária de São José do Rio Preto. Captação inteligente,
            verificada e transparente.
          </p>
          <div className="mt-6 flex items-center gap-3">
            {[Linkedin, Instagram, Youtube, Twitter].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-teal-500 hover:text-white text-slate-300 flex items-center justify-center transition"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm">
          {[
            {
              title: 'Produto',
              links: ['Recursos', 'Planos', 'Tokens', 'Como Funciona'],
            },
            {
              title: 'Empresa',
              links: ['Sobre nós', 'Blog', 'Carreiras', 'Contato'],
            },
            {
              title: 'Suporte',
              links: ['Central de Ajuda', 'Comunidade', 'Status', 'API'],
            },
            {
              title: 'Legal',
              links: ['Privacidade', 'Termos', 'Cookies', 'LGPD'],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-white font-bold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-teal-300 transition">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16 pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <p>© 2026 Captalo · Todos os direitos reservados</p>
        <p className="flex items-center gap-2">
          Feito com <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" /> em São José do Rio
          Preto
        </p>
      </div>
    </div>
  </footer>
);

/* ------------------------------------------------------------ */
/* Marquee strip (logos / categorias)                            */
/* ------------------------------------------------------------ */

const Marquee: React.FC = () => {
  const items = [
    'Apartamentos',
    'Casas',
    'Coberturas',
    'Comerciais',
    'Lançamentos',
    'Terrenos',
    'Lofts',
    'Salas',
    'Galpões',
  ];
  const list = [...items, ...items];
  return (
    <div className="relative py-8 border-y border-slate-100 bg-white overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />
      <div className="flex gap-12 captalo-anim-marquee whitespace-nowrap">
        {list.map((item, i) => (
          <div key={i} className="flex items-center gap-3 text-slate-500">
            <Building2 className="w-4 h-4 text-teal-500" />
            <span className="text-sm font-semibold uppercase tracking-wider">{item}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ */
/* Scroll-to-top button                                          */
/* ------------------------------------------------------------ */

const ScrollTop: React.FC = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-2xl shadow-teal-500/40 hover:-translate-y-1 transition flex items-center justify-center"
      aria-label="Voltar ao topo"
    >
      <ChevronDown className="w-5 h-5 rotate-180" />
    </button>
  );
};

/* ------------------------------------------------------------ */
/* Page                                                          */
/* ------------------------------------------------------------ */

export const CaptaloLanding: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth scrolling for anchor clicks
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!link) return;
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const el = document.querySelector(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div ref={containerRef} className="bg-white text-slate-900 antialiased selection:bg-teal-200/50">
      <Navbar />
      <Hero />
      <Marquee />
      <ParaQuem />
      <Connection />
      <Features />
      <ComoFunciona />
      <Feed />
      <Perfis />
      <Economia />
      <Planos />
      <Depoimentos />
      <CTA />
      <Footer />
      <ScrollTop />
    </div>
  );
};

export default CaptaloLanding;
