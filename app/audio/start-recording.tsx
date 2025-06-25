import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';

function AnimatedWaveMic() {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[styles.animatedButton, { transform: [{ scale: scaleAnim }] }]}> 
      <MaterialIcons name="graphic-eq" size={40} color="#fff" style={{ position: 'absolute', top: 18, left: 40 }} />
      <MaterialIcons name="mic" size={64} color="#fff" />
    </Animated.View>
  );
}

export default function StartRecordingScreen() {
  const router = useRouter();
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      // First check current permission status without requesting
      const { status } = await Audio.getPermissionsAsync();
      console.log('Initial permission check:', status);
      setPermissionStatus(status);
      
      // If permission is undetermined, we'll request it when user taps record
      if (status === 'undetermined') {
        setPermissionStatus('undetermined');
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setPermissionStatus('denied');
    }
  };

  const forcePermissionRequest = async () => {
    try {
      console.log('Forcing permission request...');
      
      // Set audio mode first (important for some devices)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      const { status } = await Audio.requestPermissionsAsync();
      console.log('Forced permission result:', status);
      setPermissionStatus(status);
      
      if (status === 'granted') {
        router.push('/audio/recording-in-progress');
      } else {
        Alert.alert('Permission Status', `Permission is: ${status}`);
      }
    } catch (error) {
      console.error('Force permission error:', error);
      Alert.alert('Error', `Permission request failed: ${error.message}`);
    }
  };

  const handleStartRecording = async () => {
    try {
      console.log('Current permission status:', permissionStatus);
      
      // Force request permission again - this will show the dialog if possible
      const { status } = await Audio.requestPermissionsAsync();
      console.log('Permission request result:', status);
      
      setPermissionStatus(status);
      
      if (status === 'granted') {
        console.log('Permission granted, starting recording...');
        router.push('/audio/recording-in-progress');
      } else if (status === 'denied') {
        Alert.alert(
          'Microphone Permission Required',
          'To enable microphone access:\n\nAndroid: Settings → Apps → AudioFileManagerApp → Permissions → Microphone → Allow\n\niOS: Settings → Privacy & Security → Microphone → Enable for this app\n\nFor Expo Go: Enable microphone for Expo Go app instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: () => {
              // Check permissions again after user potentially changes settings
              setTimeout(checkPermissions, 1000);
            }},
            { text: 'Reset & Try', onPress: async () => {
              // Try one more time in case user just enabled it
              const { status: newStatus } = await Audio.requestPermissionsAsync();
              if (newStatus === 'granted') {
                router.push('/audio/recording-in-progress');
              } else {
                setPermissionStatus(newStatus);
              }
            }}
          ]
        );
      } else {
        Alert.alert(
          'Permission Required',
          `Microphone permission status: ${status}. Please enable microphone access to record audio.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: checkPermissions }
          ]
        );
      }
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert('Error', 'Failed to request microphone permission. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Start a new recording</Text>
      <TouchableOpacity
        style={[styles.micButton, permissionStatus === 'denied' && styles.micButtonDisabled]}
        onPress={handleStartRecording}
        activeOpacity={0.8}
      >
        <AnimatedWaveMic />
      </TouchableOpacity>
      <Text style={styles.hint}>
        {permissionStatus === 'denied' 
          ? 'Microphone permission required' 
          : permissionStatus === 'undetermined'
          ? 'Tap to request microphone permission'
          : 'Tap the button to start recording'}
      </Text>
      {permissionStatus === 'denied' && (
        <Text style={styles.permissionText}>
          Please enable microphone permission in your device settings
        </Text>
      )}
      {permissionStatus === 'undetermined' && (
        <Text style={styles.permissionText}>
          The app will request microphone permission when you tap record
        </Text>
      )}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 40,
    textAlign: 'center',
  },
  micButton: {
    backgroundColor: '#4F8EF7',
    borderRadius: 60,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F8EF7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 24,
  },
  animatedButton: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  hint: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  micButtonDisabled: {
    backgroundColor: '#ccc',
    shadowColor: '#ccc',
  },
  permissionText: {
    fontSize: 14,
    color: '#E74C3C',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
}); 