import { motion } from 'motion/react';

export function HeroV3() {
  return (
    <header className="relative pt-[140px] pb-20 overflow-hidden bg-background-soft">
      {/* Glow background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(900px 500px at 85% 0%, rgba(17,202,230,.14), transparent 60%), radial-gradient(700px 600px at 0% 100%, rgba(129,233,245,.18), transparent 60%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(1,28,38,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(1,28,38,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-16 items-center">
        {/* ===== Copy ===== */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-secondary lv3-mono"
          >
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-secondary text-[10px] font-bold">
              RP
            </span>
            <span>
              <b>Captalo · 0.1</b> · feita em São José do Rio Preto
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-outfit font-bold mt-7 text-[clamp(48px,7vw,92px)] leading-[0.95] tracking-[-0.03em] text-secondary"
          >
            Toda boa
            <br />
            captação
            <br />
            <em className="lv3-serif italic font-normal text-primary-600">conversa</em>
            <span className="lv3-stroke">.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-7 text-lg text-secondary/65 leading-relaxed max-w-[480px]"
          >
            A primeira rede colaborativa de imóveis de Rio Preto. Capte, conecte e feche — com a confiança de uma rede real de corretores.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-3"
          >
            <button
              onClick={() => { window.location.href = '/auth/account-type'; }}
              className="group inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-[15px] font-bold text-secondary transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(180deg, #11CAE6, #0A8FA6)',
                boxShadow:
                  '0 1px 0 rgba(255,255,255,.6) inset, 0 8px 20px -8px rgba(17,202,230,.6)',
              }}
            >
              Entrar na rede
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="group-hover:translate-x-0.5 transition-transform"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
            <button className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-semibold text-secondary hover:bg-secondary/5 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Ver demo · 90s
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12 flex items-center gap-6 flex-wrap"
          >
            <Stat value="+1.200" label="Corretores ativos" />
            <Divider />
            <Stat value="R$ 84M" label="Em captações" />
            <Divider />
            <Stat value="48h" label="Tempo médio · match → visita" />
          </motion.div>
        </div>

        {/* ===== Visual / hero photo composition ===== */}
        <div className="relative h-[560px] hidden lg:block">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="absolute inset-0 rounded-[28px] overflow-hidden shadow-[0_30px_80px_-20px_rgba(1,28,38,0.3)]"
            style={{
              background:
                'linear-gradient(160deg, rgba(17,202,230,.18) 0%, rgba(242,250,253,1) 60%)',
            }}
          >
            <img
              src="/assets/landingv3/hero-couple-house.png"
              alt="Corretores Captalo apresentando imóvel"
              className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(70% 60% at 50% 100%, rgba(17,202,230,.18), transparent 60%)',
              }}
            />
          </motion.div>

          {/* Float card 1 — chat */}
          <motion.div
            initial={{ opacity: 0, x: -16, y: -16 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="absolute top-8 -left-6 w-[280px] bg-white rounded-2xl p-4 shadow-[0_20px_40px_-12px_rgba(1,28,38,0.25)] border border-secondary/5"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="w-8 h-8 rounded-full grid place-items-center text-xs font-bold"
                style={{
                  background: 'linear-gradient(135deg, #0A8FA6, #11CAE6)',
                  color: '#F2FAFD',
                }}
              >
                M
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-secondary">
                  Marina · Vila Imperial
                </div>
                <div className="text-[11px] text-secondary/50 flex items-center gap-1.5 lv3-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary lv3-pulse" />
                  digitando…
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="ml-auto max-w-[80%] px-3 py-2 rounded-2xl rounded-br-md bg-secondary text-background-soft text-xs font-medium">
                tenho cliente p/ 3 dorm
              </div>
              <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-background-light text-secondary text-xs font-medium">
                tenho 2 unidades · 100% match
              </div>
            </div>
          </motion.div>

          {/* Float card 2 — captações ativas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="absolute bottom-10 -right-4 w-[220px] bg-white rounded-2xl p-4 shadow-[0_20px_40px_-12px_rgba(1,28,38,0.25)] border border-secondary/5"
          >
            <div className="text-[10px] font-semibold tracking-wider text-secondary/50 uppercase lv3-mono">
              Captações ativas
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-outfit font-bold text-3xl text-secondary">182</span>
              <span className="text-xs font-bold text-success">↑ 24%</span>
            </div>
            <svg className="w-full h-8 mt-2" viewBox="0 0 200 30" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lv3-spark" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#11CAE6" stopOpacity=".6" />
                  <stop offset="100%" stopColor="#11CAE6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,24 C20,20 30,12 50,14 C70,16 80,4 100,6 C120,8 130,2 150,4 C170,6 185,2 200,1 L200,30 L0,30 Z"
                fill="url(#lv3-spark)"
              />
              <path
                d="M0,24 C20,20 30,12 50,14 C70,16 80,4 100,6 C120,8 130,2 150,4 C170,6 185,2 200,1"
                fill="none"
                stroke="#11CAE6"
                strokeWidth="1.8"
              />
            </svg>
          </motion.div>

          {/* Badge: Match em 48h */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 1.1 }}
            className="absolute top-1/2 -right-2 px-3 py-2.5 bg-secondary text-background-soft rounded-xl shadow-xl flex items-center gap-2.5"
          >
            <div className="w-2 h-2 rounded-full bg-primary lv3-pulse" />
            <div>
              <div className="text-xs font-bold leading-none mb-0.5">Match em 48h</div>
              <div className="text-[10px] text-background-soft/60 lv3-mono">
                Vila Imperial · agora
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-outfit font-bold text-2xl text-secondary leading-none">{value}</div>
      <div className="mt-1.5 text-xs text-secondary/55 lv3-mono">{label}</div>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-8 bg-secondary/15" />;
}
