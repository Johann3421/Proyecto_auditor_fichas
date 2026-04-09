// React Query keys
export const queryKeys = {
  fichas: ['fichas'] as const,
  fichasResumen: ['fichas', 'resumen'] as const,
  fichaDetalle: (id: string) => ['fichas', id] as const,
  estimaciones: ['estimaciones'] as const,
  notificaciones: ['notificaciones'] as const,
  dashboard: (filters: Record<string, string>) => ['reportes', 'dashboard', filters] as const,
};
