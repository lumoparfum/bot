import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export type AppAlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertState = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
};

const DEFAULT_STATE: AlertState = { visible: false, title: '', buttons: [] };

let showFn: ((title: string, message?: string, buttons?: AppAlertButton[]) => void) | null = null;

// Alert.alert(title, message, buttons) ile ayni imzayi tasiyan, ama
// uygulamanin kendi tasarimini kullanan yerine gecen fonksiyon. Boylece
// telefonun ciplak sistem penceresi yerine markali bir onay kutusu cikiyor.
export function showAlert(title: string, message?: string, buttons?: AppAlertButton[]): void {
  showFn?.(title, message, buttons && buttons.length > 0 ? buttons : [{ text: 'Tamam' }]);
}

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [state, setState] = useState<AlertState>(DEFAULT_STATE);

  const show = useCallback((title: string, message?: string, buttons?: AppAlertButton[]) => {
    setState({ visible: true, title, message, buttons: buttons ?? [{ text: 'Tamam' }] });
  }, []);

  useEffect(() => {
    showFn = show;
    return () => {
      showFn = null;
    };
  }, [show]);

  const handlePress = (button: AppAlertButton) => {
    setState(DEFAULT_STATE);
    button.onPress?.();
  };

  const stacked = state.buttons.length > 2;

  return (
    <>
      {children}
      <Modal
        visible={state.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setState(DEFAULT_STATE)}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.textBlock}>
              <Text style={styles.title}>{state.title}</Text>
              {state.message ? <Text style={styles.message}>{state.message}</Text> : null}
            </View>
            <View style={[styles.buttonRow, stacked && styles.buttonColumn]}>
              {state.buttons.map((button, index) => (
                <Pressable
                  key={`${button.text}-${index}`}
                  style={({ pressed }) => [
                    styles.button,
                    stacked
                      ? index > 0 && styles.buttonBorderTop
                      : index > 0 && styles.buttonBorderLeft,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handlePress(button)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === 'destructive' && styles.buttonTextDestructive,
                      button.style === 'cancel' && styles.buttonTextCancel,
                    ]}
                  >
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(26, 34, 56, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 300,
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    textBlock: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      gap: 6,
    },
    title: {
      ...typography.headline,
      color: colors.text,
      textAlign: 'center',
    },
    message: {
      ...typography.subhead,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    buttonRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    buttonColumn: {
      flexDirection: 'column',
    },
    button: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
    },
    buttonBorderLeft: {
      borderLeftWidth: 1,
      borderLeftColor: colors.divider,
    },
    buttonBorderTop: {
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    buttonPressed: {
      backgroundColor: colors.surface,
    },
    buttonText: {
      ...typography.body,
      fontWeight: '600',
      color: colors.primary,
    },
    buttonTextDestructive: {
      color: colors.error,
    },
    buttonTextCancel: {
      fontWeight: '400',
      color: colors.textMuted,
    },
  });
}
