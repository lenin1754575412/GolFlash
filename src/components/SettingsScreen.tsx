import ToolsCenter from './ToolsCenter';
import LegalLinks from './LegalLinks';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  Linking,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  Preferences,
  preferences,
  loadPreferences,
  savePreferences,
} from '../services/preferences';

const config = require('../../app.json').expo;

type Props = {
  visible: boolean;
  onClose: () => void;
  autoRefresh: boolean;
  onAutoRefresh: (value: boolean) => void;
};

const languages = [
  ['es', 'Español'],
  ['en', 'English'],
  ['pt', 'Português'],
];

const zones = [
  ['system', 'Automático / System'],
  ['America/Lima', 'Perú - Lima'],
  ['America/Bogota', 'Colombia - Bogotá'],
  ['America/Mexico_City', 'México'],
  ['America/Argentina/Buenos_Aires', 'Argentina'],
  ['America/Santiago', 'Chile'],
  ['America/Sao_Paulo', 'Brasil'],
  ['America/New_York', 'Estados Unidos'],
  ['Europe/Madrid', 'España'],
  ['Europe/London', 'Reino Unido'],
  ['UTC', 'UTC'],
];

const translations = {
  es: {
    settings: 'Configuración',
    preferences: 'PREFERENCIAS',
    refresh: 'Actualización automática',
    interval: 'Resultados cada 30 segundos',
    language: 'Idioma',
    timezone: 'Zona horaria',
    appearance: 'Apariencia',
    light: 'Modo claro',
    dark: 'Modo oscuro',
    system: 'Automático',
    version: 'Versión',
    information: 'INFORMACIÓN DE LA APLICACIÓN',
    storage: 'Almacenamiento local',
    sources: 'Fuentes deportivas',
    technology: 'Tecnología',
    repository: 'Repositorio oficial',
    slogan: 'Tu fútbol, en tiempo real',
    cancel: 'Cancelar',
  },
  en: {
    settings: 'Settings',
    preferences: 'PREFERENCES',
    refresh: 'Automatic refresh',
    interval: 'Scores every 30 seconds',
    language: 'Language',
    timezone: 'Time zone',
    appearance: 'Appearance',
    light: 'Light mode',
    dark: 'Dark mode',
    system: 'System default',
    version: 'Version',
    information: 'APPLICATION INFORMATION',
    storage: 'Local storage',
    sources: 'Sports data sources',
    technology: 'Technology',
    repository: 'Official repository',
    slogan: 'Your football, in real time',
    cancel: 'Cancel',
  },
  pt: {
    settings: 'Configurações',
    preferences: 'PREFERÊNCIAS',
    refresh: 'Atualização automática',
    interval: 'Resultados a cada 30 segundos',
    language: 'Idioma',
    timezone: 'Fuso horário',
    appearance: 'Aparência',
    light: 'Modo claro',
    dark: 'Modo escuro',
    system: 'Automático',
    version: 'Versão',
    information: 'INFORMAÇÕES DO APLICATIVO',
    storage: 'Armazenamento local',
    sources: 'Fontes esportivas',
    technology: 'Tecnologia',
    repository: 'Repositório oficial',
    slogan: 'Seu futebol, em tempo real',
    cancel: 'Cancelar',
  },
};

