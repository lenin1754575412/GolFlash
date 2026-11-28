import { getTimeZone } from './preferences';
import type { Match, MatchResult, Status } from '../types';

// ESPN ofrece datos públicos sin una clave en estos endpoints no oficiales.
// Su disponibilidad y cobertura pueden cambiar. TheSportsDB es respaldo parcial.
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const SPORTDB_BASE = 'https://www.thesportsdb.com/api/v1/json/123';

// GOLFLASH_WORLD_FOOTBALL

const WORLD_CATALOG = `
eng.1|Premier League
esp.1|LaLiga
uefa.champions|Champions League
ita.1|Serie A
ger.1|Bundesliga
fra.1|Ligue 1
per.1|Liga 1 Peru
mex.1|Liga MX
arg.1|Liga Argentina
bra.1|Brasileirao
usa.1|MLS
conmebol.libertadores|Copa Libertadores
conmebol.sudamericana|Copa Sudamericana
uefa.europa|Europa League
fifa.world|Mundial FIFA
fifa.cwc|Mundial de Clubes
fifa.intercontinental_cup|Copa Intercontinental
fifa.wwc|Mundial Femenino
fifa.world.u20|Mundial Sub-20
fifa.world.u17|Mundial Sub-17
fifa.wworld.u17|Mundial Femenino Sub-17
fifa.worldq.conmebol|Eliminatorias Sudamericanas
fifa.worldq.uefa|Eliminatorias Europeas
fifa.worldq.concacaf|Eliminatorias Concacaf
fifa.worldq.afc|Eliminatorias Asia
fifa.worldq.caf|Eliminatorias Africa
fifa.worldq.ofc|Eliminatorias Oceania
fifa.wworldq.uefa|Eliminatorias Mundial Femenino UEFA
fifa.wwcq.ply|Repechaje Mundial Femenino
fifa.friendly|Amistosos Internacionales
fifa.friendly.w|Amistosos Femeninos
fifa.friendly_u21|Amistosos Sub-21
fifa.u20.friendly|Amistosos Sub-20
fifa.olympics|Juegos Olimpicos Masculinos
fifa.w.olympics|Juegos Olimpicos Femeninos
fifa.shebelieves|SheBelieves Cup
fifa.w.champions_cup|Copa de Campeonas FIFA
conmebol.america|Copa America
conmebol.america.femenina|Copa America Femenina
conmebol.recopa|Recopa Sudamericana
global.finalissima|Finalissima
uefa.euro|Eurocopa
uefa.euroq|Eliminatorias Eurocopa
uefa.weuro|Eurocopa Femenina
uefa.euro_u21|Eurocopa Sub-21
uefa.euro_u21_qual|Eliminatorias Euro Sub-21
uefa.euro.u19|Eurocopa Sub-19
uefa.nations|UEFA Nations League
uefa.w.nations|Nations League Femenina
uefa.europa.conf|Conference League
uefa.champions_qual|Clasificacion Champions League
uefa.europa_qual|Clasificacion Europa League
uefa.europa.conf_qual|Clasificacion Conference League
uefa.super_cup|Supercopa UEFA
uefa.wchampions|Champions League Femenina
concacaf.gold|Copa Oro
concacaf.nations.league|Concacaf Nations League
concacaf.champions|Concacaf Champions Cup
concacaf.leagues.cup|Leagues Cup
concacaf.w.gold|Copa Oro Femenina
concacaf.w.champions_cup|Concacaf Champions Femenina
campeones.cup|Campeones Cup
eng.2|Championship Inglaterra
eng.3|League One Inglaterra
eng.4|League Two Inglaterra
eng.5|National League Inglaterra
eng.fa|FA Cup
eng.league_cup|Carabao Cup
eng.trophy|EFL Trophy
eng.charity|Community Shield
eng.w.1|Superliga Femenina Inglaterra
eng.w.fa|FA Cup Femenina
esp.2|Segunda Division Espana
esp.copa_del_rey|Copa del Rey
esp.super_cup|Supercopa de Espana
esp.w.1|Liga Femenina Espana
esp.copa_de_la_reina|Copa de la Reina
ger.2|Segunda Bundesliga
ger.dfb_pokal|Copa de Alemania
ger.super_cup|Supercopa Alemana
ita.2|Serie B Italia
ita.coppa_italia|Copa Italia
ita.super_cup|Supercopa Italia
fra.2|Ligue 2
fra.coupe_de_france|Copa de Francia
fra.super_cup|Supercopa Francia
fra.w.1|Liga Femenina Francia
por.1|Liga Portugal
por.taca.portugal|Copa Portugal
ned.1|Eredivisie
ned.2|Segunda Division Paises Bajos
ned.3|Tercera Division Paises Bajos
ned.cup|Copa Paises Bajos
ned.supercup|Supercopa Paises Bajos
ned.w.1|Liga Femenina Paises Bajos
bel.1|Liga Belgica
sco.1|Liga Escocia
sco.2|Championship Escocia
sco.3|League One Escocia
sco.4|League Two Escocia
sco.tennents|Copa Escocia
sco.cis|Copa de la Liga Escocesa
aut.1|Liga Austria
tur.1|Liga Turquia
gre.1|Liga Grecia
den.1|Liga Dinamarca
nor.1|Liga Noruega
swe.1|Liga Suecia
cyp.1|Liga Chipre
irl.1|Liga Irlanda
rus.1|Liga Rusia
arg.copa|Copa Argentina
bra.2|Serie B Brasil
bra.copa_do_brazil|Copa Brasil
chi.1|Liga Chile
col.1|Liga Colombia
ecu.1|Liga Ecuador
uru.1|Liga Uruguay
par.1|Liga Paraguay
bol.1|Liga Bolivia
ven.1|Liga Venezuela
mex.2|Liga Expansion Mexico
mex.campeon|Campeon de Campeones
mex.supercopa|Supercopa Mexico
usa.open|US Open Cup
usa.usl.1|USL Championship
usa.usl.l1|USL League One
usa.nwsl|Liga Femenina Estados Unidos
usa.nwsl.cup|NWSL Challenge Cup
usa.w.usl.1|USL Femenina
can.w.nsl|Liga Femenina Canada
ksa.1|Liga Arabia Saudita
ksa.kings.cup|Copa del Rey Arabia Saudita
jpn.1|Liga Japon
chn.1|Liga China
ind.1|Liga India
tha.1|Liga Tailandia
mys.1|Liga Malasia
idn.1|Liga Indonesia
sgp.1|Liga Singapur
aus.1|Liga Australia
aus.w.1|Liga Femenina Australia
afc.champions|Champions League Asia
afc.cup|AFC Champions League Two
afc.asian.cup|Copa Asiatica
caf.nations|Copa Africana de Naciones
caf.nations_qual|Eliminatorias Copa Africana
caf.champions|Champions League Africa
caf.confed|Copa Confederacion Africa
rsa.1|Liga Sudafrica
nga.1|Liga Nigeria
gha.1|Liga Ghana
club.friendly|Amistosos de Clubes
`;

