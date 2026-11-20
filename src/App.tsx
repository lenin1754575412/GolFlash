import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Section = 'Partidos' | 'Favorito' | 'Explorar' | 'Fichaje' | 'Noticia';
type DayTab = 'AYER' | 'HOY' | 'DIRECTO' | 'MAÑANA';
type Match = {
  id: number;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  utcDate: string;
  league: string;
};

const COLORS = {
  background: '#202020',
  card: '#303030',
  cardStrong: '#353535',
  border: '#414141',
  white: '#F1F1F1',
  muted: '#A7A7A7',
  green: '#45AE31',
};

// No pegues una clave privada aquí si subirás la app a un repositorio público.
// Para partidos reales configura un servidor/proxy propio que devuelva
// { matches: [...] } de football-data.org, con la API Key guardada en el servidor.
// Ejemplo de URL: https://tu-servidor.com/api/matches
const MATCHES_URL = ''; // Escribe aquí la URL HTTPS de tu API propia cuando la tengas.
const FAVORITES_KEY = '@golflash_favorites_v1';
const sections: { key: Section; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'Partidos', icon: 'grid-outline' },
  { key: 'Favorito', icon: 'star-outline' },
  { key: 'Explorar', icon: 'radio-button-on-outline' },
  { key: 'Fichaje', icon: 'swap-horizontal-outline' },
  { key: 'Noticia', icon: 'newspaper-outline' },
];
const dayTabs: DayTab[] = ['AYER', 'HOY', 'DIRECTO', 'MAÑANA'];

function peruDayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find(p => p.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}
function shiftedPeruDay(offset: number): string {
  const [year, month, day] = peruDayKey(new Date()).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + offset, 12)).toISOString().slice(0, 10);
}
const isLive = (status: string): boolean => ['IN_PLAY', 'PAUSED', 'LIVE'].includes(status);
const isDone = (status: string): boolean => ['FINISHED', 'AWARDED'].includes(status);
const toMatch = (source: any): Match => ({
  id: Number(source.id),
  home: String(source.homeTeam?.shortName || source.homeTeam?.name || source.home || 'Local'),
  away: String(source.awayTeam?.shortName || source.awayTeam?.name || source.away || 'Visitante'),
  homeScore: typeof source.score?.fullTime?.home === 'number'
    ? source.score.fullTime.home : typeof source.homeScore === 'number' ? source.homeScore : null,
  awayScore: typeof source.score?.fullTime?.away === 'number'
    ? source.score.fullTime.away : typeof source.awayScore === 'number' ? source.awayScore : null,
  status: String(source.status || 'SCHEDULED'),
  utcDate: String(source.utcDate || source.date || ''),
  league: String(source.competition?.name || source.league || 'Partido'),
});
function formatHour(utcDate: string): string {
  if (!utcDate) return '--:--';
  try {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(utcDate));
  } catch {
    return '--:--';
  }
}

