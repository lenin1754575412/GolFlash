import { jsonFetch, peruKey } from './football';

export const SPORTS = [
  {
    id: 'football',
    name: 'Fútbol',
    icon: 'football-outline',
    path: 'soccer',
    leagues: [],
    db: 'Soccer',
  },
  {
    id: 'basketball',
    name: 'Básquet',
    icon: 'basketball-outline',
    path: 'basketball',
    leagues: ['nba', 'wnba', 'mens-college-basketball'],
    db: 'Basketball',
  },
  {
    id: 'volleyball',
    name: 'Vóley',
    icon: 'tennisball-outline',
    path: 'volleyball',
    leagues: [
      'womens-college-volleyball',
      'mens-college-volleyball',
      'fivb.w',
    ],
    db: 'Volleyball',
  },
  {
    id: 'tennis',
    name: 'Tenis',
    icon: 'tennisball-outline',
    path: 'tennis',
    leagues: ['atp', 'wta'],
    db: 'Tennis',
  },
  {
    id: 'baseball',
    name: 'Béisbol',
    icon: 'baseball-outline',
    path: 'baseball',
    leagues: ['mlb'],
    db: 'Baseball',
  },
  {
    id: 'formula1',
    name: 'Fórmula 1',
    icon: 'car-sport-outline',
    path: 'racing',
    leagues: ['f1'],
    db: 'Motorsport',
  },
  {
    id: 'mma',
    name: 'UFC',
    icon: 'fitness-outline',
    path: 'mma',
    leagues: ['ufc'],
    db: 'Fighting',
  },
  {
    id: 'boxing',
    name: 'Boxeo',
    icon: 'fitness-outline',
    path: '',
    leagues: [],
    db: 'Fighting',
  },
  {
    id: 'nfl',
    name: 'NFL',
    icon: 'american-football-outline',
    path: 'football',
    leagues: ['nfl', 'college-football'],
    db: 'American Football',
  },
  {
    id: 'hockey',
    name: 'Hockey',
    icon: 'trophy-outline',
    path: 'hockey',
    leagues: ['nhl'],
    db: 'Ice Hockey',
  },
  {
    id: 'rugby',
    name: 'Rugby',
    icon: 'american-football-outline',
    path: 'rugby',
    leagues: ['164205', '180659'],
    db: 'Rugby',
  },
  {
    id: 'cycling',
    name: 'Ciclismo',
    icon: 'bicycle-outline',
    path: '',
    leagues: [],
    db: 'Cycling',
  },
] as const;

export type SportId = typeof SPORTS[number]['id'];

export type Participant = {
  name: string;
  logo?: string;
  score: string;
  periods: string[];
};

export type SportEvent = {
  id: string;
  sport: SportId;
  league: string;
  title: string;
  date: string;
  status: 'live' | 'finished' | 'scheduled' | 'postponed' | 'unknown';
  detail: string;
  participants: Participant[];
  venue?: string;
  source: 'ESPN' | 'TheSportsDB';
  link?: string;
};

const BASE =
  'https://site.api.espn.com/apis/site/v2/sports';

function secureUrl(value: any): string | undefined {
  return typeof value === 'string' &&
    /^https:\/\//i.test(value)
    ? value
    : undefined;
}

