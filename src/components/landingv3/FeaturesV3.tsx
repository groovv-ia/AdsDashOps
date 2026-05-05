import { useReveal } from './useReveal';
import { Eyebrow } from './ManifestoV3';

export function FeaturesV3() {
  const head = useReveal();

  return (
    <section id="features" className="relative py-32 bg-background-soft">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8">
        <div
          ref={head.ref}
          className={`mb-20 lv3-reveal ${head.inView ? 'is-visible' : ''}`}
        >
          <Eyebrow>Recursos · 04</Eyebrow>
          <h2 className="mt-5 font-outfit font-bold text-[clamp(34px,4.5vw,56px)] leading-[1.05] tracking-[-0.02em] text-secondary max-w-[820px]">
            Tudo que você usa
            <br />
            em planilhas, agora <em className="lv3-serif italic font-normal text-primary-600">conversando</em>.
          </h2>
        </div>

        <div className="space-y-32">
          <FeatRow
            num="01 — LOCALIZAÇÃO INTELIGENTE"
            title={<>O imóvel certo,<br /><em className="lv3-serif italic font-normal">no minuto certo.</em></>}
            body="Nossa IA cruza perfil de cliente, histórico de visitas e tendência do mercado. Em vez de listas infinitas, você recebe os 5 imóveis com maior chance real de fechar."
            link="Ver localizador"
            visual={<RadarVis />}
            visualDark
          />
          <FeatRow
            flip
            num="02 — CHAT COLABORATIVO"
            title={<>Negocie como<br /><em className="lv3-serif italic font-normal">profissional</em>.</>}
            body='Permutas, comissões, parcerias e contratos — tudo na mesma conversa, com histórico, anexo e validação. Acabou o "vou te mandar no WhatsApp depois".'
            link="Ver chat"
            visual={<ChatVis />}
          />
          <FeatRow
            num="03 — MÉTRICAS QUE IMPORTAM"
            title={<>Pare de adivinhar.<br /><em className="lv3-serif italic font-normal">Decida com dado.</em></>}
            body="Captações, propostas, conversões e comissão projetada — tudo no mesmo painel, atualizado em tempo real. Saiba exatamente onde focar a próxima hora do seu dia."
            link="Ver dashboards"
            visual={<ChartVis />}
          />
          <FeatRow
            flip
            num="04 — CONFIANÇA VERIFICADA"
            title={<>CRECI ativo,<br /><em className="lv3-serif italic font-normal">parceria real.</em></>}
            body="Cada perfil é validado direto na junta do CRECI-SP. Você sabe exatamente com quem está falando — histórico, avaliações de pares e número de negócios fechados."
            link="Ver verificação"
            visual={<ProfileVis />}
          />
        </div>
      </div>
    </section>
  );
}

