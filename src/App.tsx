import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, AppState, Image, Linking, Modal, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import type { Article, Match, Section } from './types';
import { dayFromOffset, getMatches, LEAGUES, matchDayText, matchHour, peruKey } from './services/football';
import { getNews } from './services/news';

const C = {
  bg: '#1F1F1F', surface: '#303030', card: '#303030', raised: '#393939',
  line: '#414141', white: '#F2F2F2', subtle: '#ABABAB', green: '#4AAE39',
  red: '#EE6868', shade: 'rgba(0,0,0,0.68)',
};
const FAVORITES_KEY = '@golflash/matches/favs-v2';
const NEWS_CACHE_KEY = '@golflash/articles/cache-v2';
const MATCH_CACHE_PREFIX = '@golflash/matches/day-v2-';

type IconName = keyof typeof Ionicons.glyphMap;
const NAV: { label: Section; icon: IconName; onIcon: IconName }[] = [
  { label: 'Partidos', icon: 'grid-outline', onIcon: 'grid' },
  { label: 'Favorito', icon: 'star-outline', onIcon: 'star' },
  { label: 'Explorar', icon: 'radio-button-on-outline', onIcon: 'radio-button-on' },
  { label: 'Fichaje', icon: 'swap-horizontal-outline', onIcon: 'swap-horizontal' },
  { label: 'Noticia', icon: 'newspaper-outline', onIcon: 'newspaper' },
];

function isLive(m: Match): boolean { return m.status === 'live'; }
function scoreText(m: Match): string {
  if (m.status === 'scheduled' || m.status === 'postponed') return 'VS';
  if (m.homeScore == null || m.awayScore == null) return 'VS';
  return `${m.homeScore} - ${m.awayScore}`;
}
function matchState(m: Match): string {
  if (isLive(m)) return m.minute || 'EN VIVO';
  if (m.status === 'finished') return 'FINAL';
  if (m.status === 'postponed') return 'APLAZADO';
  return matchHour(m.date);
}
function publishedText(value?: string): string {
  if (!value) return 'Fecha no indicada';
  try {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima', day: '2-digit', month: 'short', year: 'numeric',
    }).format(new Date(value));
  } catch { return value; }
}
async function openPage(url?: string) {
  if (!url || !/^https:\/\//i.test(url)) {
    Alert.alert('Enlace no disponible', 'Esta fuente no proporcionó un enlace válido.');
    return;
  }
  try { await Linking.openURL(url); }
  catch { Alert.alert('No se pudo abrir', 'Comprueba tu conexión e inténtalo de nuevo.'); }
}

function Logo({ url, size = 32 }: { url?: string; size?: number }) {
  return url && /^https:\/\//.test(url)
    ? <Image source={{ uri: url }} style={{ width: size, height: size }} resizeMode="contain" />
    : <View style={[styles.emptyLogo, { width: size, height: size }]}><Ionicons name="shield-outline" size={size * .62} color={C.subtle} /></View>;
}

