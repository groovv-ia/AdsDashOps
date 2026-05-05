import { useReveal } from './useReveal';
import { Eyebrow } from './ManifestoV3';

const Check = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function PricingV3() {
  const head = useReveal();

  const plans = [
    {
      name: 'Starter', price: 'R$ 0', period: '/mês',
      desc: 'Para corretores que estão chegando agora — para fazer as primeiras conexões.',
      items: ['Até 5 captações ativas', 'Chat com captadores', 'Perfil verificado CRECI'],
      cta: 'Começar grátis', variant: 'outline' as const,
    },
    {
      name: 'Pro', price: 'R$ 89', period: '/mês',
      desc: 'Para corretores ativos, que vivem de volume e velocidade.',
      items: ['Captações ilimitadas', 'Localizador inteligente', 'Disparos integrados', 'Métricas avançadas'],
      cta: 'Assinar Pro', variant: 'primary' as const,
    },
    {
      name: 'Business', price: 'R$ 249', period: '/mês', featured: true,
      desc: 'Para imobiliárias que querem performance, gestão e crescimento.',
      items: ['Tudo do Pro', 'Painel multi-corretor', 'Distribuição de leads', 'Portal customizado', 'Suporte prioritário'],
      cta: 'Assinar Business', variant: 'cyan' as const,
    },
    {
      name: 'Enterprise', price: 'Sob', period: 'medida',
      desc: 'Para construtoras e redes com necessidades específicas e SLA dedicado.',
      items: ['Tudo do Business', 'Integrações sob medida', 'SLA dedicado', 'Onboarding white-glove'],
      cta: 'Falar com vendas', variant: 'outline' as const,
    },
  ];

  return (
    <section id="pricing" className="py-32 bg-background">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8">
        <div ref={head.ref} className={`flex justify-between items-end gap-10 flex-wrap mb-14 lv3-reveal ${head.inView ? 'is-visible' : ''}`}>
          <div>
            <Eyebrow>Planos</Eyebrow>
            <h2 className="mt-5 font-outfit font-bold text-[clamp(34px,4.5vw,56px)] leading-[1.05] tracking-[-0.02em] text-secondary">
              Pague pelo<br />seu <em className="lv3-serif italic font-normal text-primary-600">tamanho.</em>
            </h2>
          </div>
          <p className="max-w-[420px] text-[16px] text-secondary/60 leading-relaxed">
            Comece grátis, evolua conforme cresce. Sem fidelidade, sem comissão sobre vendas. Cancela a qualquer hora.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-7 rounded-3xl flex flex-col ${
                plan.featured
                  ? 'bg-secondary text-background-soft border border-primary/30'
                  : 'bg-background-soft border border-secondary/10 text-secondary'
              }`}
              style={plan.featured ? { boxShadow: '0 30px 60px -20px rgba(17,202,230,.3)' } : {}}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-7 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider lv3-mono"
                  style={{ background: 'linear-gradient(180deg, #11CAE6, #0A8FA6)', color: '#011C26' }}
                >
                  MAIS ESCOLHIDO
                </div>
              )}
              <div className="text-xs font-bold tracking-wider lv3-mono uppercase opacity-60">{plan.name}</div>
              <div className="mt-3 font-outfit font-bold text-4xl leading-none">
                {plan.price}<small className="text-base font-semibold opacity-60 ml-1">{plan.period}</small>
              </div>
              <p className={`mt-4 text-[13px] leading-relaxed ${plan.featured ? 'text-background-soft/60' : 'text-secondary/65'}`}>{plan.desc}</p>
              <ul className="mt-6 space-y-2.5 flex-1">
                {plan.items.map((it) => (
                  <li key={it} className="flex items-center gap-2.5 text-[13px]">
                    <span className={`w-5 h-5 rounded-full grid place-items-center flex-shrink-0 ${plan.featured ? 'bg-primary text-secondary' : 'bg-primary/15 text-primary-700'}`}>
                      <Check />
                    </span>
                    {it}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { window.location.href = '/auth/account-type'; }}
                className={`mt-7 w-full py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 ${
                  plan.variant === 'cyan'
                    ? 'text-secondary'
                    : plan.variant === 'primary'
                      ? 'bg-secondary text-background-soft'
                      : plan.featured
                        ? 'border border-background-soft/20 text-background-soft hover:bg-background-soft/10'
                        : 'border border-secondary text-secondary hover:bg-secondary hover:text-background-soft'
                }`}
                style={plan.variant === 'cyan' ? { background: 'linear-gradient(180deg, #11CAE6, #0A8FA6)' } : {}}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
