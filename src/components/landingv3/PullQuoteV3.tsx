import { useReveal } from './useReveal';
import { Eyebrow } from './ManifestoV3';

export function PullQuoteV3() {
  const a = useReveal();
  const b = useReveal();

  return (
    <section className="py-32 bg-background-soft border-y border-secondary/10">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-16 items-start">
        <div ref={a.ref} className={`lv3-reveal ${a.inView ? 'is-visible' : ''}`}>
          <Eyebrow>História real</Eyebrow>
          <blockquote className="mt-7 font-outfit font-bold text-[clamp(28px,3.5vw,44px)] leading-[1.15] tracking-[-0.015em] text-secondary">
            "Em 30 dias, fechei{' '}
            <span className="text-primary-700">3 negócios</span>{' '}
            via Captalo. O que mudou foi a velocidade — captação virou colaborativa{' '}
            <em className="lv3-serif italic font-normal text-primary-600">de verdade</em>."
          </blockquote>
          <div className="mt-9 flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full grid place-items-center font-outfit font-bold text-base"
              style={{
                background: 'radial-gradient(at 32% 28%, #FFFFFF 0%, rgba(255,255,255,0) 32%), linear-gradient(135deg,#0A8FA6,#11CAE6)',
                color: '#F2FAFD',
              }}
            >
              JM
            </div>
            <div>
              <b className="block font-outfit text-secondary">Júlio Matos</b>
              <span className="text-[13px] text-secondary/55">Corretor autônomo · 7 anos de mercado</span>
            </div>
          </div>
        </div>

        <div
          ref={b.ref}
          className={`grid grid-cols-2 gap-8 lv3-reveal ${b.inView ? 'is-visible' : ''}`}
        >
          {[
            { v: '3.2', s: 'x', l: 'Velocidade média p/ encontrar imóvel compatível com perfil do cliente.' },
            { v: '+38', s: '%', l: 'Aumento médio de comissão em 90 dias para usuários do plano Pro.' },
            { v: '94', s: '%', l: 'Dos negócios iniciados via chat são finalizados na plataforma.' },
            { v: '4.9', s: '/5', l: 'Avaliação média de corretores e imobiliárias após 6 meses de uso.' },
          ].map((stat) => (
            <div key={stat.l}>
              <div className="font-outfit font-bold text-3xl text-secondary leading-none">
                {stat.v}
                <small className="text-base text-primary-600 font-bold ml-0.5">{stat.s}</small>
              </div>
              <div className="mt-3 text-[12px] text-secondary/55 leading-relaxed max-w-[200px]">
                {stat.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
