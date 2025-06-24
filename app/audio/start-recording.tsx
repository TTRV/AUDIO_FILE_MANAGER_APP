import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Start a new recording</Text>
      <TouchableOpacity
        style={styles.micButton}
        onPress={() => router.push('/audio/recording-in-progress')}
        activeOpacity={0.8}
      >
        <AnimatedWaveMic />
      </TouchableOpacity>
      <Text style={styles.hint}>Tap the button to start recording</Text>
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
}); 