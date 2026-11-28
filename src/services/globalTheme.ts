import { useEffect, useSyncExternalStore } from 'react';
import { useColorScheme, StyleSheet } from 'react-native';

import {
  preferences,
  loadPreferences,
  subscribePreferences,
} from './preferences';

let initialLoad: Promise<unknown> | undefined;

function getTheme() {
  return preferences.theme;
}

export function useGolTheme(): boolean {

  const system = useColorScheme();

  const selected = useSyncExternalStore(
    subscribePreferences,
    getTheme,
    getTheme
  );

  useEffect(() => {

    if (!initialLoad) {

      initialLoad = loadPreferences().catch(() => {
        initialLoad = undefined;
      });
    }

  }, []);

  return selected === 'system'
    ? system !== 'light'
    : selected !== 'light';
}

type Role = 'text' | 'background' | 'border';

const textPalette: Record<string, string> = {
  '#FFFFFF': '#172019',
  '#F2F2F2': '#172019',
  '#EEEEEE': '#172019',
  '#ABABAB': '#616C63',
  '#AAAAAA': '#616C63',
  '#999999': '#606C63',
  '#B9B9B9': '#616C63',
  '#4AAE39': '#287A24',
  '#76E536': '#287A24',
  '#83E442': '#287A24',
  '#00D68F': '#087A51',
};

const backgrounds: Record<string, string> = {
  '#000000': '#F2F4F6',
  '#101512': '#F2F4F6',
  '#151A16': '#F2F4F6',
  '#1F1F1F': '#F2F4F6',
  '#202020': '#F2F4F6',
  '#252525': '#F5F6F5',
  '#303030': '#FFFFFF',
  '#343434': '#FFFFFF',
  '#393939': '#E8ECE9',
  '#414141': '#E8ECE9',
  '#444444': '#E8ECE9',
  '#292D29': '#FFFFFF',
  '#232C25': '#FFFFFF',
  '#263029': '#FFFFFF',
  '#293D24': '#E3F1DE',
  '#263A28': '#E3F1DE',
  '#263A2B': '#E3F1DE',
  '#293D30': '#E3F1DE',
  '#081715': '#F0F8EE',
  '#102820': '#E4F3E0',
  '#1B3D1A': '#CFE8C8',
};

function hex(r: number, g: number, b: number) {

  return '#' + [r, g, b].map(value =>
    Math.round(
      Math.max(0, Math.min(255, value))
    ).toString(16).padStart(2, '0')
  ).join('');
}

function convert(
  input: string,
  role: Role
): string {

  if (input === 'transparent') return input;

  if (input.toLowerCase() === 'white') {

    return role === 'text'
      ? '#172019' : '#FFFFFF';
  }

  if (input.toLowerCase() === 'black') {

    return role === 'background'
      ? '#F2F4F6' : '#000000';
  }

  // Keep modal overlays and transparent colors.

  if (/^rgba?\(/i.test(input)) {

    if (role === 'border') {

      return input.replace(
        /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/i,
        'rgba(54,95,57,'
      );
    }

    return input;
  }

  let value = input.toUpperCase();

  if (/^#[0-9A-F]{3}$/.test(value)) {

    value = '#' + value.slice(1)
      .split('')
      .map(c => c + c)
      .join('');
  }

  if (!/^#[0-9A-F]{6}$/.test(value)) {
    return input;
  }

  if (role === 'text' && textPalette[value]) {
    return textPalette[value];
  }

  if (role === 'background' && backgrounds[value]) {
    return backgrounds[value];
  }

  const r = parseInt(value.slice(1, 3), 16);
  const g = parseInt(value.slice(3, 5), 16);
  const b = parseInt(value.slice(5, 7), 16);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  const neutral = max - min < 30;

  const brightness =
    (r * 299 + g * 587 + b * 114) / 1000;

  if (role === 'background') {

    if (brightness >= 185) return input;

    if (neutral) {

      return brightness < 45
        ? '#F2F4F6'
        : '#FFFFFF';
    }

    return hex(
      r * 0.14 + 255 * 0.86,
      g * 0.14 + 255 * 0.86,
      b * 0.14 + 255 * 0.86
    );
  }

  if (role === 'border') {

    if (brightness > 185) return input;

    if (neutral) return '#DCE3DD';

    if (g > r && g > b) return '#8CB883';

    return '#CCD6CE';
  }

  if (brightness < 100) return input;

  if (neutral) {

    return brightness > 210
      ? '#172019'
      : '#616C63';
  }

  if (g > r && g >= b) return '#287A24';

  if (r > g * 1.2 && r > b) return '#B32635';

  if (b > r && b >= g) return '#245D91';

  if (r > 180 && g > 130 && b < 150) {
    return '#805E09';
  }

  return '#3D5940';
}

export function gfColor<T>(
  value: T,
  dark: boolean,
  role: Role = 'text'
): T {

  if (dark || typeof value !== 'string') {
    return value;
  }

  return convert(value, role) as T;
}

export function gfColors<T>(
  values: T,
  dark: boolean,
  role: Role = 'text'
): T {

  if (dark || !Array.isArray(values)) {
    return values;
  }

  return values.map(
    value => gfColor(value, dark, role)
  ) as unknown as T;
}

const styleCache =
  new WeakMap<object, unknown>();

export function gfStyle<T>(
  value: T,
  dark: boolean
): T {

  if (dark || !value) return value;

  if (Array.isArray(value)) {

    return value.map(
      item => gfStyle(item, dark)
    ) as unknown as T;
  }

  if (typeof value === 'number') {

    const resolved = StyleSheet.flatten(value as any);

    return gfStyle(resolved, dark) as T;
  }

  if (typeof value !== 'object') return value;

  const original = value as object;

  if (styleCache.has(original)) {
    return styleCache.get(original) as T;
  }

  const output: Record<string, any> = {
    ...(value as Record<string, any>),
  };

  for (const key of Object.keys(output)) {

    if (key === 'backgroundColor') {

      output[key] = gfColor(
        output[key], dark, 'background'
      );

    } else if (/^border.*Color$/.test(key)) {

      output[key] = gfColor(
        output[key], dark, 'border'
      );

    } else if (
      key === 'color' ||
      key === 'tintColor' ||
      key === 'textDecorationColor'
    ) {

      output[key] = gfColor(
        output[key], dark, 'text'
      );
    }
  }

  styleCache.set(original, output);

  return output as T;
}