// GOLFLASH_GLOBAL_THEME
import { useGolTheme, gfStyle, gfColor, gfColors } from "../services/globalTheme";
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  AccessibilityInfo,
  type PressableProps,
  type ViewProps,
  type TextProps,
  type ViewStyle
} from 'react-native';
import * as Haptics from 'expo-haptics';


let gfReducedMotion = false;

let gfMotionSubscription:
  { remove: () => void } | undefined;

const gfMotionListeners =
  new Set<() => void>();

function gfMotionSnapshot() {
  return gfReducedMotion;
}

function gfNotifyMotion(value: boolean) {

  if (gfReducedMotion === value) return;

  gfReducedMotion = value;

  gfMotionListeners.forEach(
    listener => listener()
  );
}

function gfSubscribeMotion(
  listener: () => void
) {

  gfMotionListeners.add(listener);

  if (!gfMotionSubscription) {

    AccessibilityInfo.isReduceMotionEnabled()
      .then(gfNotifyMotion)
      .catch(() => {});

    gfMotionSubscription =
      AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        gfNotifyMotion
      );
  }

  return () => {

    gfMotionListeners.delete(listener);

    if (!gfMotionListeners.size) {

      gfMotionSubscription?.remove();

      gfMotionSubscription = undefined;
    }
  };
}

function useReducedMotion() {

  return React.useSyncExternalStore(
    gfSubscribeMotion,
    gfMotionSnapshot,
    gfMotionSnapshot
  );
}

export function MotionView({
  children,
  style,
  delay = 0,
  distance = 14,
  horizontal = false,
  ...props
}: ViewProps & {
  delay?: number;
  distance?: number;
  horizontal?: boolean;
}) {
  const gfDark = useGolTheme();

  const value = useRef(new Animated.Value(1)).current;
  

  

  const position = value.interpolate({
    inputRange: [0, 1],
    outputRange: [distance, 0]
  });

  return (
    <Animated.View
      {...props}
      style={gfStyle([
        style,
        {
          opacity: value,
          transform: horizontal
            ? [{ translateX: position }]
            : [{ translateY: position }]
        }
      ], gfDark)}
    >
      {children}
    </Animated.View>
  );
}

export function MotionPressable({
  children,
  style,
  onPressIn,
  onPressOut,
  onPress,
  feedback = false,
  ...props
}: PressableProps & { feedback?: boolean }) {
  const gfDark = useGolTheme();

  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();

  const animate = (toValue: number) => {
    Animated.spring(scale, {
      toValue: reduced ? 1 : toValue,
      speed: 30,
      bounciness: 5,
      isInteraction: false, useNativeDriver: true
    }).start();
  };

  return (
    <Pressable
      {...props}
      style={gfStyle(style, gfDark)}
      onPressIn={event => {
        animate(0.97);
        onPressIn?.(event);
      }}
      onPressOut={event => {
        animate(1);
        onPressOut?.(event);
      }}
      onPress={event => {
        if (feedback) {
          Haptics.selectionAsync().catch(() => {});
        }
        onPress?.(event);
      }}
    >
      {state => (
        <Animated.View style={gfStyle({ transform: [{ scale }] }, gfDark)}>
          {typeof children === 'function'
            ? children(state)
            : children}
        </Animated.View>
      )}
    </Pressable>
  );
}

export function MotionScore({
  value,
  style
}: {
  value: string;
  style?: TextProps['style'];
}) {
  const gfDark = useGolTheme();

  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef(value);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (previous.current === value) return;

    previous.current = value;

    if (reduced) {
      scale.setValue(1);
      return;
    }

    const animation = Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.18,
        duration: 100,
        isInteraction: false, useNativeDriver: true
      }),
      Animated.spring(scale, {
        toValue: 1,
        speed: 25,
        bounciness: 3,
        isInteraction: false, useNativeDriver: true
      })
    ]);

    animation.start();

    return () => animation.stop();
  }, [value, scale, reduced]);

  return (
    <Animated.Text
      style={gfStyle([style, { transform: [{ scale }] }], gfDark)}
    >
      {value}
    </Animated.Text>
  );
}

export function LivePulse({
  style
}: {
  style?: TextProps['style'];
}) {
  const gfDark = useGolTheme();

  const opacity = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 850,
          isInteraction: false, useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 850,
          isInteraction: false, useNativeDriver: true
        })
      ])
    );

    loop.start();

    return () => loop.stop();
  }, [opacity, reduced]);

  return (
    <Animated.Text style={gfStyle([style, { opacity }], gfDark)}>
      {'\u25CF EN VIVO'}
    </Animated.Text>
  );
}

export function MotionBar({
  percent,
  color,
  reverse = false
}: {
  percent: number;
  color: string;
  reverse?: boolean;
}) {
  const gfDark = useGolTheme();

  const value = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    const target = Number.isFinite(percent)
      ? Math.max(0, Math.min(100, percent))
      : 0;

    const animation = Animated.timing(value, {
      toValue: target,
      duration: reduced ? 0 : 160,
      easing: Easing.out(Easing.cubic),
      isInteraction: false, useNativeDriver: false
    });

    animation.start();

    return () => animation.stop();
  }, [percent, value, reduced]);

  return (
    <Animated.View
      style={gfStyle({
        width: value.interpolate({
          inputRange: [0, 100],
          outputRange: ['0%', '100%']
        }),
        height: 6,
        backgroundColor: color,
        borderRadius: 8,
        alignSelf: reverse ? 'flex-end' : 'flex-start'
      }, gfDark)}
    />
  );
}

export function MotionDrawer({
  children,
  style,
  contentContainerStyle
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}) {
  const gfDark = useGolTheme();

  const slide = useRef(new Animated.Value(-300)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(slide, {
        toValue: 0,
        duration: reduced ? 0 : 130,
        easing: Easing.out(Easing.cubic),
        isInteraction: false, useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: reduced ? 0 : 100,
        isInteraction: false, useNativeDriver: true
      })
    ]);

    animation.start();

    return () => animation.stop();
  }, [slide, opacity, reduced]);

  return (
    <Animated.ScrollView
      style={gfStyle([
        style,
        { opacity, transform: [{ translateX: slide }] }
      ], gfDark)}
      contentContainerStyle={gfStyle(contentContainerStyle, gfDark)}
    >
      {children}
    </Animated.ScrollView>
  );
}