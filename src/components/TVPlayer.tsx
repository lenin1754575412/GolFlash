import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';

const SOURCE =
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

export default function TVPlayer() {
  const player = useVideoPlayer(SOURCE);

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Ionicons
          name="tv-outline"
          color="#8BDD4B"
          size={23}
        />

        <Text style={s.title}>
          GOLFLASH PLAYER
        </Text>

        <Text style={s.hd}>HD</Text>
      </View>

      <VideoView
        player={player}
        style={s.video}
        nativeControls={true}
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
      />

      <Text style={s.description}>
        Reproductor integrado
      </Text>

      <Text style={s.info}>
        Video de prueba - HLS
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#151D18',
    borderRadius: 18,
    padding: 13,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#29382E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  title: {
    flex: 1,
    color: '#8BDD4B',
    fontSize: 15,
    fontWeight: '800',
  },
  hd: {
    color: '#8BDD4B',
    backgroundColor: '#293D24',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 5,
    fontWeight: '700',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: 12,
  },
  description: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginTop: 15,
  },
  info: {
    color: '#A5B0A8',
    fontSize: 12,
    marginTop: 6,
  },
});