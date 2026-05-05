import { useState } from 'react';
import { useReveal } from './useReveal';
import { Eyebrow } from './ManifestoV3';

export function CtaFinalV3() {
  const { ref, inView } = useReveal();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => { window.location.href = '/auth/account-type'; }, 800);
  };

  return (
    <section className="relative py-32 bg-secondary overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(800px 500px at 80% 30%, rgba(17,202,230,.18), transparent 60%), radial-gradient(600px 400px at 20% 80%, rgba(129,233,245,.10), transparent 60%)',
        }}
      />
      <div
        ref={ref}
        className={`relative max-w-[1280px] mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-16 items-center lv3-reveal ${
          inView ? 'is-visible' : ''
        }`}
      >
        <div>
          <Eyebrow>Bora?</Eyebrow>
          <h2 className="mt-5 font-outfit font-bold text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-[-0.025em] text-background-soft">
            Entra na rede que <em className="lv3-serif italic font-normal text-primary">move</em> Rio Preto.
          </h2>
          <p className="mt-6 text-lg text-background-soft/70 leading-relaxed max-w-[520px]">
            Cadastro grátis em 2 minutos. Sem cartão, sem fidelidade. A primeira conexão é por nossa conta.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-9 flex gap-2 p-1.5 max-w-[520px] rounded-2xl border border-background-soft/15 bg-background-soft/5 backdrop-blur-xl"
          >
            <input
              type="email"
              required
              placeholder="seu@email.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-0 px-4 text-background-soft placeholder:text-background-soft/40 text-[15px]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-secondary"
              style={{ background: 'linear-gradient(180deg, #11CAE6, #0A8FA6)' }}
            >
              {sent ? 'Cadastro enviado ✓' : 'Entrar na rede'}
              {!sent && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </form>
          <div className="mt-5 text-[13px] text-background-soft/50">
            Já tem conta?{' '}
            <button onClick={() => { window.location.href = '/auth/login'; }} className="text-accent hover:text-primary transition-colors">
              Fazer login →
            </button>
            &nbsp;·&nbsp; Disponível em SJRP — em breve no interior.
          </div>
        </div>

        <div
          className="relative w-full aspect-square rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(17,202,230,.15), rgba(129,233,245,.05))',
            boxShadow: '0 30px 60px -20px rgba(0,0,0,.5)',
          }}
        >
          <img
            src="/assets/landingv3/aperto-de-mao.png"
            alt="Negócio fechado via Captalo"
            className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(80% 60% at 50% 100%, rgba(17,202,230,.25), transparent 60%)' }}
          />
        </div>
      </div>
    </section>
  );
}
