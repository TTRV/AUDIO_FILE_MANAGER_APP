import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useState, useRef } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import * as FileSystem from 'expo-file-system';

const STORAGE_KEY = 'AUDIO_RECORDINGS';

type RecordingData = {
  id: string;
  name: string;
  duration: string;
  uri: string; // file:// path for playback
  size: number; // file size in bytes
};

export default function SaveAudioScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const router = useRouter();
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      const audioPerm = await Audio.requestPermissionsAsync();
      const mediaPerm = await MediaLibrary.requestPermissionsAsync();
      if (!audioPerm.granted || !mediaPerm.granted) {
        Alert.alert('Permissions Required', 'Microphone and media access are needed to record audio.');
      }
    })();
    
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, []);

  const startRecordingTimer = () => {
    recordingTimer.current = setInterval(() => {
      setRecordingDuration(prev => prev + 100);
    }, 100);
  };

  const stopRecordingTimer = () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const { granted } = await Audio.getPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Denied', 'Microphone access is required.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      startRecordingTimer();
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  const pauseRecording = async () => {
    try {
      if (recording && isRecording && !isPaused) {
        await recording.pauseAsync();
        setIsPaused(true);
        stopRecordingTimer();
      }
    } catch (err) {
      console.error('Failed to pause recording', err);
      Alert.alert('Error', 'Could not pause recording.');
    }
  };

  const resumeRecording = async () => {
    try {
      if (recording && isRecording && isPaused) {
        await recording.startAsync();
        setIsPaused(false);
        startRecordingTimer();
      }
    } catch (err) {
      console.error('Failed to resume recording', err);
      Alert.alert('Error', 'Could not resume recording.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      stopRecordingTimer();
      const status = await recording.getStatusAsync();
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      setRecording(null);
      setIsRecording(false);
      setIsPaused(false);

      if (uri) {
        // Copy to permanent storage immediately
        const permanentUri = `${FileSystem.documentDirectory}recordings/Recording_${Date.now()}.m4a`;
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}recordings/`, { intermediates: true });
        await FileSystem.copyAsync({ from: uri, to: permanentUri });

        // Get file size
        const fileInfo = await FileSystem.getInfoAsync(permanentUri);
        const fileSize = fileInfo.exists ? fileInfo.size || 0 : 0;

        // Optional: save to Media Library for system access
        try {
          const asset = await MediaLibrary.createAssetAsync(permanentUri);
          const album = await MediaLibrary.getAlbumAsync('Recordings');
          if (!album) {
            await MediaLibrary.createAlbumAsync('Recordings', asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
        } catch (mediaError) {
          console.log('Media library save failed, but file is saved locally:', mediaError);
        }

        // Check for existing recordings to prevent duplicates
        const prev = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: RecordingData[] = prev ? JSON.parse(prev) : [];
        
        // Generate unique name if duplicate exists
        let baseName = `Recording_${new Date().toLocaleTimeString()}`;
        let finalName = baseName;
        let counter = 1;
        
        while (parsed.some(recording => recording.name === finalName)) {
          finalName = `${baseName} (${counter})`;
          counter++;
        }

        const duration = Math.round((status.durationMillis || recordingDuration) / 1000) + ' sec';
        const newRecording: RecordingData = {
          id: uuidv4(),
          name: finalName,
          duration,
          uri: permanentUri,
          size: fileSize,
        };

        const updated = [...parsed, newRecording];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        Alert.alert('Success', 'Recording saved successfully.');
        setRecordingDuration(0);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Error', 'Could not save recording.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#1A2366" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Record Audio</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.recordingContainer}>
        <View style={styles.microphoneArea}>
          <View style={[styles.microphoneIcon, isRecording && styles.recordingMicIcon]}>
            <MaterialIcons 
              name="mic" 
              size={80} 
              color={isRecording ? "#E74C3C" : "#4F8EF7"} 
            />
          </View>
          
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.pulseCircle} />
            </View>
          )}
        </View>

        <View style={styles.timeDisplay}>
          <Text style={styles.timeText}>
            {formatTime(recordingDuration)}
          </Text>
          <Text style={styles.statusText}>
            {isRecording ? (isPaused ? 'PAUSED' : 'RECORDING') : 'READY TO RECORD'}
          </Text>
        </View>

        <View style={styles.controlsContainer}>
          {!isRecording ? (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startRecording}
            >
              <MaterialIcons name="fiber-manual-record" size={48} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.recordingControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={isPaused ? resumeRecording : pauseRecording}
              >
                <MaterialIcons 
                  name={isPaused ? "play-arrow" : "pause"} 
                  size={32} 
                  color="#4F8EF7" 
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopRecording}
              >
                <MaterialIcons name="stop" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {!isRecording 
              ? "Tap the red button to start recording" 
              : "Tap pause to pause, or stop to save your recording"
            }
          </Text>
          {!isRecording && (
            <Text style={styles.formatText}>
              Records in high-quality M4A format (AAC codec)
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#F6F8FB',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2366',
  },
  placeholder: {
    width: 40,
  },
  recordingContainer: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  microphoneArea: {
    position: 'relative',
    marginBottom: 60,
  },
  microphoneIcon: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  recordingMicIcon: {
    backgroundColor: '#FFE5E5',
    shadowColor: '#E74C3C',
  },
  recordingIndicator: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -10,
    left: -10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: '#E74C3C',
    opacity: 0.5,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 60,
  },
  timeText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1A2366',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#E74C3C',
    fontWeight: '600',
    letterSpacing: 1,
  },
  controlsContainer: {
    marginBottom: 40,
  },
  startButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E74C3C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E74C3C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  instructionContainer: {
    paddingHorizontal: 40,
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  formatText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
