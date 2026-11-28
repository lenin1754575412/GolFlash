import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Modal,
  Alert,
  Share,
  Linking,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPO =
  'https://github.com/lenin1754575412/GolFlash';

const VERSION = require('../../app.json').expo.version;

const ALERT_KEY = '@golflash/goal-alerts';

const CACHE_PREFIX = "@golflash/matches/day-v2-";
const NEWS_KEY = "@golflash/articles/cache-v2";

const LEAGUES = [
  { id: 'per.1', name: 'Liga 1 Peru' },
  { id: 'esp.1', name: 'LaLiga' },
  { id: 'eng.1', name: 'Premier League' },
  { id: 'ita.1', name: 'Serie A' },
  { id: 'ger.1', name: 'Bundesliga' },
  { id: 'fra.1', name: 'Ligue 1' },
  { id: 'arg.1', name: 'Argentina' },
  { id: 'bra.1', name: 'Brasileirao' },
  { id: 'por.1', name: 'Portugal' },
  { id: 'uefa.champions', name: 'Champions League' },
  { id: 'conmebol.libertadores', name: 'Libertadores' },
];

const QUESTIONS = [
  {
    question: 'Cuantos jugadores inicia un equipo de futbol?',
    answers: ['9', '10', '11', '12'],
    correct: 2,
  },
  {
    question: 'Cuantos minutos dura un partido reglamentario?',
    answers: ['60', '80', '90', '100'],
    correct: 2,
  },
  {
    question: 'Que pais gano el Mundial de 2022?',
    answers: ['Brasil', 'Argentina', 'Francia', 'Alemania'],
    correct: 1,
  },
  {
    question: 'Cuantos jugadores por equipo hay en cancha en basquet?',
    answers: ['4', '5', '6', '7'],
    correct: 1,
  },
  {
    question: 'Cuantos jugadores por equipo hay en cancha en voley de sala?',
    answers: ['4', '5', '6', '8'],
    correct: 2,
  },
  {
    question: 'Cuantos puntos vale un tiro libre en basquet?',
    answers: ['1', '2', '3', '4'],
    correct: 0,
  },
  {
    question: 'En tenis, que puntuacion sigue despues de 30?',
    answers: ['35', '40', '45', '50'],
    correct: 1,
  },
  {
    question: 'En que deporte se utiliza un disco llamado puck?',
    answers: ['Tenis', 'Voley', 'Hockey sobre hielo', 'Beisbol'],
    correct: 2,
  },
];

type Page =
  'standings' |
  'quiz' |
  'storage' |
  'help' |
  'diagnostics' |
  null;

type Standing = {
  id: string;
  name: string;
  logo?: string;
  rank: string;
  played: string;
  won: string;
  drawn: string;
  lost: string;
  points: string;
};

type Group = {
  id: string;
  name: string;
  rows: Standing[];
};

