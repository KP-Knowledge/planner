const base =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimary = `${base} bg-primary text-white hover:opacity-90`;
export const btnSecondary = `${base} border border-border bg-card text-text hover:bg-surface`;
export const btnDanger = `${base} bg-danger text-white hover:opacity-90`;
export const btnGhost = `${base} text-muted hover:bg-surface hover:text-text`;
export const inputCls =
  "w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm text-text placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary";
