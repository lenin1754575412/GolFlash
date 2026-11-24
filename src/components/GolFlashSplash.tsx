import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

export default function GolFlashSplash({
  children,
}: {
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(true);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    const entrada = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 35,
        useNativeDriver: true,
      }),
    ]);

    entrada.start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, 2500);

    return () => {
      clearTimeout(timer);
      entrada.stop();
    };
  }, [opacity, scale]);

  return (
    <View style={styles.container}>
      {children}

      {visible && (
        <Animated.View style={[styles.overlay, { opacity }]}>
          <Animated.Image
            source={require("../../assets/golflash-inicio.png")}
            resizeMode="contain"
            style={[styles.logo, { transform: [{ scale }] }]}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#050805",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  logo: {
    width: 250,
    height: 250,
    borderRadius: 35,
  },
});
