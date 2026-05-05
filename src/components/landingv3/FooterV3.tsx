export function FooterV3() {
  return (
    <footer className="relative bg-secondary text-background-soft pt-20 pb-10 overflow-hidden">
      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 pb-16 border-b border-background-soft/10">
          <div className="col-span-2 md:col-span-1">
            <img src="/assets/landingv3/captalo-logo-light.png" alt="Captalo" className="h-7 w-auto" />
            <p className="mt-5 text-[13px] text-background-soft/55 leading-relaxed max-w-[260px]">
              A primeira rede colaborativa de imóveis de São José do Rio Preto.
            </p>
            <div className="mt-6 flex gap-2.5">
              {[
                ['Instagram', <><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></>],
                ['LinkedIn', <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></>],
                ['YouTube', <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>],
              ].map(([label, paths]) => (
                <a key={label as string} href="#" aria-label={label as string} className="w-9 h-9 rounded-full grid place-items-center bg-background-soft/8 hover:bg-primary/20 hover:text-primary transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{paths}</svg>
                </a>
              ))}
            </div>
          </div>

          <Col title="Produto" links={[['Recursos','#features'],['Como funciona','#how'],['Planos','#pricing'],['API','#']]} />
          <Col title="Empresa" links={[['Manifesto','#manifesto'],['Carreiras','#'],['Imprensa','#'],['Contato','#']]} />
          <Col title="Legal" links={[['Termos','#'],['Privacidade','#'],['LGPD','#'],['Cookies','#']]} />
        </div>

        <div className="lv3-word-foot text-center my-8 select-none">captalo.</div>

        <div className="flex justify-between items-center flex-wrap gap-4 pt-6 border-t border-background-soft/10 text-[11px] text-background-soft/40 lv3-mono tracking-wider">
          <div>© 2026 CAPTALO · Todos os direitos reservados</div>
          <div>Feito em SÃO JOSÉ DO RIO PRETO</div>
        </div>
      </div>
    </footer>
  );
}

function Col({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h6 className="text-[11px] font-bold tracking-[0.18em] text-background-soft/40 lv3-mono uppercase mb-4">{title}</h6>
      <ul className="space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <a href={href} className="text-[14px] text-background-soft/70 hover:text-primary transition-colors">{label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
