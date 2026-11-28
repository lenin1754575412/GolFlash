// GOLFLASH_GLOBAL_THEME
import { useGolTheme, gfStyle, gfColor, gfColors } from "../services/globalTheme";
import React, { useMemo, useState } from 'react';

import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LEAGUES } from '../services/football';
import type { Match } from '../types';

type Props = {
  value: string;
  onChange: (code: string) => void;
  matches: Match[];
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function WorldFootballPicker({
  value,
  onChange,
  matches,
}: Props) {
  const gfDark = useGolTheme();


  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);

  const counts = useMemo(() => {

    const map = new Map<string, number>();

    matches.forEach(match => {

      map.set(
        match.leagueCode,
        (map.get(match.leagueCode) || 0) + 1
      );
    });

    return map;

  }, [matches]);

  const catalog = useMemo(() => {

    const list = new Map(
      LEAGUES.map(l => [l.code, l.name])
    );

    matches.forEach(m => {
      if (!list.has(m.leagueCode)) {
        list.set(m.leagueCode, m.league);
      }
    });

    return [...list.entries()].map(([code, name]) => ({
      code,
      name,
    }));

  }, [matches]);

  const leagues = useMemo(() => {

    const q = normalize(search.trim());

    return catalog
      .filter(l => !activeOnly || counts.has(l.code))
      .filter(l =>
        normalize(l.name + ' ' + l.code).includes(q)
      )
      .sort((a, b) => {

        const activeA = counts.has(a.code) ? 1 : 0;
        const activeB = counts.has(b.code) ? 1 : 0;

        return activeB - activeA ||
          a.name.localeCompare(b.name);
      });

  }, [search, activeOnly, counts, catalog]);

  const selected = value === 'TODAS'
    ? 'Todas las competiciones'
    : catalog.find(l => l.code === value)?.name ||
      value;

  function choose(code: string) {

    onChange(code);
    setVisible(false);
    setSearch('');
  }

  return (

    <View style={gfStyle({ margin: 14 }, gfDark)}>

      <Pressable
        style={gfStyle(s.selector, gfDark)}
        onPress={() => setVisible(true)}
      >

        <View style={gfStyle(s.iconBox, gfDark)}>
          <Ionicons
            name="globe-outline"
            size={25}
            color={gfColor("#83E442", gfDark, "text")}
          />
        </View>

        <View style={gfStyle({ flex: 1 }, gfDark)}>

          <Text style={gfStyle(s.caption, gfDark)}>
            GOLFLASH WORLD FOOTBALL
          </Text>

          <Text style={gfStyle(s.title, gfDark)}>
            {selected}
          </Text>

          <Text style={gfStyle(s.sub, gfDark)}>
            {catalog.length} competiciones
          </Text>

        </View>

        <Ionicons
          name="chevron-down"
          size={22}
          color={gfColor("#83E442", gfDark, "text")}
        />

      </Pressable>

      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >

        <SafeAreaView style={gfStyle(s.screen, gfDark)}>

          <View style={gfStyle(s.header, gfDark)}>

            <Pressable
              hitSlop={12}
              onPress={() => setVisible(false)}
            >
              <Ionicons
                name="arrow-back"
                size={26}
                color={gfColor("#FFFFFF", gfDark, "text")}
              />
            </Pressable>

            <View style={gfStyle({ flex: 1 }, gfDark)}>

              <Text style={gfStyle(s.heading, gfDark)}>
                Competiciones
              </Text>

              <Text style={gfStyle(s.sub, gfDark)}>
                Futbol internacional
              </Text>

            </View>

            <Ionicons
              name="trophy-outline"
              size={28}
              color={gfColor("#83E442", gfDark, "text")}
            />

          </View>

          <View style={gfStyle(s.search, gfDark)}>

            <Ionicons
              name="search-outline"
              size={22}
              color={gfColor("#AAB6AA", gfDark, "text")}
            />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar Mundial, liga, copa..."
              placeholderTextColor={gfColor("#AAB6AA", gfDark, "text")}
              style={gfStyle(s.input, gfDark)}
            />

          </View>

          <View style={gfStyle(s.tabs, gfDark)}>

            <Pressable
              onPress={() => setActiveOnly(false)}
              style={gfStyle([
                s.tab,
                !activeOnly && s.tabActive
              ], gfDark)}
            >
              <Text style={gfStyle(s.tabText, gfDark)}>
                Todas
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveOnly(true)}
              style={gfStyle([
                s.tab,
                activeOnly && s.tabActive
              ], gfDark)}
            >
              <Text style={gfStyle(s.tabText, gfDark)}>
                Con partidos
              </Text>
            </Pressable>

          </View>

          <Pressable
            style={gfStyle(s.row, gfDark)}
            onPress={() => choose('TODAS')}
          >

            <Ionicons
              name="football-outline"
              size={24}
              color={gfColor("#83E442", gfDark, "text")}
            />

            <Text style={gfStyle(s.rowName, gfDark)}>
              Todas las competiciones
            </Text>

            <Text style={gfStyle(s.number, gfDark)}>
              {matches.length}
            </Text>

          </Pressable>

          <FlatList
            data={leagues}
            keyExtractor={item => item.code}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={gfStyle({
              paddingBottom: 30,
            }, gfDark)}
            ListEmptyComponent={
              <Text style={gfStyle(s.empty, gfDark)}>
                No hay competiciones para esta busqueda.
              </Text>
            }
            renderItem={({ item }) => (

              <Pressable
                style={gfStyle(s.row, gfDark)}
                onPress={() => choose(item.code)}
              >

                <View style={gfStyle(s.leagueIcon, gfDark)}>

                  <Ionicons
                    name="trophy-outline"
                    size={21}
                    color={gfColor("#83E442", gfDark, "text")}
                  />

                </View>

                <View style={gfStyle({ flex: 1 }, gfDark)}>

                  <Text style={gfStyle(s.rowName, gfDark)}>
                    {item.name}
                  </Text>

                  <Text style={gfStyle(s.sub, gfDark)}>
                    {counts.get(item.code) || 0} partidos
                  </Text>

                </View>

                <Ionicons
                  name={
                    value === item.code
                      ? 'checkmark-circle'
                      : 'chevron-forward'
                  }
                  size={21}
                  color={gfColor(value === item.code
                      ? '#83E442'
                      : '#788478', gfDark, "text")}
                />

              </Pressable>
            )}
          />

        </SafeAreaView>

      </Modal>

    </View>
  );
}

