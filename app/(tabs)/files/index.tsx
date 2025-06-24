import React, { useState } from 'react';
import { Alert, Button } from 'react-native';
import { useRouter } from 'expo-router';

const FilesScreen: React.FC = () => {
  const router = useRouter();

  const openFile = async (uri: string, type: string, name: string) => {
    try {
      router.push({
        pathname: '/(tabs)/files/viewer',
        params: { uri, type, name }
      });
    } catch (e) {
      Alert.alert('Error', 'Unable to open file.');
    }
  };

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default FilesScreen; 