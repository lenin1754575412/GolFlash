// GOLFLASH_GLOBAL_THEME
import { useGolTheme, gfStyle, gfColor, gfColors } from "../services/globalTheme";
import React, { useState } from 'react';

import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

const WEBSITE = 'https://futbol-libre.com/';

export default function TVPlayer() {
  const gfDark = useGolTheme();


  const [opened, setOpened] = useState(false);
  const [reload, setReload] = useState(0);

  return (
    <View style={gfStyle(s.card, gfDark)}>

      <View style={gfStyle(s.header, gfDark)}>
        <Ionicons
          name="tv-outline"
          size={25}
          color={gfColor("#8BDD4B", gfDark, "text")}
        />

        <Text style={gfStyle(s.title, gfDark)}>
          GOLFLASH WEB TV
        </Text>

        <Pressable
          onPress={() => setReload(n => n + 1)}
        >
          <Ionicons
            name="refresh-outline"
            color={gfColor("#8BDD4B", gfDark, "text")}
            size={25}
          />
        </Pressable>
      </View>

      {opened ? (
        <>
          <View style={gfStyle(s.browser, gfDark)}>
            <WebView<{}>
              key={reload}
              source={{ uri: WEBSITE }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsFullscreenVideo={true}
              allowsInlineMediaPlayback={true}
              startInLoadingState={true}
              nestedScrollEnabled={true}
              mixedContentMode="never"
              allowFileAccess={false}
              originWhitelist={['https://*']}
              style={gfStyle({ flex: 1 }, gfDark)}
              renderLoading={() => (
                <View style={gfStyle(s.loading, gfDark)}>
                  <ActivityIndicator
                    size="large"
                    color={gfColor("#8BDD4B", gfDark, "text")}
                  />
                  <Text style={gfStyle(s.muted, gfDark)}>
                    Cargando página...
                  </Text>
                </View>
              )}
              renderError={() => (
                <View style={gfStyle(s.loading, gfDark)}>
                  <Ionicons
                    name="cloud-offline-outline"
                    size={45}
                    color={gfColor("#8BDD4B", gfDark, "text")}
                  />

                  <Text style={gfStyle(s.white, gfDark)}>
                    Página no disponible
                  </Text>

                  <Pressable
                    onPress={() => setReload(n => n + 1)}
                  >
                    <Text style={gfStyle(s.green, gfDark)}>
                      Reintentar
                    </Text>
                  </Pressable>
                </View>
              )}
            />
          </View>

          <Pressable
            style={gfStyle(s.button, gfDark)}
            onPress={() => setOpened(false)}
          >
            <Text style={gfStyle(s.buttonText, gfDark)}>
              CERRAR PÁGINA
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={gfStyle(s.empty, gfDark)}>
            <Ionicons
              name="tv-outline"
              size={65}
              color={gfColor("#8BDD4B", gfDark, "text")}
            />

            <Text style={gfStyle(s.white, gfDark)}>
              Centro deportivo
            </Text>

            <Text style={gfStyle(s.muted, gfDark)}>
              Navegador integrado de GolFlash
            </Text>
          </View>

          <Pressable
            style={gfStyle(s.button, gfDark)}
            onPress={() => setOpened(true)}
          >
            <Ionicons
              name="play-circle"
              size={25}
              color={gfColor("#101810", gfDark, "text")}
            />

            <Text style={gfStyle(s.buttonText, gfDark)}>
              ABRIR PÁGINA
            </Text>
          </Pressable>
        </>
      )}

    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#151D18',
    padding: 14,
    borderRadius: 18,
    marginBottom: 20,
    gap: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
    color: '#8BDD4B',
    fontSize: 16,
    fontWeight: '800',
  },
  browser: {
    height: 580,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  loading: {
    flex: 1,
    backgroundColor: '#090D0A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  empty: {
    height: 220,
    backgroundColor: '#090D0A',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  white: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  muted: {
    color: '#999999',
    fontSize: 13,
  },
  green: {
    color: '#8BDD4B',
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#8BDD4B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#101810',
    fontWeight: '800',
  },
});