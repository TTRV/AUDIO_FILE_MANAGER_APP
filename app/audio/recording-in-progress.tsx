import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
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
      console.log('Checking audio permissions...');
      
      // Check current permission status first
      const { status: currentStatus } = await Audio.getPermissionsAsync();
      console.log('Current permission status:', currentStatus);
      
      let finalStatus = currentStatus;
      
      // If permission is not granted, request it
      if (currentStatus !== 'granted') {
        console.log('Requesting audio permissions...');
        const { status: requestedStatus } = await Audio.requestPermissionsAsync();
        console.log('Permission request result:', requestedStatus);
        finalStatus = requestedStatus;
      }
      
      if (finalStatus !== 'granted') {
        setError(`Microphone permission ${finalStatus}. Please enable in device settings.`);
        Alert.alert(
          'Permission Required',
          'Microphone access is required to record audio. Please enable it in your device settings and try again.',
          [
            { text: 'OK', onPress: () => router.back() }
          ]
        );
        return;
      }
      
      console.log('Setting audio mode...');
      await Audio.setAudioModeAsync({ 
        allowsRecordingIOS: true, 
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false 
      });
      
      console.log('Creating recording...');
      const recording = new Audio.Recording();
      console.log('Recording object created');
      
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      console.log('Recording prepared');
      
      await recording.startAsync();
      console.log('Recording started');
      
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000) as unknown as NodeJS.Timeout;
      console.log('Recording setup completed successfully');
    } catch (e) {
      console.error('Recording error:', e);
      setError(`Failed to start recording: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) {
        setError('No recording in progress.');
        return;
      }
      
      console.log('Stopping recording...');
      
      // Stop the recording first
      await recordingRef.current.stopAndUnloadAsync();
      console.log('Recording stopped successfully');
      
      // Get the URI immediately
      const tempUri = recordingRef.current.getURI();
      console.log('Recording temp URI:', tempUri);
      
      if (!tempUri) {
        setError('Failed to get recording URI. Please try recording again.');
        console.error('URI is null or undefined');
        setTimeout(() => {
          router.back();
        }, 3000);
        return;
      }
      
      // Immediately copy to permanent storage to prevent cache cleanup
      const timestamp = Date.now();
      const fileName = `recording_${timestamp}.m4a`;
      const permanentUri = FileSystem.documentDirectory + fileName;
      
      console.log('Copying from temp to permanent storage...');
      console.log('From:', tempUri);
      console.log('To:', permanentUri);
      
      try {
        await FileSystem.copyAsync({
          from: tempUri,
          to: permanentUri
        });
        console.log('File copied successfully to permanent storage');
        
        // Verify the permanent file exists
        const fileInfo = await FileSystem.getInfoAsync(permanentUri);
        console.log('Permanent file info:', fileInfo);
        
        if (!fileInfo.exists) {
          throw new Error('Failed to copy recording to permanent storage');
        }
        
      } catch (copyError) {
        console.error('Copy error:', copyError);
        setError(`Failed to save recording: ${copyError.message}`);
        return;
      }
      
      const duration = `${recordingTime}s`;
      
      // Clean up
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
      
      console.log('Navigating to audio player with permanent URI:', permanentUri);
      
      // Navigate with the permanent URI
      router.replace({ 
        pathname: '/audio/audio-player-save', 
        params: { uri: encodeURIComponent(permanentUri), duration } 
      });
      
    } catch (e) {
      console.error('Stop recording error:', e);
      console.error('Error type:', typeof e);
      console.error('Error message:', e?.message || 'No message');
      
      setError(`Recording failed: ${e?.message || 'Unknown error'}`);
      setIsRecording(false);
      
      // Clean up on error
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
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
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={() => router.back()}
            >
              <Text style={styles.retryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}
        {!error && (
          <TouchableOpacity
            style={[styles.doneButton, !isRecording && styles.doneButtonDisabled]}
            onPress={stopRecording}
            activeOpacity={0.8}
            disabled={!isRecording}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        )}
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
  errorContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  doneButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
}); 