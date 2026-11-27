import TVPlayer from './TVPlayer';
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Linking,
  Alert,
  StyleSheet,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const GREEN = '#4AAE39';

const CHANNELS = [
  {
    id: 'fifa',
    name: 'FIFA+ en DAZN',
    description: 'Partidos gratuitos seleccionados',
    url: 'https://www.fifa.com/es/dazn',
    color: '#164E63',
    label: 'FIFA+',
  },
  {
    id: 'uefa',
    name: 'UEFA.tv',
    description: 'Competiciones juveniles, femeninas y futsal',
    url: 'https://www.uefa.tv/',
    color: '#1E3A8A',
    label: 'UEFA',
  },
  {
    id: 'l1max',
    name: 'L1MAX',
    description: 'Futbol peruano - Suscripcion',
    url: 'https://www.l1max.com/es',
    color: '#334155',
    label: 'L1MAX',
  },
  {
    id: 'youtube',
    name: 'FIFA YouTube',
    description: 'Videos y transmisiones oficiales',
    url: 'https://www.youtube.com/@fifa',
    color: '#B91C1C',
    label: 'YT',
  },
  {
    id: 'l1youtube',
    name: 'L1MAX YouTube',
    description: 'Contenido oficial del futbol peruano',
    url: 'https://www.youtube.com/channel/UCGVHVLD7Nzw0zdIwbVhE3vw',
    color: '#166534',
    label: 'L1',
  },
];

export default function LiveTV() {
  const [visible, setVisible] = useState(false);

  async function watch(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'GolFlash TV',
        'No se pudo abrir la plataforma.'
      );
    }
  }

  return (
    <>
      <Pressable
        style={s.banner}
        onPress={() => setVisible(true)}
      >
        <Ionicons
          name="tv-outline"
          size={24}
          color={GREEN}
        />

        <View style={{ flex: 1 }}>
          <Text style={s.bannerTitle}>
            GOLFLASH TV
          </Text>

          <Text style={s.subtitle}>
            Futbol y transmisiones deportivas
          </Text>
        </View>

        <Ionicons
          name="play-circle"
          size={29}
          color={GREEN}
        />
      </Pressable>

      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <SafeAreaView style={s.root}>
          <View style={s.header}>
            <Pressable
              onPress={() => setVisible(false)}
              hitSlop={12}
            >
              <Ionicons
                name="arrow-back"
                size={26}
                color="#FFFFFF"
              />
            </Pressable>

            <Text style={s.brand}>
              GOL<Text style={{ color: GREEN }}>
                FLASH TV
              </Text>
            </Text>

            <Ionicons
              name="tv-outline"
              size={25}
              color={GREEN}
            />
          </View>

          <ScrollView
            contentContainerStyle={s.content}
          >
{visible ? <TVPlayer /> : null}

            <View style={s.hero}>
              <Ionicons
                name="play-circle-outline"
                size={65}
                color={GREEN}
              />

              <Text style={s.heroTitle}>
                Futbol en vivo
              </Text>

              <Text style={s.subtitle}>
                Plataformas oficiales de transmision
              </Text>
            </View>

            <Text style={s.section}>
              PLATAFORMAS DEPORTIVAS
            </Text>

            {CHANNELS.map(channel => (
              <Pressable
                key={channel.id}
                style={s.channel}
                onPress={() => watch(channel.url)}
              >
                <View style={[
                  s.logo,
                  { backgroundColor: channel.color },
                ]}>
                  <Text style={s.logoText}>
                    {channel.label}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.channelTitle}>
                    {channel.name}
                  </Text>

                  <Text style={s.subtitle}>
                    {channel.description}
                  </Text>
                </View>

                <Ionicons
                  name="play-circle-outline"
                  color={GREEN}
                  size={29}
                />
              </Pressable>
            ))}

            <View style={s.notice}>
              <Ionicons
                name="information-circle-outline"
                size={23}
                color={GREEN}
              />

              <Text style={s.noticeText}>
                Las transmisiones dependen del pais,
                los derechos deportivos y la programacion.
                Algunas requieren una cuenta o suscripcion.
              </Text>
            </View>

            <Text style={s.footer}>
              GOLFLASH SPORTS TV
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1F1F1F',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 14,
    gap: 12,
    borderRadius: 14,
    backgroundColor: '#263B25',
    borderWidth: 1,
    borderColor: '#385735',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#414141',
  },
  brand: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: '#142014',
    borderRadius: 20,
    paddingVertical: 35,
    gap: 12,
    marginBottom: 25,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },
  section: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: 14,
  },
  channel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#303030',
    padding: 16,
    borderRadius: 15,
    gap: 13,
    marginBottom: 12,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  channelTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#ABABAB',
    fontSize: 12,
    lineHeight: 18,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#293D24',
    borderRadius: 12,
    gap: 12,
    marginTop: 16,
  },
  noticeText: {
    flex: 1,
    color: '#CCCCCC',
    fontSize: 12,
    lineHeight: 19,
  },
  footer: {
    color: '#777777',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 12,
    letterSpacing: 2,
  },
});