export default function SettingsScreen({
  visible,
  onClose,
  autoRefresh,
  onAutoRefresh,
}: Props) {
  const [pref, setPref] = useState(preferences);

  const [selector, setSelector] = useState<
    'theme' | 'language' | 'timezone' | null
  >(null);

  const systemTheme = useColorScheme();

  useEffect(() => {
    loadPreferences().then(setPref).catch(() => {});
  }, []);

  const dark = pref.theme === 'system'
    ? systemTheme !== 'light'
    : pref.theme === 'dark';

  const t = translations[pref.language] || translations.es;

  const C = {
    bg: dark ? '#1F1F1F' : '#F2F4F6',
    card: dark ? '#303030' : '#FFFFFF',
    text: dark ? '#FFFFFF' : '#202020',
    muted: dark ? '#AAAAAA' : '#666666',
    line: dark ? '#414141' : '#E5E7EB',
    green: dark ? '#65C64D' : '#328A26',
    icon: dark ? '#293D24' : '#E4F2DE',
  };

  async function update(key: keyof Preferences, value: string) {
    const next = { ...pref, [key]: value } as Preferences;

    try {
      await savePreferences(next);
      setPref(next);
      setSelector(null);
    } catch {
      Alert.alert('GolFlash', 'Error al guardar la preferencia');
    }
  }

  const themes = [
    ['light', t.light],
    ['dark', t.dark],
    ['system', t.system],
  ];

  const options = selector === 'theme'
    ? themes
    : selector === 'language'
      ? languages
      : zones;

  const selectedValue = selector ? pref[selector] : '';

  function item(
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    subtitle: string,
    action?: () => void,
    extra?: React.ReactNode,
  ) {
    return (
      <Pressable
        disabled={!action}
        onPress={action}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 15,
          minHeight: 78,
          gap: 13,
          borderBottomWidth: 0.5,
          borderBottomColor: C.line,
        }}
      >
        <View style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          backgroundColor: C.icon,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Ionicons name={icon} size={23} color={C.green}/>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{
            color: C.text,
            fontSize: 15,
            fontWeight: '600',
          }}>
            {title}
          </Text>

          <Text style={{
            color: C.muted,
            fontSize: 13,
            marginTop: 5,
          }}>
            {subtitle}
          </Text>
        </View>

        {extra || (action && (
          <Ionicons
            name="chevron-forward"
            color={C.muted}
            size={19}
          />
        ))}
      </Pressable>
    );
  }

  function heading(value: string) {
    return (
      <Text style={{
        color: C.green,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.1,
        marginTop: 28,
        marginBottom: 12,
      }}>
        {value}
      </Text>
    );
  }

  const card = {
    backgroundColor: C.card,
    borderRadius: 18,
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{
        flex: 1,
        backgroundColor: C.bg,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 20,
          gap: 20,
          borderBottomWidth: 1,
          borderBottomColor: C.line,
        }}>
          <Pressable onPress={onClose}>
            <Ionicons
              name="arrow-back"
              size={26}
              color={C.text}
            />
          </Pressable>

          <Text style={{
            color: C.text,
            fontSize: 22,
            fontWeight: '700',
          }}>
            {t.settings}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{
          padding: 18,
          paddingBottom: 40,
        }}>
          <View style={{
            alignItems: 'center',
            paddingVertical: 25,
          }}>
            <Image
              source={require('../../assets/golflash-logo.png')}
              style={{
                width: 90,
                height: 90,
                borderRadius: 22,
              }}
            />

            <Text style={{
              fontSize: 30,
              color: C.text,
              fontWeight: '800',
              marginTop: 18,
            }}>
              GOL<Text style={{ color: C.green }}>FLASH</Text>
            </Text>

            <Text style={{
              color: C.muted,
              marginTop: 7,
            }}>
              {t.slogan}
            </Text>

            <View style={{
              backgroundColor: C.icon,
              padding: 12,
              borderRadius: 30,
              marginTop: 16,
            }}>
              <Text style={{
                color: C.green,
                fontWeight: '700',
              }}>
                {t.version} {config.version}
              </Text>
            </View>
          </View>

          {heading(t.preferences)}

          <View style={card}>
            {item(
              'refresh-outline',
              t.refresh,
              t.interval,
              undefined,
              <Switch
                value={autoRefresh}
                onValueChange={onAutoRefresh}
                trackColor={{
                  false: '#888888',
                  true: C.green,
                }}
              />
            )}

            {item(
              'globe-outline',
              t.language,
              languages.find(x => x[0] === pref.language)?.[1] || 'Español',
              () => setSelector('language')
            )}

            {item(
              'time-outline',
              t.timezone,
              zones.find(x => x[0] === pref.timezone)?.[1] || pref.timezone,
              () => setSelector('timezone')
            )}

            {item(
              dark ? 'moon-outline' : 'sunny-outline',
              t.appearance,
              t[pref.theme],
              () => setSelector('theme')
            )}
          </View>

          {heading(t.information)}

          <View style={card}>
            {item(
              'information-circle-outline',
              t.version,
              config.version
            )}

            {item(
              'save-outline',
              t.storage,
              'AsyncStorage'
            )}

            {item(
              'football-outline',
              t.sources,
              'ESPN / TheSportsDB'
            )}

            {item(
              'code-slash-outline',
              t.technology,
              'React Native / Expo / TypeScript'
            )}

            {item(
              'logo-github',
              t.repository,
              'GitHub',
              () => Linking.openURL(
                'https://github.com/lenin1754575412/GolFlash'
              ).catch(() => Alert.alert('GolFlash', 'Error'))
            )}
          </View>
        
<LegalLinks dark={dark} />

<ToolsCenter dark={dark} />
</ScrollView>

        <Modal
          visible={selector !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelector(null)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            justifyContent: 'center',
            padding: 25,
          }}>
            <View style={{
              backgroundColor: C.card,
              borderRadius: 23,
              padding: 20,
              maxHeight: '80%',
            }}>
              <Text style={{
                color: C.text,
                fontSize: 22,
                fontWeight: '700',
                marginBottom: 18,
              }}>
                {selector === 'theme'
                  ? t.appearance
                  : selector === 'language'
                    ? t.language
                    : t.timezone}
              </Text>

              <ScrollView>
                {options.map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() => {
                      if (selector) update(selector, value);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 17,
                      gap: 15,
                    }}
                  >
                    <Ionicons
                      name={selectedValue === value
                        ? 'radio-button-on'
                        : 'radio-button-off'}
                      size={23}
                      color={selectedValue === value
                        ? C.green
                        : C.muted}
                    />

                    <Text style={{
                      color: C.text,
                      fontSize: 16,
                    }}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Pressable
                onPress={() => setSelector(null)}
                style={{
                  alignSelf: 'flex-end',
                  padding: 12,
                }}
              >
                <Text style={{
                  color: C.green,
                  fontWeight: '700',
                }}>
                  {t.cancel}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}