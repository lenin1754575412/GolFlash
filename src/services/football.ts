import type { Match, MatchResult, Status } from '../types';

// ESPN ofrece datos públicos sin una clave en estos endpoints no oficiales.
// Su disponibilidad y cobertura pueden cambiar. TheSportsDB es respaldo parcial.
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const SPORTDB_BASE = 'https://www.thesportsdb.com/api/v1/json/123';

export const LEAGUES = [
  { code: 'eng.1', name: 'Premier League' },
  { code: 'esp.1', name: 'LaLiga' },
  { code: 'uefa.champions', name: 'Champions League' },
  { code: 'ita.1', name: 'Serie A' },
  { code: 'ger.1', name: 'Bundesliga' },
  { code: 'fra.1', name: 'Ligue 1' },
  { code: 'per.1', name: 'Liga 1 Perú' },
  { code: 'mex.1', name: 'Liga MX' },
  { code: 'arg.1', name: 'Liga Argentina' },
  { code: 'bra.1', name: 'Brasileirão' },
  { code: 'usa.1', name: 'MLS' },
  { code: 'conmebol.libertadores', name: 'Copa Libertadores' },
  { code: 'conmebol.sudamericana', name: 'Copa Sudamericana' },
  { code: 'uefa.europa', name: 'Europa League' },
] as const;

export async function jsonFetch(url: string, timeoutMs = 12000): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export function fromESPN(event: any, leagueCode: string, league: string): Match | null {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors ?? [];
  const home = competitors.find((t: any) => t.homeAway === 'home');
  const away = competitors.find((t: any) => t.homeAway === 'away');
  if (!event?.id || !home || !away || !event.date) return null;
  const info = competition?.status ?? event?.status ?? {};
  const kind = info?.type ?? {};
  const state = String(kind.state ?? 'pre').toLowerCase();
  const name = String(kind.name ?? '');
  const status: Status = /POSTPONED|CANCELED|CANCELLED|ABANDONED/.test(name) ? 'postponed'
    : state === 'in' ? 'live' : state === 'post' || kind.completed === true ? 'finished' : 'scheduled';
  const number = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
  };
  const links = Array.isArray(event.links) ? event.links : [];
  const matchLink = links.find((item: any) => item?.href?.startsWith?.('https://') && item?.rel?.includes?.('summary'))?.href;
  return {
    id: `espn:${leagueCode}:${event.id}`,
    home: String(home.team?.displayName || home.team?.name || 'Local'),
    away: String(away.team?.displayName || away.team?.name || 'Visitante'),
    homeTeamId: home.team?.id ? String(home.team.id) : undefined,
    awayTeamId: away.team?.id ? String(away.team.id) : undefined,
    homeLogo: home.team?.logo,
    awayLogo: away.team?.logo,
    homeScore: status === 'scheduled' ? null : number(home.score),
    awayScore: status === 'scheduled' ? null : number(away.score),
    date: String(event.date),
    status,
    statusText: String(kind.shortDetail || kind.description || 'Por comenzar'),
    minute: status === 'live' ? String(info.displayClock || kind.shortDetail || 'EN VIVO') : undefined,
    league,
    leagueCode,
    venue: competition?.venue?.fullName,
    link: matchLink || `https://www.espn.com/soccer/match/_/gameId/${event.id}`,
    source: 'ESPN',
  };
}

export function fromSportsDB(event: any): Match | null {
  if (!event?.idEvent || !event?.strHomeTeam || !event?.strAwayTeam) return null;
  const asScore = (v: any): number | null => v === null || v === '' || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null;
  const homeScore = asScore(event.intHomeScore);
  const awayScore = asScore(event.intAwayScore);
  const rawStatus = String(event.strStatus || '');
  const status: Status = /postpone|cancel|abandon/i.test(rawStatus) ? 'postponed'
    : /live|half|progress/i.test(rawStatus) ? 'live'
    : /finish|full time|after/i.test(rawStatus) || (homeScore != null && awayScore != null) ? 'finished' : 'scheduled';
  const time = String(event.strTime || '00:00:00');
  const date = event.strTimestamp || (event.dateEvent ? `${event.dateEvent}T${time.replace(/Z$/, '')}Z` : '');
  if (!date) return null;
  return {
    id: `sportsdb:${event.idEvent}`,
    home: String(event.strHomeTeam), away: String(event.strAwayTeam),
    homeLogo: event.strHomeTeamBadge || undefined, awayLogo: event.strAwayTeamBadge || undefined,
    homeScore, awayScore, status, statusText: rawStatus || 'Programado',
    date: String(date), league: String(event.strLeague || 'Fútbol'),
    leagueCode: 'sportsdb', venue: event.strVenue || undefined,
    link: event.strVideo?.startsWith?.('https://') ? event.strVideo : undefined,
    source: 'TheSportsDB',
  };
}

export async function getMatches(day: string): Promise<MatchResult> {
  const compactDate = day.replace(/-/g, '');
  const responses = await Promise.allSettled(
    LEAGUES.map(async league => {
      const url = `${ESPN_BASE}/${league.code}/scoreboard?dates=${compactDate}&limit=200`;
      const data = await jsonFetch(url);
      if (!Array.isArray(data?.events)) throw new Error('ESPN no devolvió eventos');
      return (data.events as any[])
        .map(e => fromESPN(e, league.code, String(data.leagues?.[0]?.name || league.name)))
        .filter((m): m is Match => !!m);
    }),
  );
  const ok = responses.filter((r): r is PromiseFulfilledResult<Match[]> => r.status === 'fulfilled');
  if (ok.length > 0) {
    const unique = new Map<string, Match>();
    ok.flatMap(r => r.value).forEach(m => unique.set(m.id, m));
    return {
      matches: [...unique.values()].sort((a, b) => a.date.localeCompare(b.date)),
      source: 'ESPN',
      warning: ok.length < LEAGUES.length ? `Cobertura parcial: ${LEAGUES.length - ok.length} competiciones no respondieron.` : undefined,
    };
  }
  // Si ESPN no responde, obtener al menos la cobertura gratuita disponible.
  const data = await jsonFetch(`${SPORTDB_BASE}/eventsday.php?d=${day}&s=Soccer`);
  if (!Array.isArray(data?.events) && data?.events != null) throw new Error('Respuesta inesperada de TheSportsDB');
  const matches = (data?.events || []).map(fromSportsDB).filter((m: Match | null): m is Match => !!m);
  return {
    matches: matches.sort((a: Match, b: Match) => a.date.localeCompare(b.date)),
    source: 'TheSportsDB',
    warning: 'ESPN no respondió. Mostrando una cobertura limitada de TheSportsDB (plan gratuito).',
  };
}

export function peruKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (name: string) => parts.find(p => p.type === name)?.value || '00';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function dayFromOffset(offset: number): string {
  const [y, m, d] = peruKey(new Date()).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + offset, 12)).toISOString().slice(0, 10);
}

export function matchHour(date: string): string {
  try {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(date));
  } catch { return '--:--'; }
}

export function matchDayText(date: string): string {
  try {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima', weekday: 'short', day: '2-digit', month: 'short',
    }).format(new Date(date));
  } catch { return date; }
}
