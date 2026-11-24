declare const process: {
  env: {
    EXPO_PUBLIC_PHOTO_SERVER?: string;
  };
};

import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, Pressable,
  ActivityIndicator, StyleSheet, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Match } from '../types';
import { jsonFetch } from '../services/football';

const C = {
  bg: '#202020',
  card: '#343434',
  raised: '#444444',
  green: '#00D68F',
  blue: '#68B5DA',
  white: '#FFFFFF',
  gray: '#B9B9B9',
  line: '#505050',
  yellow: '#FFD449'
};

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

const TABS = [
  'RESUMEN', 'PREVIA', 'ALINEACIONES', 'CUOTAS',
  'EVENTOS', 'DIRECTO', 'ESTADÍSTICAS',
  'CLASIFICACIÓN', 'ANÁLISIS', 'NOTICIAS'
];

const arr = (v: any): any[] => Array.isArray(v) ? v : [];

const labels: Record<string, string> = {
  possessionPct: 'Posesión',
  possession: 'Posesión',
  totalShots: 'Tiros totales',
  shotsOnTarget: 'Tiros a puerta',
  shotsOffTarget: 'Tiros fuera',
  blockedShots: 'Tiros bloqueados',
  cornerKicks: 'Tiros de esquina',
  foulsCommitted: 'Faltas',
  fouls: 'Faltas',
  yellowCards: 'Tarjetas amarillas',
  redCards: 'Tarjetas rojas',
  offsides: 'Fueras de juego',
  saves: 'Paradas',
  totalPasses: 'Pases',
  accuratePasses: 'Pases completados',
  passPct: 'Precisión de pases',
  tackles: 'Entradas',
  interceptions: 'Intercepciones',
  clearances: 'Despejes',
  expectedGoals: 'Goles esperados (xG)'
};

function nameOf(a: any) {
  return a?.shortName || a?.displayName || a?.fullName || a?.name || '';
}

function logoOf(t: any) {
  return typeof t?.logo === 'string'
    ? t.logo
    : t?.logo?.href ||
      t?.logos?.[0]?.href ||
      (t?.id
        ? `https://a.espncdn.com/i/teamlogos/soccer/500/${t.id}.png`
        : undefined);
}

function valueOf(s: any) {
  const v = s?.displayValue ?? s?.value;
  return v == null ? '—' : String(v);
}

function playerPhoto(p: any) {
  const a = p?.athlete || p;

  return JSON.stringify({
    id: String(a?.id || ''),
    name: a?.fullName || a?.displayName || a?.name || a?.shortName || '',
    direct: a?.headshot?.href || a?.image?.href || '',
    league: p?.leagueCode || '',
    ref: a?.$ref || ''
  });
}

const imageCache = new Map<string, string[]>();
const activeRequests = new Map<string, Promise<string[]>>();

let queueCount = 0;
const waiting: Array<() => void> = [];

async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (queueCount >= 4) {
    await new Promise<void>(resolve => waiting.push(resolve));
  }

  queueCount++;

  try {
    return await task();
  } finally {
    queueCount--;
    const next = waiting.shift();
    if (next) next();
  }
}

