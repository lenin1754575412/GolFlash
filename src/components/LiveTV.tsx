// GOLFLASH_GLOBAL_THEME
import { useGolTheme, gfStyle, gfColor, gfColors } from "../services/globalTheme";
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
  const gfDark = useGolTheme();

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
        style={gfStyle(s.banner, gfDark)}
        onPress={() => setVisible(true)}
      >
        <Ionicons
          name="tv-outline"
          size={24}
          color={gfColor(GREEN, gfDark, "text")}
        />

        <View style={gfStyle({ flex: 1 }, gfDark)}>
          <Text style={gfStyle(s.bannerTitle, gfDark)}>
            GOLFLASH TV
          </Text>

          <Text style={gfStyle(s.subtitle, gfDark)}>
            Futbol y transmisiones deportivas
          </Text>
        </View>

        <Ionicons
          name="play-circle"
          size={29}
          color={gfColor(GREEN, gfDark, "text")}
        />
      </Pressable>

      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <SafeAreaView style={gfStyle(s.root, gfDark)}>
          <View style={gfStyle(s.header, gfDark)}>
            <Pressable
              onPress={() => setVisible(false)}
              hitSlop={12}
            >
              <Ionicons
                name="arrow-back"
                size={26}
                color={gfColor("#FFFFFF", gfDark, "text")}
              />
            </Pressable>

            <Text style={gfStyle(s.brand, gfDark)}>
              GOL<Text style={gfStyle({ color: GREEN }, gfDark)}>
                FLASH TV
              </Text>
            </Text>

            <Ionicons
              name="tv-outline"
              size={25}
              color={gfColor(GREEN, gfDark, "text")}
            />
          </View>

          <ScrollView
            contentContainerStyle={gfStyle(s.content, gfDark)}
          >
{visible ? <TVPlayer /> : null}

            <View style={gfStyle(s.hero, gfDark)}>
              <Ionicons
                name="play-circle-outline"
                size={65}
                color={gfColor(GREEN, gfDark, "text")}
              />

              <Text style={gfStyle(s.heroTitle, gfDark)}>
                Futbol en vivo
              </Text>

              <Text style={gfStyle(s.subtitle, gfDark)}>
                Plataformas oficiales de transmision
              </Text>
            </View>

            <Text style={gfStyle(s.section, gfDark)}>
              PLATAFORMAS DEPORTIVAS
            </Text>

            {CHANNELS.map(channel => (
              <Pressable
                key={channel.id}
                style={gfStyle(s.channel, gfDark)}
                onPress={() => watch(channel.url)}
              >
                <View style={gfStyle([
                  s.logo,
                  { backgroundColor: channel.color },
                ], gfDark)}>
                  <Text style={gfStyle(s.logoText, gfDark)}>
                    {channel.label}
                  </Text>
                </View>

                <View style={gfStyle({ flex: 1 }, gfDark)}>
                  <Text style={gfStyle(s.channelTitle, gfDark)}>
                    {channel.name}
                  </Text>

                  <Text style={gfStyle(s.subtitle, gfDark)}>
                    {channel.description}
                  </Text>
                </View>

                <Ionicons
                  name="play-circle-outline"
                  color={gfColor(GREEN, gfDark, "text")}
                  size={29}
                />
              </Pressable>
            ))}

            <View style={gfStyle(s.notice, gfDark)}>
              <Ionicons
                name="information-circle-outline"
                size={23}
                color={gfColor(GREEN, gfDark, "text")}
              />

              <Text style={gfStyle(s.noticeText, gfDark)}>
                Las transmisiones dependen del pais,
                los derechos deportivos y la programacion.
                Algunas requieren una cuenta o suscripcion.
              </Text>
            </View>

            <Text style={gfStyle(s.footer, gfDark)}>
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