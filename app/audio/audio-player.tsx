import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { audioPlayerStyles } from '../styles/audioPlayerStyles';

export default function AudioPlayer() {
  const router = useRouter();
  const { uri, name, duration } = useLocalSearchParams();
  
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ? parseInt(duration as string) : 0);
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    loadAudio();
    
    return () => {
      cleanup();
    };
  }, []);

  // Stop audio when leaving screen
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // This runs when screen loses focus
        if (sound && isPlaying) {
          stopPlayback();
        }
      };
    }, [sound, isPlaying])
  );

  const cleanup = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      setIsPlaying(false);
      setIsPaused(false);
      setPlaybackDuration(0);
    } catch (error) {
      console.log('Cleanup error:', error);
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const loadAudio = async () => {
    try {
      // Set optimized audio mode for smooth playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      });

      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: uri as string },
        {
          shouldPlay: false,
          isLooping: false,
          // Optimize for smooth playback
          progressUpdateIntervalMillis: 500, // Reduce update frequency
          positionMillis: 0,
        }
      );
      
      setSound(audioSound);
      
      const status = await audioSound.getStatusAsync();
      if (status.isLoaded) {
        setTotalDuration(status.durationMillis || 0);
      }
    } catch (error) {
      console.error('Error loading audio:', error);
      Alert.alert('Error', 'Failed to load audio file');
    }
  };

  const startPlayback = async () => {
    try {
      if (!sound) return;

      // Set up status listener with throttled updates
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        
        // Don't update position while user is seeking to prevent conflicts
        if (!isSeeking) {
          setPlaybackDuration(status.positionMillis || 0);
        }
        
        if (status.didJustFinish) {
          setIsPlaying(false);
          setIsPaused(false);
          setPlaybackDuration(0);
          sound.setPositionAsync(0);
        }
      });

      await sound.playAsync();
      setIsPlaying(true);
      setIsPaused(false);
    } catch (err) {
      console.error('Failed to start playback', err);
      Alert.alert('Error', 'Could not start playback.');
    }
  };

  const pausePlayback = async () => {
    try {
      if (sound && isPlaying && !isPaused) {
        await sound.pauseAsync();
        setIsPaused(true);
      }
    } catch (err) {
      console.error('Failed to pause playback', err);
      Alert.alert('Error', 'Could not pause playback.');
    }
  };

  const resumePlayback = async () => {
    try {
      if (sound && isPlaying && isPaused) {
        await sound.playAsync();
        setIsPaused(false);
      }
    } catch (err) {
      console.error('Failed to resume playback', err);
      Alert.alert('Error', 'Could not resume playback.');
    }
  };

  const stopPlayback = async () => {
    try {
      if (!sound) return;

      await sound.stopAsync();
      await sound.setPositionAsync(0);
      
      setIsPlaying(false);
      setIsPaused(false);
      setPlaybackDuration(0);
    } catch (err) {
      console.error('Failed to stop playback', err);
      Alert.alert('Error', 'Could not stop playback.');
    }
  };

  const seekToPosition = async (value: number) => {
    if (!sound) return;
    try {
      // Temporarily disable status updates during seeking to prevent stuttering
      sound.setOnPlaybackStatusUpdate(null);
      await sound.setPositionAsync(value);
      setPlaybackDuration(value);
      
      // Re-enable status updates after a short delay
      setTimeout(() => {
        if (sound) {
          sound.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded) return;
            setPlaybackDuration(status.positionMillis || 0);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setIsPaused(false);
              setPlaybackDuration(0);
              sound.setPositionAsync(0);
            }
          });
        }
      }, 100);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  return (
    <View style={audioPlayerStyles.container}>
      <View style={audioPlayerStyles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={audioPlayerStyles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#1A2366" />
        </TouchableOpacity>
        <Text style={audioPlayerStyles.headerTitle}>Now Playing</Text>
        <View style={audioPlayerStyles.placeholder} />
      </View>

      <View style={audioPlayerStyles.playerContainer}>
        <View style={audioPlayerStyles.albumArt}>
          <MaterialIcons name="music-note" size={80} color="#4F8EF7" />
        </View>

        <View style={audioPlayerStyles.trackInfo}>
          <Text style={audioPlayerStyles.trackTitle} numberOfLines={2}>
            {name || 'Audio Recording'}
          </Text>
          <Text style={audioPlayerStyles.trackSubtitle}>
            Audio File Manager
          </Text>
        </View>

        <View style={audioPlayerStyles.progressContainer}>
          <View style={audioPlayerStyles.progressBar}>
            <Slider
              style={audioPlayerStyles.slider}
              minimumValue={0}
              maximumValue={totalDuration}
              value={playbackDuration}
              onSlidingStart={() => setIsSeeking(true)}
              onSlidingComplete={(value) => {
                setIsSeeking(false);
                seekToPosition(value);
              }}
              onValueChange={(value) => {
                if (isSeeking) {
                  setPlaybackDuration(value);
                }
              }}
              minimumTrackTintColor="#4F8EF7"
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor="#4F8EF7"
            />
          </View>
          
          <View style={audioPlayerStyles.timeContainer}>
            <Text style={audioPlayerStyles.timeText}>
              {formatTime(playbackDuration)}
            </Text>
            <Text style={audioPlayerStyles.timeText}>
              {formatTime(totalDuration)}
            </Text>
          </View>
        </View>

        <View style={audioPlayerStyles.controlsContainer}>
          <TouchableOpacity 
            style={audioPlayerStyles.controlButton}
            onPress={() => seekToPosition(Math.max(0, playbackDuration - 15000))}
          >
            <MaterialIcons name="replay" size={32} color="#666" />
          </TouchableOpacity>

          {!isPlaying ? (
            <TouchableOpacity 
              style={audioPlayerStyles.playButton}
              onPress={startPlayback}
            >
              <MaterialIcons name="play-arrow" size={48} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={audioPlayerStyles.playButton}
              onPress={isPaused ? resumePlayback : pausePlayback}
            >
              <MaterialIcons 
                name={isPaused ? "play-arrow" : "pause"} 
                size={48} 
                color="#fff" 
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={audioPlayerStyles.controlButton}
            onPress={() => seekToPosition(Math.min(totalDuration, playbackDuration + 15000))}
          >
            <MaterialIcons name="fast-forward" size={32} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={audioPlayerStyles.bottomControls}>
          <TouchableOpacity 
            style={audioPlayerStyles.actionButton}
            onPress={stopPlayback}
          >
            <MaterialIcons name="stop" size={24} color="#E74C3C" />
            <Text style={audioPlayerStyles.actionButtonText}>Stop</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={audioPlayerStyles.actionButton}
            onPress={() => {
              // Add share functionality here if needed
              Alert.alert('Share', 'Share functionality coming soon!');
            }}
          >
            <MaterialIcons name="share" size={24} color="#4F8EF7" />
            <Text style={audioPlayerStyles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}