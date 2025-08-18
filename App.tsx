/**
 * 3D Tour Pro - Professional Virtual Tour App
 * Built with MVVM Architecture
 * Ứng dụng Tour 3D Chuyên Nghiệp - Xây dựng với Kiến trúc MVVM
 */

// Import React core library để tạo component
import React from 'react';
// Import các component cơ bản từ React Native
import {View, StatusBar, LogBox} from 'react-native';
// Import observer từ mobx-react-lite để theo dõi thay đổi state
import {observer} from 'mobx-react-lite';
// Import component chính Simple360Painter để hiển thị giao diện vẽ 360 độ
import {Simple360Painter} from './src/components/Simple360Painter';

// Ẩn các cảnh báo LogBox liên quan đến WKWebView injectedJavaScript return-type
// Điều này giúp tránh các cảnh báo có thể chặn touch events trong môi trường development
LogBox.ignoreLogs([
  'Error evaluating injectedJavaScript', // Lỗi đánh giá JavaScript được inject
  'JavaScript execution returned a result of an unsupported type', // JavaScript trả về kết quả không được hỗ trợ
]);

// Component App chính của ứng dụng - được wrap bởi observer để theo dõi state changes
const App = observer(() => {
  // Render UI của ứng dụng
  return (
    // Container chính của app - chiếm toàn màn hình với nền đen
    <View style={{flex: 1, backgroundColor: 'black'}}>
      {/* Ẩn thanh status bar để tận dụng toàn bộ màn hình */}
      <StatusBar hidden={true} />
      {/* Render component Simple360Painter - giao diện chính của ứng dụng */}
      <Simple360Painter />
    </View>
  );
});

// Export component App làm component mặc định của ứng dụng
export default App;
