import AsyncStorage from '@react-native-async-storage/async-storage';

export type Preferences = {
  theme: 'dark' | 'light' | 'system';
  language: 'es' | 'en' | 'pt';
  timezone: string;
};

export let preferences: Preferences = {
  theme: 'dark',
  language: 'es',
  timezone: 'America/Lima',
};

const KEY = '@golflash/preferences-v2';

export async function loadPreferences() {
  const saved = await AsyncStorage.getItem(KEY);
  if (saved) {
    preferences = {
      ...preferences,
      ...JSON.parse(saved),
    };
  }
  return preferences;
}

export async function savePreferences(value: Preferences) {
  preferences = value;
  await AsyncStorage.setItem(KEY, JSON.stringify(value));
}

export function getTimeZone(): string {
  return preferences.timezone === 'system'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : preferences.timezone;
}