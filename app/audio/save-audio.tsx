import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SaveAudioScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Save Audio</Text>
      <Text style={styles.subtitle}>Audio saving functionality will be implemented here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
}); 