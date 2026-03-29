// Returns a string like "Semiconductors (35%)" for the top theme exposure
export function formatTopThemeExposure(themeExposure: Array<{ theme: string; exposurePct: number }>): string {
  if (!themeExposure || themeExposure.length === 0) return '';
  const { theme, exposurePct } = themeExposure[0];
  return `${theme} (${Math.round(exposurePct)}%)`;
}
