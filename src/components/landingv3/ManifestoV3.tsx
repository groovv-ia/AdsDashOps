import { useReveal } from './useReveal';

export function ManifestoV3() {
  const { ref, inView } = useReveal();

  return (
    <section id="manifesto" className="relative py-32 bg-background-soft">
      <div
        ref={ref}
        className={`max-w-[1280px] mx-auto px-5 sm:px-8 lv3-reveal ${inView ? 'is-visible' : ''}`}
      >
        <Eyebrow>A nossa convicção</Eyebrow>

        <h2 className="mt-6 font-outfit font-bold text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-[-0.025em] text-secondary max-w-[1100px]">
          O mercado imobiliário de Rio Preto cresce{' '}
          <span className="lv3-strike">isolado</span>{' '}
          <em className="lv3-serif italic font-normal text-primary-600">conectado</em>
          {' '}— quando corretores se ajudam, todo mundo fecha mais.
        </h2>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 border-t border-secondary/10 pt-10">
          <Item
            num="2024"
            text="Fundada por dois corretores e um engenheiro de software inconformados com planilhas no WhatsApp."
          />
          <Item
            num="100%"
            text="Foco regional. Conhecemos cada bairro, cada construtora, cada CRECI da cidade."
          />
          <Item
            num="0%"
            text="De comissão sobre suas vendas. Cobramos só assinatura. O negócio fica todo seu."
          />
        </div>
      </div>
    </section>
  );
}

function Item({ num, text }: { num: string; text: string }) {
  return (
    <div>
      <h4 className="font-outfit font-bold text-4xl text-primary-600 leading-none">{num}</h4>
      <p className="mt-3 text-[15px] text-secondary/65 leading-relaxed max-w-[300px]">{text}</p>
    </div>
  );
}

export function Eyebrow({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-700 lv3-mono ${center ? 'justify-center' : ''}`}
    >
      <span className="w-6 h-px bg-primary-700" />
      {children}
    </span>
  );
}
