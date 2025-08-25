import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CONTAINER_HEIGHT = Math.round(screenHeight * 0.76);
// Chừa khoảng cho tiêu đề + khu vực "màu gần đây" ~220px (tuỳ thiết bị)
const GRID_MAX_HEIGHT = Math.max(300, CONTAINER_HEIGHT - 220);

// Bảng màu đầy đủ dựa trên ảnh mẫu
const FULL_COLOR_PALETTE = {
  // Màu gần đây (最近使用した色)
  recentColors: [
    '#D3D3D3', // Xám nhạt
    '#DAA520', // Vàng mù tạt
    '#708090', // Xanh lam xám
    '#4169E1', // Xanh dương trung bình
    '#DC143C', // Đỏ đậm
  ],
  
  // Lưới màu chính (8 hàng x 10 cột)
  mainColors: [
    // Hàng 1 - Grays & Whites
    ['#000000', '#404040', '#808080', '#C0C0C0', '#E0E0E0', '#F0F0F0', '#F8F8F8', '#FFFFFF'],
    
    // Hàng 2 - Bright Colors
    ['#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FFFF', '#0080FF', '#0000FF', '#FF00FF'],
    
    // Hàng 3 - Pastel Colors
    ['#FFE4E1', '#FFB6C1', '#FFFACD', '#F0FFF0', '#E0FFFF', '#E6E6FA', '#F5DEB3', '#FFDAB9'],
    
    // Hàng 4 - Earth Tones
    ['#CD5C5C', '#FF7F50', '#BDB76B', '#9ACD32', '#4682B4', '#708090', '#9370DB', '#DEB887'],
    
    // Hàng 5 - Deep Colors
    ['#8B0000', '#800020', '#FF4500', '#DAA520', '#228B22', '#4B0082', '#191970', '#8B008B'],
    
    // Hàng 6 - Brown Tones
    ['#A0522D', '#654321', '#D2691E', '#B8860B', '#556B2F', '#2F4F4F', '#8B4513', '#6B8E23'],
    
    // Hàng 7 - Dark Tones
    ['#3E2723', '#8B4513', '#006400', '#000080', '#191970', '#2F4F4F', '#4B0082', '#000000'],
    
    // Hàng 8 - Near Black
    ['#0D0D0D', '#1B4D2E', '#000033', '#000066', '#330033', '#1A1A1A', '#2F2F2F', '#3A3A3A'],
  ]
};

interface ColorPaletteProps {
  visible: boolean;
  onClose: () => void;
  onColorSelect: (color: string) => void;
  selectedColor: string;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  visible,
  onClose,
  onColorSelect,
  selectedColor,
}) => {
  const [recentColors, setRecentColors] = useState<string[]>(FULL_COLOR_PALETTE.recentColors);

  // Thêm màu vào danh sách gần đây
  const addToRecent = (color: string) => {
    if (!recentColors.includes(color)) {
      const newRecent = [color, ...recentColors.slice(0, 4)];
      setRecentColors(newRecent);
    }
  };

  const handleColorSelect = (color: string) => {
    addToRecent(color);
    onColorSelect(color);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.paletteContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Bảng màu</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Màu gần đây */}
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>🎨 Màu đã sử dụng gần đây</Text>
            <View style={styles.recentColorsContainer}>
              {recentColors.map((color, index) => (
                <TouchableOpacity
                  key={`recent-${index}`}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedSwatch,
                  ]}
                  onPress={() => handleColorSelect(color)}
                  activeOpacity={0.7}
                >
                  {selectedColor === color && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Lưới màu chính */}
          <View style={styles.mainColorsContainer}>
            <Text style={styles.sectionTitle}>🌈 Tất cả màu sắc ({FULL_COLOR_PALETTE.mainColors.length} hàng)</Text>
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              style={{maxHeight: GRID_MAX_HEIGHT}}
              contentContainerStyle={{paddingBottom: 16}}
            >
              {FULL_COLOR_PALETTE.mainColors.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.colorRow}>
                  {row.map((color, colIndex) => (
                    <TouchableOpacity
                      key={`color-${rowIndex}-${colIndex}`}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: color },
                        selectedColor === color && styles.selectedSwatch,
                      ]}
                      onPress={() => handleColorSelect(color)}
                      activeOpacity={0.7}
                    >
                      {selectedColor === color && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
              

            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paletteContainer: {
    width: screenWidth * 0.94,
    height: CONTAINER_HEIGHT,
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    padding: 22,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  recentSection: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    letterSpacing: 0.3,
  },
  recentColorsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 15,
  },
  mainColorsContainer: {
    flex: 1,
    minHeight: 200,
    marginTop: 15,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 5,
  },
  colorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedSwatch: {
    borderColor: '#FFFFFF',
    borderWidth: 2,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  checkmark: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
});
