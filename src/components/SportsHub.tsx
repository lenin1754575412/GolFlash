import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';

import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  AppState,
  Linking,
  useColorScheme,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DatePicker from './DatePicker';

import {
  SPORTS,
  SportId,
  SportEvent,
  getSportEvents,
} from '../services/multisports';

import {
  dayFromOffset,
  matchHour,
} from '../services/football';

const GREEN = '#4AAE39';

const FAVORITES = '@golflash/sports-favorites-v1';

type IconName = keyof typeof Ionicons.glyphMap;

function SportBar({
  selected,
  onSelect,
  light = false,
}: {
  selected: SportId;
  onSelect: (sport: SportId) => void;
  light?: boolean;
}) {
  return (
    <View style={{ height: 76 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 12,
          alignItems: 'center',
          gap: 8,
        }}
      >
        {SPORTS.map(sport => {
          const active = selected === sport.id;

          return (
            <Pressable
              key={sport.id}
              onPress={() => onSelect(sport.id)}
              style={{
                minWidth: 72,
                paddingVertical: 10,
                paddingHorizontal: 11,
                borderRadius: 13,
                alignItems: 'center',
                gap: 5,
                backgroundColor: active
                  ? (light ? '#E5F3DF' : '#293D24')
                  : (light ? '#FFFFFF' : '#303030'),
              }}
            >
              <Ionicons
                name={sport.icon as IconName}
                color={active ? GREEN : '#999999'}
                size={23}
              />

              <Text style={{
                fontSize: 11,
                fontWeight: active ? '700' : '500',
                color: active
                  ? GREEN
                  : light ? '#333333' : '#EEEEEE',
              }}>
                {sport.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SportsScreen({
  sport,
  onSport,
  onClose,
}: {
  sport: SportId;
  onSport: (sport: SportId) => void;
  onClose: () => void;
}) {
  const [day, setDay] = useState(dayFromOffset(0));

  const [direct, setDirect] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [calendar, setCalendar] = useState(false);

  const [events, setEvents] = useState<SportEvent[]>([]);
  const [favorites, setFavorites] = useState<SportEvent[]>([]);
  const [ready, setReady] = useState(false);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState('');
  const [updated, setUpdated] = useState('');

  const [expanded, setExpanded] = useState('');
  const [auto, setAuto] = useState(true);
  const [active, setActive] = useState(true);

  const [theme, setTheme] = useState('dark');
  const scheme = useColorScheme();

  const light = theme === 'light' ||
    (theme === 'system' && scheme === 'light');

  const C = {
    bg: light ? '#F4F5F6' : '#1F1F1F',
    card: light ? '#FFFFFF' : '#303030',
    text: light ? '#202020' : '#F2F2F2',
    muted: light ? '#666666' : '#ABABAB',
    line: light ? '#DDDDDD' : '#414141',
  };

  const request = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES)
      .then(value => {
        if (value) {
          const data = JSON.parse(value);
          if (Array.isArray(data)) setFavorites(data);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));

    AsyncStorage.getItem('@golflash/auto-refresh')
      .then(value => setAuto(value !== 'false'))
      .catch(() => {});

    AsyncStorage.getItem('@golflash/preferences-v2')
      .then(value => {
        if (value) setTheme(JSON.parse(value).theme || 'dark');
      })
      .catch(() => {});

    const sub = AppState.addEventListener(
      'change',
      state => setActive(state === 'active')
    );

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (ready) {
      AsyncStorage.setItem(
        FAVORITES, JSON.stringify(favorites)
      ).catch(() => {});
    }
  }, [favorites, ready]);

  const refresh = useCallback(async () => {
    if (busy.current) return;

    busy.current = true;

    const rid = ++request.current;

    setLoading(true);

    try {
      const result = await getSportEvents(sport, day);

      if (rid !== request.current) return;

      setEvents(result.events);
      setWarning(result.warning);
      setUpdated(new Date().toISOString());

      const current = new Map(
        result.events.map(e => [e.id, e])
      );

      setFavorites(old =>
        old.map(e => current.get(e.id) || e)
      );
    } catch {
      if (rid === request.current) {
        setWarning(
          'No se pudo actualizar. Revisa tu conexion. Los datos anteriores pueden estar desactualizados.'
        );
      }
    } finally {
      if (rid === request.current) {
        setLoading(false);
        busy.current = false;
      }
    }
  }, [sport, day]);

  useEffect(() => {
    request.current++;
    busy.current = false;

    setEvents([]);
    setWarning('');
    setUpdated('');
    setExpanded('');
    setLoading(false);
  }, [sport, day]);

  useEffect(() => {
    if (!active || savedOnly) return;

    refresh();

    const timer = auto
      ? setInterval(refresh, 30000)
      : undefined;

    return () => {
      if (timer) clearInterval(timer);
      request.current++;
      busy.current = false;
    };
  }, [refresh, active, auto, savedOnly]);

  function chooseDay(offset: number, live = false) {
    setSavedOnly(false);
    setDirect(live);
    setDay(dayFromOffset(offset));
  }

  function toggleFavorite(event: SportEvent) {
    if (!ready) return;

    setFavorites(old =>
      old.some(e => e.id === event.id)
        ? old.filter(e => e.id !== event.id)
        : [event, ...old]
    );
  }

  const liveCount = events.filter(
    e => e.status === 'live'
  ).length;

  const visible = (savedOnly
    ? favorites.filter(e => e.sport === sport)
    : events
  ).filter(e =>
    (!direct || savedOnly || e.status === 'live') &&
    `${e.title} ${e.league} ${e.participants.map(
      p => p.name
    ).join(' ')}`.toLowerCase().includes(query.toLowerCase())
  );

  const name =
    SPORTS.find(s => s.id === sport)?.name || 'Deportes';

  function status(event: SportEvent) {
    switch (event.status) {
      case 'live': return 'EN VIVO';
      case 'finished': return 'FINAL';
      case 'postponed': return 'APLAZADO / CANCELADO';
      case 'scheduled':
        return event.date ? matchHour(event.date) : 'PROGRAMADO';
      default: return event.detail || 'ESTADO NO DISPONIBLE';
    }
  }

  const tabs = [
    { label: 'AYER', offset: -1, live: false },
    { label: 'HOY', offset: 0, live: false },
    { label: `DIRECTO (${liveCount})`, offset: 0, live: true },
    { label: 'MAÑANA', offset: 1, live: false },
  ];

  return (
    <SafeAreaView style={{
      flex: 1,
      backgroundColor: C.bg,
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 13,
      }}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons
            name="arrow-back"
            color={C.text}
            size={25}
          />
        </Pressable>

        <Image
          source={require('../../assets/golflash-logo.png')}
          style={{
            width: 35,
            height: 35,
            borderRadius: 8,
          }}
        />

        <View style={{ flex: 1 }}>
          <Text style={{
            color: C.text,
            fontSize: 20,
            fontWeight: '700',
          }}>
            GOL<Text style={{ color: GREEN }}>FLASH</Text>
          </Text>

          <Text style={{ color: C.muted, fontSize: 10 }}>
            SPORTS
          </Text>
        </View>

        <Pressable onPress={() => setCalendar(true)}>
          <Ionicons
            name="calendar-outline"
            size={25}
            color={C.text}
          />
        </Pressable>

        <Pressable onPress={() => {
          setSavedOnly(value => !value);
          setDirect(false);
        }}>
          <Ionicons
            name={savedOnly ? 'star' : 'star-outline'}
            size={25}
            color={savedOnly ? GREEN : C.text}
          />
        </Pressable>
      </View>

      <SportBar
        selected={sport}
        onSelect={onSport}
        light={light}
      />

      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 8,
      }}>
        {tabs.map(tab => {
          const selected = !savedOnly && (
            tab.live ? direct
              : !direct && day === dayFromOffset(tab.offset)
          );

          return (
            <Pressable
              key={tab.label.split(' ')[0]}
              onPress={() => chooseDay(tab.offset, tab.live)}
              style={{
                flex: 1,
                paddingVertical: 17,
                borderBottomWidth: 3,
                borderBottomColor: selected
                  ? GREEN : 'transparent',
              }}
            >
              <Text style={{
                textAlign: 'center',
                color: selected ? GREEN : C.muted,
                fontSize: 11,
                fontWeight: '600',
              }}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{
        backgroundColor: C.card,
        margin: 14,
        borderRadius: 13,
        paddingHorizontal: 15,
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}>
        <Ionicons
          name="search-outline"
          size={21}
          color={C.muted}
        />

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar equipo, jugador o liga"
          placeholderTextColor={C.muted}
          style={{
            flex: 1,
            color: C.text,
            fontSize: 14,
          }}
        />
      </View>

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{
            color: C.text,
            fontSize: 20,
            fontWeight: '700',
          }}>
            {savedOnly ? 'Favoritos' : name}
          </Text>

          <Text style={{
            color: C.muted,
            fontSize: 12,
            marginTop: 5,
          }}>
            {day.split('-').reverse().join('/')} · ESPN / TheSportsDB
          </Text>
        </View>

        <Pressable onPress={refresh}>
          <Ionicons
            name="refresh-outline"
            size={26}
            color={GREEN}
          />
        </Pressable>
      </View>

      {warning && !savedOnly ? (
        <Text style={{
          color: C.muted,
          marginHorizontal: 16,
          marginBottom: 10,
          fontSize: 12,
        }}>
          {warning}
        </Text>
      ) : null}

      <FlatList
        data={visible}
        keyExtractor={item => item.id}
        contentContainerStyle={{
          padding: 14,
          paddingBottom: 35,
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              color={GREEN}
              size="large"
              style={{ marginTop: 30 }}
            />
          ) : (
            <View style={{
              backgroundColor: C.card,
              padding: 28,
              borderRadius: 16,
              alignItems: 'center',
              gap: 12,
            }}>
              <Ionicons
                name="trophy-outline"
                color={C.muted}
                size={38}
              />

              <Text style={{
                color: C.text,
                fontSize: 17,
                fontWeight: '700',
                textAlign: 'center',
              }}>
                {savedOnly
                  ? 'No tienes favoritos'
                  : direct
                    ? 'No hay eventos en directo disponibles'
                    : 'No hay eventos disponibles'}
              </Text>

              <Text style={{
                color: C.muted,
                textAlign: 'center',
              }}>
                {savedOnly
                  ? 'Presiona la estrella para guardar un evento.'
                  : 'Consulta otra fecha o actualiza los resultados.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const favorite = favorites.some(
            e => e.id === item.id
          );

          const open = expanded === item.id;

          return (
            <View style={{
              backgroundColor: C.card,
              borderRadius: 15,
              marginBottom: 12,
              padding: 16,
            }}>
              <Pressable onPress={() =>
                setExpanded(open ? '' : item.id)
              }>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 7,
                }}>
                  <Ionicons
                    name="trophy-outline"
                    size={15}
                    color={GREEN}
                  />

                  <Text style={{
                    color: C.muted,
                    flex: 1,
                    fontSize: 12,
                  }}>
                    {item.league}
                  </Text>

                  <Text style={{
                    color: item.status === 'live'
                      ? '#E85858' : GREEN,
                    fontSize: 11,
                    fontWeight: '700',
                  }}>
                    {status(item)}
                  </Text>
                </View>

                <Text style={{
                  color: C.text,
                  fontWeight: '600',
                  marginTop: 13,
                  marginBottom: 10,
                }}>
                  {item.title}
                </Text>

                {item.participants.slice(
                  0, open ? item.participants.length : 4
                ).map((p, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 9,
                      gap: 12,
                    }}
                  >
                    {p.logo ? (
                      <Image
                        source={{ uri: p.logo }}
                        style={{ width: 32, height: 32 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <Ionicons
                        name="person-circle-outline"
                        size={32}
                        color={C.muted}
                      />
                    )}

                    <Text style={{
                      color: C.text,
                      flex: 1,
                      fontSize: 14,
                    }}>
                      {p.name}
                    </Text>

                    <Text style={{
                      color: C.text,
                      fontSize: 19,
                      fontWeight: '800',
                    }}>
                      {p.score}
                    </Text>

                    {open && p.periods.length > 0 ? (
                      <Text style={{
                        color: C.muted,
                        fontSize: 11,
                        maxWidth: 95,
                      }}>
                        {p.periods.join(' | ')}
                      </Text>
                    ) : null}
                  </View>
                ))}

                {item.detail ? (
                  <Text style={{
                    color: C.muted,
                    fontSize: 12,
                    marginVertical: 7,
                  }}>
                    {item.detail}
                  </Text>
                ) : null}

                {open && item.venue ? (
                  <Text style={{
                    color: C.muted,
                    marginVertical: 8,
                  }}>
                    Sede: {item.venue}
                  </Text>
                ) : null}
              </Pressable>

              <View style={{
                borderTopWidth: 1,
                borderTopColor: C.line,
                flexDirection: 'row',
                alignItems: 'center',
                paddingTop: 12,
                gap: 16,
              }}>
                <Text style={{
                  color: C.muted,
                  flex: 1,
                  fontSize: 11,
                }}>
                  Fuente: {item.source}
                </Text>

                {item.link ? (
                  <Pressable onPress={() =>
                    Linking.openURL(item.link!).catch(() => {})
                  }>
                    <Ionicons
                      name="open-outline"
                      color={GREEN}
                      size={20}
                    />
                  </Pressable>
                ) : null}

                <Pressable onPress={() => toggleFavorite(item)}>
                  <Ionicons
                    name={favorite ? 'star' : 'star-outline'}
                    color={GREEN}
                    size={23}
                  />
                </Pressable>

                <Pressable onPress={() =>
                  setExpanded(open ? '' : item.id)
                }>
                  <Ionicons
                    name={open
                      ? 'chevron-up'
                      : 'chevron-down'}
                    color={C.muted}
                    size={20}
                  />
                </Pressable>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          updated ? (
            <Text style={{
              color: C.muted,
              textAlign: 'center',
              fontSize: 11,
              padding: 15,
            }}>
              Actualizado: {matchHour(updated)}
              {auto ? ' · Actualización cada 30 segundos' : ''}
            </Text>
          ) : undefined
        }
      />

      <DatePicker
        visible={calendar}
        value={day}
        onClose={() => setCalendar(false)}
        onConfirm={date => {
          setDay(date);
          setDirect(false);
          setSavedOnly(false);
          setCalendar(false);
        }}
      />
    </SafeAreaView>
  );
}

export default function SportsHub() {
  const [sport, setSport] = useState<SportId>('football');

  return (
    <>
      <SportBar
        selected="football"
        onSelect={setSport}
      />

      <Modal
        visible={sport !== 'football'}
        animationType="slide"
        onRequestClose={() => setSport('football')}
      >
        {sport !== 'football' ? (
          <SportsScreen
            sport={sport}
            onSport={setSport}
            onClose={() => setSport('football')}
          />
        ) : null}
      </Modal>
    </>
  );
}