function normalized(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function validImage(value: any): value is string {
  return typeof value === 'string' &&
    /^https:\/\//i.test(value) &&
    !/placeholder|no-image|default-player/i.test(value);
}

async function requestJson(url: string, timeout = 8000) {
  const controller = new AbortController();

  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function wikiPhotos(id: string): Promise<string[]> {
  if (!/^\d+$/.test(id)) return [];

  const query = `
    SELECT DISTINCT ?person ?photo WHERE {
      ?person wdt:P3681 "${id}" .
      ?person wdt:P18 ?photo .
    } LIMIT 5
  `;

  const url =
    'https://query.wikidata.org/sparql?format=json&query=' +
    encodeURIComponent(query);

  const data = await requestJson(url, 15000);

  const rows = data?.results?.bindings || [];

  const persons = new Set(
    rows.map((r: any) => r?.person?.value)
  );

  if (persons.size !== 1) return [];

  const images: string[] = [];

  for (const row of rows) {
    const value = row?.photo?.value;

    if (typeof value !== 'string') continue;

    try {
      const file = decodeURIComponent(
        value.split('/').pop() || ''
      );

      if (!file) continue;

      images.push(
        'https://commons.wikimedia.org/wiki/Special:FilePath/' +
        encodeURIComponent(file) +
        '?width=320'
      );
    } catch {
      // Skip invalid filenames.
    }
  }

  return images;
}

async function sportsDbPhotos(
  id: string,
  name: string
): Promise<string[]> {

  if (!name || /^[A-Z]\.\s*/.test(name)) return [];

  const url =
    'https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p=' +
    encodeURIComponent(name);

  const data = await requestJson(url);

  const players = Array.isArray(data?.player)
    ? data.player : [];

  const exact = players.filter((p: any) =>
    p.strSport === 'Soccer' &&
    normalized(p.strPlayer) === normalized(name)
  );

  const sameId = players.filter((p: any) =>
    p.strSport === 'Soccer' &&
    id &&
    String(p.idESPN || '') === id
  );

  const match = sameId.length === 1
    ? sameId[0]
    : exact.length === 1
      ? exact[0] : null;

  if (!match) return [];

  return [
    match.strCutout,
    match.strThumb,
    match.strRender,
    match.strRender
  ].filter(validImage);
}

async function additionalPhotos(info: any): Promise<string[]> {
  const id = String(info.id || '');
  const key = id || normalized(info.name);

  if (!key) return [];

  if (imageCache.has(key)) {
    return imageCache.get(key) || [];
  }

  const existing = activeRequests.get(key);

  if (existing) return existing;

  const task = limited(async () => {
    const photos: string[] = [];

    let name = String(info.name || '');
    let birth = '';

    if (/^\d+$/.test(id)) {
      const ref = typeof info.ref === 'string' &&
        /^https?:\/\/sports\.core\.api\.espn\.com\//i.test(info.ref)
        ? info.ref.replace(/^http:/, 'https:')
        : '';

      const profileUrl = ref || (
        'https://sports.core.api.espn.com/v2/sports/soccer/leagues/' +
        encodeURIComponent(info.league || 'eng.1') +
        '/athletes/' + encodeURIComponent(id)
      );

      const profile = await requestJson(profileUrl, 5000);

      if (profile) {
        birth = String(profile.dateOfBirth || '').slice(0, 10);
        name = profile.fullName ||
          profile.displayName ||
          name;

        if (validImage(profile.headshot?.href)) {
          photos.push(profile.headshot.href);
        }
      }
    }

    const results = await Promise.all([
      wikiPhotos(id).catch(() => []),
      sportsDbPhotos(id, name).catch(() => [])
    ]);

    photos.push(...results[0], ...results[1]);

    if (birth && name) {
      try {
        const server: string = "";

        if (server) {
          const extra = await requestJson(
            server + '/photo?name=' +
            encodeURIComponent(name) +
            '&birth=' + encodeURIComponent(birth),
            10000
          );

          if (Array.isArray(extra?.photos)) {
            photos.push(...extra.photos.filter(validImage));
          }
        }
      } catch {
        // Preserve existing sources.
      }
    }

    const final = [...new Set(photos.filter(validImage))];

    if (final.length) imageCache.set(key, final);

    return final;
  });

  activeRequests.set(key, task);

  try {
    return await task;
  } finally {
    activeRequests.delete(key);
  }
}

function PhotoImage({
  urls,
  size,
  player,
  exhausted
}: {
  urls: string[];
  size: number;
  player: boolean;
  exhausted?: () => void;
}) {
  const [index, setIndex] = useState(0);

  const current = urls[index];

  useEffect(() => {
    if (!current && exhausted) {
      exhausted();
    }
  }, [current, exhausted]);

  if (!current) {
    return (
      <Ionicons
        name={player ? 'person' : 'shield'}
        size={size * .55}
        color="#777777"
      />
    );
  }

  return (
    <Image
      key={current}
      source={{ uri: current }}
      resizeMode={player ? 'cover' : 'contain'}
      onError={() => {
        setIndex(old => old === index ? old + 1 : old);
      }}
      style={{
        width: size - 2,
        height: size - 2,
        borderRadius: size / 2
      }}
    />
  );
}

function PlayerAvatar({
  uri,
  size
}: {
  uri?: string;
  size: number;
}) {
  const [extra, setExtra] = useState<string[]>([]);
  const [fallback, setFallback] = useState(false);

  let info: any = {};

  try {
    info = JSON.parse(uri || '{}');
  } catch {
    info = { direct: uri };
  }

  const urls: string[] = [];

  if (validImage(info.direct)) {
    urls.push(info.direct);
  }

  if (/^\d+$/.test(String(info.id || ''))) {
    urls.push(
      `https://a.espncdn.com/i/headshots/soccer/players/full/${info.id}.png`
    );

    urls.push(
      `https://a.espncdn.com/combiner/i?img=/i/headshots/soccer/players/full/${info.id}.png&w=256&h=256&scale=crop`
    );
  }

  useEffect(() => {
    if (!fallback) return;

    let alive = true;

    additionalPhotos(info).then(photos => {
      if (alive) setExtra(photos);
    }).catch(() => {});

    return () => {
      alive = false;
    };
  }, [uri, fallback]);

  const sources = [...new Set([
    ...urls,
    ...extra
  ])];

  return (
    <PhotoImage
      key={uri}
      urls={sources}
      size={size}
      player
      exhausted={() => setFallback(true)}
    />
  );
}

function Avatar({
  uri,
  size = 38,
  player = false
}: {
  uri?: string;
  size?: number;
  player?: boolean;
}) {
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: '#FFFFFF',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {player ? (
        <PlayerAvatar
          key={uri}
          uri={uri}
          size={size}
        />
      ) : (
        <PhotoImage
          key={uri}
          urls={uri ? [uri] : []}
          size={size}
          player={false}
        />
      )}
    </View>
  );
}


function Empty({ message }: { message?: string }) {
  return (
    <View style={s.empty}>
      <Ionicons name="information-circle-outline" size={28} color={C.gray} />
      <Text style={s.muted}>
        {message || 'Información no disponible para este partido.'}
      </Text>
    </View>
  );
}

function Card({ title, children }: any) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      <View style={s.cardBody}>{children}</View>
    </View>
  );
}

