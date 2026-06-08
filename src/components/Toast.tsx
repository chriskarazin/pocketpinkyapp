import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';
import { horizontalScale, verticalScale, moderateScale, responsiveFontSize } from '../theme/responsive';
import { Feather } from '@expo/vector-icons';

type ToastType = 'success' | 'error';

interface ToastProps {
  visible: boolean;
  message: string;
  type: ToastType;
  onHide?: () => void;
  duration?: number;
}

export function Toast({ visible, message, type, onHide, duration = 3000 }: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (!visible || !message) return;

    opacity.setValue(0);
    translateY.setValue(-20);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onHide?.());
    }, duration);
    return () => clearTimeout(t);
  }, [visible, message]);

  if (!visible || !message) return null;

  const isSuccess = type === 'success';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + spacing.sm,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.pill, isSuccess ? styles.pillSuccess : styles.pillError]}>
        <Feather
          name={isSuccess ? 'check-circle' : 'alert-circle'}
          size={18}
          color={colors.textOnDark}
          style={styles.icon}
        />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: horizontalScale(16),
    borderRadius: moderateScale(24),
    gap: spacing.sm,
    maxWidth: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  pillSuccess: {
    backgroundColor: colors.primary,
  },
  pillError: {
    backgroundColor: colors.secondary,
  },
  icon: {
    opacity: 0.95,
  },
  message: {
    ...typography.body,
    fontSize: responsiveFontSize(14),
    color: colors.textOnDark,
    flex: 1,
  },
});