export default function App() {
  const [section, setSection] = useState<Section>('Explorar');
  const [offset, setOffset] = useState(0);
  const [direct, setDirect] = useState(false);
  const [search, setSearch] = useState('');
  const [league, setLeague] = useState('TODAS');
  const [drawer, setDrawer] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const [about, setAbout] = useState(false);
  const [selected, setSelected] = useState<Match | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [favorites, setFavorites] = useState<Match[]>([]);
  const [ready, setReady] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [error, setError] = useState('');
  const [newsError, setNewsError] = useState('');
  const [warning, setWarning] = useState('');
  const [newsWarning, setNewsWarning] = useState('');
  const [source, setSource] = useState('ESPN');
  const [cached, setCached] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [appActive, setAppActive] = useState(true);
  const searchRef = useRef<TextInput>(null);
  const matchReq = useRef(0);
  const newsReq = useRef(0);
  const matchDate = direct ? dayFromOffset(0) : dayFromOffset(offset);
  const isMatchSection = section === 'Partidos' || section === 'Explorar' || section === 'Favorito';

  useEffect(() => {
    const listener = AppState.addEventListener('change', value => setAppActive(value === 'active'));
    return () => listener.remove();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [savedMatches, savedNews] = await Promise.all([
          AsyncStorage.getItem(FAVORITES_KEY), AsyncStorage.getItem(NEWS_CACHE_KEY),
        ]);
        if (!alive) return;
        if (savedMatches) {
          const parsed = JSON.parse(savedMatches);
          if (Array.isArray(parsed)) setFavorites(parsed.filter((x): x is Match => typeof x?.id === 'string' && !!x?.date));
        }
        if (savedNews) {
          const parsed = JSON.parse(savedNews);
          if (Array.isArray(parsed)) setArticles(parsed.filter((x): x is Article => typeof x?.id === 'string' && typeof x?.title === 'string'));
        }
      } catch { /* Si el almacenamiento está dañado, se inicia vacío. */ }
      finally { if (alive) setReady(true); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)).catch(() => {});
  }, [favorites, ready]);

  const refreshMatches = useCallback(async () => {
    const rid = ++matchReq.current;
    setLoading(true); setError('');
    const cacheKey = MATCH_CACHE_PREFIX + matchDate;
    try {
      const stored = await AsyncStorage.getItem(cacheKey);
      if (rid !== matchReq.current) return;
      if (stored) {
        const parsed: any = JSON.parse(stored);
        if (Array.isArray(parsed?.matches)) {
          setMatches(parsed.matches);
          setCached(true);
          setSource(String(parsed.source || 'ESPN'));
          setLastUpdated(String(parsed.updated || ''));
        }
      } else {
        setMatches([]);
        setCached(false);
      }
    } catch { setMatches([]); }
    try {
      const result = await getMatches(matchDate);
      if (rid !== matchReq.current) return;
      setMatches(result.matches);
      setSource(result.source);
      setCached(false);
      setWarning(result.warning || '');
      const updated = new Date().toISOString();
      setLastUpdated(updated);
      AsyncStorage.setItem(cacheKey, JSON.stringify({ matches: result.matches, source: result.source, updated })).catch(() => {});
      const currentById = new Map(result.matches.map(m => [m.id, m]));
      setFavorites(existing => existing.map(m => currentById.get(m.id) || m));
    } catch (cause: any) {
      if (rid !== matchReq.current) return;
      setError('No se pudo conectar con los resultados deportivos. Puedes reintentar o consultar datos guardados.');
      setCached(true);
      setWarning('La información que se muestre puede estar desactualizada.');
    } finally { if (rid === matchReq.current) setLoading(false); }
  }, [matchDate]);

  const refreshNews = useCallback(async () => {
    const rid = ++newsReq.current;
    setNewsLoading(true); setNewsError('');
    try {
      const result = await getNews();
      if (rid !== newsReq.current) return;
      setArticles(result.articles);
      setNewsWarning(result.warning || '');
      AsyncStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(result.articles)).catch(() => {});
    } catch {
      if (rid !== newsReq.current) return;
      setNewsError('No se pudieron actualizar las noticias. Si ves artículos, son datos guardados.');
    } finally { if (rid === newsReq.current) setNewsLoading(false); }
  }, []);

  useEffect(() => {
    if (!appActive) return;
    refreshMatches();
    const timer = setInterval(refreshMatches, 90000);
    return () => { clearInterval(timer); matchReq.current++; };
  }, [refreshMatches, appActive]);

  useEffect(() => {
    if (!appActive || (section !== 'Fichaje' && section !== 'Noticia')) return;
    refreshNews();
    const timer = setInterval(refreshNews, 10 * 60 * 1000);
    return () => { clearInterval(timer); newsReq.current++; };
  }, [section, appActive, refreshNews]);

  const toggleFavorite = useCallback((match: Match) => {
    setFavorites(old => old.some(m => m.id === match.id)
      ? old.filter(m => m.id !== match.id) : [match, ...old]);
  }, []);
  const favoriteIds = useMemo(() => new Set(favorites.map(m => m.id)), [favorites]);
  const query = search.trim().toLocaleLowerCase('es-PE');
  const filtered = useMemo(() => {
    const base = section === 'Favorito' ? favorites : matches;
    return base
      .filter(m => section === 'Favorito' || (direct
        ? m.status === 'live'
        : peruKey(new Date(m.date)) === matchDate))
      .filter(m => section !== 'Explorar' || league === 'TODAS' || m.leagueCode === league)
      .filter(m => `${m.home} ${m.away} ${m.league}`.toLocaleLowerCase('es-PE').includes(query))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [matches, favorites, section, direct, matchDate, league, query]);
  const filteredArticles = useMemo(() => articles
    .filter(a => section !== 'Fichaje' || a.isTransfer)
    .filter(a => `${a.title} ${a.description} ${a.league}`.toLocaleLowerCase('es-PE').includes(query)),
  [articles, section, query]);

  function navigate(next: Section) {
    setSection(next); setDrawer(false); setSelected(null); setSearch('');
  }
  function chooseDay(day: 'AYER' | 'HOY' | 'DIRECTO' | 'MAÑANA') {
    setDirect(day === 'DIRECTO');
    if (day !== 'DIRECTO') setOffset(day === 'AYER' ? -1 : day === 'MAÑANA' ? 1 : 0);
    setDrawer(false);
  }
  function tabIsActive(day: string): boolean {
    return day === 'DIRECTO' ? direct : !direct && offset === (day === 'AYER' ? -1 : day === 'MAÑANA' ? 1 : 0);
  }

  const articleHeader = section === 'Fichaje' ? 'Mercado de fichajes' : 'Últimas noticias';
  const visibleDay = direct ? 'DIRECTO' : offset === -1 ? 'AYER' : offset === 0 ? 'HOY' : offset === 1 ? 'MAÑANA' : matchDayText(`${matchDate}T12:00:00Z`);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="light" backgroundColor={C.bg} />
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => setDrawer(true)} accessibilityLabel="Abrir menú">
          <Ionicons name="menu-outline" size={32} color={C.white} />
        </Pressable>
        <Pressable style={styles.brand} onPress={() => navigate('Partidos')}>
          <Ionicons name="square-outline" color={C.white} size={22} />
          <Text style={styles.brandName}>GOLFLASH</Text>
        </Pressable>
        <Pressable style={styles.headerButton} onPress={() => setCalendar(true)} accessibilityLabel="Seleccionar fecha">
          <Ionicons name="calendar-outline" size={24} color={C.white} />
        </Pressable>
        <Pressable style={styles.headerButton} onPress={() => {
          if (!isMatchSection) navigate('Explorar');
          setTimeout(() => searchRef.current?.focus(), 80);
        }} accessibilityLabel="Buscar">
          <Ionicons name="search-outline" size={26} color={C.white} />
        </Pressable>
      </View>

      {selected ? (
        <ScrollView style={styles.flex} contentContainerStyle={styles.contentPadding}>
          <Pressable onPress={() => setSelected(null)} style={styles.backLine}>
            <Ionicons name="arrow-back" size={19} color={C.white} />
            <Text style={styles.backLineText}>Volver</Text>
          </Pressable>
          <View style={styles.detailCard}>
            <Text style={styles.secondaryLabel}>{selected.league}</Text>
            <Text style={[styles.detailStatus, isLive(selected) && { color: C.red }]}>{matchState(selected)}</Text>
            <View style={styles.detailTeamsRow}>
              <View style={styles.detailTeam}><Logo url={selected.homeLogo} size={56} /><Text style={styles.detailTeamText}>{selected.home}</Text></View>
              <Text style={styles.detailScore}>{scoreText(selected)}</Text>
              <View style={styles.detailTeam}><Logo url={selected.awayLogo} size={56} /><Text style={styles.detailTeamText}>{selected.away}</Text></View>
            </View>
            <Text style={styles.dimText}>{matchDayText(selected.date)} · {matchHour(selected.date)} (Perú)</Text>
            {selected.venue ? <Text style={[styles.dimText, { marginTop: 8 }]}>{selected.venue}</Text> : null}
          </View>
          <View style={styles.detailActions}>
            <Pressable style={styles.actionButton} onPress={() => toggleFavorite(selected)}>
              <Ionicons name={favoriteIds.has(selected.id) ? 'star' : 'star-outline'} color={C.green} size={22} />
              <Text style={styles.actionLabel}>{favoriteIds.has(selected.id) ? 'Quitar favorito' : 'Guardar favorito'}</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => openPage(selected.link)}>
              <Ionicons name="open-outline" color={C.green} size={21} />
              <Text style={styles.actionLabel}>Ver en {selected.source}</Text>
            </Pressable>
          </View>
          <Text style={styles.sectionTitle}>Información del partido</Text>
          <View style={styles.informationBox}>
            <Text style={styles.infoRow}>Estado: {selected.statusText}</Text>
            <Text style={styles.infoRow}>Competición: {selected.league}</Text>
            <Text style={styles.infoRow}>Fuente: {selected.source}</Text>
            <Text style={[styles.dimText, { marginTop: 16 }]}>Los eventos y estadísticas detalladas dependen de la fuente. Abre el enlace original para consultar más información.</Text>
          </View>
        </ScrollView>
      ) : (
        <>
          {isMatchSection && section !== 'Favorito' ? (
            <View style={styles.daysRow}>
              {(['AYER', 'HOY', 'DIRECTO', 'MAÑANA'] as const).map(tab => (
                <Pressable key={tab} onPress={() => chooseDay(tab)} style={styles.dayItem}>
                  <Text style={[styles.dayLabel, tabIsActive(tab) && styles.activeDayLabel]}>{tab}</Text>
                  {tabIsActive(tab) ? <View style={styles.dayIndicator} /> : null}
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.pageHeading}>
              <Text style={styles.pageTitle}>{section === 'Favorito' ? 'Mis favoritos' : articleHeader}</Text>
              <Pressable onPress={() => section === 'Favorito' ? navigate('Partidos') : refreshNews()} accessibilityLabel="Actualizar">
                <Ionicons name="refresh-outline" color={C.green} size={23} />
              </Pressable>
            </View>
          )}

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={19} color={C.subtle} />
            <TextInput
              ref={searchRef} style={styles.searchField} value={search} onChangeText={setSearch}
              placeholder={isMatchSection ? 'Buscar equipo o liga' : 'Buscar en las noticias'}
              placeholderTextColor={C.subtle} returnKeyType="search"
            />
            {search ? <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={20} color={C.subtle} /></Pressable> : null}
          </View>

          {section === 'Explorar' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leaguesScroll} contentContainerStyle={styles.leaguesContent}>
              {[{ code: 'TODAS', name: 'Todas las ligas' }, ...LEAGUES].map(l => (
                <Pressable onPress={() => setLeague(l.code)} key={l.code} style={[styles.leagueChip, league === l.code && styles.chipActive]}>
                  <Text style={[styles.leagueChipText, league === l.code && styles.leagueChipTextActive]}>{l.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {isMatchSection ? (
            <ScrollView
              style={styles.flex} contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshMatches} tintColor={C.green} colors={[C.green]} />}>
              <View style={styles.headingRow}>
                <View style={styles.flex}>
                  <Text style={styles.listTitle}>{section === 'Favorito' ? 'Partidos guardados' : direct ? 'Partidos en directo' : `Partidos · ${visibleDay}`}</Text>
                  {section !== 'Favorito' ? <Text style={styles.sourceText}>{matchDayText(`${matchDate}T12:00:00Z`)} · Fuente {source}{cached ? ' · Caché' : ''}</Text> : null}
                </View>
                <Pressable onPress={refreshMatches} style={styles.refreshButton} accessibilityLabel="Actualizar partidos">
                  <Ionicons name="refresh-outline" color={C.green} size={23} />
                </Pressable>
              </View>
              {loading && matches.length === 0 ? <ActivityIndicator color={C.green} size="large" style={{ marginVertical: 24 }} /> : null}
              {error && section !== 'Favorito' ? <View style={styles.warningBox}><Ionicons name="cloud-offline-outline" size={19} color={C.subtle} /><Text style={styles.warningText}>{error}</Text></View> : null}
              {warning && section !== 'Favorito' ? <Text style={styles.warningNote}>{warning}</Text> : null}
              {!loading && filtered.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name={section === 'Favorito' ? 'star-outline' : direct ? 'radio-outline' : 'football-outline'} color={C.subtle} size={34} />
                  <Text style={styles.emptyTitle}>{section === 'Favorito' ? 'No hay favoritos' : direct ? 'No hay partidos en vivo' : 'No hay encuentros para mostrar'}</Text>
                  <Text style={styles.emptyText}>{section === 'Favorito' ? 'Guarda cualquier partido tocando la estrella. Quedará disponible incluso si cierras la aplicación.' : search ? 'Prueba con otro equipo o competición.' : 'Puede que no haya partidos este día en las ligas consultadas o que la fuente no los cubra.'}</Text>
                  {section !== 'Favorito' ? <Pressable style={styles.greenOutline} onPress={refreshMatches}><Text style={styles.greenText}>Reintentar</Text></Pressable> : null}
                </View>
              ) : null}
              {filtered.map(match => (
                <Pressable key={match.id} style={styles.matchCard} onPress={() => setSelected(match)}>
                  <View style={styles.matchMeta}>
                    <Text numberOfLines={1} style={styles.matchLeague}>{match.league}</Text>
                    <Text style={[styles.matchMetaStatus, isLive(match) && { color: C.red }]}>{matchState(match)}</Text>
                  </View>
                  <View style={styles.matchBody}>
                    <View style={styles.matchTeam}>
                      <Logo url={match.homeLogo} size={34} />
                      <Text numberOfLines={2} style={styles.matchTeamName}>{match.home}</Text>
                    </View>
                    <View style={styles.scoreCenter}>
                      <Text style={styles.scoreText}>{scoreText(match)}</Text>
                      {isLive(match) ? <Text style={styles.liveText}>● EN VIVO</Text> : null}
                    </View>
                    <View style={styles.matchTeam}>
                      <Logo url={match.awayLogo} size={34} />
                      <Text numberOfLines={2} style={styles.matchTeamName}>{match.away}</Text>
                    </View>
                  </View>
                  <View style={styles.matchFooter}>
                    <Text style={styles.footerDate}>{matchDayText(match.date)} · {matchHour(match.date)} PER</Text>
                    <Pressable hitSlop={12} style={styles.favoriteButton} onPress={event => { event.stopPropagation(); toggleFavorite(match); }} accessibilityLabel="Guardar como favorito">
                      <Ionicons name={favoriteIds.has(match.id) ? 'star' : 'star-outline'} size={21} color={favoriteIds.has(match.id) ? C.green : C.subtle} />
                    </Pressable>
                  </View>
                </Pressable>
              ))}
              {lastUpdated && section !== 'Favorito' ? <Text style={styles.refreshFoot}>Actualizado: {publishedText(lastUpdated)} · Arrastra hacia abajo para actualizar.</Text> : null}
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.flex} contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={newsLoading} onRefresh={refreshNews} tintColor={C.green} colors={[C.green]} />}>
              <Text style={styles.sectionIntroduction}>{section === 'Fichaje' ? 'Noticias y rumores de transferencias publicados por las fuentes. Un rumor no confirma un fichaje.' : 'Actualidad del fútbol internacional desde fuentes deportivas.'}</Text>
              {newsLoading && articles.length === 0 ? <ActivityIndicator color={C.green} style={{ marginVertical: 30 }} size="large" /> : null}
              {newsError ? <View style={styles.warningBox}><Ionicons name="wifi-outline" color={C.subtle} size={19} /><Text style={styles.warningText}>{newsError}</Text></View> : null}
              {newsWarning ? <Text style={styles.warningNote}>{newsWarning}</Text> : null}
              {filteredArticles.length === 0 && !newsLoading ? (
                <View style={styles.emptyBox}>
                  <Ionicons name={section === 'Fichaje' ? 'swap-horizontal-outline' : 'newspaper-outline'} color={C.subtle} size={35} />
                  <Text style={styles.emptyTitle}>No se encontraron publicaciones</Text>
                  <Text style={styles.emptyText}>No se inventan fichajes ni noticias. Prueba actualizar o cambiar la búsqueda.</Text>
                  <Pressable style={styles.greenOutline} onPress={refreshNews}><Text style={styles.greenText}>Actualizar noticias</Text></Pressable>
                </View>
              ) : null}
              {filteredArticles.map(article => (
                <Pressable key={article.id} style={styles.articleCard} onPress={() => openPage(article.link)}>
                  {article.image ? <Image source={{ uri: article.image }} style={styles.articleImage} resizeMode="cover" /> : null}
                  <View style={styles.articleBody}>
                    <View style={styles.articleHead}>
                      <Text style={styles.articleLeague}>{article.league} · ESPN</Text>
                      {article.isTransfer ? <Text style={styles.transferTag}>MERCADO</Text> : null}
                    </View>
                    <Text style={styles.articleTitle}>{article.title}</Text>
                    {article.description ? <Text numberOfLines={3} style={styles.articleDescription}>{article.description}</Text> : null}
                    <View style={styles.articleFooter}>
                      <Text style={styles.articleTime}>{publishedText(article.published)}</Text>
                      <View style={styles.articleLink}><Text style={styles.greenText}>Leer artículo</Text><Ionicons name="open-outline" size={16} color={C.green} /></View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </>
      )}

      <View style={styles.bottomBar}>
        {NAV.map(item => (
          <Pressable key={item.label} style={styles.bottomItem} onPress={() => navigate(item.label)} accessibilityLabel={`Ir a ${item.label}`}>
            <Ionicons name={section === item.label ? item.onIcon : item.icon} color={section === item.label ? C.green : C.subtle} size={27} />
            <Text style={[styles.bottomText, section === item.label && styles.bottomSelected]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {drawer ? (
        <View style={styles.drawerLayer}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setDrawer(false)} />
          <ScrollView style={styles.drawerPanel} contentContainerStyle={styles.drawerInner}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerBrand}>GOL<Text style={{ color: C.green }}>FLASH</Text></Text>
              <Pressable onPress={() => setDrawer(false)} accessibilityLabel="Cerrar menú"><Ionicons name="close" color={C.white} size={25} /></Pressable>
            </View>
            <Text style={styles.drawerCaption}>NAVEGACIÓN</Text>
            {NAV.map(item => (
              <Pressable key={item.label} style={styles.drawerItem} onPress={() => navigate(item.label)}>
                <Ionicons name={item.icon} color={item.label === section ? C.green : C.white} size={22} />
                <Text style={[styles.drawerItemText, item.label === section && { color: C.green }]}>{item.label === 'Fichaje' ? 'Fichajes' : item.label === 'Noticia' ? 'Noticias' : item.label === 'Favorito' ? 'Favoritos' : item.label}</Text>
              </Pressable>
            ))}
            <Text style={[styles.drawerCaption, { marginTop: 22 }]}>PARTIDOS</Text>
            {(['AYER', 'HOY', 'DIRECTO', 'MAÑANA'] as const).map(label => (
              <Pressable key={label} style={styles.drawerItem} onPress={() => { navigate('Partidos'); chooseDay(label); }}>
                <Ionicons name={label === 'DIRECTO' ? 'radio-outline' : 'calendar-outline'} color={C.white} size={21} />
                <Text style={styles.drawerItemText}>{label === 'DIRECTO' ? 'En directo' : label}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.drawerItem} onPress={() => { setDrawer(false); setCalendar(true); }}>
              <Ionicons name="calendar-number-outline" color={C.white} size={22} /><Text style={styles.drawerItemText}>Elegir fecha</Text>
            </Pressable>
            <Pressable style={styles.drawerItem} onPress={() => { setDrawer(false); setAbout(true); }}>
              <Ionicons name="information-circle-outline" color={C.white} size={22} /><Text style={styles.drawerItemText}>Acerca de GolFlash</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}

      <Modal visible={calendar} animationType="fade" transparent onRequestClose={() => setCalendar(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Selecciona una fecha</Text>
              <Pressable onPress={() => setCalendar(false)}><Ionicons name="close" color={C.white} size={25} /></Pressable>
            </View>
            <Text style={styles.dimText}>Fechas y horarios de Perú (UTC−5)</Text>
            <ScrollView style={styles.calendarList}>
              {Array.from({ length: 22 }, (_, i) => i - 7).map(value => (
                <Pressable key={value} style={[styles.calendarOption, !direct && offset === value && styles.calendarOptionSelected]} onPress={() => {
                  setOffset(value); setDirect(false); setSelected(null); setSection('Partidos'); setCalendar(false);
                }}>
                  <Ionicons name="calendar-outline" color={!direct && offset === value ? C.green : C.subtle} size={20} />
                  <Text style={styles.calendarText}>{value === 0 ? 'Hoy' : value === -1 ? 'Ayer' : value === 1 ? 'Mañana' : matchDayText(`${dayFromOffset(value)}T12:00:00Z`)}</Text>
                  {!direct && offset === value ? <Ionicons name="checkmark-circle" color={C.green} size={20} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={about} animationType="fade" transparent onRequestClose={() => setAbout(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalTitleRow}><Text style={styles.modalTitle}>Acerca de GolFlash</Text><Pressable onPress={() => setAbout(false)}><Ionicons name="close" color={C.white} size={25} /></Pressable></View>
            <Text style={styles.aboutParagraph}>Aplicación informativa de fútbol. Consulta partidos y resultados reales, guarda favoritos en tu dispositivo y lee noticias y transferencias.</Text>
            <Text style={styles.aboutParagraph}>Fuentes: ESPN (API pública no oficial) y TheSportsDB como respaldo de cobertura limitada. No garantizan todos los partidos ni información en vivo sin retraso.</Text>
            <Text style={styles.aboutParagraph}>Los artículos se abren en su fuente original. GolFlash no ofrece apuestas ni dinero real.</Text>
            <Pressable style={styles.aboutLink} onPress={() => openPage('https://www.espn.com/soccer/')}><Text style={styles.greenText}>Visitar ESPN</Text><Ionicons name="open-outline" size={18} color={C.green} /></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  header: { height: 95, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  headerButton: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, paddingLeft: 1 },
  brandName: { fontSize: 22, color: C.white, fontWeight: '400', letterSpacing: .8 },
  daysRow: { height: 72, flexDirection: 'row', marginBottom: 15, paddingHorizontal: 8 },
  dayItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dayLabel: { color: C.subtle, fontSize: 13.5, fontWeight: '500' },
  activeDayLabel: { color: C.white },
  dayIndicator: { backgroundColor: C.green, height: 4, position: 'absolute', left: '15%', right: '15%', bottom: 0 },
  searchBox: { marginHorizontal: 14, height: 62, paddingHorizontal: 17, borderRadius: 11, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 },
  searchField: { flex: 1, color: C.white, height: '100%', fontSize: 15 },
  leaguesScroll: { flexGrow: 0, maxHeight: 54, marginBottom: 10 },
  leaguesContent: { paddingHorizontal: 13, gap: 8, paddingBottom: 8, alignItems: 'center' },
  leagueChip: { borderColor: C.line, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18 },
  chipActive: { borderColor: C.green, backgroundColor: '#29382A' },
  leagueChipText: { fontSize: 12.5, color: C.subtle },
  leagueChipTextActive: { color: C.white, fontWeight: '600' },
  pageHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17, paddingVertical: 15 },
  pageTitle: { color: C.white, fontWeight: '700', fontSize: 23 },
  listContent: { paddingHorizontal: 14, paddingTop: 3, paddingBottom: 30, flexGrow: 1 },
  headingRow: { marginBottom: 13, marginTop: 4, flexDirection: 'row', alignItems: 'center' },
  listTitle: { color: C.white, fontWeight: '700', fontSize: 18 },
  sourceText: { color: C.subtle, marginTop: 4, fontSize: 11 },
  refreshButton: { padding: 10 },
  matchCard: { backgroundColor: C.card, borderRadius: 13, paddingHorizontal: 15, paddingTop: 14, paddingBottom: 8, marginBottom: 10, borderWidth: 1, borderColor: '#3C3C3C' },
  matchMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  matchLeague: { color: C.subtle, fontSize: 12, flex: 1 },
  matchMetaStatus: { color: C.subtle, fontSize: 12, fontWeight: '600' },
  matchBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 11 },
  matchTeam: { width: '37%', alignItems: 'center', gap: 7 },
  matchTeamName: { color: C.white, textAlign: 'center', fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  scoreCenter: { flex: 1, alignItems: 'center' },
  scoreText: { color: C.white, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  liveText: { color: C.red, fontWeight: '700', fontSize: 10, marginTop: 4 },
  emptyLogo: { justifyContent: 'center', alignItems: 'center' },
  matchFooter: { borderTopWidth: 1, borderTopColor: C.line, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerDate: { color: C.subtle, fontSize: 10.5 },
  favoriteButton: { paddingHorizontal: 6, paddingVertical: 7 },
  warningBox: { flexDirection: 'row', padding: 13, backgroundColor: '#3A3231', borderRadius: 10, marginBottom: 12, gap: 10, alignItems: 'center' },
  warningText: { color: '#E5C5C1', fontSize: 12.5, flex: 1, lineHeight: 18 },
  warningNote: { color: '#C8BB98', fontSize: 11.5, marginBottom: 11 },
  emptyBox: { padding: 28, backgroundColor: C.card, borderRadius: 13, alignItems: 'center', gap: 12, marginTop: 8 },
  emptyTitle: { color: C.white, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  emptyText: { color: C.subtle, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  greenOutline: { marginTop: 5, borderWidth: 1, borderColor: C.green, borderRadius: 9, paddingVertical: 10, paddingHorizontal: 19 },
  greenText: { color: C.green, fontSize: 13.5, fontWeight: '600' },
  refreshFoot: { color: C.subtle, fontSize: 10.5, textAlign: 'center', marginTop: 16, marginBottom: 12 },
  bottomBar: { height: 79, flexDirection: 'row', borderTopWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  bottomItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7 },
  bottomText: { color: C.subtle, fontSize: 11.5 },
  bottomSelected: { color: C.green },
  contentPadding: { paddingHorizontal: 15, paddingTop: 8, paddingBottom: 24 },
  backLine: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 13, marginBottom: 11 },
  backLineText: { color: C.white, fontSize: 15 },
  detailCard: { padding: 21, paddingVertical: 30, borderRadius: 15, backgroundColor: C.card, alignItems: 'center' },
  secondaryLabel: { color: C.subtle, fontSize: 13 },
  detailStatus: { color: C.white, fontSize: 14, marginTop: 12, fontWeight: '700' },
  detailTeamsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 24 },
  detailTeam: { width: '36%', alignItems: 'center', gap: 11 },
  detailTeamText: { color: C.white, fontSize: 14, lineHeight: 19, textAlign: 'center', fontWeight: '600' },
  detailScore: { flex: 1, textAlign: 'center', fontSize: 26, fontWeight: '900', color: C.white },
  dimText: { color: C.subtle, fontSize: 12, lineHeight: 19, textAlign: 'center' },
  detailActions: { flexDirection: 'row', gap: 10, marginVertical: 13 },
  actionButton: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', gap: 7 },
  actionLabel: { color: C.white, fontSize: 12, textAlign: 'center' },
  sectionTitle: { color: C.white, fontSize: 18, fontWeight: '700', marginVertical: 14 },
  informationBox: { backgroundColor: C.card, borderRadius: 12, padding: 18 },
  infoRow: { color: C.white, fontSize: 13, lineHeight: 27 },
  sectionIntroduction: { color: C.subtle, marginBottom: 14, fontSize: 12.5, lineHeight: 19 },
  articleCard: { borderRadius: 13, backgroundColor: C.card, marginBottom: 14, overflow: 'hidden' },
  articleImage: { width: '100%', aspectRatio: 1.9, backgroundColor: C.raised },
  articleBody: { padding: 15 },
  articleHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  articleLeague: { color: C.subtle, fontSize: 11 },
  transferTag: { color: C.green, fontWeight: '700', fontSize: 10 },
  articleTitle: { color: C.white, fontSize: 16.5, fontWeight: '700', lineHeight: 23, marginTop: 9 },
  articleDescription: { color: C.subtle, fontSize: 12.5, lineHeight: 19, marginTop: 9 },
  articleFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, gap: 8 },
  articleTime: { color: C.subtle, fontSize: 11 },
  articleLink: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  drawerLayer: { ...StyleSheet.absoluteFillObject, zIndex: 90, flexDirection: 'row' },
  drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: C.shade },
  drawerPanel: { width: '82%', backgroundColor: '#272727', borderRightWidth: 1, borderColor: C.line },
  drawerInner: { paddingHorizontal: 18, paddingTop: 32, paddingBottom: 30 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  drawerBrand: { color: C.white, fontSize: 25, fontWeight: '800' },
  drawerCaption: { color: C.subtle, fontWeight: '700', letterSpacing: 1, fontSize: 11, marginBottom: 10 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#353535' },
  drawerItemText: { color: C.white, fontSize: 15 },
  modalBackdrop: { flex: 1, backgroundColor: C.shade, alignItems: 'center', justifyContent: 'center', padding: 22 },
  modalCard: { backgroundColor: '#292929', borderRadius: 16, padding: 18, width: '100%', maxHeight: '76%', borderColor: C.line, borderWidth: 1 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { color: C.white, fontSize: 19, fontWeight: '700' },
  calendarList: { marginTop: 13 },
  calendarOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 12, borderBottomColor: C.line, borderBottomWidth: 1 },
  calendarOptionSelected: { backgroundColor: '#30412F' },
  calendarText: { flex: 1, color: C.white, fontSize: 14 },
  aboutParagraph: { fontSize: 13.5, lineHeight: 21, color: C.subtle, marginBottom: 15 },
  aboutLink: { flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 7, marginBottom: 8 },
});