function Bar({ title, home, away }: {
  title: string; home: any; away: any;
}) {
  const h = parseFloat(String(home));
  const a = parseFloat(String(away));
  const valid = Number.isFinite(h) && Number.isFinite(a);
  const total = valid ? Math.max(0, h) + Math.max(0, a) : 0;

  const hp = total > 0 ? Math.max(0, h) / total * 100 : 0;
  const ap = total > 0 ? Math.max(0, a) / total * 100 : 0;

  return (
    <View style={s.stat}>
      <View style={s.statRow}>
        <Text style={[s.statValue, { color: C.green }]}>{home}</Text>
        <Text style={s.statName}>{title}</Text>
        <Text style={[s.statValue, { color: C.blue }]}>{away}</Text>
      </View>
      <View style={s.trackRow}>
        <View style={s.track}>
          <View style={{
            width: `${hp}%`, backgroundColor: C.green,
            height: 6, borderRadius: 8, alignSelf: 'flex-end'
          }} />
        </View>
        <View style={s.track}>
          <View style={{
            width: `${ap}%`, backgroundColor: C.blue,
            height: 6, borderRadius: 8
          }} />
        </View>
      </View>
    </View>
  );
}

function Player({ item }: { item: any }) {
  const a = item?.athlete || item;

  return (
    <View style={s.player}>
      <Avatar uri={playerPhoto(item)} size={42} player />
      <Text style={s.number}>{item?.jersey || a?.jersey || '—'}</Text>
      <Text style={s.playerName} numberOfLines={2}>
        {nameOf(a) || 'Jugador'}
      </Text>
    </View>
  );
}

function formationRows(roster: any) {
  const players = arr(roster?.roster).filter(
    (p: any) => p?.starter === true || p?.starter === 'true'
  );

  if (!players.length) return [];

  const formation = String(roster?.formation || '').match(/\d+/g);
  const sizes = formation ? [1, ...formation.map(Number)] : [];

  if (sizes.length && sizes.reduce((a, b) => a + b, 0) === players.length) {
    let i = 0;
    return sizes.map(n => {
      const row = players.slice(i, i + n);
      i += n;
      return row;
    });
  }

  const groups: any[][] = [[], [], [], []];

  players.forEach(p => {
    const pos = String(
      p?.position?.abbreviation || p?.position?.name || ''
    ).toUpperCase();

    if (/GK|GOALKEEPER/.test(pos)) groups[0].push(p);
    else if (/BACK|DEFENDER|^D$|CB|LB|RB|WB/.test(pos)) groups[1].push(p);
    else if (/MIDFIELD|^M$|CM|DM|AM|LM|RM/.test(pos)) groups[2].push(p);
    else groups[3].push(p);
  });

  return groups.filter(g => g.length);
}

