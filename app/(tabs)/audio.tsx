import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { audioStyles } from '../styles/audioStyles';

const STORAGE_KEY = 'AUDIO_RECORDINGS';

type Recording = {
  id: string;
  name: string;
  duration: string;
  uri: string;
  size?: number; // file size in bytes (optional for backward compatibility)
};

export default function RecordingsScreen() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [currentPlayback, setCurrentPlayback] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadRecordings();
    checkPermissions();
    return () => {
      if (currentPlayback) {
        currentPlayback.unloadAsync();
      }
    };
  }, []);

  // Auto-update filtered recordings when recordings or search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRecordings(recordings);
    } else {
      const filtered = recordings.filter(recording =>
        recording.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRecordings(filtered);
    }
  }, [recordings, searchQuery]);

  const checkPermissions = async () => {
    try {
      const { status } = await Audio.getPermissionsAsync();
      setPermissionStatus(status);
    } catch (error) {
      setPermissionStatus('denied');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadRecordings();
      checkPermissions();
    }, [])
  );

  const loadRecordings = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const allRecordings = JSON.parse(data);
        console.log('Loaded recordings:', allRecordings);
        
        const validRecordings = [];
        for (const recording of allRecordings) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(recording.uri);
            if (fileInfo.exists) {
              // Add file size if missing (for backward compatibility)
              if (!recording.size && fileInfo.size) {
                recording.size = fileInfo.size;
              }
              validRecordings.push(recording);
            } else {
              console.log('Missing file removed:', recording.name);
            }
          } catch (error) {
            console.log('Error checking file:', recording.name, error);
          }
        }
        
        // Save if we cleaned up missing files or added size data
        const needsUpdate = validRecordings.length !== allRecordings.length || 
                           validRecordings.some((rec, index) => !allRecordings[index]?.size && rec.size);
        
        if (needsUpdate) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validRecordings));
          console.log(`Updated recordings with file sizes and cleaned up missing files`);
        }
        
        setRecordings(validRecordings);
      } else {
        setRecordings([]);
      }
    } catch (e) {
      console.error('Failed to load recordings', e);
      setRecordings([]);
      setFilteredRecordings([]);
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
    } catch (e) {
      console.error('Failed to save recordings', e);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return 'Unknown size';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const playAudio = async (id: string) => {
    try {
      const rec = recordings.find((r) => r.id === id);
      if (!rec) return;

      console.log('Attempting to play:', rec.uri);
      const fileInfo = await FileSystem.getInfoAsync(rec.uri);
      console.log('File info:', fileInfo);
      
      if (!fileInfo.exists) {
        Alert.alert(
          'File Missing', 
          'This recording file is no longer available. It will be removed from the list.',
          [
            {
              text: 'OK',
              onPress: async () => {
                const updated = recordings.filter((r) => r.id !== id);
                setRecordings(updated);
                await saveRecordings(updated);
              }
            }
          ]
        );
        return;
      }

      // Stop any current playback before navigating
      if (currentPlayback) {
        await currentPlayback.unloadAsync();
        setCurrentPlayback(null);
        setPlayingId(null);
        setIsPaused(false);
      }

      // Navigate to dedicated audio player screen
      router.push({
        pathname: '/audio/audio-player',
        params: {
          uri: rec.uri,
          name: rec.name,
          duration: rec.duration?.toString() || '0'
        }
      });
    } catch (e) {
      Alert.alert('Playback Error', e instanceof Error ? e.message : JSON.stringify(e));
    }
  };

  const deleteRecording = async (id: string) => {
    Alert.alert('Delete Recording', 'Are you sure you want to delete this recording?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = recordings.filter((r) => r.id !== id);
            setRecordings(updated);
            await saveRecordings(updated);

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
    ]);
  };

  const renderRecording = ({ item }: { item: Recording }) => (
    <View style={audioStyles.recordingCard}>
      <View style={audioStyles.recordingInfo}>
        <View style={audioStyles.iconContainer}>
          <Ionicons name="musical-notes" size={24} color="#fff" />
        </View>
        <View style={audioStyles.textContainer}>
          <Text style={audioStyles.recordingName}>{item.name}</Text>
          <View style={audioStyles.recordingMetadata}>
            <Text style={audioStyles.recordingDuration}>{item.duration}</Text>
            <Text style={audioStyles.recordingSeparator}>•</Text>
            <Text style={audioStyles.recordingSize}>{formatFileSize(item.size || 0)}</Text>
          </View>
        </View>
        <View style={audioStyles.actions}>
          <TouchableOpacity onPress={() => playAudio(item.id)} style={audioStyles.playButton}>
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
          <TouchableOpacity onPress={() => deleteRecording(item.id)} style={audioStyles.deleteButton}>
            <MaterialIcons name="delete" size={24} color="#E74C3C" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={audioStyles.container}>
      <View style={audioStyles.header}>
        <View style={audioStyles.headerLeft}>
        </View>
        <Text style={audioStyles.title}>Audio Recordings</Text>
        <TouchableOpacity
          style={[audioStyles.addButton, permissionStatus === 'denied' && audioStyles.addButtonDisabled]}
          onPress={() => router.push('/audio/start-recording')}
        >
          <MaterialIcons 
            name={permissionStatus === 'granted' ? 'add' : permissionStatus === 'denied' ? 'mic-off' : 'mic'} 
            size={28} 
            color={permissionStatus === 'denied' ? '#ccc' : '#1A2366'} 
          />
        </TouchableOpacity>
      </View>
      
      {recordings.length > 0 && (
        <View style={audioStyles.searchContainer}>
          <View style={audioStyles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color="#666" style={audioStyles.searchIcon} />
            <TextInput
              style={audioStyles.searchInput}
              placeholder="Search recordings..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearch('')}
                style={audioStyles.clearSearchButton}
              >
                <MaterialIcons name="clear" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          {searchQuery.length > 0 && (
            <Text style={audioStyles.searchResults}>
              {filteredRecordings.length} of {recordings.length} recordings
            </Text>
          )}
        </View>
      )}
      
      <FlatList
        data={filteredRecordings}
        keyExtractor={(item) => item.id}
        renderItem={renderRecording}
        contentContainerStyle={filteredRecordings.length === 0 && searchQuery.length > 0 ? audioStyles.emptyListContent : recordings.length === 0 ? audioStyles.emptyListContent : audioStyles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          searchQuery.length > 0 ? (
            <View style={audioStyles.emptyContainer}>
              <MaterialIcons name="search-off" size={80} color="#E0E6F0" />
              <Text style={audioStyles.emptyTitle}>No Results Found</Text>
              <Text style={audioStyles.emptySubtitle}>
                No recordings match "{searchQuery}". Try a different search term.
              </Text>
              <TouchableOpacity 
                style={audioStyles.recordButton} 
                onPress={() => handleSearch('')}
              >
                <MaterialIcons name="clear" size={24} color="#fff" />
                <Text style={audioStyles.recordButtonText}>Clear Search</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={audioStyles.emptyContainer}>
              <MaterialIcons name="library-music" size={80} color="#E0E6F0" />
              <Text style={audioStyles.emptyTitle}>No Recordings Yet</Text>
              <Text style={audioStyles.emptySubtitle}>Start recording audio to see them here</Text>
              <TouchableOpacity style={audioStyles.recordButton} onPress={() => router.push('/audio/start-recording')}>
                <MaterialIcons name="mic" size={24} color="#fff" />
                <Text style={audioStyles.recordButtonText}>Start Recording</Text>
              </TouchableOpacity>
            </View>
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}