function FeatRow(props: {
  num: string;
  title: React.ReactNode;
  body: string;
  link: string;
  visual: React.ReactNode;
  flip?: boolean;
  visualDark?: boolean;
}) {
  const { ref, inView } = useReveal();
  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center lv3-reveal ${inView ? 'is-visible' : ''}`}
    >
      <div className={props.flip ? 'lg:order-2' : ''}>
        <div className="text-[11px] font-bold tracking-[0.2em] text-primary-700 lv3-mono">
          {props.num}
        </div>
        <h3 className="mt-4 font-outfit font-bold text-[clamp(28px,3.5vw,44px)] leading-[1.05] tracking-[-0.02em] text-secondary">
          {props.title}
        </h3>
        <p className="mt-5 text-[16px] text-secondary/65 leading-relaxed max-w-[460px]">
          {props.body}
        </p>
        <a
          href="#"
          className="inline-flex items-center gap-2 mt-7 text-sm font-semibold text-primary-700 hover:text-primary-600 transition-colors"
        >
          {props.link}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <div
        className={`relative aspect-[5/4] rounded-3xl overflow-hidden ${
          props.visualDark ? 'bg-secondary' : 'bg-white border border-secondary/10'
        } ${props.flip ? 'lg:order-1' : ''}`}
        style={{
          boxShadow: '0 30px 60px -20px rgba(1,28,38,.2)',
        }}
      >
        {props.visual}
      </div>
    </div>
  );
}

/* ---------- visualizations ---------- */

function RadarVis() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="absolute inset-12 rounded-full border border-primary/20 lv3-spin-slow" />
      <div className="absolute inset-20 rounded-full border border-primary/30 lv3-spin-slower" />
      <div className="absolute inset-28 rounded-full border border-primary/40 lv3-spin-slow" />
      <div className="w-16 h-16 rounded-full bg-primary shadow-[0_0_60px_rgba(17,202,230,0.6)] grid place-items-center text-secondary font-outfit font-bold text-xl">
        C
      </div>
      {[
        { x: '30%', y: '25%' }, { x: '70%', y: '20%' }, { x: '78%', y: '60%' },
        { x: '22%', y: '70%' }, { x: '50%', y: '85%' },
      ].map((p, i) => (
        <div
          key={i}
          className="absolute w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_rgba(17,202,230,0.8)]"
          style={{ left: p.x, top: p.y }}
        />
      ))}
      <div
        className="absolute top-[18%] right-[10%] px-3 py-2 bg-white text-secondary text-[11px] font-semibold rounded-lg shadow-lg"
      >
        Solare · 3 dorm
        <small className="block text-[10px] text-secondary/50 font-normal lv3-mono">
          R$ 685.000 · 102m²
        </small>
      </div>
      <div
        className="absolute bottom-[14%] left-[8%] px-3 py-2 bg-white text-secondary text-[11px] font-semibold rounded-lg shadow-lg"
      >
        Mont Blanc · 3 dorm
        <small className="block text-[10px] text-secondary/50 font-normal lv3-mono">
          R$ 640.000 · 98m²
        </small>
      </div>
    </div>
  );
}

function ChatVis() {
  return (
    <div className="absolute inset-0 p-7 flex flex-col gap-2 bg-background-soft">
      <div className="flex items-center gap-3 pb-3 border-b border-secondary/10">
        <div className="w-9 h-9 rounded-full grid place-items-center text-xs font-bold text-background-soft" style={{ background: 'linear-gradient(135deg, #0A8FA6, #11CAE6)' }}>
          RC
        </div>
        <div>
          <b className="block text-sm text-secondary">Rafael Costa</b>
          <span className="text-[11px] text-secondary/50 lv3-mono">capta · imob. norte</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-2 pt-2">
        <Bubble side="them">tenho 2 unidades no Solare · vc tem cliente?</Bubble>
        <Bubble side="me">tenho! 3 dorm, até 700k</Bubble>
        <Bubble side="them">match perfeito ✦ comissão 50/50?</Bubble>
        <Bubble side="cyan">fechado. agenda visita amanhã 16h?</Bubble>
        <Bubble side="them">
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary/40 lv3-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-secondary/40 lv3-pulse" style={{ animationDelay: '0.2s' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-secondary/40 lv3-pulse" style={{ animationDelay: '0.4s' }} />
          </span>
        </Bubble>
      </div>
    </div>
  );
}

function Bubble({ side, children }: { side: 'me' | 'them' | 'cyan'; children: React.ReactNode }) {
  const base = 'max-w-[75%] px-3.5 py-2 rounded-2xl text-xs font-medium';
  if (side === 'me') return <div className={`${base} ml-auto rounded-br-md bg-secondary text-background-soft`}>{children}</div>;
  if (side === 'cyan') return <div className={`${base} ml-auto rounded-br-md bg-primary text-secondary font-semibold`}>{children}</div>;
  return <div className={`${base} rounded-bl-md bg-white border border-secondary/10 text-secondary`}>{children}</div>;
}

function ChartVis() {
  const bars = [30, 48, 38, 64, 55, 72, 60, 92];
  return (
    <div className="absolute inset-0 p-7 flex flex-col gap-4 bg-white">
      <div className="flex items-center justify-between">
        <b className="text-sm text-secondary">Captações fechadas · 30d</b>
        <span className="text-xs font-bold text-success">↑ 32%</span>
      </div>
      <div>
        <span className="font-outfit font-bold text-3xl text-secondary">R$ 184k</span>
        <small className="ml-2 text-xs text-secondary/55 lv3-mono">comissão projetada</small>
      </div>
      <div className="flex-1 flex items-end gap-2">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md"
            style={{
              height: `${h}%`,
              background: i === bars.length - 1
                ? 'linear-gradient(180deg, #11CAE6, #0A8FA6)'
                : 'linear-gradient(180deg, #C3EDF9, #81E9F5)',
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-secondary/45 lv3-mono">
        <span>seg 03</span><span>seg 17</span><span>seg 31</span>
      </div>
    </div>
  );
}

function ProfileVis() {
  return (
    <div className="absolute inset-0 p-7 flex flex-col items-center justify-center text-center bg-background-soft">
      <div
        className="relative w-28 h-28 rounded-full grid place-items-center text-4xl font-outfit font-bold"
        style={{
          background: 'radial-gradient(at 32% 28%, #FFFFFF 0%, rgba(255,255,255,0) 32%), linear-gradient(135deg,#0A8FA6,#11CAE6)',
          color: '#F2FAFD',
          boxShadow: '0 30px 60px -20px rgba(17,202,230,.5), inset 18px 22px 44px rgba(255,255,255,.4), inset -28px -36px 60px rgba(1,28,38,.3)',
        }}
      >
        RC
        <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary grid place-items-center border-4 border-background-soft">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#011C26" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
      <h5 className="mt-5 font-outfit font-bold text-xl text-secondary">Rafael Costa</h5>
      <div className="text-xs text-secondary/55 lv3-mono mt-1">Lançamentos · Alto padrão</div>
      <div className="flex gap-2 mt-4 flex-wrap justify-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary-700 text-[11px] font-bold">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          CRECI 12.847
        </span>
        <span className="px-2.5 py-1 rounded-full bg-secondary/8 text-secondary/70 text-[11px] font-semibold">
          ★ 4.9 · 312 reviews
        </span>
      </div>
      <div className="grid grid-cols-3 gap-5 mt-6 pt-5 border-t border-secondary/10 w-full">
        {[['312', 'fechamentos'], ['8 anos', 'mercado'], ['48h', 'resposta']].map(([v, l]) => (
          <div key={l}>
            <div className="font-outfit font-bold text-sm text-secondary">{v}</div>
            <div className="text-[10px] text-secondary/50 lv3-mono mt-0.5">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
