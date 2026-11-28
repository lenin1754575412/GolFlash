import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { Match } from '../types';
import { peruKey, matchHour } from '../services/football';

const GREEN = '#76E536';
const RED = '#FF4757';

type Props = {
  matches: Match[];
  today: string;
  currentDay: boolean;
  loading: boolean;
  stale: boolean;
  updated: string;
  onAll: () => void;
  onSelect: (match: Match) => void;
};

function Team({
  name,
  logo,
}: {
  name: string;
  logo?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [logo]);

  return (
    <View style={s.team}>
      {logo && /^https:\/\//i.test(logo) && !failed ? (
        <Image
          source={{ uri: logo }}
          resizeMode="contain"
          style={s.logo}
          onError={() => setFailed(true)}
        />
      ) : (
        <Ionicons
          name="shield-outline"
          color="#A8B9AD"
          size={44}
        />
      )}

      <Text
        style={s.teamName}
        numberOfLines={2}
      >
        {name}
      </Text>
    </View>
  );
}

function Field() {
  return (
    <View
      pointerEvents="none"
      style={s.fieldBackground}
    >
      <View style={s.lightLeft}/>
      <View style={s.lightRight}/>

      <View style={s.pitch}>
        <View style={s.middleLine}/>
        <View style={s.circle}/>
        <View style={s.areaLeft}/>
        <View style={s.areaRight}/>
      </View>
    </View>
  );
}

