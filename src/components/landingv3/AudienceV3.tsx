import { useReveal } from './useReveal';
import { Eyebrow } from './ManifestoV3';

export function AudienceV3() {
  const head = useReveal();

  return (
    <section id="audience" className="relative py-32 bg-background">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8">
        <div
          ref={head.ref}
          className={`flex justify-between items-end gap-10 flex-wrap mb-16 lv3-reveal ${
            head.inView ? 'is-visible' : ''
          }`}
        >
          <div>
            <Eyebrow>Para quem</Eyebrow>
            <h2 className="mt-5 font-outfit font-bold text-[clamp(34px,4.5vw,56px)] leading-[1.05] tracking-[-0.02em] text-secondary">
              Construído por quem
              <br />
              <em className="lv3-serif italic font-normal text-primary-600">vive de captação.</em>
            </h2>
          </div>
          <p className="max-w-[420px] text-[16px] text-secondary/60 leading-relaxed">
            Cada papel no mercado tem uma jornada própria. Captalo se molda às duas pontas — sem te empurrar pra ferramenta errada.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
          <AudienceBlock
            tag="// CORRETOR"
            heading={<>Para quem caça <em className="lv3-serif italic font-normal">oportunidade</em></>}
            description="Você tem cliente. Falta só o imóvel certo, na hora certa, com o captador certo. A gente conecta os três."
            portrait="/assets/landingv3/agente-recepcao.png"
            decoColor="rgba(17,202,230,.18)"
            items={[
              'Acesso à base completa de imóveis da cidade — atualizada por captadores reais.',
              'Chat direto, sem intermediário, com quem captou cada imóvel.',
              'Comissão acordada e registrada antes de qualquer visita.',
            ]}
          />
          <AudienceBlock
            tag="// IMOBILIÁRIA & CONSTRUTORA"
            heading={<>Para quem precisa de <em className="lv3-serif italic font-normal">volume</em></>}
            description="Você tem carteira e equipe. Falta alcance e gestão. Coloca a operação inteira pra rodar em um só painel."
            portrait="/assets/landingv3/agente-mesa.png"
            decoColor="rgba(129,233,245,.18)"
            altPortrait
            items={[
              'Multiplique o alcance da sua carteira via rede de corretores parceiros.',
              'Painel multi-corretor com performance, leads e comissões em tempo real.',
              'Distribuição automática de leads e portal personalizado da imobiliária.',
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function AudienceBlock(props: {
  tag: string;
  heading: React.ReactNode;
  description: string;
  portrait: string;
  altPortrait?: boolean;
  decoColor: string;
  items: string[];
}) {
  const { ref, inView } = useReveal();
  return (
    <div
      ref={ref}
      className={`relative rounded-3xl border border-secondary/10 bg-background-soft p-9 md:p-11 grid grid-cols-1 md:grid-cols-[1fr_180px] gap-7 overflow-hidden lv3-reveal ${
        inView ? 'is-visible' : ''
      }`}
    >
      {/* deco glow */}
      <div
        className="absolute -top-12 -right-12 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(closest-side, ${props.decoColor}, transparent)`,
        }}
      />

      {/* Portrait */}
      <div
        className="md:col-start-2 md:row-span-full relative w-full md:w-[180px] aspect-[3/4] rounded-2xl overflow-hidden self-start"
        style={{
          background: props.altPortrait
            ? 'linear-gradient(160deg, #E1F6FC 0%, #C3EDF9 100%)'
            : 'linear-gradient(160deg, #81E9F5 0%, #E1F6FC 100%)',
          boxShadow: '0 20px 40px -16px rgba(1,28,38,.25)',
        }}
      >
        <img
          src={props.portrait}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-[center_top]"
        />
      </div>

      <div className="md:col-start-1 md:row-start-1 self-start">
        <span className="text-[10px] font-semibold tracking-[0.2em] text-primary-700 lv3-mono">
          {props.tag}
        </span>
      </div>

      <h3 className="md:col-start-1 md:row-start-2 font-outfit font-bold text-[clamp(24px,3vw,36px)] leading-[1.1] tracking-[-0.02em] text-secondary">
        {props.heading}
      </h3>

      <p className="md:col-start-1 md:row-start-3 text-[15px] text-secondary/65 leading-relaxed max-w-[440px]">
        {props.description}
      </p>

      <div className="md:col-start-1 md:row-start-4 mt-2 space-y-3">
        {props.items.map((item, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="flex-shrink-0 text-[11px] font-bold text-primary-700 lv3-mono pt-0.5">
              {String(i + 1).padStart(2, '0')}
            </div>
            <div className="text-sm text-secondary/75 leading-relaxed">{item}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
