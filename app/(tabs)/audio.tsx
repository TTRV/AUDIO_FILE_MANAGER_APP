import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system';

const STORAGE_KEY = 'AUDIO_RECORDINGS';

type Recording = {
  id: string;
  name: string;
  duration: string;
  uri: string;
};

export default function RecordingsScreen() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [currentPlayback, setCurrentPlayback] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Load recordings when component mounts
  useEffect(() => {
    loadRecordings();
    return () => {
      if (currentPlayback) {
        currentPlayback.unloadAsync();
      }
    };
  }, []);

  // Refresh recordings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadRecordings();
    }, [])
  );

  const loadRecordings = async () => {
    try {
      console.log('Loading recordings...');
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsedRecordings = JSON.parse(data);
        console.log('Found recordings:', parsedRecordings.length);
        setRecordings(parsedRecordings);
      } else {
        console.log('No recordings found');
        setRecordings([]);
      }
    } catch (e) {
      console.error('Failed to load recordings', e);
      setRecordings([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecordings();
    setRefreshing(false);
  };

  const saveRecordings = async (newRecordings: Recording[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newRecordings));
      console.log('Recordings saved:', newRecordings.length);
    } catch (e) {
      console.error('Failed to save recordings', e);
    }
  };

  const playAudio = async (id: string) => {
    try {
      const rec = recordings.find(r => r.id === id);
      if (!rec) return;
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(rec.uri);
      if (!fileInfo.exists) {
        Alert.alert('File not found', 'This recording file is missing and will be removed from the list.');
        const updatedRecordings = recordings.filter(r => r.id !== id);
        setRecordings(updatedRecordings);
        await saveRecordings(updatedRecordings);
        return;
      }
      // If the same audio is currently playing, pause it
      if (playingId === id && currentPlayback && !isPaused) {
        await currentPlayback.pauseAsync();
        setIsPaused(true);
        return;
      }
      // If the same audio was paused, resume it
      if (playingId === id && currentPlayback && isPaused) {
        await currentPlayback.playAsync();
        setIsPaused(false);
        return;
      }
      // If a different audio is playing, stop it first
      if (currentPlayback) {
        await currentPlayback.unloadAsync();
        setCurrentPlayback(null);
        setPlayingId(null);
        setIsPaused(false);
      }
      // Start playing the new audio
      const { sound } = await Audio.Sound.createAsync({ uri: rec.uri });
      setCurrentPlayback(sound);
      setPlayingId(id);
      setIsPaused(false);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setPlayingId(null);
          setIsPaused(false);
          sound.unloadAsync();
        }
      });
    } catch (e) {
      Alert.alert('Failed to play audio', e instanceof Error ? e.message : JSON.stringify(e));
      console.error('Failed to play audio', e);
    }
  };

  const deleteRecording = async (id: string) => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedRecordings = recordings.filter(r => r.id !== id);
              setRecordings(updatedRecordings);
              await saveRecordings(updatedRecordings);
              
              // Stop playback if the deleted recording was playing
              if (playingId === id && currentPlayback) {
                await currentPlayback.unloadAsync();
                setCurrentPlayback(null);
                setPlayingId(null);
                setIsPaused(false);
              }
            } catch (e) {
              console.error('Failed to delete recording', e);
            }
          },
        },
      ]
    );
  };

  const renderRecording = ({ item }: { item: Recording }) => (
    <View style={styles.recordingCard}>
      <View style={styles.recordingInfo}>
        <View style={styles.iconContainer}>
          <Ionicons name="musical-notes" size={24} color="#fff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.recordingName}>{item.name}</Text>
          <Text style={styles.recordingDuration}>{item.duration}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => playAudio(item.id)} style={styles.playButton}>
            <Ionicons
              name={
                playingId === item.id
                  ? isPaused
                    ? 'play-circle'
                    : 'pause-circle'
                  : 'play-circle'
              }
              size={32}
              color="#4F8EF7"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteRecording(item.id)} style={styles.deleteButton}>
            <MaterialIcons name="delete" size={24} color="#E74C3C" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.title}>My Recordings</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/audio/start-recording')}>
          <MaterialIcons name="add" size={32} color="#1A2366" />
        </TouchableOpacity>
      </View>
      <Text style={styles.sessionNote}>
        Note: In Expo Go, recordings are only available during the current session. They will be lost if the app is closed or reloaded.
      </Text>
      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        renderItem={renderRecording}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="library-music" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Recordings Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start recording audio to see them here
            </Text>
            <TouchableOpacity 
              style={styles.recordButton}
              onPress={() => router.push('/audio')}
            >
              <MaterialIcons name="fiber-manual-record" size={24} color="#fff" />
              <Text style={styles.recordButtonText}>Go to Audio Home</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      />
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
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  recordingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  recordingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F8EF7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 10,
  },
  recordingName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordingDuration: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    gap: 8,
  },
  playButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  listContent: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  recordButton: {
    backgroundColor: '#4F8EF7',
    padding: 10,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  sessionNote: {
    color: '#E67E22',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 