export default function LiveCarousel({
  matches,
  today,
  currentDay,
  loading,
  stale,
  updated,
  onAll,
  onSelect,
}: Props) {

  const { width: windowWidth } = useWindowDimensions();

  const [width, setWidth] = useState(
    Math.max(240, windowWidth - 28)
  );

  const [index, setIndex] = useState(0);

  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const live = currentDay
    ? Array.from(
        new Map(
          matches.filter(m => {
            if (m.status !== 'live') return false;

            const date = new Date(m.date);

            return Number.isFinite(date.getTime()) &&
              peruKey(date) === today;
          }).map(m => [m.id, m])
        ).values()
      )
    : [];

  // Mostrar hasta ocho encuentros destacados.
  // Ver todos abre la lista completa.
  const featured = live.slice(0, 8);

  useEffect(() => {
    if (index >= featured.length) {
      setIndex(0);

      scroll.current?.scrollTo({
        x: 0,
        animated: false,
      });
    }
  }, [featured.length, index]);

  function goTo(page: number) {
    if (page < 0 || page >= featured.length) return;

    setIndex(page);

    scroll.current?.scrollTo({
      x: page * width,
      animated: true,
    });
  }

  return (
    <View
      style={s.container}
      onLayout={event => {
        const next = Math.round(
          event.nativeEvent.layout.width
        );

        if (next > 0 && next !== width) {
          setWidth(next);
          setIndex(0);

          scroll.current?.scrollTo({
            x: 0,
            animated: false,
          });
        }
      }}
    >
      <View style={s.heading}>
        <View style={s.accent}/>

        <View style={[
          s.liveDot,
          (!currentDay || stale || !live.length) &&
            s.inactiveDot,
        ]}/>

        <Text style={s.headingText}>
          DIRECTO
          {currentDay && !stale && !loading
            ? ` (${live.length})`
            : ''}
        </Text>

        <Pressable
          onPress={onAll}
          hitSlop={8}
          style={s.viewAll}
        >
          <Text style={s.viewAllText}>
            Ver todos
          </Text>

          <Ionicons
            name="arrow-forward"
            color={GREEN}
            size={19}
          />
        </Pressable>
      </View>

      {featured.length > 0 ? (
        <>
          <ScrollView
            ref={scroll}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            onMomentumScrollEnd={event => {
              const page = Math.round(
                event.nativeEvent.contentOffset.x / width
              );

              setIndex(
                Math.max(
                  0,
                  Math.min(page, featured.length - 1)
                )
              );
            }}
            style={s.carousel}
          >
            {featured.map(match => {
              const score =
                match.homeScore == null ||
                match.awayScore == null
                  ? '- : -'
                  : `${match.homeScore} - ${match.awayScore}`;

              return (
                <View
                  key={match.id}
                  style={{ width }}
                >
                  <Pressable
                    onPress={() => onSelect(match)}
                    style={({ pressed }) => [
                      s.card,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <LinearGradient
                      colors={[
                        '#081715',
                        '#102820',
                        '#1B3D1A',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.9, y: 1 }}
                      style={s.gradient}
                    >
                      <Field/>

                      <View style={s.cardHeader}>
                        <Ionicons
                          name="trophy-outline"
                          color="#D8E9DC"
                          size={16}
                        />

                        <Text
                          style={s.league}
                          numberOfLines={1}
                        >
                          {match.league}
                        </Text>

                        <View style={[
                          s.minuteBox,
                          stale && { borderColor: '#999999' },
                        ]}>
                          <Text style={[
                            s.minute,
                            stale && { color: '#BBBBBB' },
                          ]}>
                            {match.minute || 'LIVE'}
                          </Text>
                        </View>
                      </View>

                      <View style={s.teamsRow}>
                        <Team
                          name={match.home}
                          logo={match.homeLogo}
                        />

                        <View style={s.center}>
                          <View style={[
                            s.badge,
                            stale && {
                              backgroundColor: '#525252'
                            },
                          ]}>
                            <View style={s.whiteDot}/>

                            <Text style={s.badgeText}>
                              {stale
                                ? 'GUARDADO'
                                : 'EN VIVO'}
                            </Text>
                          </View>

                          <Text style={s.score}>
                            {score}
                          </Text>
                        </View>

                        <Team
                          name={match.away}
                          logo={match.awayLogo}
                        />
                      </View>

                      <View style={s.footer}>
                        <Text style={s.source}>
                          {match.source}
                          {updated
                            ? ` · ${matchHour(updated)}`
                            : ''}
                        </Text>

                        <View style={s.detail}>
                          <Text style={s.detailText}>
                            Detalles
                          </Text>

                          <Ionicons
                            name="chevron-forward"
                            color="#B9EBA1"
                            size={13}
                          />
                        </View>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>

          <View style={s.pagination}>
            {featured.map((match, page) => (
              <Pressable
                key={match.id}
                hitSlop={4}
                onPress={() => goTo(page)}
                accessibilityLabel={`Partido ${page + 1}`}
              >
                <View style={[
                  s.dot,
                  page === index && s.dotActive,
                ]}/>
              </Pressable>
            ))}
          </View>

          {stale ? (
            <Text style={s.notice}>
              Ultimos datos guardados.
              Actualizacion no confirmada.
            </Text>
          ) : null}
        </>
      ) : (
        <Pressable
          style={s.empty}
          onPress={onAll}
        >
          <Ionicons
            name="radio-outline"
            color={GREEN}
            size={24}
          />

          <View style={{ flex: 1 }}>
            <Text style={s.emptyTitle}>
              {!currentDay
                ? 'Consultar partidos de hoy'
                : loading
                  ? 'Actualizando resultados...'
                  : stale
                    ? 'Resultados no disponibles'
                    : 'No hay partidos en directo'}
            </Text>

            <Text style={s.emptyText}>
              {!currentDay
                ? 'Ver los encuentros en directo'
                : 'Segun las fuentes disponibles'}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={19}
            color={GREEN}
          />
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginBottom: 12,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    minHeight: 32,
  },
  accent: {
    width: 4,
    height: 25,
    backgroundColor: GREEN,
    borderRadius: 3,
  },
  liveDot: {
    width: 9,
    height: 9,
    backgroundColor: RED,
    borderRadius: 6,
  },
  inactiveDot: {
    backgroundColor: '#777777',
  },
  headingText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    flex: 1,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  viewAllText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '700',
  },
  carousel: {
    flexGrow: 0,
  },
  card: {
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#76E536',
    backgroundColor: '#0C1911',
  },
  gradient: {
    padding: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  league: {
    color: '#E8F0EB',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  minuteBox: {
    borderColor: RED,
    borderWidth: 1,
    backgroundColor: '#291B1B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  minute: {
    color: RED,
    fontSize: 12,
    fontWeight: '800',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 10,
  },
  team: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    width: 48,
    height: 48,
  },
  teamName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
  },
  center: {
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  badge: {
    backgroundColor: '#DA1429',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  whiteDot: {
    backgroundColor: '#FFFFFF',
    width: 6,
    height: 6,
    borderRadius: 4,
  },
  score: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF20',
    paddingTop: 7,
  },
  source: {
    color: '#A9C0AE',
    fontSize: 10,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  detailText: {
    color: '#B9EBA1',
    fontSize: 11,
    fontWeight: '700',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: '#646B65',
  },
  dotActive: {
    backgroundColor: GREEN,
    width: 18,
  },
  fieldBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  lightLeft: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    top: -60,
    left: 15,
    backgroundColor: '#B5FFD51A',
  },
  lightRight: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    top: -60,
    right: 15,
    backgroundColor: '#B5FFD51A',
  },
  pitch: {
    position: 'absolute',
    bottom: -28,
    left: '5%',
    width: '90%',
    height: 100,
    borderWidth: 1,
    borderColor: '#B9FFA126',
    backgroundColor: '#57A52A16',
  },
  middleLine: {
    position: 'absolute',
    left: '50%',
    height: '100%',
    width: 1,
    backgroundColor: '#B9FFA126',
  },
  circle: {
    position: 'absolute',
    left: '42%',
    top: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#B9FFA126',
  },
  areaLeft: {
    position: 'absolute',
    left: 0,
    top: 15,
    width: 38,
    height: 60,
    borderWidth: 1,
    borderColor: '#B9FFA126',
  },
  areaRight: {
    position: 'absolute',
    right: 0,
    top: 15,
    width: 38,
    height: 60,
    borderWidth: 1,
    borderColor: '#B9FFA126',
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: '#17251B',
    borderWidth: 1,
    borderColor: '#344B32',
    borderRadius: 14,
    padding: 13,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: '#A5B4A9',
    fontSize: 11,
    marginTop: 4,
  },
  notice: {
    color: '#BBBBBB',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 5,
  },
});