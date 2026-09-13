/**
 * Decorative fallback for the login brand panel, shown until a oficina logo
 * has been cached in this browser (see getLogoFixadaParaLogin em useOficina.ts).
 * Colors come from CSS vars so it stays in sync with the graphite/orange
 * identity without duplicating hexes.
 */
export function WorkshopIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 340"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="300" width="480" height="40" fill="var(--graphite-2)" />
      <line x1="0" y1="304" x2="480" y2="304" stroke="var(--brand-600)" strokeWidth="3" strokeDasharray="14 10" opacity="0.85" />

      {/* car body */}
      <rect x="120" y="200" width="200" height="86" rx="16" fill="var(--surface-alt)" stroke="var(--graphite-3)" strokeWidth="3" />
      <path
        d="M150 200 L215 200 L196 170 L169 170 Z"
        fill="var(--surface-alt)"
        stroke="var(--graphite-3)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="168" cy="298" r="26" fill="var(--graphite-2)" stroke="var(--surface-alt)" strokeWidth="4" />
      <circle cx="168" cy="298" r="9" fill="var(--graphite)" />
      <circle cx="272" cy="298" r="26" fill="var(--graphite-2)" stroke="var(--surface-alt)" strokeWidth="4" />
      <circle cx="272" cy="298" r="9" fill="var(--graphite)" />

      {/* lift arm */}
      <rect x="60" y="120" width="16" height="180" rx="7" fill="var(--graphite-3)" stroke="var(--surface-alt)" strokeWidth="1.5" />
      <rect x="55" y="284" width="26" height="12" rx="4" fill="var(--graphite)" />

      {/* wrench */}
      <g transform="translate(330,150) rotate(-18) scale(1.6)">
        <path
          d="M14.7 6.3a4 4 0 0 1-5.1 5.1L4 17l3 3 5.6-5.6a4 4 0 0 1 5.1-5.1L15 12l-3-3Z"
          fill="var(--brand-600)"
        />
      </g>

      {/* pending ticket clipboard */}
      <rect x="352" y="60" width="92" height="120" rx="8" fill="var(--graphite-2)" stroke="var(--line-dark)" strokeWidth="1.5" />
      <rect x="372" y="48" width="52" height="20" rx="4" fill="var(--graphite-3)" />
      <line x1="368" y1="96" x2="428" y2="96" stroke="var(--surface-alt)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="368" y1="116" x2="428" y2="116" stroke="var(--surface-alt)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="368" y1="136" x2="410" y2="136" stroke="var(--surface-alt)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="404" cy="136" r="9" fill="none" stroke="var(--brand-600)" strokeWidth="3" />
      <path d="M400 136 l3 3 6-6" stroke="var(--brand-600)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
