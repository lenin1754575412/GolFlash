import { useEffect, useRef } from 'react';

import {
  AppState,
  Platform,
  ToastAndroid,
  Alert,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Match } from '../types';

type Props = {
  matches: Match[];
  currentDay: boolean;
  cached: boolean;
  updated: string;
};

type Previous = {
  home: number;
  away: number;
  status: string;
};

export default function GoalAlerts({
  matches,
  currentDay,
  cached,
  updated,
}: Props) {
  const previous = useRef(
    new Map<string, Previous>()
  );

  const lastUpdate = useRef('');

  useEffect(() => {
    if (!currentDay) {
      previous.current.clear();
      lastUpdate.current = '';
      return;
    }

    if (cached || !updated ||
        lastUpdate.current === updated) return;

    lastUpdate.current = updated;

    const messages: string[] = [];

    const next = new Map<string, Previous>();

    matches.forEach(match => {
      if (
        match.homeScore == null ||
        match.awayScore == null
      ) return;

      const home = Number(match.homeScore);
      const away = Number(match.awayScore);

      if (!Number.isFinite(home) ||
          !Number.isFinite(away)) return;

      const old = previous.current.get(match.id);

      if (
        old &&
        old.status === 'live' &&
        match.status === 'live' &&
        (home > old.home || away > old.away) &&
        home >= old.home && away >= old.away
      ) {
        messages.push(
          'GOL: ' + match.home + ' ' +
          home + ' - ' + away + ' ' + match.away
        );
      }

      next.set(match.id, {
        home,
        away,
        status: match.status,
      });
    });

    previous.current = next;

    if (!messages.length) return;

    let alive = true;

    AsyncStorage.getItem('@golflash/goal-alerts')
      .then(value => {
        if (
          !alive ||
          value !== 'true' ||
          AppState.currentState !== 'active'
        ) return;

        const message = messages.join('\n');

        if (Platform.OS === 'android') {
          ToastAndroid.show(
            message,
            ToastAndroid.LONG
          );
        } else {
          Alert.alert('GolFlash - Gol', message);
        }
      })
      .catch(() => {});

    return () => { alive = false; };

  }, [matches, currentDay, cached, updated]);

  return null;
}