export const LEAGUES = WORLD_CATALOG
  .trim()
  .split('\n')
  .map(line => {
    const [code, name] = line.split('|');
    return { code: code.trim(), name: name.trim() };
  });


async function gfRawFetch(url: string, timeoutMs = 12000): Promise<any> {
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

// World Football: consultas limitadas y cache por liga.

type LeagueEntry = {
  matches: Match[];
  time: number;
};

const worldCache = new Map<string, LeagueEntry>();

const worldFlights =
  new Map<string, Promise<MatchResult>>();

const leagueFlights =
  new Map<string, Promise<Match[]>>();

function cacheLifetime(
  entry: LeagueEntry,
  day: string
): number {

  if (day < dayFromOffset(0)) {
    return 10 * 60 * 1000;
  }

  if (entry.matches.some(m => m.status === 'live')) {
    return 25000;
  }

  if (entry.matches.some(m =>
    m.status === 'scheduled' &&
    Date.parse(m.date) <= Date.now() + 60 * 60 * 1000
  )) {
    return 30000;
  }

  if (!entry.matches.length) {
    return 5 * 60 * 1000;
  }

  return 2 * 60 * 1000;
}

async function loadWorldLeague(
  day: string,
  league: { code: string; name: string }
): Promise<Match[]> {

  const key = day + ':' + league.code;
  const cached = worldCache.get(key);

  if (
    cached &&
    Date.now() - cached.time <
      cacheLifetime(cached, day)
  ) {
    return cached.matches;
  }

  const running = leagueFlights.get(key);

  if (running) return running;

  const task = (async () => {

    const dates = day.replace(/-/g, '');

    const data = await jsonFetch(
      ESPN_BASE + '/' + league.code +
      '/scoreboard?dates=' + dates +
      '&limit=200',
      8000
    );

    if (!Array.isArray(data?.events)) {
      throw new Error('Respuesta ESPN no disponible');
    }

    const matches: Match[] = data.events
      .map((event: any) =>
        fromESPN(event, league.code, league.name)
      )
      .filter((m: Match | null): m is Match => {
        return Boolean(
          m && Number.isFinite(Date.parse(m.date))
        );
      });

    worldCache.set(key, {
      matches,
      time: Date.now(),
    });

    if (worldCache.size > 1500) {

      const first = worldCache.keys().next().value;

      if (first !== undefined) {
        worldCache.delete(first);
      }
    }

    return matches;
  })();

  leagueFlights.set(key, task);

  try {
    return await task;
  } finally {
    leagueFlights.delete(key);
  }
}

// GOLFLASH_TURBO_V1

type WorldProgress = (matches: Match[]) => void;

const worldSubscribers =
  new Map<string, Set<WorldProgress>>();

const worldSnapshots =
  new Map<string, Match[]>();

const worldLastProgress =
  new Map<string, number>();

function publishWorldProgress(
  day: string,
  collected: Match[]
) {

  if (!collected.length) return;

  const now = Date.now();

  if (
    now - (worldLastProgress.get(day) || 0) < 600
  ) return;

  const unique = new Map<string, Match>();

  for (const match of collected) {

    if (peruKey(new Date(match.date)) !== day) {
      continue;
    }

    const key =
      match.id.split(':').pop() || match.id;

    const previous = unique.get(key);

    if (
      !previous ||
      LEAGUES.findIndex(l => l.code === match.leagueCode) <
      LEAGUES.findIndex(l => l.code === previous.leagueCode)
    ) {
      unique.set(key, match);
    }
  }

  const snapshot = [...unique.values()].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  if (!snapshot.length) return;

  worldLastProgress.set(day, now);
  worldSnapshots.set(day, snapshot);

  worldSubscribers.get(day)?.forEach(callback => {
    try {
      callback(snapshot);
    } catch {}
  });
}

async function collectWorldMatches(
  day: string
): Promise<MatchResult> {

  let index = 0;
  let success = 0;
  let failures = 0;
  let cachedLeagues = 0;

  const collected: Match[] = [];

  async function worker() {

    while (index < LEAGUES.length) {

      const league = LEAGUES[index++];

      try {

        const matches = await loadWorldLeague(
          day,
          league
        );

        collected.push(...matches);
        success++;
        publishWorldProgress(day, collected);

      } catch {

        failures++;

        const cached = worldCache.get(
          day + ':' + league.code
        );

        if (cached) {
          collected.push(...cached.matches);
          cachedLeagues++;
          publishWorldProgress(day, collected);
        }
      }
    }
  }

  // Limita las consultas simultaneas.
  await Promise.all(
    Array.from({ length: 8 }, () => worker())
  );

  const unique = new Map<string, Match>();

  for (const match of collected) {

    if (peruKey(new Date(match.date)) !== day) {
      continue;
    }

    // Evitar partidos repetidos con diferentes competiciones.
    const eventId = match.id.split(':').pop() || match.id;

    const previous = unique.get(eventId);

    if (
      !previous ||
      LEAGUES.findIndex(l => l.code === match.leagueCode) <
      LEAGUES.findIndex(l => l.code === previous.leagueCode)
    ) {
      unique.set(eventId, match);
    }
  }

  if (success || cachedLeagues) {

    const warning = failures
      ? 'Cobertura parcial: ' + failures +
        ' competiciones no respondieron.' +
        (cachedLeagues
          ? ' Algunas muestran datos guardados.'
          : '')
      : undefined;

    return {
      matches: [...unique.values()].sort(
        (a, b) => a.date.localeCompare(b.date)
      ),
      source: 'ESPN',
      warning,
    };
  }

  // Fuente de respaldo cuando ESPN no responde.

  const data = await jsonFetch(
    SPORTDB_BASE +
    '/eventsday.php?d=' + day + '&s=Soccer'
  );

  if (
    !Array.isArray(data?.events) &&
    data?.events != null
  ) {
    throw new Error('Respuesta deportiva no disponible');
  }

  const matches: Match[] = (data?.events || [])
    .map(fromSportsDB)
    .filter((m: Match | null): m is Match => !!m)
    .filter((m: Match) =>
      Number.isFinite(Date.parse(m.date)) &&
      peruKey(new Date(m.date)) === day
    );

  return {
    matches: [...new Map(
      matches.map(m => [m.id, m])
    ).values()].sort(
      (a, b) => a.date.localeCompare(b.date)
    ),
    source: 'TheSportsDB',
    warning: 'ESPN no respondio. Cobertura de respaldo limitada.',
  };
}

export async function getMatches(
  day: string,
  onProgress?: WorldProgress
): Promise<MatchResult> {

  let listeners = worldSubscribers.get(day);

  if (!listeners) {
    listeners = new Set<WorldProgress>();
    worldSubscribers.set(day, listeners);
  }

  if (onProgress) {

    listeners.add(onProgress);

    const previous = worldSnapshots.get(day);

    if (previous?.length) {
      onProgress(previous);
    }
  }

  let task = worldFlights.get(day);

  if (!task) {

    task = collectWorldMatches(day).finally(() => {

      worldFlights.delete(day);
      worldSnapshots.delete(day);
      worldLastProgress.delete(day);
    });

    worldFlights.set(day, task);
  }

  try {

    return await task;

  } finally {

    if (onProgress) {
      listeners.delete(onProgress);
    }

    if (
      !listeners.size &&
      worldSubscribers.get(day) === listeners
    ) {
      worldSubscribers.delete(day);
    }
  }
}

export function peruKey(date: Date): string {
  const parts = gfFormatter('en-US', {
    timeZone: getTimeZone(), year: 'numeric', month: '2-digit', day: '2-digit',
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
    return gfFormatter('es-PE', {
      timeZone: getTimeZone(), hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(date));
  } catch { return '--:--'; }
}

export function matchDayText(date: string): string {
  try {
    return gfFormatter('es-PE', {
      timeZone: getTimeZone(), weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    }).format(new Date(date));
  } catch { return date; }
}


// GOLFLASH_PERFORMANCE_V2

const gfNetworkCache = new Map<string, {
  data: any;
  expires: number;
}>();

const gfNetworkPending =
  new Map<string, Promise<any>>();

const gfFormatters =
  new Map<string, Intl.DateTimeFormat>();

function gfFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {

  const key = locale + JSON.stringify(options);

  let formatter = gfFormatters.get(key);

  if (!formatter) {

    formatter = new Intl.DateTimeFormat(
      locale, options
    );

    if (gfFormatters.size >= 20) {
      gfFormatters.clear();
    }

    gfFormatters.set(key, formatter);
  }

  return formatter;
}

function gfCacheTime(url: string): number {

  // No almacenar marcadores en vivo aqui.
  if (/scoreboard/i.test(url)) return 0;

  if (/\/summary(?:\?|$)/i.test(url)) {
    return 8000;
  }

  if (/\/standings(?:\?|$)/i.test(url)) {
    return 45000;
  }

  if (/\/roster(?:\?|$)/i.test(url)) {
    return 60000;
  }

  if (/\/news(?:\?|$)/i.test(url)) {
    return 90000;
  }

  return 0;
}

export async function jsonFetch(
  url: string,
  timeoutMs = 12000
): Promise<any> {

  const ttl = gfCacheTime(url);

  if (!ttl) {
    return gfRawFetch(url, timeoutMs);
  }

  const cached = gfNetworkCache.get(url);

  if (
    cached &&
    cached.expires > Date.now()
  ) {
    return cached.data;
  }

  const pending = gfNetworkPending.get(url);

  if (pending) return pending;

  const request = gfRawFetch(url, timeoutMs)
    .then(data => {

      if (data && typeof data === 'object') {

        if (gfNetworkCache.size >= 120) {

          const first =
            gfNetworkCache.keys().next().value;

          if (first !== undefined) {
            gfNetworkCache.delete(first);
          }
        }

        gfNetworkCache.set(url, {
          data,
          expires: Date.now() + ttl,
        });
      }

      return data;
    })
    .finally(() => {
      gfNetworkPending.delete(url);
    });

  gfNetworkPending.set(url, request);

  return request;
}

