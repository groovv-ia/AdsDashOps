export function MarqueeV3() {
  const bairros = [
    'Vila Imperial', 'Damha', 'Jardim Tarraf II', 'Higienópolis', 'Centro',
    'Vila Redentora', 'Bosque da Saúde', 'Quinta do Lago',
  ];
  // dobrado para loop infinito
  const items = [...bairros, ...bairros, ...bairros, ...bairros];

  return (
    <section
      className="relative py-7 overflow-hidden border-y border-secondary/10 bg-background-soft"
      aria-hidden="true"
    >
      <div className="lv3-marquee-track">
        {items.map((b, i) => (
          <span
            key={i}
            className="px-9 text-2xl lv3-serif italic text-secondary/30 whitespace-nowrap flex items-center gap-9"
          >
            {b}
            <span className="text-primary text-sm not-italic">◆</span>
          </span>
        ))}
      </div>
    </section>
  );
}
