import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE =
  'https://site.api.espn.com/apis/site/v2/sports/soccer';

const PREFIX = '@golflash/pro-cache-v1/';

export const LEAGUES = [
  { id: 'per.1', name: 'Liga 1 Peru' },
  { id: 'esp.1', name: 'LaLiga' },
  { id: 'eng.1', name: 'Premier League' },
  { id: 'ita.1', name: 'Serie A' },
  { id: 'ger.1', name: 'Bundesliga' },
  { id: 'fra.1', name: 'Ligue 1' },
  { id: 'usa.1', name: 'MLS' },
  { id: 'arg.1', name: 'Argentina' },
  { id: 'bra.1', name: 'Brasil' },
];

export type Team = {
  id: string;
  name: string;
  logo?: string;
};

export type Game = {
  id: string;
  date: string;
  opponent: string;
  gf: number;
  ga: number;
};

export type Player = {
  id: string;
  name: string;
  position: string;
  age: string;
  country: string;
  photo?: string;
  stats: { name: string; value: string }[];
};

export type Form = {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  averageFor: number;
  averageAgainst: number;
  recent: Game[];
};

function arr(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function url(value: any): string | undefined {
  return typeof value === 'string' &&
    value.startsWith('https://')
    ? value : undefined;
}

async function request(path: string) {
  const key = PREFIX + path;
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(), 15000
  );

  try {
    const response = await fetch(BASE + path, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const data = await response.json();

    if (!data || typeof data !== 'object') {
      throw new Error('Respuesta invalida');
    }

    const updated = new Date().toISOString();

    await AsyncStorage.setItem(
      key,
      JSON.stringify({ data, updated })
    ).catch(() => {});

    return { data, cached: false, updated };

  } catch (error) {
    const saved = await AsyncStorage.getItem(key);

    if (!saved) throw error;

    const result = JSON.parse(saved);

    return {
      data: result.data,
      updated: result.updated,
      cached: true,
    };

  } finally {
    clearTimeout(timer);
  }
}

export async function getTeams(league: string) {
  const result = await request(
    '/' + league + '/teams?limit=100'
  );

  const teams: Team[] = arr(result.data.sports)
    .flatMap(s => arr(s.leagues))
    .flatMap(l => arr(l.teams))
    .map(x => ({
      id: String(x.team?.id || ''),
      name: String(
        x.team?.displayName || x.team?.name || ''
      ),
      logo: url(x.team?.logos?.[0]?.href),
    }))
    .filter(t => t.id && t.name);

  return {
    ...result,
    teams: [...new Map(
      teams.map(t => [t.id, t])
    ).values()],
  };
}

function numericScore(value: any): number {
  const raw = typeof value === 'object'
    ? value?.value ?? value?.displayValue
    : value;

  if (raw == null || String(raw).trim() === '') {
    return NaN;
  }

  return Number(raw);
}

export async function getForm(
  league: string,
  teamId: string
) {
  const result = await request(
    '/' + league + '/teams/' +
    teamId + '/schedule'
  );

  const games: Game[] = [];

  for (const event of arr(result.data.events)) {
    const competition = event.competitions?.[0];

    if (!competition) continue;

    const status =
      competition.status?.type || event.status?.type;

    if (
      status?.completed !== true &&
      status?.state !== 'post'
    ) continue;

    if (/cancel|abandon|postpon|forfeit/i.test(
      String(status?.name || '')
    )) continue;

    const competitors = arr(competition.competitors);

    const team = competitors.find(
      c => String(c.team?.id ?? c.id) === teamId
    );

    const opponent = competitors.find(
      c => String(c.team?.id ?? c.id) !== teamId
    );

    if (!team || !opponent) continue;

    const gf = numericScore(team.score);
    const ga = numericScore(opponent.score);

    if (
      !Number.isInteger(gf) ||
      !Number.isInteger(ga) ||
      gf < 0 || ga < 0
    ) continue;

    const date = String(
      competition.date || event.date || ''
    );

    if (
      !Number.isFinite(Date.parse(date)) ||
      Date.parse(date) > Date.now()
    ) continue;

    games.push({
      id: String(event.id || competition.id || date),
      date,
      opponent: String(
        opponent.team?.displayName ||
        opponent.team?.name || 'Rival'
      ),
      gf,
      ga,
    });
  }

  const recent = [...new Map(
    games.map(g => [g.id, g])
  ).values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const n = recent.length;

  const gf = recent.reduce(
    (total, g) => total + g.gf, 0
  );

  const ga = recent.reduce(
    (total, g) => total + g.ga, 0
  );

  const form: Form = {
    games: n,
    wins: recent.filter(g => g.gf > g.ga).length,
    draws: recent.filter(g => g.gf === g.ga).length,
    losses: recent.filter(g => g.gf < g.ga).length,
    gf,
    ga,
    averageFor: n ? gf / n : 0,
    averageAgainst: n ? ga / n : 0,
    recent,
  };

  return { ...result, form };
}

export async function getPlayers(
  league: string,
  teamId: string
) {
  const result = await request(
    '/' + league + '/teams/' +
    teamId + '/roster'
  );

  const players: Player[] = [];

  function visit(value: any) {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const p = value.athlete || value;

    if (p.id && (p.fullName || p.displayName)) {
      const stats = arr(p.stats || value.stats)
        .filter(s =>
          s.displayValue != null ||
          s.value != null
        )
        .map(s => ({
          name: String(
            s.displayName || s.name || 'Estadistica'
          ),
          value: String(
            s.displayValue ?? s.value
          ),
        }));

      players.push({
        id: String(p.id),
        name: String(p.fullName || p.displayName),
        position: String(
          p.position?.displayName ||
          p.position?.name ||
          p.position?.abbreviation || '-'
        ),
        age: String(p.age ?? '-'),
        country: String(
          p.citizenship ||
          p.birthPlace?.country || '-'
        ),
        photo: url(p.headshot?.href),
        stats,
      });
    }

    if (value.items) visit(value.items);
    if (value.athletes) visit(value.athletes);
  }

  visit(result.data.athletes);
  visit(result.data.roster);

  return {
    ...result,
    players: [...new Map(
      players.map(p => [p.id, p])
    ).values()],
  };
}

export function predict(a: Form, b: Form) {
  if (a.games < 5 || b.games < 5) return null;

  const lambdaA =
    (a.averageFor + b.averageAgainst) / 2;

  const lambdaB =
    (b.averageFor + a.averageAgainst) / 2;

  function poisson(lambda: number) {
    const values = [Math.exp(-lambda)];

    for (let k = 1; k <= 40; k++) {
      values.push(values[k - 1] * lambda / k);
    }

    return values;
  }

  const pa = poisson(lambdaA);
  const pb = poisson(lambdaB);

  let winA = 0;
  let draw = 0;
  let winB = 0;
  let best = -1;
  let score = '';

  for (let i = 0; i < pa.length; i++) {
    for (let j = 0; j < pb.length; j++) {
      const p = pa[i] * pb[j];

      if (i > j) winA += p;
      else if (i === j) draw += p;
      else winB += p;

      if (p > best) {
        best = p;
        score = i + ' - ' + j;
      }
    }
  }

  const total = winA + draw + winB;

  if (!Number.isFinite(total) || total <= 0) {
    return null;
  }

  const x = Math.round(100 * winA / total);
  const y = Math.round(100 * draw / total);

  return {
    a: x,
    draw: y,
    b: 100 - x - y,
    score,
    lambdaA,
    lambdaB,
  };
}