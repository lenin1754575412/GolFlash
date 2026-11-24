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

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (active) setReduced(value);
      })
      .catch(() => {});

    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced
    );

    return () => {
      active = false;
      listener.remove();
    };
  }, []);

  return reduced;
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
  const value = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    value.setValue(reduced ? 1 : 0);

    const animation = Animated.timing(value, {
      toValue: 1,
      duration: reduced ? 0 : 320,
      delay: reduced ? 0 : delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    });

    animation.start();

    return () => animation.stop();
  }, [value, delay, reduced]);

  const position = value.interpolate({
    inputRange: [0, 1],
    outputRange: [distance, 0]
  });

  return (
    <Animated.View
      {...props}
      style={[
        style,
        {
          opacity: value,
          transform: horizontal
            ? [{ translateX: position }]
            : [{ translateY: position }]
        }
      ]}
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
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();

  const animate = (toValue: number) => {
    Animated.spring(scale, {
      toValue: reduced ? 1 : toValue,
      speed: 30,
      bounciness: 5,
      useNativeDriver: true
    }).start();
  };

  return (
    <Pressable
      {...props}
      style={style}
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
        <Animated.View style={{ transform: [{ scale }] }}>
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
        duration: 150,
        useNativeDriver: true
      }),
      Animated.spring(scale, {
        toValue: 1,
        speed: 14,
        bounciness: 7,
        useNativeDriver: true
      })
    ]);

    animation.start();

    return () => animation.stop();
  }, [value, scale, reduced]);

  return (
    <Animated.Text
      style={[style, { transform: [{ scale }] }]}
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
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true
        })
      ])
    );

    loop.start();

    return () => loop.stop();
  }, [opacity, reduced]);

  return (
    <Animated.Text style={[style, { opacity }]}>
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
  const value = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    const target = Number.isFinite(percent)
      ? Math.max(0, Math.min(100, percent))
      : 0;

    const animation = Animated.timing(value, {
      toValue: target,
      duration: reduced ? 0 : 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    });

    animation.start();

    return () => animation.stop();
  }, [percent, value, reduced]);

  return (
    <Animated.View
      style={{
        width: value.interpolate({
          inputRange: [0, 100],
          outputRange: ['0%', '100%']
        }),
        height: 6,
        backgroundColor: color,
        borderRadius: 8,
        alignSelf: reverse ? 'flex-end' : 'flex-start'
      }}
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
  const slide = useRef(new Animated.Value(-300)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(slide, {
        toValue: 0,
        duration: reduced ? 0 : 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: reduced ? 0 : 220,
        useNativeDriver: true
      })
    ]);

    animation.start();

    return () => animation.stop();
  }, [slide, opacity, reduced]);

  return (
    <Animated.ScrollView
      style={[
        style,
        { opacity, transform: [{ translateX: slide }] }
      ]}
      contentContainerStyle={contentContainerStyle}
    >
      {children}
    </Animated.ScrollView>
  );
}