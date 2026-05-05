import { useReveal } from './useReveal';
import { Eyebrow } from './ManifestoV3';

export function HowItWorksV3() {
  const head = useReveal();
  const steps = [
    { num: '01', title: 'Cadastre & conecte', desc: 'Crie seu perfil em 2 minutos, valide o CRECI e tenha acesso à rede inteira de Rio Preto.', tag: '// 2 minutos' },
    { num: '02', title: 'Match & converse', desc: 'Encontre captações alinhadas ao perfil do seu cliente e negocie comissão direto com o captador.', tag: '// match em segundos' },
    { num: '03', title: 'Feche & receba', desc: 'Contrato digital, gestão de comissão e relatório completo do negócio. Tudo registrado, tudo rastreável.', tag: '// pagto. em 48h' },
  ];

  return (
    <section id="how" className="py-32 bg-background">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8">
        <div
          ref={head.ref}
          className={`mb-16 lv3-reveal ${head.inView ? 'is-visible' : ''}`}
        >
          <Eyebrow>Como funciona</Eyebrow>
          <h2 className="mt-5 font-outfit font-bold text-[clamp(34px,4.5vw,56px)] leading-[1.05] tracking-[-0.02em] text-secondary">
            Três passos.
            <br />
            Zero <em className="lv3-serif italic font-normal text-primary-600">fricção.</em>
          </h2>
          <p className="mt-6 max-w-[560px] text-[16px] text-secondary/60 leading-relaxed">
            Da primeira conexão ao primeiro fechamento, tudo dentro da plataforma — com governança, contrato digital e histórico completo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {steps.map((s, i) => (
            <Step key={s.num} step={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Step({ step: s, index: i }: { step: { num: string; title: string; desc: string; tag: string }; index: number }) {
  const r = useReveal();
  return (
    <div
      ref={r.ref}
      className={`relative p-9 rounded-3xl bg-background-soft border border-secondary/10 lv3-reveal ${r.inView ? 'is-visible' : ''}`}
      style={{ transitionDelay: `${i * 100}ms` }}
    >
                <div
                  className="w-14 h-14 rounded-full grid place-items-center font-outfit font-bold text-lg text-secondary"
                  style={{
                    background: 'linear-gradient(135deg, #11CAE6, #81E9F5)',
                    boxShadow: '0 12px 28px -10px rgba(17,202,230,.5)',
                  }}
                >
                  {s.num}
                </div>
                <h4 className="mt-6 font-outfit font-bold text-[22px] text-secondary leading-tight">
                  {s.title}
                </h4>
                <p className="mt-3 text-[14px] text-secondary/65 leading-relaxed">{s.desc}</p>
      <span className="block mt-6 text-[10px] tracking-wider text-primary-700 lv3-mono">{s.tag}</span>
    </div>
  );
}
