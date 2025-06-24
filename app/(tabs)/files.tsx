import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, Image, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Video, ResizeMode } from 'expo-av';
import Pdf from 'react-native-pdf';
// @ts-ignore
import XLSX from 'xlsx';
import { WebView } from 'react-native-webview';

const STORAGE_KEY = 'SAVED_FILES';
const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

const getFileTypeIcon = (type: string) => {
  if (!type) return <Ionicons name="document" size={28} color="#888" />;
  if (type.includes('pdf')) return <MaterialIcons name="picture-as-pdf" size={28} color="#E74C3C" />;
  if (type.includes('image')) return <Ionicons name="image" size={28} color="#4F8EF7" />;
  if (type.includes('video')) return <Ionicons name="videocam" size={28} color="#27AE60" />;
  return <Ionicons name="document" size={28} color="#888" />;
};

export default function FilesHomeScreen() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [excelData, setExcelData] = useState<any[][] | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (selectedFile && (selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.csv'))) {
      loadExcel(selectedFile.uri);
    } else {
      setExcelData(null);
      setExcelError(null);
    }
  }, [selectedFile]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setFiles(JSON.parse(data));
      } else {
        setFiles([]);
      }
    } catch (e) {
      setFiles([]);
    }
    setLoading(false);
  };

  const pickFile = async () => {
    try {
      const res: DocumentPicker.DocumentPickerResult = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (res.assets && res.assets.length > 0) {
        const { name, uri, mimeType } = res.assets[0];
        const newFile = {
          id: Date.now().toString(),
          name,
          uri,
          type: mimeType || 'unknown',
          date: new Date().toISOString(),
        };
        const updatedFiles = [newFile, ...files];
        setFiles(updatedFiles);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick file.');
    }
  };

  const openFile = (file: any) => {
    setSelectedFile(file);
  };

  const closeViewer = () => {
    setSelectedFile(null);
    setExcelData(null);
    setExcelError(null);
  };

  const loadExcel = async (uri: string) => {
    setExcelLoading(true);
    setExcelError(null);
    try {
      const fileString = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const workbook = XLSX.read(fileString, { type: 'base64' });
      const wsname = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      setExcelData(data as any[][]);
    } catch (e) {
      setExcelError('Failed to load Excel file.');
    }
    setExcelLoading(false);
  };

  const renderFile = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.fileCard} onPress={() => openFile(item)}>
      <View style={styles.icon}>{getFileTypeIcon(item.type)}</View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>{item.type} | {new Date(item.date).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  // Viewer UI
  if (selectedFile) {
    const { uri, type, name } = selectedFile;
    if (type && type.includes('image')) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <TouchableOpacity onPress={closeViewer} style={{ padding: 16 }}>
            <Text style={{ color: '#fff' }}>Close</Text>
          </TouchableOpacity>
          <Image source={{ uri }} style={{ flex: 1, resizeMode: 'contain', width: windowWidth, height: windowHeight }} />
        </View>
      );
    }
    if (type && type.includes('video')) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <TouchableOpacity onPress={closeViewer} style={{ padding: 16 }}>
            <Text style={{ color: '#fff' }}>Close</Text>
          </TouchableOpacity>
          <Video source={{ uri }} useNativeControls style={{ flex: 1, width: windowWidth, height: windowHeight }} resizeMode={ResizeMode.CONTAIN} />
        </View>
      );
    }
    if (type && type.includes('pdf')) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <TouchableOpacity onPress={closeViewer} style={{ padding: 16 }}>
            <Text style={{ color: '#fff' }}>Close</Text>
          </TouchableOpacity>
          <Pdf source={{ uri }} style={{ flex: 1, width: windowWidth, height: windowHeight }} />
        </View>
      );
    }
    if (name && (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv'))) {
      return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <TouchableOpacity onPress={closeViewer} style={{ padding: 16 }}>
            <Text>Close</Text>
          </TouchableOpacity>
          {excelLoading ? (
            <ActivityIndicator style={{ flex: 1 }} />
          ) : excelError ? (
            <Text style={{ color: 'red', padding: 20 }}>{excelError}</Text>
          ) : excelData ? (
            <ScrollView horizontal style={{ flex: 1 }}>
              <ScrollView style={{ flex: 1 }}>
                <View style={{ padding: 16 }}>
                  {excelData.map((row, i) => (
                    <View key={i} style={{ flexDirection: 'row' }}>
                      {row.map((cell, j) => (
                        <Text key={j} style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, minWidth: 80 }}>{cell}</Text>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </ScrollView>
          ) : (
            <Text style={{ padding: 20 }}>No data found in Excel file.</Text>
          )}
        </View>
      );
    }
    // Fallback: try to open in WebView
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={closeViewer} style={{ padding: 16 }}>
          <Text>Close</Text>
        </TouchableOpacity>
        <WebView source={{ uri }} style={{ flex: 1 }} />
      </View>
    );
  }

  // Main file list UI
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Files</Text>
      <TouchableOpacity style={styles.pickButton} onPress={pickFile}>
        <MaterialIcons name="attach-file" size={24} color="#fff" />
        <Text style={styles.pickButtonText}>Pick a File</Text>
      </TouchableOpacity>
      {loading ? (
        <Text style={{ marginTop: 20 }}>Loading...</Text>
      ) : files.length === 0 ? (
        <Text style={{ marginTop: 20, color: '#888' }}>No files saved yet.</Text>
      ) : (
        <FlatList
          data={files}
          keyExtractor={item => item.id}
          renderItem={renderFile}
          contentContainerStyle={{ paddingVertical: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FB',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2366',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  pickButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  icon: {
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: '#888',
  },
}); 