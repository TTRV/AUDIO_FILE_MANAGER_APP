import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResizeMode, Video } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import XLSX from 'xlsx';
import { filesStyles } from '../styles/filesStyles';
import { fileViewerStyles } from '../styles/fileViewerStyles';
import { filePickerStyles } from '../styles/filePickerStyles';

const STORAGE_KEY = 'SAVED_FILES';
const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

const getFileTypeIcon = (type: string, size: number = 32) => {
  if (!type) return <Ionicons name="document" size={size} color="#888" />;
  if (type.includes('pdf')) return <MaterialIcons name="picture-as-pdf" size={size} color="#E74C3C" />;
  if (type.includes('image')) return <Ionicons name="image" size={size} color="#4F8EF7" />;
  if (type.includes('video')) return <Ionicons name="videocam" size={size} color="#27AE60" />;
  if (type.includes('excel') || type.includes('spreadsheet') || type.includes('csv')) 
    return <MaterialIcons name="table-chart" size={size} color="#27AE60" />;
  if (type.includes('wordprocessingml') || type.includes('msword') || type.includes('docx'))
    return <MaterialIcons name="description" size={size} color="#4285F4" />;
  return <Ionicons name="document" size={size} color="#888" />;
};

const getFileTypeName = (type: string) => {
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('image')) return 'Image';
  if (type.includes('video')) return 'Video';
  if (type.includes('excel') || type.includes('spreadsheet') || type.includes('csv')) return 'Spreadsheet';
  if (type.includes('wordprocessingml') || type.includes('msword') || type.includes('docx')) return 'Word Document';
  return 'Document';
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const SUPPORTED_FILE_TYPES = {
  // Images
  'image/jpeg': { name: 'JPEG Image', maxSize: 10 * 1024 * 1024 }, // 10MB
  'image/jpg': { name: 'JPG Image', maxSize: 10 * 1024 * 1024 },
  'image/png': { name: 'PNG Image', maxSize: 10 * 1024 * 1024 },
  'image/gif': { name: 'GIF Image', maxSize: 10 * 1024 * 1024 },
  'image/webp': { name: 'WebP Image', maxSize: 10 * 1024 * 1024 },
  'image/bmp': { name: 'BMP Image', maxSize: 10 * 1024 * 1024 },
  
  // Documents
  'application/pdf': { name: 'PDF Document', maxSize: 10 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { name: 'Excel Spreadsheet', maxSize: 10 * 1024 * 1024 },
  'application/vnd.ms-excel': { name: 'Excel Spreadsheet', maxSize: 10 * 1024 * 1024 },
  'text/csv': { name: 'CSV File', maxSize: 10 * 1024 * 1024 },
  'application/msword': { name: 'Word Document', maxSize: 10 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { name: 'DOCX Document', maxSize: 10 * 1024 * 1024 },
  'text/plain': { name: 'Text File', maxSize: 10 * 1024 * 1024 },
  
  // Videos
  'video/mp4': { name: 'MP4 Video', maxSize: 10 * 1024 * 1024 },
  'video/avi': { name: 'AVI Video', maxSize: 10 * 1024 * 1024 },
  'video/mov': { name: 'MOV Video', maxSize: 10 * 1024 * 1024 },
  'video/wmv': { name: 'WMV Video', maxSize: 10 * 1024 * 1024 },
  'video/webm': { name: 'WebM Video', maxSize: 10 * 1024 * 1024 },
  
  // Audio
  'audio/mpeg': { name: 'MP3 Audio', maxSize: 10 * 1024 * 1024 },
  'audio/mp4': { name: 'M4A Audio', maxSize: 10 * 1024 * 1024 },
  'audio/wav': { name: 'WAV Audio', maxSize: 10 * 1024 * 1024 },
  'audio/ogg': { name: 'OGG Audio', maxSize: 10 * 1024 * 1024 },
};

const validateFile = (file: any) => {
  const { name, mimeType, size } = file;
  const errors = [];
  
  // Check file type support
  if (!mimeType || !SUPPORTED_FILE_TYPES[mimeType]) {
    errors.push(`File type not supported: ${mimeType || 'unknown'}`);
  } else {
    const supportedType = SUPPORTED_FILE_TYPES[mimeType];
    
    // Check file size
    if (size && size > supportedType.maxSize) {
      const maxSizeMB = Math.round(supportedType.maxSize / (1024 * 1024));
      errors.push(`File too large. Maximum size for ${supportedType.name} is ${maxSizeMB}MB`);
    }
  }
  
  // Check file name
  if (!name || name.trim().length === 0) {
    errors.push('File name is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    supportedType: SUPPORTED_FILE_TYPES[mimeType]
  };
};

export default function FilesHomeScreen() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [excelData, setExcelData] = useState<any[][] | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [pdfInfo, setPdfInfo] = useState<{size: number, pages?: number, base64?: string} | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [pickedFiles, setPickedFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFiles, setFilteredFiles] = useState<any[]>([]);

  useEffect(() => {
    loadFiles();
  }, []);

  // Auto-update filtered files when files or search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFiles(files);
    } else {
      const filtered = files.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getFileTypeName(file.type).toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFiles(filtered);
    }
  }, [files, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadFiles();
    }, [])
  );

  useEffect(() => {
    if (selectedFile && (selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.csv'))) {
      loadExcel(selectedFile.uri);
    } else {
      setExcelData(null);
      setExcelError(null);
    }
    
    if (selectedFile && selectedFile.type?.includes('pdf')) {
      loadPDFInfo(selectedFile.uri);
    } else {
      setPdfInfo(null);
    }
  }, [selectedFile]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const allFiles = JSON.parse(data);
        console.log('Loaded files:', allFiles);
        
        // Verify each file exists and get file info
        const validFiles = [];
        for (const file of allFiles) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(file.uri);
            if (fileInfo.exists) {
              // Add file size if not present
              if (!file.size && fileInfo.size) {
                file.size = fileInfo.size;
              }
              validFiles.push(file);
            } else {
              console.log('Missing file removed:', file.name);
            }
          } catch (error) {
            console.log('Error checking file:', file.name, error);
          }
        }
        
        // Update storage if we removed any invalid files
        if (validFiles.length !== allFiles.length) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validFiles));
          console.log(`Cleaned up ${allFiles.length - validFiles.length} missing files`);
        }
        
        setFiles(validFiles);
      } else {
        setFiles([]);
      }
    } catch (e) {
      console.error('Failed to load files:', e);
      setFiles([]);
      setFilteredFiles([]);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const openFilePicker = () => {
    setShowFilePicker(true);
    setPickedFiles([]);
    setIsUploading(false);
    setUploadProgress(0);
  };

  const pickFiles = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });
      
      if (res.assets && res.assets.length > 0) {
        // Limit to 10 files
        const selectedFiles = res.assets.slice(0, 10);
        
        // Validate each file
        const validFiles = [];
        const invalidFiles = [];
        
        for (const file of selectedFiles) {
          const validation = validateFile(file);
          if (validation.isValid) {
            validFiles.push(file);
          } else {
            invalidFiles.push({ file, errors: validation.errors });
          }
        }
        
        // Show errors for invalid files
        if (invalidFiles.length > 0) {
          const errorMessages = invalidFiles.map(({ file, errors }) => 
            `${file.name}: ${errors.join(', ')}`
          ).join('\n\n');
          
          Alert.alert(
            'File Validation Errors',
            `${invalidFiles.length} file(s) could not be added:\n\n${errorMessages}`,
            [
              { text: 'OK' },
              validFiles.length > 0 ? { 
                text: `Continue with ${validFiles.length} valid files`, 
                onPress: () => setPickedFiles(validFiles) 
              } : null
            ].filter(Boolean)
          );
        }
        
        if (validFiles.length > 0) {
          setPickedFiles(validFiles);
        }
      }
    } catch (e) {
      console.error('File picker error:', e);
      Alert.alert('Error', 'Failed to pick files.');
    }
  };

  const uploadFiles = async () => {
    if (pickedFiles.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const newFiles = [];
      
      for (let i = 0; i < pickedFiles.length; i++) {
        const { name, uri, mimeType, size } = pickedFiles[i];
        
        // Update progress
        setUploadProgress(((i + 1) / pickedFiles.length) * 100);
        
        // Copy to permanent storage
        const timestamp = Date.now() + i;
        const fileExtension = name.split('.').pop() || '';
        const fileName = `file_${timestamp}.${fileExtension}`;
        const permanentUri = FileSystem.documentDirectory + fileName;
        
        await FileSystem.copyAsync({
          from: uri,
          to: permanentUri
        });
        
        const fileInfo = await FileSystem.getInfoAsync(permanentUri);
        
        const newFile = {
          id: timestamp.toString(),
          name,
          uri: permanentUri,
          type: mimeType || 'unknown',
          size: size || fileInfo.size || 0,
          date: new Date().toISOString(),
        };
        
        newFiles.push(newFile);
        
        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      const updatedFiles = [...newFiles, ...files];
      setFiles(updatedFiles);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
      
      setShowFilePicker(false);
      Alert.alert('Success', `${newFiles.length} file(s) uploaded successfully.`);
      
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload files.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const discardFiles = () => {
    setPickedFiles([]);
    setShowFilePicker(false);
    setIsUploading(false);
    setUploadProgress(0);
  };

  const deleteFile = async (fileId: string) => {
    const fileToDelete = files.find(f => f.id === fileId);
    if (!fileToDelete) return;
    
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${fileToDelete.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from file system
              try {
                await FileSystem.deleteAsync(fileToDelete.uri);
              } catch (fsError) {
                console.log('File already deleted from filesystem:', fsError);
              }
              
              // Remove from state and storage
              const updatedFiles = files.filter(f => f.id !== fileId);
              setFiles(updatedFiles);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
              
              Alert.alert('Success', 'File deleted successfully.');
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete file.');
            }
          }
        }
      ]
    );
  };


  const sharePDF = async (uri: string, fileName: string) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${fileName}`,
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share PDF.');
    }
  };

  const openFile = (file: any) => {
    setSelectedFile(file);
  };

  const closeViewer = () => {
    setSelectedFile(null);
    setExcelData(null);
    setExcelError(null);
    setPdfInfo(null);
  };

  const loadPDFInfo = async (uri: string) => {
    setPdfLoading(true);
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        console.log('Loading PDF base64 data...');
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        console.log('PDF base64 loaded, length:', base64.length);
        setPdfInfo({ 
          size: fileInfo.size || 0,
          base64: base64
        });
      } else {
        setPdfInfo(null);
      }
    } catch (e) {
      console.error('Failed to load PDF info:', e);
      setPdfInfo(null);
    }
    setPdfLoading(false);
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
    <View style={filesStyles.fileCard}>
      <TouchableOpacity 
        style={filesStyles.fileContent} 
        onPress={() => openFile(item)}
        activeOpacity={0.7}
      >
        <View style={filesStyles.iconContainer}>
          {getFileTypeIcon(item.type, 32)}
        </View>
        <View style={filesStyles.fileInfo}>
          <Text style={filesStyles.fileName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={filesStyles.fileMeta}>
            <Text style={filesStyles.fileType}>
              {getFileTypeName(item.type)}
            </Text>
            {item.size && (
              <>
                <Text style={filesStyles.metaSeparator}>•</Text>
                <Text style={filesStyles.fileSize}>
                  {formatFileSize(item.size)}
                </Text>
              </>
            )}
          </View>
          <Text style={filesStyles.fileDate}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity 
        style={filesStyles.deleteButton}
        onPress={() => deleteFile(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons name="delete-outline" size={24} color="#E74C3C" />
      </TouchableOpacity>
    </View>
  );

  if (selectedFile) {
    const { uri, type, name, size } = selectedFile;

    // Image Viewer
    if (type?.includes('image')) {
      return (
        <View style={fileViewerStyles.viewerContainer}>
          <View style={fileViewerStyles.viewerHeader}>
            <TouchableOpacity onPress={closeViewer} style={fileViewerStyles.closeButton}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={fileViewerStyles.viewerHeaderInfo}>
              <Text style={fileViewerStyles.viewerTitle} numberOfLines={1}>{name}</Text>
              <Text style={fileViewerStyles.viewerSubtitle}>
                {getFileTypeName(type)} {size && `• ${formatFileSize(size)}`}
              </Text>
            </View>
            <View style={fileViewerStyles.viewerActions}>
              <TouchableOpacity style={fileViewerStyles.actionButton}>
                <MaterialIcons name="download" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView 
            contentContainerStyle={fileViewerStyles.imageContainer}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            <Image 
              source={{ uri }} 
              style={fileViewerStyles.imageViewer}
              resizeMode="contain"
            />
          </ScrollView>
        </View>
      );
    }

    // Video Viewer
    if (type?.includes('video')) {
      return (
        <View style={fileViewerStyles.viewerContainer}>
          <View style={fileViewerStyles.viewerHeader}>
            <TouchableOpacity onPress={closeViewer} style={fileViewerStyles.closeButton}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={fileViewerStyles.viewerHeaderInfo}>
              <Text style={fileViewerStyles.viewerTitle} numberOfLines={1}>{name}</Text>
              <Text style={fileViewerStyles.viewerSubtitle}>
                {getFileTypeName(type)} {size && `• ${formatFileSize(size)}`}
              </Text>
            </View>
            <View style={fileViewerStyles.viewerActions}>
              <TouchableOpacity style={fileViewerStyles.actionButton}>
                <MaterialIcons name="download" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={fileViewerStyles.videoContainer}>
            <Video 
              source={{ uri }} 
              useNativeControls 
              style={fileViewerStyles.videoPlayer}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
            />
          </View>
        </View>
      );
    }

    // PDF Viewer
    if (type?.includes('pdf')) {
      return (
        <View style={fileViewerStyles.viewerContainer}>
          <View style={fileViewerStyles.viewerHeader}>
            <TouchableOpacity onPress={closeViewer} style={fileViewerStyles.closeButton}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={fileViewerStyles.viewerHeaderInfo}>
              <Text style={fileViewerStyles.viewerTitle} numberOfLines={1}>{name}</Text>
              <Text style={fileViewerStyles.viewerSubtitle}>
                {getFileTypeName(type)} {size && `• ${formatFileSize(size)}`}
              </Text>
            </View>
            <View style={fileViewerStyles.viewerActions}>
              <TouchableOpacity 
                style={fileViewerStyles.actionButton}
                onPress={() => sharePDF(uri, name)}
              >
                <MaterialIcons name="share" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={fileViewerStyles.pdfContainer}>
            {pdfLoading ? (
              <View style={fileViewerStyles.pdfLoading}>
                <ActivityIndicator size="large" color="#4F8EF7" />
                <Text style={filesStyles.loadingText}>Loading PDF...</Text>
              </View>
            ) : (
              <WebView
                source={{
                  html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>PDF Viewer</title>
                      <style>
                        * {
                          margin: 0;
                          padding: 0;
                          box-sizing: border-box;
                        }
                        body {
                          font-family: Arial, sans-serif;
                          background: #f5f5f5;
                          height: 100vh;
                          margin: 0;
                          padding: 0;
                          overflow-x: hidden;
                        }
                        .pdf-container {
                          width: 100%;
                          height: 100vh;
                          overflow-y: auto;
                          overflow-x: hidden;
                          background: #e8e8e8;
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          padding: 10px 0;
                        }
                        .pdf-page {
                          background: white;
                          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                          margin-bottom: 15px;
                          max-width: 95%;
                          width: auto;
                          height: auto;
                        }
                        .loading {
                          color: #666;
                          text-align: center;
                          font-size: 18px;
                          padding: 40px;
                        }
                        .error {
                          color: #ff6b6b;
                          text-align: center;
                          padding: 20px;
                          background: white;
                          border-radius: 8px;
                          margin: 20px;
                        }
                      </style>
                      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
                    </head>
                    <body>
                      <div class="pdf-container" id="pdfContainer">
                        <div class="loading">Loading PDF...</div>
                      </div>

                      <script>
                        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                        
                        let pdfDoc = null;
                        let scale = 1.0;
                        
                        // Get PDF as data URL from React Native
                        const pdfData = 'data:application/pdf;base64,' + '${pdfInfo?.base64 || ''}';
                        
                        async function loadPDF() {
                          try {
                            if (!pdfData || pdfData === 'data:application/pdf;base64,') {
                              throw new Error('No PDF data available');
                            }
                            
                            const loadingTask = pdfjsLib.getDocument(pdfData);
                            pdfDoc = await loadingTask.promise;
                            
                            console.log('PDF loaded with ' + pdfDoc.numPages + ' pages');
                            
                            await renderAllPages();
                          } catch (error) {
                            console.error('Error loading PDF:', error);
                            document.getElementById('pdfContainer').innerHTML = 
                              '<div class="error">Failed to load PDF: ' + error.message + '</div>';
                          }
                        }
                        
                        async function renderAllPages() {
                          const container = document.getElementById('pdfContainer');
                          container.innerHTML = '';
                          
                          for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                            try {
                              const page = await pdfDoc.getPage(pageNum);
                              const viewport = page.getViewport({ scale: scale });
                              
                              const canvas = document.createElement('canvas');
                              const ctx = canvas.getContext('2d');
                              canvas.height = viewport.height;
                              canvas.width = viewport.width;
                              canvas.className = 'pdf-page';
                              
                              const renderContext = {
                                canvasContext: ctx,
                                viewport: viewport
                              };
                              
                              await page.render(renderContext).promise;
                              container.appendChild(canvas);
                              
                              console.log('Rendered page ' + pageNum);
                            } catch (error) {
                              console.error('Error rendering page ' + pageNum + ':', error);
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'error';
                              errorDiv.textContent = 'Error rendering page ' + pageNum;
                              container.appendChild(errorDiv);
                            }
                          }
                        }
                        
                        // Load PDF when page loads
                        window.addEventListener('load', loadPDF);
                      </script>
                    </body>
                    </html>
                  `
                }}
                style={fileViewerStyles.pdfViewer}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={fileViewerStyles.pdfLoading}>
                    <ActivityIndicator size="large" color="#4F8EF7" />
                    <Text style={filesStyles.loadingText}>Initializing PDF viewer...</Text>
                  </View>
                )}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView error:', nativeEvent);
                }}
              />
            )}
          </View>
        </View>
      );
    }

    // DOCX Viewer
    if (type?.includes('wordprocessingml') || type?.includes('msword') || name?.endsWith('.docx') || name?.endsWith('.doc')) {
      return (
        <View style={fileViewerStyles.viewerContainer}>
          <View style={fileViewerStyles.viewerHeader}>
            <TouchableOpacity onPress={closeViewer} style={fileViewerStyles.closeButton}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={fileViewerStyles.viewerHeaderInfo}>
              <Text style={fileViewerStyles.viewerTitle} numberOfLines={1}>{name}</Text>
              <Text style={fileViewerStyles.viewerSubtitle}>
                Word Document {size && `• ${formatFileSize(size)}`}
              </Text>
            </View>
            <View style={fileViewerStyles.viewerActions}>
              <TouchableOpacity 
                style={fileViewerStyles.actionButton}
                onPress={() => {
                  Alert.alert('Share', 'Share functionality coming soon!');
                }}
              >
                <MaterialIcons name="share" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={fileViewerStyles.docContainer}>
            <WebView
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Document Viewer</title>
                    <style>
                      * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                      }
                      body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        background: #f5f5f5;
                        height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 20px;
                      }
                      .doc-container {
                        background: white;
                        border-radius: 8px;
                        padding: 40px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        max-width: 95%;
                        width: 100%;
                        text-align: center;
                      }
                      .doc-icon {
                        font-size: 64px;
                        color: #4285F4;
                        margin-bottom: 20px;
                      }
                      .doc-title {
                        font-size: 24px;
                        color: #333;
                        margin-bottom: 16px;
                        font-weight: 600;
                      }
                      .doc-message {
                        font-size: 16px;
                        color: #666;
                        line-height: 1.5;
                        margin-bottom: 24px;
                      }
                      .doc-features {
                        text-align: left;
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 6px;
                        margin-top: 20px;
                      }
                      .feature-item {
                        display: flex;
                        align-items: center;
                        margin-bottom: 12px;
                        font-size: 14px;
                        color: #555;
                      }
                      .feature-icon {
                        color: #27AE60;
                        margin-right: 8px;
                        font-weight: bold;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="doc-container">
                      <div class="doc-icon">📄</div>
                      <div class="doc-title">${name}</div>
                      <div class="doc-message">
                        Word document detected. This file can be opened with Microsoft Word or compatible applications.
                      </div>
                      <div class="doc-features">
                        <div class="feature-item">
                          <span class="feature-icon">✓</span>
                          File format: ${getFileTypeName(type)}
                        </div>
                        <div class="feature-item">
                          <span class="feature-icon">✓</span>
                          File size: ${size ? formatFileSize(size) : 'Unknown'}
                        </div>
                        <div class="feature-item">
                          <span class="feature-icon">✓</span>
                          Supported by Microsoft Word, Google Docs, and LibreOffice
                        </div>
                      </div>
                    </div>
                  </body>
                  </html>
                `
              }}
              style={fileViewerStyles.webViewer}
              onError={(event) => {
                console.error('WebView error:', event.nativeEvent);
              }}
            />
          </View>
        </View>
      );
    }

    // Excel/CSV Viewer
    if (name?.endsWith('.xls') || name?.endsWith('.xlsx') || name?.endsWith('.csv')) {
      return (
        <View style={fileViewerStyles.viewerContainer}>
          <View style={fileViewerStyles.viewerHeader}>
            <TouchableOpacity onPress={closeViewer} style={fileViewerStyles.closeButton}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={fileViewerStyles.viewerHeaderInfo}>
              <Text style={fileViewerStyles.viewerTitle} numberOfLines={1}>{name}</Text>
              <Text style={fileViewerStyles.viewerSubtitle}>
                Spreadsheet {size && `• ${formatFileSize(size)}`}
              </Text>
            </View>
            <View style={fileViewerStyles.viewerActions}>
              <TouchableOpacity style={fileViewerStyles.actionButton}>
                <MaterialIcons name="download" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={fileViewerStyles.excelContainer}>
            {excelLoading ? (
              <View style={fileViewerStyles.excelLoading}>
                <ActivityIndicator size="large" color="#4F8EF7" />
                <Text style={filesStyles.loadingText}>Loading spreadsheet...</Text>
              </View>
            ) : excelError ? (
              <View style={fileViewerStyles.errorContainer}>
                <MaterialIcons name="error-outline" size={48} color="#E74C3C" />
                <Text style={fileViewerStyles.errorTitle}>Failed to load spreadsheet</Text>
                <Text style={fileViewerStyles.errorMessage}>{excelError}</Text>
                <TouchableOpacity 
                  style={fileViewerStyles.retryButton} 
                  onPress={() => loadExcel(uri)}
                >
                  <Text style={fileViewerStyles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : excelData && excelData.length > 0 ? (
              <ScrollView horizontal style={fileViewerStyles.excelScrollHorizontal}>
                <ScrollView style={fileViewerStyles.excelScrollVertical}>
                  <View style={fileViewerStyles.excelTable}>
                    {excelData.map((row, i) => (
                      <View key={i} style={[fileViewerStyles.excelRow, i === 0 && fileViewerStyles.excelHeaderRow]}>
                        {row.map((cell, j) => (
                          <View key={j} style={[fileViewerStyles.excelCell, i === 0 && fileViewerStyles.excelHeaderCell]}>
                            <Text 
                              style={[fileViewerStyles.excelCellText, i === 0 && fileViewerStyles.excelHeaderText]}
                              numberOfLines={3}
                            >
                              {cell?.toString() || ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </ScrollView>
            ) : (
              <View style={fileViewerStyles.noDataContainer}>
                <MaterialIcons name="table-chart" size={48} color="#999" />
                <Text style={fileViewerStyles.noDataText}>No data found in this spreadsheet</Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    // Text/Document Viewer (Fallback)
    return (
      <View style={fileViewerStyles.viewerContainer}>
        <View style={fileViewerStyles.viewerHeader}>
          <TouchableOpacity onPress={closeViewer} style={fileViewerStyles.closeButton}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={fileViewerStyles.viewerHeaderInfo}>
            <Text style={fileViewerStyles.viewerTitle} numberOfLines={1}>{name}</Text>
            <Text style={fileViewerStyles.viewerSubtitle}>
              {getFileTypeName(type)} {size && `• ${formatFileSize(size)}`}
            </Text>
          </View>
          <View style={fileViewerStyles.viewerActions}>
            <TouchableOpacity style={fileViewerStyles.actionButton}>
              <MaterialIcons name="download" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <WebView 
          source={{ uri }} 
          style={fileViewerStyles.webViewer}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={fileViewerStyles.webViewLoading}>
              <ActivityIndicator size="large" color="#4F8EF7" />
              <Text style={filesStyles.loadingText}>Loading document...</Text>
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <View style={filesStyles.container}>
      <View style={filesStyles.header}>
        <View style={filesStyles.headerLeft}>
          {/* Empty view for spacing */}
        </View>
        <Text style={filesStyles.title}>My Files</Text>
        <TouchableOpacity
          style={filesStyles.addButton}
          onPress={openFilePicker}
        >
          <MaterialIcons name="add" size={28} color="#1A2366" />
        </TouchableOpacity>
      </View>
      
      {/* Search Bar */}
      {files.length > 0 && (
        <View style={filesStyles.searchContainer}>
          <View style={filesStyles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color="#666" style={filesStyles.searchIcon} />
            <TextInput
              style={filesStyles.searchInput}
              placeholder="Search files by name or type..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearch('')}
                style={filesStyles.clearSearchButton}
              >
                <MaterialIcons name="clear" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          {searchQuery.length > 0 && (
            <Text style={filesStyles.searchResults}>
              {filteredFiles.length} of {files.length} files
            </Text>
          )}
        </View>
      )}
      
      {loading && files.length === 0 ? (
        <View style={filesStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F8EF7" />
          <Text style={filesStyles.loadingText}>Loading files...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFiles}
          keyExtractor={item => item.id}
          renderItem={renderFile}
          contentContainerStyle={filteredFiles.length === 0 && searchQuery.length > 0 ? filesStyles.emptyListContent : files.length === 0 ? filesStyles.emptyListContent : filesStyles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4F8EF7"
              colors={['#4F8EF7']}
            />
          }
          ListEmptyComponent={
            searchQuery.length > 0 ? (
              <View style={filesStyles.emptyContainer}>
                <MaterialIcons name="search-off" size={80} color="#E0E6F0" />
                <Text style={filesStyles.emptyTitle}>No Results Found</Text>
                <Text style={filesStyles.emptySubtitle}>
                  No files match "{searchQuery}". Try a different search term.
                </Text>
                <TouchableOpacity 
                  style={filesStyles.emptyActionButton} 
                  onPress={() => handleSearch('')}
                >
                  <MaterialIcons name="clear" size={24} color="#fff" />
                  <Text style={filesStyles.emptyActionText}>Clear Search</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={filesStyles.emptyContainer}>
                <MaterialIcons name="folder-open" size={80} color="#E0E6F0" />
                <Text style={filesStyles.emptyTitle}>No Files Yet</Text>
                <Text style={filesStyles.emptySubtitle}>
                  Tap the + button to add your first file
                </Text>
                <TouchableOpacity style={filesStyles.emptyActionButton} onPress={openFilePicker}>
                  <MaterialIcons name="add" size={24} color="#fff" />
                  <Text style={filesStyles.emptyActionText}>Add File</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}

      {/* Beautiful File Picker Popup */}
      {showFilePicker && (
        <View style={filePickerStyles.popupOverlay}>
          <View style={filePickerStyles.popupContainer}>
            <View style={filePickerStyles.popupHeader}>
              <View style={filePickerStyles.popupHeaderContent}>
                <MaterialIcons name="cloud-upload" size={24} color="#4F8EF7" />
                <Text style={filePickerStyles.popupTitle}>Browse Files</Text>
              </View>
              <TouchableOpacity 
                style={filePickerStyles.closeButton}
                onPress={discardFiles}
                disabled={isUploading}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {!isUploading ? (
              <>
                {pickedFiles.length === 0 ? (
                  <View style={filePickerStyles.browseSection}>
                    <View style={filePickerStyles.browseIconContainer}>
                      <MaterialIcons name="folder-open" size={80} color="#E0E6F0" />
                    </View>
                    <Text style={filePickerStyles.browseTitle}>Select Files to Upload</Text>
                    <Text style={filePickerStyles.browseSubtitle}>
                      Choose a file up to 10MB (images, documents, videos, etc.)
                    </Text>
                    
                    <TouchableOpacity 
                      style={filePickerStyles.browseButton}
                      onPress={pickFiles}
                    >
                      <MaterialIcons name="folder" size={24} color="#fff" />
                      <Text style={filePickerStyles.browseButtonText}>Browse Files</Text>
                    </TouchableOpacity>

                    <View style={filePickerStyles.supportedFormats}>
                      <Text style={filePickerStyles.formatsTitle}>Supported formats:</Text>
                      <View style={filePickerStyles.formatsList}>
                        <View style={filePickerStyles.formatItem}>
                          <MaterialIcons name="image" size={16} color="#4F8EF7" />
                          <Text style={filePickerStyles.formatText}>Images</Text>
                        </View>
                        <View style={filePickerStyles.formatItem}>
                          <MaterialIcons name="picture-as-pdf" size={16} color="#E74C3C" />
                          <Text style={filePickerStyles.formatText}>PDFs</Text>
                        </View>
                        <View style={filePickerStyles.formatItem}>
                          <MaterialIcons name="videocam" size={16} color="#27AE60" />
                          <Text style={filePickerStyles.formatText}>Videos</Text>
                        </View>
                        <View style={filePickerStyles.formatItem}>
                          <MaterialIcons name="table-chart" size={16} color="#27AE60" />
                          <Text style={filePickerStyles.formatText}>Docs</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={filePickerStyles.selectedFilesSection}>
                    <Text style={filePickerStyles.selectedTitle}>
                      Selected Files ({pickedFiles.length}/10)
                    </Text>
                    
                    <ScrollView style={filePickerStyles.filesList} showsVerticalScrollIndicator={false}>
                      {pickedFiles.map((file, index) => (
                        <View key={index} style={filePickerStyles.selectedFileCard}>
                          <View style={filePickerStyles.filePreview}>
                            {file.mimeType?.includes('image') ? (
                              <Image source={{ uri: file.uri }} style={filePickerStyles.imagePreview} />
                            ) : (
                              <View style={filePickerStyles.fileIconContainer}>
                                {getFileTypeIcon(file.mimeType || '', 32)}
                              </View>
                            )}
                          </View>
                          <View style={filePickerStyles.fileDetails}>
                            <Text style={filePickerStyles.selectedFileName} numberOfLines={2}>
                              {file.name}
                            </Text>
                            <Text style={filePickerStyles.selectedFileSize}>
                              {formatFileSize(file.size || 0)}
                            </Text>
                          </View>
                          <View style={filePickerStyles.fileStatus}>
                            <MaterialIcons name="check-circle" size={20} color="#27AE60" />
                          </View>
                        </View>
                      ))}
                    </ScrollView>

                    <View style={filePickerStyles.actionButtons}>
                      <TouchableOpacity 
                        style={filePickerStyles.discardButton}
                        onPress={discardFiles}
                      >
                        <MaterialIcons name="close" size={20} color="#E74C3C" />
                        <Text style={filePickerStyles.discardButtonText}>Discard</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={filePickerStyles.uploadButton}
                        onPress={uploadFiles}
                      >
                        <MaterialIcons name="cloud-upload" size={20} color="#fff" />
                        <Text style={filePickerStyles.uploadButtonText}>Upload Files</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View style={filePickerStyles.uploadingSection}>
                <View style={filePickerStyles.uploadIconContainer}>
                  <MaterialIcons name="cloud-upload" size={60} color="#4F8EF7" />
                </View>
                <Text style={filePickerStyles.uploadingTitle}>Uploading Files...</Text>
                <Text style={filePickerStyles.uploadingSubtitle}>
                  Please wait while we save your files
                </Text>
                
                <View style={filePickerStyles.progressContainer}>
                  <View style={filePickerStyles.progressBar}>
                    <View 
                      style={[
                        filePickerStyles.progressFill, 
                        { width: `${uploadProgress}%` }
                      ]} 
                    />
                  </View>
                  <Text style={filePickerStyles.progressText}>{Math.round(uploadProgress)}%</Text>
                </View>

                <TouchableOpacity 
                  style={filePickerStyles.cancelButton}
                  onPress={discardFiles}
                >
                  <MaterialIcons name="close" size={20} color="#E74C3C" />
                  <Text style={filePickerStyles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