async function request(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function extractGroups(data: any): Group[] {
  const groups: Group[] = [];

  function visit(node: any, path: string) {
    if (!node || typeof node !== 'object') return;

    const entries = node.standings?.entries || node.entries;

    if (Array.isArray(entries) && entries.length) {
      const rows = entries.map((entry: any, i: number) => {
        const stats = Array.isArray(entry.stats)
          ? entry.stats : [];

        function value(...names: string[]) {
          const item = stats.find((s: any) =>
            names.includes(String(s.name)) ||
            names.includes(String(s.abbreviation))
          );

          return String(
            item?.displayValue ?? item?.value ?? '-'
          );
        }

        const logo = entry.team?.logos?.[0]?.href;

        return {
          id: String(entry.team?.id || i),
          name: String(
            entry.team?.displayName ||
            entry.team?.name || 'Equipo'
          ),
          logo: typeof logo === 'string' &&
            logo.startsWith('https://') ? logo : undefined,
          rank: value('rank', 'RK'),
          played: value('gamesPlayed', 'GP'),
          won: value('wins', 'W'),
          drawn: value('ties', 'draws', 'D'),
          lost: value('losses', 'L'),
          points: value('points', 'PTS', 'P'),
        };
      });

      groups.push({
        id: path,
        name: String(
          node.name || node.abbreviation || 'Clasificacion'
        ),
        rows,
      });
    }

    if (Array.isArray(node.children)) {
      node.children.forEach((child: any, i: number) =>
        visit(child, path + '-' + i)
      );
    }
  }

  visit(data, 'root');

  return groups;
}

export default function ToolsCenter({
  dark = true,
}: {
  dark?: boolean;
}) {
  const [page, setPage] = useState<Page>(null);

  const [alerts, setAlerts] = useState(false);
  const [alertsReady, setAlertsReady] = useState(false);

  const [league, setLeague] = useState('per.1');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const [question, setQuestion] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const [storageCount, setStorageCount] = useState(0);
  const [cacheCount, setCacheCount] = useState(0);
  const [cacheSize, setCacheSize] = useState(0);
  const [storageBusy, setStorageBusy] = useState(false);

  const [diagnostic, setDiagnostic] = useState('');

  const C = {
    bg: dark ? '#111612' : '#F3F5F3',
    card: dark ? '#252C27' : '#FFFFFF',
    text: dark ? '#FFFFFF' : '#202520',
    muted: dark ? '#ABB5AD' : '#667069',
    line: dark ? '#38443B' : '#E0E6E0',
    green: dark ? '#80DE43' : '#328A26',
    icon: dark ? '#293D24' : '#E4F2DE',
  };

  useEffect(() => {
    AsyncStorage.getItem(ALERT_KEY)
      .then(value => setAlerts(value === 'true'))
      .catch(() => {})
      .finally(() => setAlertsReady(true));
  }, []);

  async function changeAlerts(value: boolean) {
    try {
      await AsyncStorage.setItem(ALERT_KEY, String(value));
      setAlerts(value);
    } catch {
      Alert.alert('GolFlash', 'No se pudo guardar.');
    }
  }

  useEffect(() => {
    if (page !== 'standings') return;

    let alive = true;

    setGroups([]);
    setError('');
    setLoading(true);

    request(
      'https://site.api.espn.com/apis/v2/sports/soccer/' +
      league + '/standings'
    )
      .then(data => {
        if (alive) setGroups(extractGroups(data));
      })
      .catch(() => {
        if (alive) {
          setError('Clasificacion no disponible. Intenta nuevamente.');
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [page, league, retry]);

  function isCache(key: string) {
    return Boolean(
      (CACHE_PREFIX && key.startsWith(CACHE_PREFIX)) ||
      (NEWS_KEY && key === NEWS_KEY)
    );
  }

  async function inspectStorage() {
    setStorageBusy(true);

    try {
      const keys = await AsyncStorage.getAllKeys();
      const caches = keys.filter(isCache);
      const values = await AsyncStorage.multiGet(caches);

      setStorageCount(keys.length);
      setCacheCount(caches.length);

      setCacheSize(
        values.reduce(
          (total, [, value]) =>
            total + (value?.length || 0) * 2,
          0
        )
      );
    } catch {
      Alert.alert('GolFlash', 'No se pudo leer el almacenamiento.');
    } finally {
      setStorageBusy(false);
    }
  }

  function clearCache() {
    Alert.alert(
      'Limpiar cache',
      'Se eliminaran los resultados y noticias guardados. Tus favoritos y preferencias se conservaran.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              await AsyncStorage.multiRemove(
                keys.filter(isCache)
              );

              await inspectStorage();

              Alert.alert(
                'GolFlash',
                'Cache eliminada. Los datos pueden volver a descargarse automaticamente.'
              );
            } catch {
              Alert.alert(
                'GolFlash',
                'No se pudo limpiar la cache.'
              );
            }
          },
        },
      ]
    );
  }

  async function openLink(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('GolFlash', 'Enlace no disponible.');
    }
  }

  async function shareApp() {
    try {
      await Share.share({
        message:
          'Conoce GolFlash Sports, resultados y deportes. ' +
          REPO,
      });
    } catch {
      Alert.alert('GolFlash', 'No se pudo compartir.');
    }
  }

  function resetQuiz() {
    setQuestion(0);
    setAnswer(null);
    setScore(0);
    setFinished(false);
  }

  function chooseAnswer(index: number) {
    if (answer !== null || finished) return;

    setAnswer(index);

    if (index === QUESTIONS[question].correct) {
      setScore(value => value + 1);
    }
  }

  async function testConnection() {
    setDiagnostic('Comprobando conexion...');

    try {
      const data = await request(
        'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard'
      );

      if (!Array.isArray(data?.events)) {
        throw new Error('Respuesta inesperada');
      }

      setDiagnostic(
        'ESPN conectado correctamente. Eventos recibidos: ' +
        data.events.length
      );
    } catch {
      setDiagnostic(
        'No se pudo comprobar ESPN. Revisa Internet o intenta mas tarde.'
      );
    }
  }

  function row(
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    description: string,
    action: () => void
  ) {
    return (
      <Pressable
        onPress={action}
        style={[
          s.row,
          { borderBottomColor: C.line }
        ]}
      >
        <View style={[
          s.icon,
          { backgroundColor: C.icon }
        ]}>
          <Ionicons name={icon} color={C.green} size={24}/>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[
            s.title, { color: C.text }
          ]}>
            {title}
          </Text>

          <Text style={[
            s.subtitle, { color: C.muted }
          ]}>
            {description}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={C.muted}
        />
      </Pressable>
    );
  }

  function button(title: string, action: () => void) {
    return (
      <Pressable
        onPress={action}
        style={[
          s.button,
          { backgroundColor: C.icon }
        ]}
      >
        <Text style={{
          color: C.green,
          fontWeight: '700',
          textAlign: 'center',
        }}>
          {title}
        </Text>
      </Pressable>
    );
  }

  const titles = {
    standings: 'Clasificaciones',
    quiz: 'GolFlash Quiz',
    storage: 'Almacenamiento',
    help: 'Centro de ayuda',
    diagnostics: 'Diagnostico',
  };

  const current = QUESTIONS[question];

  return (
    <View style={{ marginTop: 25 }}>

      <Text style={[
        s.section, { color: C.green }
      ]}>
        HERRAMIENTAS GOLFLASH
      </Text>

      <View style={[
        s.card, { backgroundColor: C.card }
      ]}>

        <View style={s.row}>
          <View style={[
            s.icon, { backgroundColor: C.icon }
          ]}>
            <Ionicons
              name="notifications-outline"
              color={C.green}
              size={24}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[
              s.title, { color: C.text }
            ]}>
              Alertas de goles
            </Text>

            <Text style={[
              s.subtitle, { color: C.muted }
            ]}>
              Mientras utilizas GolFlash
            </Text>
          </View>

          <Switch
            disabled={!alertsReady}
            value={alerts}
            onValueChange={changeAlerts}
            trackColor={{
              false: '#777777',
              true: C.green,
            }}
          />
        </View>

        {row(
          'trophy-outline',
          'Clasificaciones',
          'Tablas de posiciones',
          () => setPage('standings')
        )}

        {row(
          'game-controller-outline',
          'GolFlash Quiz',
          'Trivia multideportiva',
          () => {
            resetQuiz();
            setPage('quiz');
          }
        )}

        {row(
          'save-outline',
          'Almacenamiento',
          'Administrar y limpiar cache',
          () => {
            setPage('storage');
            inspectStorage();
          }
        )}

        {row(
          'share-social-outline',
          'Compartir GolFlash',
          'Enviar el enlace de GitHub',
          shareApp
        )}

        {row(
          'help-circle-outline',
          'Centro de ayuda',
          'Preguntas frecuentes',
          () => setPage('help')
        )}

        {row(
          'bug-outline',
          'Reportar un problema',
          'Soporte mediante GitHub',
          () => openLink(REPO + '/issues')
        )}

        {row(
          'pulse-outline',
          'Diagnostico',
          'Version y conexion deportiva',
          () => {
            setDiagnostic('');
            setPage('diagnostics');
          }
        )}

        {row(
          'cloud-download-outline',
          'Consultar actualizaciones',
          'Versiones publicadas en GitHub',
          () => openLink(REPO + '/releases')
        )}

      </View>

      <Modal
        visible={page !== null}
        animationType="slide"
        onRequestClose={() => setPage(null)}
      >
        <SafeAreaView style={{
          flex: 1,
          backgroundColor: C.bg,
        }}>

          <View style={[
            s.header,
            { borderBottomColor: C.line }
          ]}>
            <Pressable
              onPress={() => setPage(null)}
              hitSlop={12}
            >
              <Ionicons
                name="arrow-back"
                color={C.text}
                size={26}
              />
            </Pressable>

            <Text style={{
              color: C.text,
              fontSize: 22,
              fontWeight: '800',
            }}>
              {page ? titles[page] : ''}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 40,
            }}
          >

            {page === 'standings' && (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    gap: 8,
                    paddingBottom: 18,
                  }}
                >
                  {LEAGUES.map(item => (
                    <Pressable
                      key={item.id}
                      onPress={() => setLeague(item.id)}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: league === item.id
                          ? C.icon : C.card,
                        borderWidth: 1,
                        borderColor: league === item.id
                          ? C.green : C.line,
                      }}
                    >
                      <Text style={{
                        color: league === item.id
                          ? C.green : C.text,
                        fontWeight: '600',
                      }}>
                        {item.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {loading && (
                  <ActivityIndicator
                    size="large"
                    color={C.green}
                  />
                )}

                {!loading && error ? (
                  <>
                    <Text style={{ color: C.text }}>
                      {error}
                    </Text>

                    {button(
                      'Reintentar',
                      () => setRetry(n => n + 1)
                    )}
                  </>
                ) : null}

                {!loading && !error &&
                  groups.length === 0 ? (
                  <Text style={{ color: C.muted }}>
                    No hay clasificaciones disponibles.
                  </Text>
                ) : null}

                {groups.map(group => (
                  <View
                    key={group.id}
                    style={[
                      s.card,
                      {
                        backgroundColor: C.card,
                        marginBottom: 16,
                        padding: 12,
                      }
                    ]}
                  >
                    <Text style={[
                      s.title,
                      {
                        color: C.green,
                        marginBottom: 15,
                      }
                    ]}>
                      {group.name}
                    </Text>

                    <ScrollView horizontal>
                      <View style={{ minWidth: 350 }}>
                        <View style={s.tableRow}>
                          <Text style={{
                            color: C.muted,
                            width: 25,
                          }}>#</Text>

                          <Text style={{
                            color: C.muted,
                            flex: 1,
                            minWidth: 105,
                          }}>Equipo</Text>

                          {['PJ', 'G', 'E', 'P', 'PTS']
                            .map(label => (
                              <Text
                                key={label}
                                style={[
                                  s.cell,
                                  { color: C.muted }
                                ]}
                              >
                                {label}
                              </Text>
                            ))}
                        </View>

                        {group.rows.map((team, index) => (
                          <View
                            key={team.id + '-' + index}
                            style={[
                              s.tableRow,
                              {
                                borderTopWidth: 1,
                                borderTopColor: C.line,
                              }
                            ]}
                          >
                            <Text style={{
                              color: C.text,
                              width: 25,
                            }}>
                              {team.rank}
                            </Text>

                            <View style={{
                              flex: 1,
                              minWidth: 105,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                            }}>
                              {team.logo ? (
                                <Image
                                  source={{ uri: team.logo }}
                                  style={{
                                    width: 22,
                                    height: 22,
                                  }}
                                  resizeMode="contain"
                                />
                              ) : null}

                              <Text style={{
                                color: C.text,
                                flex: 1,
                                fontSize: 11,
                              }}>
                                {team.name}
                              </Text>
                            </View>

                            {[
                              team.played,
                              team.won,
                              team.drawn,
                              team.lost,
                              team.points,
                            ].map((value, i) => (
                              <Text
                                key={i}
                                style={[
                                  s.cell,
                                  {
                                    color: i === 4
                                      ? C.green : C.text,
                                    fontWeight: i === 4
                                      ? '800' : '400',
                                  }
                                ]}
                              >
                                {value}
                              </Text>
                            ))}
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                ))}

                <Text style={{
                  color: C.muted,
                  textAlign: 'center',
                }}>
                  Fuente: ESPN
                </Text>
              </>
            )}

            {page === 'quiz' && (
              <View style={[
                s.panel, { backgroundColor: C.card }
              ]}>

                <Ionicons
                  name="game-controller-outline"
                  size={50}
                  color={C.green}
                />

                <Text style={[
                  s.big, { color: C.text }
                ]}>
                  {finished ? 'Trivia completada' : 'GolFlash Quiz'}
                </Text>

                {finished ? (
                  <>
                    <Text style={{
                      color: C.green,
                      fontSize: 35,
                      fontWeight: '900',
                    }}>
                      {score} / {QUESTIONS.length}
                    </Text>

                    {button('Volver a jugar', resetQuiz)}
                  </>
                ) : (
                  <>
                    <Text style={{ color: C.muted }}>
                      Pregunta {question + 1} de {QUESTIONS.length}
                    </Text>

                    <Text style={[
                      s.big, { color: C.text }
                    ]}>
                      {current.question}
                    </Text>

                    {current.answers.map((option, index) => (
                      <Pressable
                        key={index}
                        disabled={answer !== null}
                        onPress={() => chooseAnswer(index)}
                        style={{
                          padding: 15,
                          borderRadius: 12,
                          backgroundColor:
                            answer !== null &&
                            index === current.correct
                              ? '#275C2A'
                              : answer === index
                                ? '#762D35'
                                : C.bg,
                        }}
                      >
                        <Text style={{
                          color: answer !== null &&
                            (index === current.correct ||
                             answer === index)
                            ? '#FFFFFF' : C.text,
                          fontWeight: '600',
                        }}>
                          {option}
                        </Text>
                      </Pressable>
                    ))}

                    {answer !== null ? (
                      <>
                        <Text style={{
                          color: answer === current.correct
                            ? C.green : '#F16C75',
                          fontWeight: '700',
                        }}>
                          {answer === current.correct
                            ? 'Correcto'
                            : 'Respuesta incorrecta'}
                        </Text>

                        {button('Continuar', () => {
                          if (
                            question + 1 >= QUESTIONS.length
                          ) {
                            setFinished(true);
                          } else {
                            setQuestion(n => n + 1);
                            setAnswer(null);
                          }
                        })}
                      </>
                    ) : null}
                  </>
                )}
              </View>
            )}

            {page === 'storage' && (
              <View style={[
                s.panel, { backgroundColor: C.card }
              ]}>
                <Ionicons
                  name="save-outline"
                  color={C.green}
                  size={45}
                />

                <Text style={[
                  s.big, { color: C.text }
                ]}>
                  Almacenamiento local
                </Text>

                {storageBusy ? (
                  <ActivityIndicator color={C.green}/>
                ) : (
                  <>
                    <Text style={{ color: C.text }}>
                      Registros locales: {storageCount}
                    </Text>

                    <Text style={{ color: C.text }}>
                      Registros de cache: {cacheCount}
                    </Text>

                    <Text style={{ color: C.text }}>
                      Tamano estimado: {(cacheSize / 1024).toFixed(1)} KB
                    </Text>
                  </>
                )}

                {button(
                  'Actualizar informacion',
                  inspectStorage
                )}

                {button('Limpiar cache', clearCache)}

                <Text style={{ color: C.muted }}>
                  Tus favoritos y preferencias se conservaran.
                  No se incluyen archivos multimedia ni cache nativa.
                </Text>
              </View>
            )}

            {page === 'help' && (
              <View style={[
                s.panel, { backgroundColor: C.card }
              ]}>
                {[
                  [
                    'Necesito una cuenta?',
                    'No. GolFlash funciona sin registro de usuarios.',
                  ],
                  [
                    'Por que no aparecen algunos partidos?',
                    'La cobertura depende de ESPN y TheSportsDB.',
                  ],
                  [
                    'Como se actualizan los resultados?',
                    'Mediante consultas periodicas o actualizacion manual.',
                  ],
                  [
                    'Como guardo favoritos?',
                    'Presiona la estrella de un encuentro.',
                  ],
                  [
                    'Funcionan las alertas con la app cerrada?',
                    'Las alertas actuales necesitan que GolFlash este abierto.',
                  ],
                  [
                    'Puedo ver cualquier partido?',
                    'Las transmisiones dependen de los derechos y proveedores autorizados.',
                  ],
                ].map(([title, description]) => (
                  <View key={title}>
                    <Text style={[
                      s.title, { color: C.green }
                    ]}>
                      {title}
                    </Text>

                    <Text style={[
                      s.subtitle, { color: C.text }
                    ]}>
                      {description}
                    </Text>
                  </View>
                ))}

                {button(
                  'Reportar un problema',
                  () => openLink(REPO + '/issues')
                )}
              </View>
            )}

            {page === 'diagnostics' && (
              <View style={[
                s.panel, { backgroundColor: C.card }
              ]}>
                <Ionicons
                  name="pulse-outline"
                  color={C.green}
                  size={48}
                />

                <Text style={[
                  s.big, { color: C.text }
                ]}>
                  GolFlash {VERSION}
                </Text>

                <Text style={{ color: C.muted }}>
                  React Native / Expo / TypeScript
                </Text>

                <Text style={{ color: C.text }}>
                  Almacenamiento: AsyncStorage
                </Text>

                <Text style={{ color: C.text }}>
                  Fuentes: ESPN / TheSportsDB
                </Text>

                {button(
                  'Comprobar conexion ESPN',
                  testConnection
                )}

                {diagnostic ? (
                  <Text style={{
                    color: C.text,
                    lineHeight: 22,
                  }}>
                    {diagnostic}
                  </Text>
                ) : null}

                {button(
                  'Ver repositorio',
                  () => openLink(REPO)
                )}
              </View>
            )}

          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  section: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 12,
    minHeight: 75,
    borderBottomWidth: 0.5,
  },
  icon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 19,
    marginTop: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    borderBottomWidth: 1,
  },
  button: {
    padding: 15,
    borderRadius: 12,
    marginVertical: 5,
  },
  panel: {
    padding: 20,
    borderRadius: 20,
    gap: 18,
  },
  big: {
    fontSize: 22,
    fontWeight: '800',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
    paddingVertical: 7,
    gap: 3,
  },
  cell: {
    width: 32,
    fontSize: 11,
    textAlign: 'center',
  },
});