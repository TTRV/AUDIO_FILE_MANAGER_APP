import { StyleSheet, Dimensions } from 'react-native';

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

export const fileViewerStyles = StyleSheet.create({
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  viewerHeaderInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 16,
  },
  viewerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  viewerSubtitle: {
    fontSize: 14,
    color: '#ccc',
  },
  viewerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 8,
  },
  
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewer: {
    width: windowWidth,
    height: windowHeight - 120,
  },
  
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: windowWidth,
    height: windowHeight - 120,
  },
  
  webViewer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  
  excelContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  docContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  excelLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  excelScrollHorizontal: {
    flex: 1,
  },
  excelScrollVertical: {
    flex: 1,
  },
  excelTable: {
    padding: 16,
  },
  excelRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  excelHeaderRow: {
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 2,
    borderBottomColor: '#D1D5DB',
  },
  excelCell: {
    minWidth: 120,
    maxWidth: 200,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    justifyContent: 'center',
  },
  excelHeaderCell: {
    backgroundColor: '#F3F4F6',
  },
  excelCellText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 18,
  },
  excelHeaderText: {
    fontWeight: '600',
    color: '#1F2937',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#4F8EF7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#fff',
  },
  noDataText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  
  pdfContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pdfViewer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pdfLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  pdfContentContainer: {
    flexGrow: 1,
    padding: 20,
  },
  pdfPreviewSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  pdfTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A2366',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  pdfFileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4F8EF7',
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  pdfInfoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    maxWidth: 300,
  },
  pdfInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pdfInfoLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
    fontWeight: '500',
  },
  pdfInfoValue: {
    fontSize: 16,
    color: '#1A2366',
    fontWeight: '600',
    flex: 1,
  },
  pdfDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  pdfActionsSection: {
    marginTop: 32,
    gap: 16,
  },
  primaryActionButton: {
    backgroundColor: '#4F8EF7',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#4F8EF7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryActionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  secondaryActionButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4F8EF7',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F8EF7',
    marginLeft: 8,
  },
});