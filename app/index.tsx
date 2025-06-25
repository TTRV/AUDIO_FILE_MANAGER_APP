import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import { PermissionsAndroid, Platform } from 'react-native';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied' | 'error'>('checking');
  const router = useRouter();

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      setPermissionStatus('checking');
      
      // For Android, use native permission request with multiple attempts
      if (Platform.OS === 'android') {
        try {
          // Check if permissions are already granted first
          const hasRecordPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
          );
          
          if (hasRecordPermission) {
            console.log('Microphone permission already granted');
            setPermissionStatus('granted');
            setTimeout(() => {
              router.replace('/(tabs)/audio');
            }, 1000);
            return;
          }

          // Request microphone permission with detailed messaging
          const micPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Access Required',
              message: 'Audio File Manager needs microphone access to record audio files. This permission is essential for the app\'s core functionality.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Deny',
              buttonPositive: 'Allow',
            }
          );
          
          console.log('Native Mic Permission Result:', micPermission);
          
          // Handle different permission results
          if (micPermission === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Microphone permission GRANTED via native request');
            setPermissionStatus('granted');
            setTimeout(() => {
              router.replace('/(tabs)/audio');
            }, 1000);
            return;
          } else if (micPermission === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            console.log('Microphone permission NEVER_ASK_AGAIN - user must enable manually');
            setPermissionStatus('denied');
            return;
          } else {
            console.log('Microphone permission DENIED - trying Expo fallback');
          }
        } catch (nativeError) {
          console.log('Native permission request failed:', nativeError);
        }
      }
      
      // Fallback to Expo permissions (both Android and iOS)
      console.log('Attempting Expo permission request...');
      const audioPermission = await Audio.requestPermissionsAsync();
      const mediaPermission = await MediaLibrary.requestPermissionsAsync();
      
      console.log('Expo Audio Permission:', audioPermission);
      console.log('Expo Media Permission:', mediaPermission);
      
      if (audioPermission.status === 'granted') {
        console.log('Permissions granted via Expo');
        setPermissionStatus('granted');
        setTimeout(() => {
          router.replace('/(tabs)/audio');
        }, 1000);
      } else {
        console.log('All permission requests failed. Status:', audioPermission.status);
        setPermissionStatus('denied');
      }
    } catch (error) {
      console.error('Permission request failed with error:', error);
      setPermissionStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const retryPermissions = () => {
    setIsLoading(true);
    requestPermissions();
  };

  const proceedAnyway = () => {
    router.replace('/(tabs)/audio');
  };

  const openSettings = () => {
    Alert.alert(
      'Enable Microphone Permission',
      'To enable microphone access manually:\n\nAndroid 13+:\n1. Settings → Privacy → Permission manager\n2. Select "Microphone"\n3. Find "Audio File Manager"\n4. Tap "Allow"\n\nOr:\n1. Settings → Apps → Audio File Manager\n2. Tap "Permissions"\n3. Enable "Microphone"',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue to App', onPress: proceedAnyway }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <MaterialIcons name="mic" size={80} color="#4F8EF7" />
          <Text style={styles.title}>Audio File Manager</Text>
          <Text style={styles.subtitle}>Setting up permissions...</Text>
          <ActivityIndicator size="large" color="#4F8EF7" style={styles.loader} />
        </View>
      </View>
    );
  }

  if (permissionStatus === 'granted') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <MaterialIcons name="check-circle" size={80} color="#27AE60" />
          <Text style={styles.title}>All Set!</Text>
          <Text style={styles.subtitle}>Permissions granted successfully</Text>
          <ActivityIndicator size="large" color="#27AE60" style={styles.loader} />
        </View>
      </View>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <MaterialIcons name="mic-off" size={80} color="#E74C3C" />
          <Text style={styles.title}>Microphone Access Needed</Text>
          <Text style={styles.description}>
            This app needs microphone access to record audio files. Please grant permission to continue.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={retryPermissions}>
              <MaterialIcons name="refresh" size={24} color="#fff" />
              <Text style={styles.primaryButtonText}>Request Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={openSettings}>
              <MaterialIcons name="settings" size={24} color="#4F8EF7" />
              <Text style={styles.secondaryButtonText}>Open Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.tertiaryButton} onPress={proceedAnyway}>
              <Text style={styles.tertiaryButtonText}>Continue Without Recording</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Error case
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialIcons name="error-outline" size={80} color="#E74C3C" />
        <Text style={styles.title}>Setup Error</Text>
        <Text style={styles.description}>
          There was an error setting up the app. You can still use the file management features.
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={retryPermissions}>
            <MaterialIcons name="refresh" size={24} color="#fff" />
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={proceedAnyway}>
            <Text style={styles.secondaryButtonText}>Continue to App</Text>
          </TouchableOpacity>
        </View>
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
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
    maxWidth: 400,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A2366',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  loader: {
    marginTop: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#4F8EF7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#4F8EF7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4F8EF7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#4F8EF7',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  tertiaryButtonText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});