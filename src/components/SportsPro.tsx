import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  LEAGUES,
  getTeams,
  getForm,
  getPlayers,
  predict,
  type Team,
  type Form,
  type Player,
} from '../services/sportsPro';

type Mode = 'teams' | 'players' | 'predictor';

type Result = {
  a: Form;
  b: Form;
  playersA: Player[];
  playersB: Player[];
  cached: boolean;
  rosterWarning: boolean;
};

export default function SportsPro({
  dark = true,
}: {
  dark?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>('teams');

  const [league, setLeague] = useState('esp.1');
  const [teams, setTeams] = useState<Team[]>([]);
  const [a, setA] = useState('');
  const [b, setB] = useState('');

  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);
  const [retry, setRetry] = useState(0);

  const C = {
    bg: dark ? '#101512' : '#F1F4F1',
    card: dark ? '#232C25' : '#FFFFFF',
    text: dark ? '#FFFFFF' : '#172019',
    muted: dark ? '#AAB8AC' : '#617064',
    green: dark ? '#83E442' : '#328A26',
    line: dark ? '#394A3D' : '#DAE3DB',
  };

  useEffect(() => {
    if (!visible) return;

    let active = true;

    setTeams([]);
    setA('');
    setB('');
    setResult(null);
    setError('');
    setCached(false);
    setLoading(true);

    getTeams(league)
      .then(value => {
        if (!active) return;

        setTeams(value.teams);
        setCached(value.cached);

        if (!value.teams.length) {
          setError('No hay equipos disponibles.');
        }
      })
      .catch(() => {
        if (active) {
          setError('No se pudo consultar la liga.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };

  }, [league, visible, retry]);

  useEffect(() => {
    setResult(null);
    setPlayerA('');
    setPlayerB('');

    if (!visible || !a || !b || a === b) return;

    let active = true;

    setError('');
    setLoading(true);

    Promise.all([
      getForm(league, a),
      getForm(league, b),
      getPlayers(league, a).catch(() => null),
      getPlayers(league, b).catch(() => null),
    ])
      .then(([fa, fb, ra, rb]) => {
        if (!active) return;

        setResult({
          a: fa.form,
          b: fb.form,
          playersA: ra?.players || [],
          playersB: rb?.players || [],
          cached: fa.cached || fb.cached ||
            Boolean(ra?.cached || rb?.cached),
          rosterWarning: !ra || !rb,
        });
      })
      .catch(() => {
        if (active) {
          setError(
            'No se pudo obtener el historial. Consulta otra liga.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };

  }, [a, b, league, visible]);

  const teamA = teams.find(t => t.id === a);
  const teamB = teams.find(t => t.id === b);

  const pa = result?.playersA.find(p => p.id === playerA);
  const pb = result?.playersB.find(p => p.id === playerB);

  const prediction = result
    ? predict(result.a, result.b)
    : null;

  function chip(
    label: string,
    active: boolean,
    action: () => void
  ) {
    return (
      <Pressable
        key={label}
        onPress={action}
        style={{
          padding: 12,
          marginRight: 7,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: active ? C.green : C.line,
          backgroundColor: C.card,
        }}
      >
        <Text style={{
          color: active ? C.green : C.text,
          fontWeight: '700',
        }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  function heading(value: string) {
    return (
      <Text style={{
        color: C.text,
        fontSize: 18,
        fontWeight: '800',
        marginVertical: 13,
      }}>
        {value}
      </Text>
    );
  }

  function teamPicker(
    title: string,
    selected: string,
    excluded: string,
    action: (value: string) => void
  ) {
    return (
      <View>
        {heading(title)}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {teams.filter(t => t.id !== excluded)
            .map(team => (
              <Pressable
                key={team.id}
                onPress={() => action(team.id)}
                style={{
                  width: 105,
                  padding: 12,
                  marginRight: 8,
                  alignItems: 'center',
                  gap: 8,
                  borderWidth: 1,
                  borderColor: selected === team.id
                    ? C.green : C.line,
                  backgroundColor: C.card,
                  borderRadius: 14,
                }}
              >
                {team.logo ? (
                  <Image
                    source={{ uri: team.logo }}
                    style={{ width: 40, height: 40 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons
                    name="shield-outline"
                    size={35}
                    color={C.green}
                  />
                )}

                <Text
                  numberOfLines={2}
                  style={{
                    color: C.text,
                    fontSize: 11,
                    textAlign: 'center',
                  }}
                >
                  {team.name}
                </Text>
              </Pressable>
            ))}
        </ScrollView>
      </View>
    );
  }

  function metric(
    label: string,
    x: string | number,
    y: string | number
  ) {
    return (
      <View
        key={label}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 13,
          borderBottomWidth: 1,
          borderBottomColor: C.line,
        }}
      >
        <Text style={{
          color: C.green,
          width: '25%',
          textAlign: 'center',
          fontWeight: '800',
        }}>{x}</Text>

        <Text style={{
          flex: 1,
          color: C.muted,
          textAlign: 'center',
          fontSize: 12,
        }}>{label}</Text>

        <Text style={{
          color: C.text,
          width: '25%',
          fontWeight: '800',
          textAlign: 'center',
        }}>{y}</Text>
      </View>
    );
  }

  function history(team: Team, form: Form) {
    return (
      <View style={[
        s.card,
        { backgroundColor: C.card }
      ]}>
        {heading(team.name)}

        {form.recent.map(game => (
          <View key={game.id} style={s.history}>
            <Text style={{
              color: C.muted,
              fontSize: 10,
              width: 70,
            }}>
              {game.date.slice(0, 10)}
            </Text>

            <Text style={{
              color: C.text,
              flex: 1,
              fontSize: 12,
            }}>
              {game.opponent}
            </Text>

            <Text style={{
              color: game.gf > game.ga
                ? C.green
                : game.gf < game.ga
                  ? '#FF6677' : C.muted,
              fontWeight: '800',
            }}>
              {game.gf} - {game.ga}
            </Text>
          </View>
        ))}

        {!form.games && (
          <Text style={{ color: C.muted }}>
            No hay partidos historicos disponibles.
          </Text>
        )}
      </View>
    );
  }

  function probability(label: string, value: number) {
    return (
      <View key={label} style={{ gap: 7 }}>
        <View style={s.history}>
          <Text style={{
            color: C.text,
            flex: 1,
          }}>{label}</Text>

          <Text style={{
            color: C.green,
            fontWeight: '800',
          }}>{value}%</Text>
        </View>

        <View style={{
          backgroundColor: C.line,
          height: 9,
          borderRadius: 6,
          overflow: 'hidden',
        }}>
          <View style={{
            width: `${value}%`,
            height: 9,
            borderRadius: 6,
            backgroundColor: C.green,
          }}/>
        </View>
      </View>
    );
  }

  function playerPicker(
    players: Player[],
    selected: string,
    action: (id: string) => void
  ) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {players.map(p =>
          chip(p.name, selected === p.id, () => action(p.id))
        )}
      </ScrollView>
    );
  }

  return (
    <View style={{ marginTop: 22 }}>

      <Pressable
        onPress={() => setVisible(true)}
        style={[
          s.entry,
          {
            backgroundColor: C.card,
            borderColor: C.green,
          }
        ]}
      >
        <Ionicons
          name="analytics-outline"
          size={33}
          color={C.green}
        />

        <View style={{ flex: 1 }}>
          <Text style={{
            color: C.green,
            fontSize: 18,
            fontWeight: '900',
          }}>
            GOLFLASH PRO
          </Text>

          <Text style={{
            color: C.muted,
            fontSize: 12,
            marginTop: 5,
          }}>
            Comparador y predicciones deportivas
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          color={C.green}
          size={24}
        />
      </Pressable>

      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <SafeAreaView style={{
          flex: 1,
          backgroundColor: C.bg,
        }}>

          <View style={s.header}>
            <Pressable
              onPress={() => setVisible(false)}
              hitSlop={12}
            >
              <Ionicons
                name="arrow-back"
                size={25}
                color={C.text}
              />
            </Pressable>

            <Text style={{
              color: C.text,
              fontSize: 22,
              fontWeight: '900',
              flex: 1,
            }}>
              GOL<Text style={{ color: C.green }}>
                FLASH PRO
              </Text>
            </Text>

            <Pressable onPress={() => setRetry(n => n + 1)}>
              <Ionicons
                name="refresh-outline"
                size={25}
                color={C.green}
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 40,
              gap: 12,
            }}
          >

            <ScrollView horizontal>
              {chip(
                'Equipos',
                mode === 'teams',
                () => setMode('teams')
              )}

              {chip(
                'Jugadores',
                mode === 'players',
                () => setMode('players')
              )}

              {chip(
                'Predictor',
                mode === 'predictor',
                () => setMode('predictor')
              )}
            </ScrollView>

            {heading('Selecciona una liga')}

            <ScrollView horizontal>
              {LEAGUES.map(l =>
                chip(
                  l.name,
                  l.id === league,
                  () => {
                    setA('');
                    setB('');
                    setResult(null);
                    setLeague(l.id);
                  }
                )
              )}
            </ScrollView>

            {teamPicker('Equipo 1', a, b, setA)}
            {teamPicker('Equipo 2', b, a, setB)}

            {loading && (
              <ActivityIndicator
                size="large"
                color={C.green}
              />
            )}

            {error ? (
              <Text style={{ color: '#FF6677' }}>
                {error}
              </Text>
            ) : null}

            {(cached || result?.cached) && (
              <Text style={{ color: C.muted }}>
                Mostrando algunos datos guardados.
                Pueden estar desactualizados.
              </Text>
            )}

            {result && teamA && teamB && (
              <>
                <View style={[
                  s.card,
                  { backgroundColor: C.card }
                ]}>
                  <View style={s.history}>
                    <Text style={{
                      color: C.text,
                      flex: 1,
                      textAlign: 'center',
                      fontWeight: '800',
                    }}>{teamA.name}</Text>

                    <Text style={{
                      color: C.green,
                      fontWeight: '900',
                    }}>VS</Text>

                    <Text style={{
                      color: C.text,
                      flex: 1,
                      textAlign: 'center',
                      fontWeight: '800',
                    }}>{teamB.name}</Text>
                  </View>
                </View>

                {mode === 'teams' && (
                  <>
                    <View style={[
                      s.card,
                      { backgroundColor: C.card }
                    ]}>
                      {heading('Rendimiento reciente')}

                      {metric(
                        'Partidos',
                        result.a.games,
                        result.b.games
                      )}

                      {metric(
                        'Victorias',
                        result.a.wins,
                        result.b.wins
                      )}

                      {metric(
                        'Empates',
                        result.a.draws,
                        result.b.draws
                      )}

                      {metric(
                        'Derrotas',
                        result.a.losses,
                        result.b.losses
                      )}

                      {metric(
                        'Goles a favor',
                        result.a.gf,
                        result.b.gf
                      )}

                      {metric(
                        'Goles en contra',
                        result.a.ga,
                        result.b.ga
                      )}

                      {metric(
                        'Promedio de goles',
                        result.a.games
                          ? result.a.averageFor.toFixed(2) : '-',
                        result.b.games
                          ? result.b.averageFor.toFixed(2) : '-'
                      )}
                    </View>

                    {history(teamA, result.a)}
                    {history(teamB, result.b)}
                  </>
                )}

                {mode === 'players' && (
                  <View style={[
                    s.card,
                    { backgroundColor: C.card }
                  ]}>
                    {heading('Jugador del equipo 1')}

                    {playerPicker(
                      result.playersA,
                      playerA,
                      setPlayerA
                    )}

                    {heading('Jugador del equipo 2')}

                    {playerPicker(
                      result.playersB,
                      playerB,
                      setPlayerB
                    )}

                    {(
                      result.rosterWarning ||
                      !result.playersA.length ||
                      !result.playersB.length
                    ) && (
                      <Text style={{ color: C.muted }}>
                        Algunas plantillas no estan disponibles.
                      </Text>
                    )}

                    {pa && pb && (
                      <>
                        <View style={s.history}>
                          {[pa, pb].map((p, i) => (
                            <View
                              key={p.id + i}
                              style={{
                                flex: 1,
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              {p.photo ? (
                                <Image
                                  source={{ uri: p.photo }}
                                  style={{
                                    width: 75,
                                    height: 75,
                                    borderRadius: 40,
                                  }}
                                />
                              ) : (
                                <Ionicons
                                  name="person-circle-outline"
                                  size={65}
                                  color={C.green}
                                />
                              )}

                              <Text style={{
                                color: C.text,
                                textAlign: 'center',
                                fontWeight: '700',
                              }}>{p.name}</Text>
                            </View>
                          ))}
                        </View>

                        {metric('Edad', pa.age, pb.age)}

                        {metric(
                          'Posicion',
                          pa.position,
                          pb.position
                        )}

                        {metric(
                          'Nacionalidad',
                          pa.country,
                          pb.country
                        )}

                        {Array.from(new Set([
                          ...pa.stats.map(x => x.name),
                          ...pb.stats.map(x => x.name),
                        ])).map(name => metric(
                          name,
                          pa.stats.find(x =>
                            x.name === name
                          )?.value || '-',
                          pb.stats.find(x =>
                            x.name === name
                          )?.value || '-'
                        ))}

                        {!pa.stats.length &&
                          !pb.stats.length && (
                          <Text style={{ color: C.muted }}>
                            ESPN no proporciono estadisticas
                            individuales para esta consulta.
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                )}

                {mode === 'predictor' && (
                  <View style={[
                    s.card,
                    { backgroundColor: C.card }
                  ]}>
                    {heading('GolFlash Predictor')}

                    {prediction ? (
                      <>
                        {probability(
                          teamA.name,
                          prediction.a
                        )}

                        {probability(
                          'Empate',
                          prediction.draw
                        )}

                        {probability(
                          teamB.name,
                          prediction.b
                        )}

                        <Text style={{
                          color: C.muted,
                          textAlign: 'center',
                          marginTop: 15,
                        }}>
                          Marcador mas probable
                        </Text>

                        <Text style={{
                          color: C.green,
                          fontSize: 38,
                          fontWeight: '900',
                          textAlign: 'center',
                        }}>
                          {prediction.score}
                        </Text>

                        {metric(
                          'Goles esperados',
                          prediction.lambdaA.toFixed(2),
                          prediction.lambdaB.toFixed(2)
                        )}

                        {metric(
                          'Partidos analizados',
                          result.a.games,
                          result.b.games
                        )}

                        <Text style={{
                          color: C.muted,
                          fontSize: 12,
                          lineHeight: 19,
                        }}>
                          Modelo Poisson independiente,
                          basado en hasta 10 resultados
                          recientes por equipo.
                          No considera lesiones, localia
                          ni alineaciones confirmadas.
                          Es una estimacion experimental,
                          no una garantia del resultado.
                        </Text>
                      </>
                    ) : (
                      <Text style={{ color: C.muted }}>
                        Se necesitan al menos cinco
                        resultados validos por equipo.
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}

            <Text style={{
              textAlign: 'center',
              color: C.muted,
              fontSize: 11,
              marginTop: 15,
            }}>
              GOLFLASH PRO | Fuente: ESPN
            </Text>

          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  entry: {
    padding: 17,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 17,
  },
  card: {
    padding: 16,
    borderRadius: 17,
    gap: 12,
  },
  history: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
});