/**
 * Catches render-time errors so a failure shows a readable message instead of
 * the app disappearing. Without this, a throw anywhere in the tree unmounts
 * everything and the app appears to "quit" with no explanation.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAudioStore } from '../../features/audio/audioStore';
import { useAdhanAudio } from '../../features/prayer/adhanAudio';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surfaced in the Metro logs. Never log user reading data — only the fault.
    console.error('Unhandled error:', error.message, info.componentStack);

    // Both audio players live in module scope, outside React. The controls that
    // stop them (MiniAudioPlayer, the settings toggle) render INSIDE this
    // boundary, so replacing the tree with the error screen would otherwise
    // leave recitation or the adhan playing with no way to stop it.
    void useAudioStore.getState().stop();
    void useAdhanAudio.getState().stopAdhan();
  }

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>حدث خطأ ما</Text>
        <ScrollView style={styles.scroll}>
          <Text style={styles.message}>{error.message}</Text>
          {error.stack !== undefined && <Text style={styles.stack}>{error.stack}</Text>}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FBF7F0', flex: 1, padding: 24, paddingTop: 80 },
  title: { color: '#1C1917', fontSize: 20, fontWeight: '600', marginBottom: 12 },
  scroll: { flex: 1 },
  message: { color: '#B91C1C', fontSize: 15, marginBottom: 16 },
  stack: { color: '#6B6058', fontFamily: 'Courier', fontSize: 11, lineHeight: 16 },
});