const s = StyleSheet.create({

  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#263029',
    borderColor: '#456D3D',
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    gap: 12,
  },

  iconBox: {
    backgroundColor: '#384B38',
    borderRadius: 12,
    padding: 12,
  },

  caption: {
    fontSize: 10,
    fontWeight: '800',
    color: '#83E442',
  },

  title: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    marginTop: 4,
  },

  sub: {
    color: '#AAB6AA',
    fontSize: 11,
    marginTop: 4,
  },

  screen: {
    flex: 1,
    backgroundColor: '#151A16',
    paddingHorizontal: 14,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 14,
  },

  heading: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },

  search: {
    backgroundColor: '#263029',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    height: 52,
    borderRadius: 13,
    gap: 9,
  },

  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },

  tabs: {
    flexDirection: 'row',
    gap: 9,
    marginVertical: 14,
  },

  tab: {
    flex: 1,
    padding: 12,
    borderRadius: 11,
    backgroundColor: '#263029',
  },

  tabActive: {
    backgroundColor: '#38642F',
  },

  tabText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#303D32',
    paddingVertical: 15,
  },

  rowName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },

  leagueIcon: {
    backgroundColor: '#263A28',
    padding: 10,
    borderRadius: 12,
  },

  number: {
    color: '#83E442',
    fontWeight: '800',
  },

  empty: {
    color: '#AAB6AA',
    textAlign: 'center',
    padding: 25,
  },

});