function Pitch({ roster, reverse }: { roster: any; reverse?: boolean }) {
  const rows = formationRows(roster);
  const ordered = reverse ? [...rows].reverse() : rows;

  return (
    <View>
      <View style={s.teamTitle}>
        <Avatar uri={logoOf(roster?.team)} />
        <View style={{ flex: 1 }}>
          <Text style={s.text}>{nameOf(roster?.team)}</Text>
          <Text style={s.muted}>
            Formación: {roster?.formation || 'No publicada'}
          </Text>
          {nameOf(roster?.coach?.[0]) ? (
            <Text style={s.muted}>{nameOf(roster.coach[0])}</Text>
          ) : null}
        </View>
      </View>

      {!rows.length ? (
        <Empty message="Alineación titular todavía no publicada." />
      ) : (
        <View style={s.pitch}>
          <View pointerEvents="none" style={[
            s.penaltyArea,
            reverse ? { bottom: 0 } : { top: 0 }
          ]} />
          {ordered.map((row, i) => (
            <View key={i} style={s.formationRow}>
              {row.map((p: any, j: number) => (
                <Player key={`${p?.athlete?.id || j}-${j}`} item={p} />
              ))}
            </View>
          ))}
          <View pointerEvents="none" style={[
            s.halfCircle,
            reverse ? { top: -45 } : { bottom: -45 }
          ]} />
        </View>
      )}
    </View>
  );
}

function Substitutes({ roster }: { roster: any }) {
  const players = arr(roster?.roster).filter(
    p => p?.starter === false || p?.starter === 'false'
  );

  return (
    <Card title={`SUPLENTES · ${nameOf(roster?.team)}`}>
      {players.length ? players.map((p, i) => (
        <View style={s.eventRow} key={i}>
          <Avatar uri={playerPhoto(p)} size={42} player />
          <Text style={s.text}>{p?.jersey || '—'}</Text>
          <Text style={[s.text, { flex: 1 }]}>{nameOf(p.athlete || p)}</Text>
          <Text style={s.muted}>{p?.position?.abbreviation || ''}</Text>
        </View>
      )) : <Empty message="Suplentes no publicados." />}
    </Card>
  );
}

function eventLabel(e: any) {
  const type = String(e?.type?.text || e?.text || '');
  if (e?.scoringPlay || /goal/i.test(type)) return 'Gol';
  if (e?.redCard || /red card/i.test(type)) return 'Tarjeta roja';
  if (e?.yellowCard || /yellow card/i.test(type)) return 'Tarjeta amarilla';
  if (/substitution/i.test(type)) return 'Sustitución';
  if (/var/i.test(type)) return 'VAR';
  return type || 'Incidencia';
}

