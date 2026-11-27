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

  const [opened, setOpened] = useState(false);
  const [reload, setReload] = useState(0);

  return (
    <View style={s.card}>

      <View style={s.header}>
        <Ionicons
          name="tv-outline"
          size={25}
          color="#8BDD4B"
        />

        <Text style={s.title}>
          GOLFLASH WEB TV
        </Text>

        <Pressable
          onPress={() => setReload(n => n + 1)}
        >
          <Ionicons
            name="refresh-outline"
            color="#8BDD4B"
            size={25}
          />
        </Pressable>
      </View>

      {opened ? (
        <>
          <View style={s.browser}>
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
              style={{ flex: 1 }}
              renderLoading={() => (
                <View style={s.loading}>
                  <ActivityIndicator
                    size="large"
                    color="#8BDD4B"
                  />
                  <Text style={s.muted}>
                    Cargando página...
                  </Text>
                </View>
              )}
              renderError={() => (
                <View style={s.loading}>
                  <Ionicons
                    name="cloud-offline-outline"
                    size={45}
                    color="#8BDD4B"
                  />

                  <Text style={s.white}>
                    Página no disponible
                  </Text>

                  <Pressable
                    onPress={() => setReload(n => n + 1)}
                  >
                    <Text style={s.green}>
                      Reintentar
                    </Text>
                  </Pressable>
                </View>
              )}
            />
          </View>

          <Pressable
            style={s.button}
            onPress={() => setOpened(false)}
          >
            <Text style={s.buttonText}>
              CERRAR PÁGINA
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={s.empty}>
            <Ionicons
              name="tv-outline"
              size={65}
              color="#8BDD4B"
            />

            <Text style={s.white}>
              Centro deportivo
            </Text>

            <Text style={s.muted}>
              Navegador integrado de GolFlash
            </Text>
          </View>

          <Pressable
            style={s.button}
            onPress={() => setOpened(true)}
          >
            <Ionicons
              name="play-circle"
              size={25}
              color="#101810"
            />

            <Text style={s.buttonText}>
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