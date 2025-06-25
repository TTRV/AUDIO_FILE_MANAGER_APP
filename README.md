# Audio File Manager App
# APK_LINK
https://expo.dev/accounts/basavadinesh/projects/AudioFileManagerApp/builds/097584a7-38b5-43b6-bf91-92178daacb7a


A fully functional Expo React Native app for recording, managing, and playing audio files, as well as storing and organizing various file types (PDFs, images, videos, Excel files).

## Features

### 🎵 Audio Tab
- **Audio Recording**: Record high-quality audio clips with real-time timer
- **Audio Playback**: Play, pause, resume, and seek through recordings
- **Audio Management**: List all recordings with duration and playback controls
- **Persistent Storage**: All recordings and metadata stored using AsyncStorage
- **Modern UI**: Beautiful card-based interface with smooth animations

### 📁 Files Tab
- **File Picking**: Select and store PDFs, images, videos, and Excel files
- **File Organization**: Automatic file type detection and categorization
- **File Preview**: View file details and metadata with modern modal interface
- **Direct File Viewing**: 
  - **PDFs**: Opens in web browser using PDF.js viewer
  - **Images**: Full-screen viewing with scroll and zoom capabilities
  - **Videos**: Native video player with expo-av controls
  - **Excel**: Opens with system's default spreadsheet app
- **File Sharing**: Share files with other apps and services
- **File Management**: Delete files with confirmation dialogs
- **Visual Indicators**: Color-coded icons for different file types
- **Loading States**: Loading screens and progress indicators
- **Discard Option**: Option to discard files before adding them

## Technical Specifications

### Audio Player Features
- ✅ Start, stop, and resume functionality
- ✅ Current playback time vs. total duration display
- ✅ Seek bar for navigation through audio
- ✅ Automatic playback status updates

### Supported Audio Formats
- **Recording**: `.m4a` (High Quality preset)
- **Playback**: `.m4a`, `.mp3`, `.wav`, `.aac` (via expo-av)
- **Limitations**: 
  - Recording format is fixed to `.m4a` for optimal quality
  - Playback supports most common audio formats supported by expo-av

### Supported File Types
- **PDFs**: `.pdf`
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`
- **Videos**: `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.mkv`
- **Excel**: `.xlsx`, `.xls`, `.csv`

## App Structure

```
AudioFileManagerApp/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab navigation layout
│   │   ├── audio.tsx            # Audio recordings list
│   │   ├── files.tsx            # Files management
│   │   ├── record.tsx           # Audio recording screen
│   │   └── recordings.tsx       # Recordings list (hidden tab)
│   ├── audio/
│   │   ├── audio-player-save.tsx # Audio player with save functionality
│   │   ├── recording-in-progress.tsx
│   │   ├── save-audio.tsx
│   │   └── start-recording.tsx
│   ├── _layout.tsx              # Root layout
│   └── +not-found.tsx           # 404 page
├── components/                  # Reusable UI components
├── constants/                   # App constants and colors
├── hooks/                       # Custom React hooks
└── assets/                      # Images, fonts, etc.
```

## Navigation Flow

### Audio Module
1. **Audio Tab** → List of all recordings
2. **+ Button** → **Record Screen** → Start recording
3. **Recording** → **Recording In Progress** → Stop recording
4. **Audio Player** → Play, save, or discard recording

### Files Module
1. **Files Tab** → List of all stored files
2. **+ Button** → **File Picker** → Select file
3. **File Card** → **File Details** → View file info

## Dependencies

### Core Dependencies
- `expo`: ~53.0.12
- `expo-router`: ~5.1.0 (File-based routing)
- `react-native`: 0.79.4

### Audio & Media
- `expo-av`: ^15.1.6 (Audio recording and playback, video viewing)
- `expo-document-picker`: ^5.8.0 (File selection)
- `expo-file-system`: ^18.0.0 (File operations)
- `expo-sharing`: ^12.0.0 (File sharing and viewing)
- `expo-web-browser`: ^14.2.0 (PDF viewing in browser)

### Storage & State
- `@react-native-async-storage/async-storage`: ^2.2.0 (Data persistence)

### UI & Navigation
- `@expo/vector-icons`: ^14.1.0 (Icons)
- `react-native-reanimated`: ~3.17.4 (Animations)
- `react-native-gesture-handler`: ~2.24.0 (Touch handling)

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS) or Android Emulator (for Android)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AudioFileManagerApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   - Scan QR code with Expo Go app (Android/iOS)
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator

### Building for Production

1. **Build APK (Android)**
   ```bash
   expo build:android
   ```

2. **Build IPA (iOS)**
   ```bash
   expo build:ios
   ```

## Usage Guide

### Recording Audio
1. Navigate to the **Audio** tab
2. Tap the **+** button to start recording
3. Tap the **Stop** button when finished
4. Enter a name and save your recording

### Managing Files
1. Navigate to the **Files** tab
2. Tap the **+** button to select a file
3. Choose from PDFs, images, videos, or Excel files
4. Confirm or discard the selected file
5. View file details by tapping on any file card
6. **One-Click Viewing**: Tap "View File" to open directly in the app
   - **PDFs**: Opens in web browser with PDF.js viewer
   - **Images**: Full-screen viewer with scroll and zoom
   - **Videos**: Native video player with expo-av controls
   - **Excel**: Opens with system's default app
7. Use "Share" to share files with other apps
8. Delete files using the delete button

### Playing Audio
1. In the **Audio** tab, tap the play button on any recording
2. Use pause/resume controls
3. View current time vs. total duration
4. Navigate to detailed view for more controls

## Error Handling

The app includes comprehensive error handling for:
- **Permission Denials**: Audio recording permissions
- **File Operations**: File picking, saving, and deletion
- **Storage Issues**: AsyncStorage failures
- **Playback Errors**: Audio loading and playback issues
- **Network Issues**: File download and upload problems

## Performance Optimizations

- **Lazy Loading**: Components load only when needed
- **Memory Management**: Proper cleanup of audio resources
- **Efficient Storage**: Optimized AsyncStorage usage
- **Smooth Animations**: Hardware-accelerated animations

## Development Notes

### Challenges Encountered
1. **Audio Permission Handling**: Ensuring proper permission flow on both platforms
2. **File Type Detection**: Accurate MIME type and extension detection
3. **Storage Management**: Efficient handling of large files and metadata
4. **Cross-Platform Compatibility**: Ensuring consistent behavior across iOS and Android

### Future Enhancements
- **Search & Filter**: Add search functionality for both audio and files
- **File Preview**: Integrate native file viewers for PDFs and images
- **Cloud Storage**: Add support for cloud storage providers
- **Audio Effects**: Add audio processing and effects
- **Batch Operations**: Support for multiple file selection and operations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the [Expo documentation](https://docs.expo.dev/)
- Review the [React Native documentation](https://reactnative.dev/)
- Open an issue in the repository

---

**Note**: This app is designed as a demonstration of React Native and Expo capabilities for audio and file management. For production use, additional security measures and error handling should be implemented.