function EventList({ events, title }: { events: any[]; title: string }) {
  return (
    <Card title={title}>
      {events.length ? events.map((e, i) => {
        const athlete = e?.participants?.[0]?.athlete ||
          e?.athletesInvolved?.[0];

        const label = eventLabel(e);

        return (
          <View style={s.eventRow} key={`${e?.id || i}-${i}`}>
            <Text style={s.minute}>
              {e?.clock?.displayValue || e?.time?.displayValue || '—'}
            </Text>
            {athlete ? <Avatar uri={playerPhoto(athlete)} player /> : (
              <Ionicons
                name={label === 'Gol' ? 'football' : 'information-circle-outline'}
                color={C.green} size={25} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.text}>{nameOf(athlete) || label}</Text>
              <Text style={s.muted}>{label}</Text>
              {e?.text ? <Text style={s.muted}>{e.text}</Text> : null}
            </View>
            {label.includes('amarilla') ? <View style={s.yellow} /> : null}
            {label.includes('roja') ? <View style={s.red} /> : null}
          </View>
        );
      }) : <Empty message="No hay incidencias publicadas." />}
    </Card>
  );
}

function StandingGroups({ data }: { data: any }) {
  const groups: any[] = [];

  function walk(node: any) {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node?.standings?.entries)) {
      groups.push({
        name: node?.name || 'Clasificación',
        entries: node.standings.entries
      });
    }

    arr(node?.children).forEach(walk);
  }

  walk(data);

  if (!groups.length) return <Empty message="Clasificación no disponible." />;

  const cols = [
    ['GP', 'gamesPlayed'],
    ['G', 'wins'],
    ['E', 'ties'],
    ['P', 'losses'],
    ['DG', 'pointDifferential'],
    ['Pts', 'points']
  ];

  return (
    <View>
      {groups.map((g, gi) => (
        <Card key={gi} title={g.name}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={s.tableRow}>
                <Text style={[s.tableTeam, s.muted]}>EQUIPO</Text>
                {cols.map(c => (
                  <Text style={[s.tableCell, s.muted]} key={c[0]}>{c[0]}</Text>
                ))}
              </View>
              {g.entries.map((entry: any, i: number) => (
                <View style={s.tableRow} key={i}>
                  <View style={s.tableTeam}>
                    <Text style={s.rank}>{i + 1}</Text>
                    <Avatar uri={logoOf(entry.team)} size={25} />
                    <Text style={[s.text, { flex: 1 }]} numberOfLines={1}>
                      {nameOf(entry.team)}
                    </Text>
                  </View>
                  {cols.map(c => (
                    <Text style={s.tableCell} key={c[0]}>
                      {valueOf(arr(entry.stats).find(st => st.name === c[1]))}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </Card>
      ))}
    </View>
  );
}

export default function MatchAdvanced({ match }: { match: Match }) {
  const [tab, setTab] = useState('RESUMEN');
  const [data, setData] = useState<any>(null);
  const [standings, setStandings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const eventId = match.id.split(':').pop() || '';
  const supported = match.source === 'ESPN';

  useEffect(() => {
    let alive = true;
    let busy = false;
    setData(null);
    setStandings(null);
    setError('');
    setTab('RESUMEN');
    setLoading(true);

    if (!supported) {
      setLoading(false);
      return;
    }

    const load = async () => {
      if (busy) return;
      busy = true;

      try {
        const result = await jsonFetch(
          `${BASE}/${match.leagueCode}/summary?event=${encodeURIComponent(eventId)}`
        );

        if (alive) {
          setData(result);
          setError('');
        }
      } catch {
        if (alive) setError('No se pudo consultar ESPN. Puedes reintentar.');
      } finally {
        busy = false;
        if (alive) setLoading(false);
      }
    };

    load();

    const timer = match.status === 'live'
      ? setInterval(load, 30000)
      : undefined;

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [match.id, match.leagueCode, match.status, supported, eventId, retry]);

  useEffect(() => {
    if (tab !== 'CLASIFICACIÓN' || !supported) return;

    let alive = true;

    jsonFetch(
      `https://site.api.espn.com/apis/v2/sports/soccer/${match.leagueCode}/standings`
    ).then(r => {
      if (alive) setStandings(r);
    }).catch(() => {
      if (alive) setStandings({});
    });

    return () => { alive = false; };
  }, [tab, match.leagueCode, supported, retry]);

  const competition = data?.header?.competitions?.[0];

  const teamStats = arr(data?.boxscore?.teams);
  const homeStats = teamStats.find(t =>
    String(t?.team?.id) === String(match.homeTeamId)
  ) || teamStats.find(t => t.homeAway === 'home');

  const awayStats = teamStats.find(t =>
    String(t?.team?.id) === String(match.awayTeamId)
  ) || teamStats.find(t => t.homeAway === 'away');

  const hs = arr(homeStats?.statistics);
  const as = arr(awayStats?.statistics);

  const statNames = [...new Set(
    [...hs, ...as].map(x => String(x?.name || '')).filter(Boolean)
  )];

  const rosters = arr(data?.rosters).map(r => ({
    ...r,
    roster: arr(r?.roster).map(p => ({
      ...p,
      leagueCode: match.leagueCode
    }))
  }));
  const homeRoster = rosters.find(r =>
    String(r?.team?.id) === String(match.homeTeamId)
  ) || rosters.find(r => r.homeAway === 'home');

  const awayRoster = rosters.find(r =>
    String(r?.team?.id) === String(match.awayTeamId)
  ) || rosters.find(r => r.homeAway === 'away');

  const details = arr(competition?.details);
  const plays = arr(data?.plays);

  const events = details.length ? details : plays.length
    ? plays : arr(data?.keyEvents);

  const odds = arr(data?.pickcenter).length
    ? arr(data?.pickcenter) : arr(competition?.odds);

  const predictor = data?.predictor;
  const news = arr(data?.news?.articles);

  const statistics = () => (
    <Card title="ESTADÍSTICAS DEL PARTIDO">
      <View style={s.comparisonHeader}>
        <Avatar uri={match.homeLogo} />
        <Text style={s.muted}>Local / Visitante</Text>
        <Avatar uri={match.awayLogo} />
      </View>
      {statNames.length ? statNames.map(key => {
        const h = hs.find(x => x.name === key);
        const a = as.find(x => x.name === key);

        return <Bar key={key}
          title={labels[key] || h?.label || a?.label || key}
          home={valueOf(h)} away={valueOf(a)} />;
      }) : <Empty message="ESPN no ha publicado estadísticas de este encuentro." />}
    </Card>
  );

  const render = () => {
    switch (tab) {
      case 'ALINEACIONES':
        return (
          <View>
            {homeRoster && awayRoster ? (
              <Card title="ALINEACIONES TITULARES">
                <Pitch roster={homeRoster} />
                <Pitch roster={awayRoster} reverse />
                <Text style={s.note}>
                  Distribución orientativa según formación y orden de jugadores publicado.
                </Text>
              </Card>
            ) : (
              <View>
                {homeRoster ? <Pitch roster={homeRoster} /> : null}
                {awayRoster ? <Pitch roster={awayRoster} reverse /> : null}
                {!homeRoster && !awayRoster ? (
                  <Empty message="Las alineaciones todavía no están disponibles." />
                ) : null}
              </View>
            )}
            {homeRoster ? <Substitutes roster={homeRoster} /> : null}
            {awayRoster ? <Substitutes roster={awayRoster} /> : null}
          </View>
        );

      case 'EVENTOS':
        return (
          <View>
            <EventList title="GOLES" events={events.filter(
              e => eventLabel(e) === 'Gol'
            )} />
            <EventList title="TARJETAS" events={events.filter(
              e => /Tarjeta/.test(eventLabel(e))
            )} />
            <EventList title="VAR" events={events.filter(
              e => eventLabel(e) === 'VAR'
            )} />
            <EventList title="SUSTITUCIONES" events={events.filter(
              e => eventLabel(e) === 'Sustitución'
            )} />
            <EventList title="INCIDENCIAS DEL PARTIDO" events={events} />
            {statistics()}
          </View>
        );

      case 'DIRECTO':
        return (
          <View>
            <Card title="SEGUIMIENTO DEL PARTIDO">
              <Text style={s.text}>
                {competition?.status?.type?.description || match.statusText}
              </Text>
              <Text style={s.muted}>
                {match.status === 'live'
                  ? 'Actualización automática cada 30 segundos.'
                  : 'El partido no está actualmente en directo.'}
              </Text>
              <Pressable style={s.button} onPress={() => setRetry(x => x + 1)}>
                <Text style={s.buttonText}>Actualizar información</Text>
              </Pressable>
            </Card>
            <EventList title="MINUTO A MINUTO" events={plays.length ? plays : events} />
          </View>
        );

      case 'ESTADÍSTICAS':
        return statistics();

      case 'CLASIFICACIÓN':
        return standings ? (
          <StandingGroups data={standings} />
        ) : <ActivityIndicator color={C.green} />;

      case 'CUOTAS':
        return (
          <Card title="CUOTAS PUBLICADAS POR LA FUENTE">
            {odds.length ? odds.map((o, i) => (
              <View style={s.odds} key={i}>
                <Text style={s.text}>
                  {o?.provider?.name || 'Proveedor no indicado'}
                </Text>
                <Text style={s.muted}>
                  {o?.details || 'Mercado no indicado'}
                </Text>
                <View style={s.statRow}>
                  {[
                    ['1', o?.moneyline?.home?.close?.odds || o?.homeTeamOdds?.moneyLine],
                    ['X', o?.moneyline?.draw?.close?.odds || o?.drawOdds?.moneyLine],
                    ['2', o?.moneyline?.away?.close?.odds || o?.awayTeamOdds?.moneyLine]
                  ].map(([label, val], j) => (
                    <View style={s.oddsCell} key={j}>
                      <Text style={s.muted}>{label}</Text>
                      <Text style={s.text}>{val == null ? '—' : String(val)}</Text>
                    </View>
                  ))}
                </View>
                {o?.overUnder != null ? (
                  <Text style={s.muted}>Total: {o.overUnder}</Text>
                ) : null}
              </View>
            )) : <Empty message="No hay cuotas publicadas para este partido." />}
            <Text style={s.note}>
              Información referencial. Las cuotas pueden cambiar y conservar el formato original del proveedor. +18.
            </Text>
          </Card>
        );

      case 'PREVIA':
        return (
          <View>
            <Card title="PREVIA DEL ENCUENTRO">
              <View style={s.comparisonHeader}>
                <Avatar uri={match.homeLogo} size={58} />
                <Text style={s.text}>VS</Text>
                <Avatar uri={match.awayLogo} size={58} />
              </View>
              <Text style={s.center}>{match.home} - {match.away}</Text>
              <Text style={s.muted}>{match.league}</Text>
              <Text style={s.muted}>{match.venue || 'Estadio no indicado'}</Text>
              <Text style={s.muted}>
                {new Date(match.date).toLocaleString('es-PE', {
                  timeZone: 'America/Lima'
                })}
              </Text>
            </Card>
            <Card title="ÚLTIMOS PARTIDOS">
              {arr(data?.lastFiveGames).length ? (
                arr(data.lastFiveGames).map((team, i) => (
                  <View key={i}>
                    <Text style={s.text}>{nameOf(team?.team)}</Text>
                    {arr(team?.events).map((ev, j) => (
                      <Text key={j} style={s.history}>
                        {ev?.gameDate || ev?.date || ''} · {ev?.opponent?.displayName || ev?.opponent?.name || ''}
                        {' '}{ev?.score || ''} {ev?.gameResult || ''}
                      </Text>
                    ))}
                  </View>
                ))
              ) : <Empty message="Historial reciente no publicado." />}
            </Card>
          </View>
        );

      case 'ANÁLISIS':
        return (
          <View>
            <Card title="PROBABILIDADES PUBLICADAS">
              {predictor?.homeTeam?.gameProjection != null ||
               predictor?.awayTeam?.gameProjection != null ? (
                <View>
                  <Bar title="Proyección"
                    home={`${predictor?.homeTeam?.gameProjection ?? '—'}%`}
                    away={`${predictor?.awayTeam?.gameProjection ?? '—'}%`} />
                  <Text style={s.muted}>
                    Empate: {predictor?.homeTeam?.tie ?? predictor?.awayTeam?.tie ?? 'No publicado'}
                  </Text>
                </View>
              ) : <Empty message="Este partido no tiene predicciones verificables publicadas." />}
            </Card>
            {statistics()}
            <Text style={s.note}>
              No se generan valores ELO, xG ni probabilidades ficticias.
            </Text>
          </View>
        );

      case 'NOTICIAS':
        return (
          <Card title="NOTICIAS RELACIONADAS">
            {news.length ? news.map((n, i) => {
              const url = n?.links?.web?.href || n?.links?.mobile?.href;
              const photo = n?.images?.[0]?.url;

              return (
                <Pressable key={i} style={s.article}
                  onPress={() => {
                    if (url && /^https:\/\//i.test(url)) {
                      Linking.openURL(url).catch(() => {});
                    }
                  }}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={s.articlePhoto} />
                  ) : null}
                  <Text style={s.text}>{n?.headline || n?.title}</Text>
                  <Text style={s.muted}>{n?.description || ''}</Text>
                </Pressable>
              );
            }) : <Empty message="No hay noticias asociadas al encuentro." />}
          </Card>
        );

      default:
        return (
          <View>
            <Card title="MARCADOR ACTUALIZADO">
              <View style={s.comparisonHeader}>
                <Avatar uri={match.homeLogo} size={48} />
                <Text style={s.score}>
                  {competition?.competitors?.find((x: any) => x.homeAway === 'home')?.score ?? match.homeScore ?? '—'}
                  {' - '}
                  {competition?.competitors?.find((x: any) => x.homeAway === 'away')?.score ?? match.awayScore ?? '—'}
                </Text>
                <Avatar uri={match.awayLogo} size={48} />
              </View>
              <Text style={s.center}>
                {competition?.status?.type?.detail || match.statusText}
              </Text>
            </Card>
            <EventList title="GOLES DEL PARTIDO"
              events={events.filter(e => eventLabel(e) === 'Gol')} />
            {statistics()}
          </View>
        );
    }
  };

  return (
    <View style={s.root}>
      <ScrollView horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabScroll}
        contentContainerStyle={s.tabs}>
        {TABS.map(t => (
          <Pressable key={t} onPress={() => setTab(t)}
            style={[s.tab, tab === t && s.activeTab]}>
            <Text style={[s.tabText, tab === t && s.activeText]}>{t}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {!supported ? (
        <Empty message="TheSportsDB ofrece cobertura limitada para este partido." />
      ) : loading ? (
        <View style={s.empty}>
          <ActivityIndicator size="large" color={C.green} />
          <Text style={s.muted}>Cargando datos del partido...</Text>
        </View>
      ) : error && !data ? (
        <View>
          <Empty message={error} />
          <Pressable style={s.button} onPress={() => setRetry(x => x + 1)}>
            <Text style={s.buttonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <View>
          {error ? <Text style={s.note}>{error} Mostrando datos anteriores.</Text> : null}
          {render()}
        </View>
      )}

      <Text style={s.note}>Fuente: ESPN · Cobertura según competición.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { marginTop: 14, marginBottom: 20 },
  text: { color: C.white, fontSize: 14, fontWeight: '600' },
  muted: { color: C.gray, fontSize: 12, lineHeight: 19 },
  center: { color: C.white, textAlign: 'center', padding: 8 },
  score: { color: C.white, fontSize: 30, fontWeight: '700' },
  tabs: { flexDirection: 'row' },
  tabScroll: { marginBottom: 12, backgroundColor: C.bg },
  tab: { paddingHorizontal: 15, paddingVertical: 16, borderBottomWidth: 3, borderColor: 'transparent' },
  activeTab: { borderColor: C.green },
  tabText: { color: C.gray, fontSize: 12, fontWeight: '600' },
  activeText: { color: C.white },
  card: { backgroundColor: C.card, borderRadius: 9, marginBottom: 10, overflow: 'hidden' },
  cardTitle: { color: C.white, fontSize: 13, fontWeight: '800', padding: 14, borderBottomWidth: 1, borderColor: C.line },
  cardBody: { padding: 10 },
  empty: { padding: 24, alignItems: 'center', gap: 9 },
  note: { color: C.gray, fontSize: 11, textAlign: 'center', lineHeight: 17, padding: 10 },
  comparisonHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  stat: { paddingVertical: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statName: { color: C.white, fontSize: 13, textAlign: 'center', flex: 1 },
  statValue: { fontSize: 16, fontWeight: '700', minWidth: 43, textAlign: 'center' },
  trackRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  track: { flex: 1, height: 6, backgroundColor: '#888888', borderRadius: 8 },
  teamTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  pitch: { backgroundColor: '#353A37', borderColor: '#737B75', borderWidth: 2, overflow: 'hidden', paddingVertical: 14 },
  formationRow: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', minHeight: 78 },
  penaltyArea: { position: 'absolute', alignSelf: 'center', width: '48%', height: 70, borderWidth: 2, borderColor: '#737B75' },
  halfCircle: { position: 'absolute', alignSelf: 'center', width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#737B75' },
  player: { flex: 1, alignItems: 'center', maxWidth: 98, zIndex: 2, paddingHorizontal: 2 },
  playerName: { color: C.white, fontSize: 10, fontWeight: '600', textAlign: 'center', backgroundColor: '#161916', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, marginTop: 3 },
  number: { color: C.white, backgroundColor: '#161916', borderRadius: 10, minWidth: 20, fontSize: 10, textAlign: 'center', marginTop: -8, paddingVertical: 2, paddingHorizontal: 5 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line },
  minute: { color: C.green, fontWeight: '800', minWidth: 30, fontSize: 12 },
  yellow: { width: 12, height: 17, backgroundColor: C.yellow, borderRadius: 2 },
  red: { width: 12, height: 17, backgroundColor: '#FF4545', borderRadius: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 46, borderBottomWidth: 1, borderColor: C.line },
  tableTeam: { width: 165, flexDirection: 'row', alignItems: 'center', gap: 7 },
  tableCell: { width: 39, color: C.white, fontSize: 12, textAlign: 'center' },
  rank: { color: C.green, fontWeight: '800', width: 22, textAlign: 'center' },
  odds: { padding: 12, borderBottomWidth: 1, borderColor: C.line, gap: 8 },
  oddsCell: { flex: 1, backgroundColor: C.raised, padding: 12, borderRadius: 6, alignItems: 'center' },
  button: { backgroundColor: '#087F55', padding: 13, borderRadius: 8, marginVertical: 10, alignItems: 'center' },
  buttonText: { color: C.white, fontWeight: '700' },
  history: { color: C.gray, padding: 9, borderBottomWidth: 1, borderColor: C.line },
  article: { paddingVertical: 12, gap: 8 },
  articlePhoto: { width: '100%', height: 150, borderRadius: 8 }
});