export default function App() {
  const [section, setSection] = useState<Section>('Explorar');
  const [day, setDay] = useState<DayTab>('MAÑANA');
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Match | null>(null);
  const searchRef = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY)
      .then(value => {
        if (value) {
          const parsed: unknown = JSON.parse(value);
          if (Array.isArray(parsed)) setFavorites(parsed.filter((n): n is number => typeof n === 'number'));
        }
      })
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    if (!MATCHES_URL.trim()) {
      setMatches([]);
      setError('Configura la API de partidos reales para consultar los encuentros.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(MATCHES_URL);
      if (!response.ok) throw new Error(`Error al consultar los partidos (${response.status}).`);
      const result = await response.json();
      const received = Array.isArray(result) ? result : result?.matches;
      if (!Array.isArray(received)) throw new Error('El servidor no devolvió una lista de partidos.');
      setMatches(received.map(toMatch).filter(item => Number.isFinite(item.id)));
    } catch (e: any) {
      setMatches([]);
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los partidos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!MATCHES_URL.trim()) return;
    const timer = setInterval(refresh, 120000);
    return () => clearInterval(timer);
  }, [refresh]);

  const toggleFavorite = useCallback((id: number) => {
    setFavorites(previous => {
      const next = previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const visibleMatches = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    let items = matches.filter(m =>
      `${m.home} ${m.away} ${m.league}`.toLocaleLowerCase('es').includes(normalized)
    );
    if (section === 'Favorito') return items.filter(m => favorites.includes(m.id));
    if (day === 'DIRECTO') return items.filter(m => isLive(m.status));
    const target = shiftedPeruDay(day === 'AYER' ? -1 : day === 'MAÑANA' ? 1 : 0);
    return items.filter(m => {
      if (!m.utcDate) return false;
      const parsed = new Date(m.utcDate);
      return !Number.isNaN(parsed.getTime()) && peruDayKey(parsed) === target;
    });
  }, [query, matches, section, favorites, day]);

  const chooseSection = (next: Section) => {
    setSection(next);
    setSelected(null);
    setMenuOpen(false);
    Keyboard.dismiss();
  };

  const MatchCard = ({ match }: { match: Match }) => (
    <Pressable style={styles.matchCard} onPress={() => setSelected(match)}>
      <View style={styles.matchHeader}>
        <Text style={styles.leagueText} numberOfLines={1}>{match.league}</Text>
        <Text style={styles.leagueText}>{isLive(match.status) ? '● EN VIVO' : isDone(match.status) ? 'FINAL' : formatHour(match.utcDate)}</Text>
      </View>
      <View style={styles.teamsRow}>
        <Text style={styles.teamName} numberOfLines={2}>{match.home}</Text>
        <Text style={styles.score}>{match.homeScore != null && match.awayScore != null ? `${match.homeScore} - ${match.awayScore}` : 'VS'}</Text>
        <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={2}>{match.away}</Text>
      </View>
      <Pressable style={styles.favoriteAction} onPress={() => toggleFavorite(match.id)}>
        <Ionicons name={favorites.includes(match.id) ? 'star' : 'star-outline'} color={favorites.includes(match.id) ? COLORS.green : COLORS.muted} size={21} />
        <Text style={styles.smallText}>{favorites.includes(match.id) ? 'Guardado' : 'Favorito'}</Text>
      </Pressable>
    </Pressable>
  );

  const showMatches = section === 'Partidos' || section === 'Explorar' || section === 'Favorito';
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <View style={styles.topBar}>
        <Pressable style={styles.iconButton} onPress={() => setMenuOpen(value => !value)} accessibilityLabel="Abrir menú">
          <Ionicons name={menuOpen ? 'close-outline' : 'menu-outline'} color={COLORS.white} size={32} />
        </Pressable>
        <Pressable style={styles.brand} onPress={() => chooseSection('Explorar')}>
          <Ionicons name="square-outline" color={COLORS.white} size={23} />
          <Text style={styles.brandText}>GOLFLASH</Text>
        </Pressable>
        <View style={styles.topBarRight}>
          <Pressable style={styles.iconButton} onPress={() => chooseSection('Partidos')} accessibilityLabel="Ver partidos">
            <Ionicons name="grid-outline" color={COLORS.white} size={25} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => { chooseSection('Explorar'); setTimeout(() => searchRef.current?.focus(), 100); }} accessibilityLabel="Buscar">
            <Ionicons name="search-outline" color={COLORS.white} size={27} />
          </Pressable>
        </View>
      </View>

      {menuOpen && (
        <View style={styles.menuPanel}>
          <Text style={styles.menuTitle}>MENÚ GOLFLASH</Text>
          {sections.map(item => (
            <Pressable key={item.key} style={styles.menuItem} onPress={() => chooseSection(item.key)}>
              <Ionicons name={item.icon} color={section === item.key ? COLORS.green : COLORS.white} size={22} />
              <Text style={[styles.menuItemText, section === item.key && { color: COLORS.green }]}>{item.key}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); refresh(); }}>
            <Ionicons name="refresh-outline" color={COLORS.white} size={22} />
            <Text style={styles.menuItemText}>Actualizar partidos</Text>
          </Pressable>
        </View>
      )}

      {selected ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          <Pressable onPress={() => setSelected(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={21} color={COLORS.white} />
            <Text style={styles.backText}>Volver a partidos</Text>
          </Pressable>
          <View style={styles.detailCard}>
            <Text style={styles.detailLeague}>{selected.league}</Text>
            <Text style={styles.detailScore}>{selected.homeScore == null || selected.awayScore == null ? 'VS' : `${selected.homeScore} - ${selected.awayScore}`}</Text>
            <Text style={styles.detailTeams}>{selected.home}  ·  {selected.away}</Text>
            <Text style={styles.detailMeta}>Hora Perú: {formatHour(selected.utcDate)}  ·  {selected.status}</Text>
            <Pressable style={styles.detailFavorite} onPress={() => toggleFavorite(selected.id)}>
              <Ionicons name={favorites.includes(selected.id) ? 'star' : 'star-outline'} color={COLORS.green} size={22} />
              <Text style={styles.detailFavoriteText}>{favorites.includes(selected.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : showMatches ? (
        <>
          {section !== 'Favorito' && (
            <View style={styles.dayTabs}>
              {dayTabs.map(label => (
                <Pressable key={label} style={styles.dayTab} onPress={() => setDay(label)}>
                  <Text style={[styles.dayText, day === label && styles.dayTextActive]}>{label}</Text>
                  {day === label && <View style={styles.indicator} />}
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.searchBox}>
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              placeholder="Buscar equipo o liga"
              placeholderTextColor={COLORS.muted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.length > 0 && <Pressable onPress={() => setQuery('')}><Ionicons name="close-circle" size={20} color={COLORS.muted} /></Pressable>}
          </View>
          {loading && <ActivityIndicator style={{ marginTop: 16 }} color={COLORS.green} size="large" />}
          {!loading && !!error && section !== 'Favorito' && (
            <View style={styles.notice}><Text style={styles.noticeText}>{error}</Text></View>
          )}
          {!loading && !error && visibleMatches.length === 0 && (
            <View style={styles.notice}><Text style={styles.noticeText}>No hay partidos disponibles para esta selección.</Text></View>
          )}
          {!loading && section === 'Favorito' && visibleMatches.length === 0 && (
            <View style={styles.notice}><Text style={styles.noticeText}>Aún no tienes partidos favoritos. Marca la estrella de un partido para guardarlo aquí.</Text></View>
          )}
          <FlatList
            style={styles.matchList}
            data={visibleMatches}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => <MatchCard match={item} />}
            contentContainerStyle={styles.matchListInner}
            keyboardShouldPersistTaps="handled"
            onRefresh={refresh}
            refreshing={loading}
          />
        </>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          <Text style={styles.pageTitle}>{section === 'Fichaje' ? 'Fichajes' : 'Noticias'}</Text>
          <View style={styles.noticeAlt}>
            <Ionicons name={section === 'Fichaje' ? 'swap-horizontal-outline' : 'newspaper-outline'} color={COLORS.green} size={31} />
            <Text style={styles.noticeText}>{section === 'Fichaje'
              ? 'Aquí aparecerán los fichajes cuando conectes una fuente de transferencias verificadas.'
              : 'Aquí aparecerán las noticias cuando conectes una fuente de información deportiva.'}</Text>
            <Pressable style={styles.externalLink} onPress={() => Linking.openURL(section === 'Fichaje' ? 'https://www.fifa.com/' : 'https://www.espn.com/soccer/').catch(() => {})}>
              <Text style={styles.externalLinkText}>Consultar fuente deportiva</Text>
              <Ionicons name="open-outline" size={17} color={COLORS.green} />
            </Pressable>
          </View>
        </ScrollView>
      )}

      <View style={styles.bottomNav}>
        {sections.map(item => (
          <Pressable key={item.key} style={styles.bottomItem} onPress={() => chooseSection(item.key)} accessibilityLabel={item.key}>
            <Ionicons name={item.icon} color={section === item.key ? COLORS.green : COLORS.muted} size={29} />
            <Text style={[styles.bottomLabel, section === item.key && styles.bottomLabelActive]}>{item.key}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { height: 98, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandText: { color: COLORS.white, fontSize: 24, fontWeight: '400', letterSpacing: .3 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 43, height: 48, alignItems: 'center', justifyContent: 'center' },
  dayTabs: { height: 67, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-around', marginBottom: 17 },
  dayTab: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  dayText: { color: COLORS.muted, fontSize: 13.5, fontWeight: '500' },
  dayTextActive: { color: COLORS.white },
  indicator: { position: 'absolute', bottom: 0, left: '18%', right: '18%', height: 4, backgroundColor: COLORS.green },
  searchBox: { height: 66, marginHorizontal: 14, marginBottom: 17, backgroundColor: COLORS.card, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 16, height: '100%' },
  notice: { marginHorizontal: 14, marginTop: 0, paddingHorizontal: 22, paddingVertical: 27, borderRadius: 13, backgroundColor: COLORS.cardStrong, alignItems: 'center' },
  noticeText: { color: COLORS.muted, textAlign: 'center', fontSize: 15.5, lineHeight: 24 },
  matchList: { flex: 1 },
  matchListInner: { paddingHorizontal: 14, paddingTop: 9, paddingBottom: 20 },
  matchCard: { backgroundColor: COLORS.card, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, padding: 18, marginBottom: 12 },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  leagueText: { color: COLORS.muted, fontSize: 12, flexShrink: 1 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 26, marginBottom: 12, gap: 8 },
  teamName: { flex: 1, color: COLORS.white, fontSize: 15, fontWeight: '600' },
  score: { color: COLORS.white, fontWeight: '800', fontSize: 24 },
  favoriteAction: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 7, paddingTop: 9 },
  smallText: { color: COLORS.muted, fontSize: 12 },
  bottomNav: { height: 85, borderTopWidth: 1, borderTopColor: '#424242', flexDirection: 'row', backgroundColor: COLORS.background, alignItems: 'center' },
  bottomItem: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bottomLabel: { color: COLORS.muted, fontSize: 12 },
  bottomLabelActive: { color: COLORS.green },
  menuPanel: { position: 'absolute', zIndex: 20, top: 95, left: 0, width: '78%', borderRightWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, padding: 18, backgroundColor: '#292929' },
  menuTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12, color: COLORS.muted },
  menuItem: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 15, borderBottomWidth: 1, borderBottomColor: '#393939' },
  menuItemText: { color: COLORS.white, fontSize: 16 },
  content: { flex: 1 },
  contentInner: { padding: 16, paddingTop: 22 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  backText: { color: COLORS.white, fontSize: 16 },
  detailCard: { backgroundColor: COLORS.card, borderRadius: 13, padding: 24, alignItems: 'center' },
  detailLeague: { color: COLORS.muted, fontSize: 14 },
  detailScore: { color: COLORS.white, fontSize: 36, fontWeight: '800', marginTop: 26 },
  detailTeams: { color: COLORS.white, textAlign: 'center', fontSize: 16, marginTop: 12 },
  detailMeta: { color: COLORS.muted, fontSize: 12, marginTop: 18 },
  detailFavorite: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 20 },
  detailFavoriteText: { color: COLORS.green, fontSize: 14 },
  pageTitle: { color: COLORS.white, fontSize: 25, fontWeight: '600', marginBottom: 20 },
  noticeAlt: { borderRadius: 13, backgroundColor: COLORS.card, padding: 28, alignItems: 'center', gap: 20 },
  externalLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  externalLinkText: { color: COLORS.green, fontSize: 15 },
});
