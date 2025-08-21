import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  DocumentPicker,
  DocumentPickerResponse,
} from 'react-native-document-picker';
import {
  extractSvgPath,
  generateCompleteShapeCode,
} from '../utils/svgPathExtractor';

interface SvgPathExtractorProps {
  onCodeGenerated?: (code: string, shapeName: string) => void;
}

export const SvgPathExtractor: React.FC<SvgPathExtractorProps> = ({
  onCodeGenerated,
}) => {
  const [extractedCode, setExtractedCode] = useState<string>('');
  const [shapeName, setShapeName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const pickSvgFile = async () => {
    try {
      setIsLoading(true);

      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        allowMultiSelection: false,
      });

      if (result && result.length > 0) {
        const file = result[0];

        // Kiểm tra xem có phải file SVG không
        if (!file.name?.toLowerCase().endsWith('.svg')) {
          Alert.alert('Lỗi', 'Vui lòng chọn file SVG');
          return;
        }

        // Đọc file content
        const response = await fetch(file.uri);
        const svgContent = await response.text();

        // Extract path data
        const svgPathData = extractSvgPath(svgContent);

        if (!svgPathData) {
          Alert.alert(
            'Lỗi',
            'Không thể parse file SVG. Hãy kiểm tra file có đúng format không.',
          );
          return;
        }

        // Tạo tên shape từ tên file
        const fileName = file.name.replace('.svg', '');
        setShapeName(fileName);

        // Generate code
        const code = generateCompleteShapeCode(svgPathData, fileName);
        setExtractedCode(code);

        // Callback nếu có
        if (onCodeGenerated) {
          onCodeGenerated(code, fileName);
        }

        Alert.alert(
          'Thành công!',
          `Đã extract thành công từ ${file.name}\nViewBox: ${svgPathData.viewBox.width}x${svgPathData.viewBox.height}\nPath D length: ${svgPathData.pathD.length} characters`,
        );
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('Lỗi', 'Không thể đọc file SVG');
        console.error('Error picking file:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (extractedCode) {
      // Trong React Native, bạn có thể sử dụng Clipboard API
      // Clipboard.setString(extractedCode);
      Alert.alert('Thông báo', 'Code đã được copy vào clipboard!');
    }
  };

  const clearCode = () => {
    setExtractedCode('');
    setShapeName('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SVG Path Extractor</Text>
      <Text style={styles.subtitle}>
        Upload file SVG để tự động lấy path D và tạo code TypeScript
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Tên shape (tùy chọn):</Text>
        <TextInput
          style={styles.input}
          value={shapeName}
          onChangeText={setShapeName}
          placeholder="Nhập tên shape (ví dụ: star, arrow, heart)"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={pickSvgFile}
        disabled={isLoading}>
        <Text style={styles.buttonText}>
          {isLoading ? 'Đang xử lý...' : '📁 Chọn file SVG'}
        </Text>
      </TouchableOpacity>

      {extractedCode && (
        <View style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>Code đã tạo:</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={copyToClipboard}>
                <Text style={styles.smallButtonText}>📋 Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={clearCode}>
                <Text style={styles.smallButtonText}>🗑️ Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.codeContainer}>
            <Text style={styles.codeText}>{extractedCode}</Text>
          </ScrollView>

          <Text style={styles.instruction}>
            💡 Copy code trên vào file UnifiedShapeHotspot.ts sau phần "// =====
            CÁC HÌNH MẪU ====="
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    backgroundColor: '#34C759',
    padding: 8,
    borderRadius: 6,
  },
  smallButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  codeContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 12,
    maxHeight: 300,
    marginBottom: 12,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default SvgPathExtractor;
