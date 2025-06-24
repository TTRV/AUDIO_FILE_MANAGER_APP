import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';

function Waveform() {
  // Placeholder animated waveform
  const bars = Array.from({ length: 12 });
  return (
    <View style={styles.waveformContainer}>
      {bars.map((_, i) => (
        <View key={i} style={[styles.waveBar, { height: 24 + (i % 3) * 10 }]} />
      ))}
    </View>
  );
}

export default function RecordingInProgressScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    startRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission denied.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000) as unknown as NodeJS.Timeout;
    } catch (e) {
      setError('Failed to start recording.');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      if (!uri) {
        setError('Failed to save recording.');
        return;
      }
      let duration = 'Unknown';
      const { status } = await recordingRef.current.createNewLoadedSoundAsync();
      if ('durationMillis' in status && typeof status.durationMillis === 'number') {
        duration = (status.durationMillis / 1000).toFixed(1) + 's';
      }
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      router.replace({ pathname: '/audio/audio-player-save', params: { uri, duration } });
    } catch (e) {
      setError('Failed to stop and save recording.');
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {isRecording && (
          <View style={styles.recordingIndicatorRow}>
            <View style={styles.redDot} />
            <Text style={styles.recordingText}>Recording...</Text>
          </View>
        )}
        <Waveform />
        <Text style={styles.timer}>{formatTime(recordingTime)}</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <TouchableOpacity
          style={styles.doneButton}
          onPress={stopRecording}
          activeOpacity={0.8}
          disabled={!isRecording}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 4,
  },
  waveBar: {
    width: 8,
    borderRadius: 4,
    backgroundColor: '#BFC8C6',
    marginHorizontal: 2,
  },
  timer: {
    fontSize: 32,
    fontWeight: '600',
    color: '#7A8B7B',
    marginBottom: 32,
    fontFamily: 'monospace',
  },
  doneButton: {
    backgroundColor: '#1A2366',
    borderRadius: 24,
    paddingHorizontal: 40,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 1,
  },
  recordingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  redDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E74C3C',
    marginRight: 8,
  },
  recordingText: {
    color: '#E74C3C',
    fontWeight: 'bold',
    fontSize: 18,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
}); 