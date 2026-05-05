import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export function NavbarV3() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: 'Manifesto', href: '#manifesto' },
    { label: 'Recursos', href: '#features' },
    { label: 'Como funciona', href: '#how' },
    { label: 'Planos', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background-soft/85 backdrop-blur-xl shadow-[0_1px_0_rgba(1,28,38,0.06)] py-3'
          : 'bg-transparent py-[18px]'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 flex items-center gap-4">
        <a href="/landing-v3" className="flex items-center gap-2.5">
          <img
            src="/assets/landingv3/captalo-logo-dark.png"
            alt="Captalo"
            className="h-7 w-auto"
          />
        </a>

        <nav className="hidden md:flex items-center gap-1 ml-auto text-sm text-secondary">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-3.5 py-2 rounded-lg font-medium hover:bg-secondary/5 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2.5 md:ml-2">
          <button
            onClick={() => { window.location.href = '/auth/login'; }}
            className="px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-secondary/5 rounded-lg transition-colors"
          >
            Entrar
          </button>
          <button
            onClick={() => { window.location.href = '/auth/account-type'; }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-secondary rounded-lg transition-all hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(180deg, #11CAE6, #0A8FA6)',
              boxShadow:
                '0 1px 0 rgba(255,255,255,.6) inset, 0 8px 20px -8px rgba(17,202,230,.6)',
            }}
          >
            Começar
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden ml-auto p-2 text-secondary"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        } bg-background-soft border-t border-secondary/10`}
      >
        <div className="px-5 py-4 space-y-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm font-medium text-secondary"
            >
              {l.label}
            </a>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-secondary/10">
            <button
              onClick={() => { window.location.href = '/auth/login'; }}
              className="w-full py-2.5 text-sm font-semibold text-secondary border border-secondary/15 rounded-lg"
            >
              Entrar
            </button>
            <button
              onClick={() => { window.location.href = '/auth/account-type'; }}
              className="w-full py-2.5 text-sm font-bold text-secondary rounded-lg"
              style={{ background: 'linear-gradient(180deg, #11CAE6, #0A8FA6)' }}
            >
              Começar
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
