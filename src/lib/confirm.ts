import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirm dialog.
 * Uses Alert.alert on native; Alert is a no-op on web, so we fall back
 * to window.confirm there.
 */
export function confirmDialog(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = 'OK',
  destructive = false,
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Abbrechen', style: 'cancel' },
    {
      text: confirmText,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}

/**
 * Cross-platform info message with a single OK button.
 * Falls back to window.alert on web.
 */
export function alertMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