function array(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function score(value: any): string {
  if (value == null || value === '') return '-';
  if (typeof value === 'object') {
    return String(value.displayValue ?? value.value ?? '-');
  }
  return String(value);
}

function getStatus(status: any): SportEvent['status'] {
  const type = status?.type || status || {};
  const name = String(type.name || '').toUpperCase();

  if (/POSTPONED|CANCELLED|CANCELED|ABANDONED/.test(name))
    return 'postponed';

  if (type.state === 'in') return 'live';
  if (type.state === 'post' || type.completed === true)
    return 'finished';

  if (type.state === 'pre') return 'scheduled';

  return 'unknown';
}

function normalizeESPN(
  event: any,
  competition: any,
  sport: SportId,
  code: string,
  league: string
): SportEvent | null {
  const date = String(competition?.date || event?.date || '');

  if (!date || !Number.isFinite(Date.parse(date))) return null;
  if (!competition?.id && !event?.id) return null;

  const info = competition?.status || event?.status || {};
  const status = getStatus(info);

  const participants: Participant[] =
    array(competition?.competitors).map((p: any) => {
      const person = p.team || p.athlete || p;

      return {
        name: String(
          person.displayName ||
          person.fullName ||
          person.name ||
          'Participante'
        ),
        logo: secureUrl(
          person.logo ||
          person.logos?.[0]?.href ||
          person.headshot?.href ||
          person.flag?.href
        ),
        score: status === 'scheduled'
          ? '-'
          : score(p.score),
        periods: array(p.linescores).map(
          (s: any) => score(s)
        ),
      };
    });

  return {
    id: `espn:${sport}:${code}:${competition.id || event.id}`,
    sport,
    league,
    title: String(
      competition?.name ||
      event?.name ||
      participants.map(p => p.name).join(' vs ') ||
      league
    ),
    date,
    status,
    detail: String(
      info.type?.shortDetail ||
      info.type?.detail ||
      info.type?.description ||
      info.displayClock ||
      ''
    ),
    participants,
    venue: competition?.venue?.fullName,
    source: 'ESPN',
    link: secureUrl(
      array(event?.links).find(
        (l: any) => secureUrl(l?.href)
      )?.href
    ),
  };
}

function getCompetitions(event: any): any[] {
  const direct = array(event?.competitions);

  const nested = array(event?.groupings).flatMap(
    (g: any) => [
      ...array(g?.competitions),
      ...array(g?.groupings).flatMap(
        (sub: any) => array(sub?.competitions)
      ),
    ]
  );

  const all = [...direct, ...nested];

  return all.length ? all : [event];
}

function adjacentDate(day: string, offset: number) {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

async function espn(
  sport: SportId,
  path: string,
  league: string,
  day: string
): Promise<SportEvent[]> {
  const compact = day.replace(/-/g, '');

  const data = await jsonFetch(
    `${BASE}/${path}/${league}/scoreboard?dates=${compact}&limit=200`
  );

  if (!Array.isArray(data?.events))
    throw new Error('Respuesta ESPN no disponible');

  const name = String(
    data.leagues?.[0]?.name || league.toUpperCase()
  );

  const result: SportEvent[] = [];

  for (const event of data.events) {
    for (const competition of getCompetitions(event)) {
      const item = normalizeESPN(
        event, competition, sport, league, name
      );

      if (item) {
        result.push(item);
      }
    }
  }

  return result;
}

async function sportsDB(
  sport: SportId,
  name: string,
  day: string
): Promise<SportEvent[]> {
  const url =
    'https://www.thesportsdb.com/api/v1/json/123/eventsday.php' +
    `?d=${day}&s=${encodeURIComponent(name)}`;

  const data = await jsonFetch(url);

  if (!data || !('events' in data))
    throw new Error('TheSportsDB no disponible');

  return array(data.events)
    .filter(e => {
      if (!e?.idEvent) return false;

      if (sport === 'boxing')
        return /boxing|boxeo/i.test(String(e.strLeague || ''));

      if (sport === 'mma')
        return /ufc|mma/i.test(String(e.strLeague || ''));

      if (sport === 'formula1')
        return /formula\s*1|formula\s*one/i.test(
          String(e.strLeague || '')
        );

      return true;
    })
    .map((e: any): SportEvent => {
      const raw = String(e.strStatus || '');
      const status: SportEvent['status'] =
        /postpon|cancel|abandon/i.test(raw) ? 'postponed'
        : /live|progress|playing/i.test(raw) ? 'live'
        : /finish|full time|match finished/i.test(raw)
          ? 'finished'
        : /scheduled|not started|upcoming/i.test(raw)
          ? 'scheduled'
        : 'unknown';

      const participants: Participant[] = [];

      if (e.strHomeTeam) {
        participants.push({
          name: String(e.strHomeTeam),
          logo: secureUrl(e.strHomeTeamBadge),
          score: score(e.intHomeScore),
          periods: [],
        });
      }

      if (e.strAwayTeam) {
        participants.push({
          name: String(e.strAwayTeam),
          logo: secureUrl(e.strAwayTeamBadge),
          score: score(e.intAwayScore),
          periods: [],
        });
      }

      return {
        id: `sportsdb:${sport}:${e.idEvent}`,
        sport,
        league: String(e.strLeague || name),
        title: String(e.strEvent || e.strLeague || name),
        date: String(e.strTimestamp || ''),
        status,
        detail: raw,
        participants,
        venue: e.strVenue || undefined,
        source: 'TheSportsDB',
      };
    });
}

export async function getSportEvents(
  sport: SportId,
  day: string
): Promise<{ events: SportEvent[]; warning: string }> {
  const config = SPORTS.find(s => s.id === sport);

  if (!config) return { events: [], warning: '' };

  // Consultar fechas vecinas en deportes de equipos
  // para reducir perdidas por diferencias horarias.
  const teamSport = [
    'basketball', 'volleyball', 'baseball',
    'nfl', 'hockey', 'rugby'
  ].includes(sport);

  const dates = teamSport
    ? [adjacentDate(day, -1), day, adjacentDate(day, 1)]
    : [day];

  const jobs = config.leagues.flatMap(league =>
    dates.map(date =>
      espn(sport, config.path, league, date).then(events =>
        events.filter(e => peruKey(new Date(e.date)) === day)
      )
    )
  );

  const responses = await Promise.allSettled(jobs);

  const successful = responses.filter(
    (r): r is PromiseFulfilledResult<SportEvent[]> =>
      r.status === 'fulfilled'
  );

  let events = successful.flatMap(r => r.value);

  let warning = responses.length > successful.length
    ? 'Algunas competiciones no respondieron.'
    : '';

  if (events.length === 0) {
    try {
      events = await sportsDB(sport, config.db, day);

      warning = events.length
        ? 'Cobertura alternativa de TheSportsDB.'
        : warning;
    } catch {
      if (successful.length === 0) {
        throw new Error('No se pudo consultar ninguna fuente.');
      }

      warning = 'Cobertura alternativa no disponible.';
    }
  }

  const unique = new Map<string, SportEvent>();

  events.forEach(e => unique.set(e.id, e));

  return {
    events: [...unique.values()].sort(
      (a, b) => a.date.localeCompare(b.date)
    ),
    warning,
  };
}