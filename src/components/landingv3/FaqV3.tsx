import { useReveal } from './useReveal';
import { Eyebrow } from './ManifestoV3';

export function FaqV3() {
  const head = useReveal();
  const list = useReveal();

  const items = [
    { q: 'Como o Captalo é diferente de um portal de imóveis?', a: 'Portais conectam imóveis a clientes finais. Captalo conecta corretores entre si — captação, parceria e fechamento acontecem dentro do mesmo ecossistema, com governança, contrato digital e histórico compartilhado.' },
    { q: 'Posso usar grátis para sempre?', a: 'Sim. O plano Starter é gratuito para sempre — inclui 5 captações ativas, chat com captadores e perfil verificado CRECI. Sem cartão, sem prazo de validade.' },
    { q: 'O Captalo cobra comissão sobre as minhas vendas?', a: 'Não. Cobramos apenas a assinatura mensal do plano escolhido. 100% da comissão fica com você e o corretor parceiro — sem qualquer intermediação financeira da nossa parte.' },
    { q: 'Como funciona a verificação de CRECI?', a: 'Cada corretor envia documento e nós validamos diretamente na base do CRECI-SP em até 24h. O selo "Verificado" só aparece após aprovação. Toda conexão na plataforma é entre profissionais reais.' },
    { q: 'Posso integrar com meu CRM atual?', a: 'A partir do plano Business oferecemos integrações com os principais CRMs do mercado imobiliário brasileiro. No Enterprise, fazemos integrações sob medida via API REST.' },
    { q: 'Está disponível fora de São José do Rio Preto?', a: 'Começamos em SJRP porque conhecemos o mercado regional a fundo — e isso faz diferença real. Estamos expandindo gradualmente para o interior paulista. Entre na lista de espera para ser avisado.' },
  ];

  return (
    <section id="faq" className="py-32 bg-background-soft">
      <div className="max-w-[860px] mx-auto px-5 sm:px-8">
        <div ref={head.ref} className={`text-center mb-14 lv3-reveal ${head.inView ? 'is-visible' : ''}`}>
          <Eyebrow center>Dúvidas frequentes</Eyebrow>
          <h2 className="mt-5 font-outfit font-bold text-[clamp(34px,4.5vw,56px)] leading-[1.05] tracking-[-0.02em] text-secondary">
            Tudo o que você quer<br /><em className="lv3-serif italic font-normal text-primary-600">saber.</em>
          </h2>
        </div>

        <div ref={list.ref} className={`space-y-3 lv3-reveal ${list.inView ? 'is-visible' : ''}`}>
          {items.map((it, i) => (
            <details
              key={i}
              className="lv3-qa group rounded-2xl border border-secondary/10 bg-background overflow-hidden"
              open={i === 0}
            >
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer text-secondary font-outfit font-semibold text-[16px] list-none">
                {it.q}
                <span className="lv3-qa-icon flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 grid place-items-center text-primary-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
              </summary>
              <div className="px-6 pb-5 text-[14px] text-secondary/65 leading-relaxed">{it.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
