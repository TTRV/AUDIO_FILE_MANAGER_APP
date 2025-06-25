import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';

const STORAGE_KEY = 'AUDIO_RECORDINGS';

type Recording = {
  id: string;
  name: string;
  duration: string;
  uri: string;
};

export default function AudioPlayerSaveScreen() {
  const params = useLocalSearchParams<{ uri: string; duration: string }>();
  const uri = params.uri ? decodeURIComponent(params.uri) : undefined;
  const duration = params.duration;
  const [name, setName] = useState('');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<any>(null);
  const [sliderValue, setSliderValue] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log('AudioPlayerSaveScreen loaded with params:', { uri, duration });
    
    const checkFile = async () => {
      if (uri) {
        try {
          console.log('Audio file URI:', uri);
          const fileInfo = await FileSystem.getInfoAsync(uri);
          console.log('Audio file info on load:', fileInfo);
        } catch (error) {
          console.error('Error checking audio file:', error);
        }
      }
    };
    
    checkFile();
    
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound, uri, duration]);

  const loadAndPlay = async () => {
    if (!uri) return;
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        return;
      } else {
        await sound.playAsync();
        setIsPlaying(true);
        return;
      }
    }
    const { sound: newSound } = await Audio.Sound.createAsync({ uri });
    setSound(newSound);
    setIsPlaying(true);
    newSound.setOnPlaybackStatusUpdate((status: any) => {
      setPlaybackStatus(status);
      if (!isSeeking && status.positionMillis && status.durationMillis) {
        setSliderValue(status.positionMillis / status.durationMillis);
      }
      if ('didJustFinish' in status && status.didJustFinish) {
        setIsPlaying(false);
        newSound.setPositionAsync(0);
      }
    });
    await newSound.playAsync();
  };

  const onSliderValueChange = (value: number) => {
    setIsSeeking(true);
    setSliderValue(value);
  };

  const onSlidingComplete = async (value: number) => {
    if (sound && playbackStatus && playbackStatus.durationMillis) {
      const position = value * playbackStatus.durationMillis;
      await sound.setPositionAsync(position);
    }
    setIsSeeking(false);
  };

  const saveRecording = async () => {
    if (!name.trim()) {
      Alert.alert('Please enter a name for your recording.');
      return;
    }
    
    if (!uri) {
      Alert.alert('Error', 'No recording file available to save.');
      return;
    }
    
    try {
      const id = Date.now().toString();
      
      // Since we already have the permanent URI, just save the recording info
      const newRecording = { 
        id, 
        name: name.trim(), 
        duration: duration || 'Unknown', 
        uri: uri // This is already the permanent path
      };
      
      console.log('Saving recording info:', newRecording);
      
      // Verify the file still exists before saving
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Recording file no longer exists');
      }
      
      console.log('File verification passed, size:', fileInfo.size);
      
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const recordings = data ? JSON.parse(data) : [];
      const updatedRecordings = [newRecording, ...recordings];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecordings));
      
      console.log('Recording saved successfully to storage');
      router.replace('/audio');
    } catch (e) {
      console.error('Failed to save recording:', e);
      Alert.alert('Failed to save recording.', e instanceof Error ? e.message : JSON.stringify(e));
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Generated!</Text>
      <Text style={styles.filename}>{name ? name + '.mp3' : 'audio.mp3'}</Text>
      <View style={styles.playerContainer}>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={0}
          maximumValue={1}
          value={sliderValue}
          minimumTrackTintColor="#4F8EF7"
          maximumTrackTintColor="#E0E6F0"
          thumbTintColor="#4F8EF7"
          onValueChange={onSliderValueChange}
          onSlidingComplete={onSlidingComplete}
          disabled={!playbackStatus || !playbackStatus.durationMillis}
        />
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{playbackStatus && playbackStatus.positionMillis ? formatTime(playbackStatus.positionMillis) : '00:00'}</Text>
          <Text style={styles.timeText}>{playbackStatus && playbackStatus.durationMillis ? formatTime(playbackStatus.durationMillis) : duration || '00:00'}</Text>
        </View>
        <TouchableOpacity style={styles.playButton} onPress={loadAndPlay}>
          <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={48} color="#4F8EF7" />
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Enter a name for your recording"
        value={name}
        onChangeText={setName}
      />
      <TouchableOpacity style={styles.saveButton} onPress={saveRecording}>
        <Text style={styles.saveButtonText}>Save audio</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FB',
    alignItems: 'center',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
    textAlign: 'center',
  },
  filename: {
    fontSize: 16,
    color: '#222',
    marginBottom: 24,
    textAlign: 'center',
  },
  playerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  seekBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'transparent',
    marginBottom: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  seekBarBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#E0E6F0',
    borderRadius: 4,
  },
  seekBarFg: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#4F8EF7',
    borderRadius: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#888',
  },
  playButton: {
    backgroundColor: '#EAF2FF',
    borderRadius: 32,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#1A2366',
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 