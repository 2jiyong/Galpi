import type { Galpi } from '../api/galpis'

export function recentGalpis(galpis: Galpi[], limit = 3): Galpi[] {
  return galpis
    .filter((galpi) => galpi.lastViewedAt !== null)
    .sort((a, b) => Date.parse(b.lastViewedAt!) - Date.parse(a.lastViewedAt!))
    .slice(0, limit)
}
