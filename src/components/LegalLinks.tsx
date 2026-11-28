import React, { useState } from 'react';

import {
  View,
  Text,
  Pressable,
  Linking,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

const VERSION = require('../../app.json').expo.version;

const PAGES = [
  {
    id: 'about',
    icon: 'information-circle-outline',
    title: 'Acerca de GolFlash',
    description: 'Conoce nuestra aplicación',
    content:
      'GolFlash Sports es una aplicación independiente de información deportiva. Permite consultar resultados, calendarios, estadísticas y favoritos. Utiliza React Native, Expo y TypeScript. Sus fuentes deportivas incluyen ESPN y TheSportsDB.',
  },
  {
    id: 'contact',
    icon: 'mail-outline',
    title: 'Contacto',
    description: 'Soporte y sugerencias',
    content:
      'Puedes consultar nuestro repositorio de GitHub para comunicar errores, propuestas y sugerencias sobre GolFlash.',
  },
  {
    id: 'privacy',
    icon: 'shield-checkmark-outline',
    title: 'Política de privacidad',
    description: 'Información sobre tus datos',
    content:
      'GolFlash utiliza almacenamiento local para guardar favoritos y preferencias. La aplicación realiza consultas a proveedores deportivos externos mediante Internet. Las páginas externas pueden aplicar sus propias políticas de privacidad. Puedes eliminar los datos locales desde la configuración de aplicaciones de tu dispositivo.',
  },
  {
    id: 'terms',
    icon: 'document-text-outline',
    title: 'Términos y condiciones',
    description: 'Condiciones de uso',
    content:
      'GolFlash proporciona información deportiva con fines informativos. Los resultados y horarios dependen de fuentes externas y pueden presentar retrasos o errores. Los nombres, escudos y marcas pertenecen a sus respectivos titulares. Las transmisiones externas están sujetas a los derechos y condiciones de sus proveedores.',
  },
] as const;

export default function LegalLinks({
  dark = true,
}: {
  dark?: boolean;
}) {

  const [selected, setSelected] = useState('');

  const C = {
    card: dark ? '#303030' : '#FFFFFF',
    text: dark ? '#FFFFFF' : '#202020',
    muted: dark ? '#AAAAAA' : '#666666',
    line: dark ? '#414141' : '#DDDDDD',
    green: dark ? '#76E536' : '#328A26',
    icon: dark ? '#293D24' : '#E4F2DE',
    content: dark ? '#242424' : '#F2F4F6',
  };

  async function contact() {
    try {
      await Linking.openURL(
        'https://github.com/lenin1754575412/GolFlash'
      );
    } catch {
      Alert.alert(
        'GolFlash',
        'No se pudo abrir el repositorio.'
      );
    }
  }

  return (
    <View style={{ marginTop: 25 }}>

      <Text style={{
        color: C.green,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 12,
      }}>
        INFORMACIÓN LEGAL Y SOPORTE
      </Text>

      <View style={{
        backgroundColor: C.card,
        borderRadius: 18,
        overflow: 'hidden',
      }}>

        {PAGES.map(page => {
          const active = selected === page.id;

          return (
            <View key={page.id}>

              <Pressable
                onPress={() =>
                  setSelected(active ? '' : page.id)
                }
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 13,
                  padding: 15,
                  minHeight: 75,
                  borderBottomWidth: 0.5,
                  borderBottomColor: C.line,
                }}
              >

                <View style={{
                  width: 43,
                  height: 43,
                  borderRadius: 12,
                  backgroundColor: C.icon,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Ionicons
                    name={page.icon}
                    size={24}
                    color={C.green}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: C.text,
                    fontSize: 15,
                    fontWeight: '600',
                  }}>
                    {page.title}
                  </Text>

                  <Text style={{
                    color: C.muted,
                    fontSize: 12,
                    marginTop: 5,
                  }}>
                    {page.description}
                  </Text>
                </View>

                <Ionicons
                  name={active
                    ? 'chevron-down'
                    : 'chevron-forward'}
                  color={C.muted}
                  size={19}
                />

              </Pressable>

              {active && (
                <View style={{
                  backgroundColor: C.content,
                  padding: 18,
                }}>

                  <Text style={{
                    color: C.text,
                    fontSize: 14,
                    lineHeight: 23,
                  }}>
                    {page.content}
                  </Text>

                  {page.id === 'about' && (
                    <Text style={{
                      color: C.green,
                      marginTop: 14,
                      fontWeight: '700',
                    }}>
                      Versión {VERSION}
                    </Text>
                  )}

                  {page.id === 'contact' && (
                    <Pressable
                      onPress={contact}
                      style={{
                        backgroundColor: C.icon,
                        padding: 15,
                        borderRadius: 12,
                        alignItems: 'center',
                        marginTop: 15,
                      }}
                    >
                      <Ionicons
                        name="logo-github"
                        size={25}
                        color={C.green}
                      />

                      <Text style={{
                        color: C.green,
                        fontWeight: '700',
                        marginTop: 7,
                      }}>
                        Repositorio oficial
                      </Text>
                    </Pressable>
                  )}

                </View>
              )}

            </View>
          );
        })}

      </View>

      <Text style={{
        color: C.muted,
        fontSize: 12,
        textAlign: 'center',
        marginTop: 25,
      }}>
        © {new Date().getFullYear()} GolFlash Sports
      </Text>

      <Text style={{
        color: C.muted,
        fontSize: 10,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 20,
      }}>
        Acerca de · Contacto · Privacidad · Términos
      </Text>

    </View>
  );
}