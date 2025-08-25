// Import React và hook useState để quản lý state của component
import React, {useState} from 'react';
// Import các component UI cơ bản từ React Native
import {
  View, // Component container chính để bọc các element khác
  TouchableOpacity, // Component button có thể touch được với hiệu ứng opacity
  Text, // Component hiển thị văn bản
  StyleSheet, // API để tạo styles cho component
  StatusBar, // Component để điều khiển thanh status bar của device
  Share,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
// Import WebView để hiển thị nội dung web (krpano viewer) trong app
import {WebView} from 'react-native-webview';
import RNFS from 'react-native-fs';

// Import các hàm xử lý vẽ điểm từ module PointMode
import {
  tapPoint, // Tạo điểm mới khi tap
  undoPoint, // Hoàn tác điểm cuối cùng
  clearPoint, // Xóa tất cả điểm
  movePoint, // Di chuyển tất cả điểm
  setPointSelected, // Làm nổi bật/bỏ nổi bật shape điểm
} from './drawing/PointMode';

// Import ColorPalette component
import {ColorPalette} from './ColorPalette';

// Import các hàm xử lý vẽ tự do từ module FreehandMode
import {
  startFreehand, // Bắt đầu vẽ nét tự do mới
  moveFreehand, // Thêm điểm vào nét tự do đang vẽ
  undoFreehand, // Hoàn tác nét tự do cuối cùng
  clearFreehand, // Xóa nét tự do hiện tại
  moveAllFreehand, // Di chuyển tất cả nét tự do
  setFreehandSelected, // Làm nổi bật/bỏ nổi bật nét tự do
  finalizeFreehand, // Kết thúc và cố định nét vẽ
  renderFreehandStroke, // Vẽ lại nét đã lưu
} from './drawing/FreehandMode';
import type {SpherePoint} from './drawing/FreehandMode';
import {
  setStrokeSelected,
  removeStroke,
  moveStroke,
  scaleStroke,
} from './drawing/FreehandMode';
import {
  postHotspotPoints,
  postHotspotPointsDelayed,
  hitTestStrokes,
  postHotspotProps,
  hitTestCircles,
} from './drawing/KrpanoBridge';
import {sendKrpano} from './drawing/KrpanoBridge';
import {
  renderCircle,
  removeCircle,
  moveCircle,
  setCircleSelected,
  startStar,
  resizeStar,
  finalizeStar,
  startArrow,
  resizeArrow,
  finalizeArrow,
  startDiamond,
  resizeDiamond,
  finalizeDiamond,
  CIRCLE_PATH_D,
  HEART_PATH_D,
} from './drawing/UnifiedShapeHotspot';
import {
  startPathShape,
  resizePathShape,
  finalizePathShape,
} from './drawing/SvgShapeHotspot';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Component chính Simple360Painter - ứng dụng vẽ 360 độ
export const Simple360Painter: React.FC = () => {
  // State quản lý chế độ vẽ điểm (true = đang bật, false = đang tắt)
  const [drawMode, setDrawMode] = useState<boolean>(false);
  // State quản lý chế độ vẽ tự do (true = đang bật, false = đang tắt)
  const [freeHandMode, setFreeHandMode] = useState<boolean>(false);
  // State quản lý chế độ di chuyển (true = đang bật, false = đang tắt)
  const [moveMode, setMoveMode] = useState<boolean>(false);
  // State quản lý chế độ phóng to/thu nhỏ (true = đang bật, false = đang tắt)
  const [scaleMode, setScaleMode] = useState<boolean>(false);
  // Chế độ vẽ hình tổng quát + loại hình
  const [shapeMode, setShapeMode] = useState<boolean>(false);
  const [shapeType, setShapeType] = useState<
    'circle' | 'star' | 'arrow' | 'heart' | 'diamond'
  >('circle');

  // State cho bảng màu
  const [showColorPalette, setShowColorPalette] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>('#FF6B35');

  // Hàm chuyển đổi màu hex sang format krpano
  const hexToKrpanoColor = (hex: string): string => {
    // Loại bỏ # nếu có
    const cleanHex = hex.replace('#', '');

    // Chuyển đổi hex sang RGB
    const r = parseInt(cleanHex.substr(0, 2), 16);
    const g = parseInt(cleanHex.substr(2, 2), 16);
    const b = parseInt(cleanHex.substr(4, 2), 16);

    // Chuyển đổi sang format krpano (0xRRGGBB)
    return `0x${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
  };

  // Giới hạn kích thước và scale
  const MIN_CIRCLE_DIAMETER = 20; // px
  const MAX_CIRCLE_DIAMETER = 900; // px
  const MIN_SCALE_FACTOR = 0.3; // 30% kích thước ban đầu
  const MAX_SCALE_FACTOR = 4.0; // 400% kích thước ban đầu

  // Ref tham chiếu đến WebView component để tương tác với krpano
  const webRef = React.useRef<WebView>(null);
  // Ref để theo dõi trạng thái đang vẽ tự do hay không
  const isDrawingRef = React.useRef<boolean>(false);
  // Theo dõi tên stroke đang chờ lưu
  const pendingStrokeNameRef = React.useRef<string | null>(null);
  // Bộ đếm sinh tên stroke duy nhất
  const strokeCounterRef = React.useRef<number>(0);
  // Danh sách các nét đã lưu
  type SavedStroke = {name: string; points: SpherePoint[]; color?: string};
  const [savedStrokes, setSavedStrokes] = useState<SavedStroke[]>([]);
  // Danh sách circle đã lưu
  const [savedCircles, setSavedCircles] = useState<
    {name: string; ath: number; atv: number; diameter: number}[]
  >([]);
  // Lịch sử undo/redo để khôi phục các nét vẽ đã bị xóa
  const [undoHistory, setUndoHistory] = useState<SavedStroke[]>([]);
  // Lịch sử vị trí để khôi phục vị trí cũ khi redo
  const [positionHistory, setPositionHistory] = useState<SavedStroke[]>([]);
  // Lịch sử vị trí của circles
  const [circlePositionHistory, setCirclePositionHistory] = useState<
    {name: string; ath: number; atv: number; diameter: number}[]
  >([]);
  // Tên stroke đang được chọn (mặc định chọn stroke cuối cùng)
  const selectedStrokeRef = React.useRef<string | null>(null);
  const selectedCircleRef = React.useRef<string | null>(null);
  // Chế độ xóa theo ý muốn (chọn 1 nét để xóa)
  const [deleteOneMode, setDeleteOneMode] = useState<boolean>(false);
  // WebView đã sẵn sàng
  const [webReady, setWebReady] = useState<boolean>(false);
  // Modal import strokes
  const [importModalVisible, setImportModalVisible] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  // Circle drawing refs
  const isDrawingCircleRef = React.useRef<boolean>(false);
  const circleStartRef = React.useRef<{x: number; y: number} | null>(null);
  const circleCounterRef = React.useRef<number>(0);
  const pendingCircleNameRef = React.useRef<string | null>(null);
  // Star drawing refs
  const isDrawingStarRef = React.useRef<boolean>(false);
  const starStartRef = React.useRef<{x: number; y: number} | null>(null);
  const starCounterRef = React.useRef<number>(0);
  const pendingStarNameRef = React.useRef<string | null>(null);
  // Arrow drawing refs
  const isDrawingArrowRef = React.useRef<boolean>(false);
  const arrowStartRef = React.useRef<{x: number; y: number} | null>(null);
  const arrowCounterRef = React.useRef<number>(0);
  const pendingArrowNameRef = React.useRef<string | null>(null);
  // Heart drawing refs
  const isDrawingHeartRef = React.useRef<boolean>(false);
  const heartStartRef = React.useRef<{x: number; y: number} | null>(null);
  const heartCounterRef = React.useRef<number>(0);
  const pendingHeartNameRef = React.useRef<string | null>(null);
  // Diamond drawing refs
  const isDrawingDiamondRef = React.useRef<boolean>(false);
  const diamondStartRef = React.useRef<{x: number; y: number} | null>(null);
  const diamondCounterRef = React.useRef<number>(0);
  const pendingDiamondNameRef = React.useRef<string | null>(null);
  // Shape unified refs - đã được sử dụng trong các hàm xử lý
  // const isDrawingShapeRef = React.useRef<boolean>(false);
  // const shapeStartRef = React.useRef<{x: number; y: number} | null>(null);
  // const shapeCounterRef = React.useRef<number>(0);
  // const pendingShapeNameRef = React.useRef<string | null>(null);
  // Lịch sử undo cho circles
  const [circleUndoHistory, setCircleUndoHistory] = useState<
    {name: string; ath: number; atv: number; diameter: number}[]
  >([]);

  // Global timeout để tránh app bị đứng yên (chỉ khi thực sự cần thiết)
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Chỉ set timeout khi có state active và không có tương tác trong thời gian dài
    if (shapeMode || freeHandMode || drawMode || moveMode || scaleMode) {
      timeoutId = setTimeout(() => {
        // Chỉ log debug thay vì warning
        console.log('Resetting inactive drawing modes...');
        setShapeMode(false);
        setFreeHandMode(false);
        setDrawMode(false);
        setMoveMode(false);
        setScaleMode(false);
      }, 30000); // Tăng lên 30 giây để ít aggressive hơn
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [shapeMode, freeHandMode, drawMode, moveMode, scaleMode]);

  const exportStrokes = async () => {
    try {
      const payload = JSON.stringify(savedStrokes);
      await Share.share({message: payload});
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể xuất nét vẽ');
    }
  };

  const saveStrokesToFile = async () => {
    try {
      const payload = JSON.stringify(savedStrokes);
      const fileName = `strokes_${Date.now()}.json`;
      const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      await RNFS.writeFile(path, payload, 'utf8');
      await Share.share({
        url: 'file://' + path,
        message: `Đã lưu: ${fileName}`,
      });
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể lưu file');
    }
  };

  const importStrokes = async () => {
    try {
      let parsed: {
        color: string;
        name: string;
        points: SpherePoint[];
      }[] = [];
      parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) {
        throw new Error('invalid');
      }
      // Xóa toàn bộ hiện tại trên viewer
      savedStrokes.forEach(s => removeStroke(webRef, s.name));
      // Lưu và vẽ lại
      setSavedStrokes(parsed);
      await AsyncStorage.setItem(
        'freehand_strokes',
        JSON.stringify(parsed),
      ).catch(() => {});
      // Hydrate lên viewer nếu web sẵn sàng
      if (webReady) {
        parsed.forEach(s =>
          renderFreehandStroke(
            webRef,
            s.name,
            s.points,
            s.color || hexToKrpanoColor(selectedColor),
          ),
        );
      }
      setImportModalVisible(false);
      setUndoHistory([]);
      setPositionHistory([]);
    } catch (_) {
      Alert.alert('Lỗi', 'Dữ liệu không hợp lệ');
    }
  };

  // Hàm xử lý sự kiện tap vào màn hình để tạo điểm
  const handleTap = (e: any) => {
    // Nếu không ở chế độ vẽ điểm thì bỏ qua
    if (!drawMode) {
      return;
    }
    // Lấy tọa độ X từ sự kiện touch và làm tròn về số nguyên
    const x = Math.round(e.nativeEvent.locationX);
    // Lấy tọa độ Y từ sự kiện touch và làm tròn về số nguyên
    const y = Math.round(e.nativeEvent.locationY);
    // Gọi hàm tạo điểm mới với tọa độ đã lấy được
    tapPoint(webRef, x, y, hexToKrpanoColor(selectedColor));
    // Reset lịch sử undo khi có điểm mới (vì đã có thay đổi mới)
    setUndoHistory([]);
    // Reset lịch sử vị trí khi có điểm mới
    setPositionHistory([]);
  };

  // Các hàm xử lý vẽ tự do
  // Hàm xử lý bắt đầu vẽ tự do khi người dùng chạm vào màn hình
  const handleFreeHandStart = (e: any) => {
    // Nếu không ở chế độ vẽ tự do thì bỏ qua
    if (!freeHandMode) {
      return;
    }
    // Đánh dấu đang bắt đầu vẽ tự do
    isDrawingRef.current = true;
    // Lấy tọa độ X từ sự kiện touch và làm tròn về số nguyên
    const x = Math.round(e.nativeEvent.locationX);
    // Lấy tọa độ Y từ sự kiện touch và làm tròn về số nguyên
    const y = Math.round(e.nativeEvent.locationY);
    // Gọi hàm bắt đầu vẽ tự do với tọa độ đã lấy được
    startFreehand(webRef, x, y, hexToKrpanoColor(selectedColor));
  };

  // Hàm xử lý di chuyển trong khi vẽ tự do (kéo chuột)
  const handleFreeHandMove = (e: any) => {
    // Nếu không ở chế độ vẽ tự do hoặc chưa bắt đầu vẽ thì bỏ qua
    if (!freeHandMode || !isDrawingRef.current) {
      return;
    }
    // Lấy tọa độ X từ sự kiện touch và làm tròn về số nguyên
    const x = Math.round(e.nativeEvent.locationX);
    // Lấy tọa độ Y từ sự kiện touch và làm tròn về số nguyên
    const y = Math.round(e.nativeEvent.locationY);
    // Gọi hàm thêm điểm mới vào nét tự do đang vẽ
    moveFreehand(webRef, x, y);
  };

  // Hàm xử lý kết thúc vẽ tự do khi người dùng nhấc ngón tay
  const handleFreeHandEnd = () => {
    // Đánh dấu đã kết thúc vẽ tự do
    isDrawingRef.current = false;
    if (!freeHandMode) {
      return;
    }
    // Tạo tên stroke duy nhất, finalize về hotspot cố định và yêu cầu points
    const num = ++strokeCounterRef.current;
    const name = `freehand_${Date.now()}_${num}`;
    pendingStrokeNameRef.current = name;
    finalizeFreehand(webRef, name, hexToKrpanoColor(selectedColor));
    // Dùng delay nhỏ để chắc chắn hotspot đã được tạo xong
    postHotspotPointsDelayed(webRef, name, 'freehand_points', 60);
  };

  // Vẽ hình tròn: start/move/end
  const handleCircleStart = (e: any) => {
    if (!shapeMode || shapeType !== 'circle') {
      return;
    }
    isDrawingCircleRef.current = true;
    const x = Math.round(e.nativeEvent.locationX);
    const y = Math.round(e.nativeEvent.locationY);
    circleStartRef.current = {x, y};
    startPathShape(webRef, x, y, CIRCLE_PATH_D, 'circle_temp');
  };

  const handleCircleMove = (e: any) => {
    if (
      !shapeMode ||
      shapeType !== 'circle' ||
      !isDrawingCircleRef.current ||
      !circleStartRef.current
    ) {
      return;
    }
    const x = Math.round(e.nativeEvent.locationX);
    const y = Math.round(e.nativeEvent.locationY);
    const dx = x - circleStartRef.current.x;
    const dy = y - circleStartRef.current.y;
    const diameter = Math.max(2, Math.round(Math.sqrt(dx * dx + dy * dy) * 2));
    resizePathShape(webRef, CIRCLE_PATH_D, diameter, 'circle_temp');
  };

  const handleCircleEnd = () => {
    if (!shapeMode || shapeType !== 'circle' || !isDrawingCircleRef.current) {
      return;
    }
    isDrawingCircleRef.current = false;
    const num = ++circleCounterRef.current;
    const name = `circle_${Date.now()}_${num}`;
    pendingCircleNameRef.current = name;
    finalizePathShape(
      webRef,
      name,
      CIRCLE_PATH_D,
      'circle_temp',
      hexToKrpanoColor(selectedColor),
    );
    // Convert the finalized circle hotspot into lon/lat polyline points and save like a stroke
    postHotspotPointsDelayed(webRef, name, 'freehand_points', 60);
    circleStartRef.current = null;
    // Thoát chế độ vẽ để có thể xoay 360 ngay sau khi thả
    setShapeMode(false);
  };

  // Vẽ ngôi sao: start/move/end
  const handleStarStart = (e: any) => {
    if (!shapeMode || shapeType !== 'star') {
      return;
    }
    isDrawingStarRef.current = true;
    const x = Math.round(e.nativeEvent.locationX);
    const y = Math.round(e.nativeEvent.locationY);
    starStartRef.current = {x, y};
    startStar(webRef, x, y);
  };

  const handleStarMove = (e: any) => {
    if (
      !shapeMode ||
      shapeType !== 'star' ||
      !isDrawingStarRef.current ||
      !starStartRef.current
    ) {
      return;
    }
    const x = Math.round(e.nativeEvent.locationX);
    const y = Math.round(e.nativeEvent.locationY);
    const dx = x - starStartRef.current.x;
    const dy = y - starStartRef.current.y;
    const diameter = Math.max(8, Math.round(Math.sqrt(dx * dx + dy * dy) * 2));
    resizeStar(webRef, diameter);
  };

  const handleStarEnd = () => {
    if (!shapeMode || shapeType !== 'star' || !isDrawingStarRef.current) {
      return;
    }
    isDrawingStarRef.current = false;
    const num = ++starCounterRef.current;
    const name = `star_${Date.now()}_${num}`;
    pendingStarNameRef.current = name;
    finalizeStar(webRef, name, hexToKrpanoColor(selectedColor));
    // Lưu như stroke bằng cách yêu cầu danh sách điểm (thêm delay tránh race)
    postHotspotPointsDelayed(webRef, name, 'freehand_points', 60);
    starStartRef.current = null;
    // Thoát chế độ vẽ để có thể xoay 360 ngay sau khi thả
    setShapeMode(false);
  };

  // Vẽ mũi tên: start/move/end
  const handleArrowStart = (e: any) => {
    if (!shapeMode || shapeType !== 'arrow') {
      return;
    }
    isDrawingArrowRef.current = true;
    const x = Math.round(e.nativeEvent.locationX);
    const y = Math.round(e.nativeEvent.locationY);
    arrowStartRef.current = {x, y};
    startArrow(webRef, x, y);
  };

  const handleArrowMove = (e: any) => {
    if (
      !shapeMode ||
      shapeType !== 'arrow' ||
      !isDrawingArrowRef.current ||
      !arrowStartRef.current
    ) {
      return;
    }
    const x = Math.round(e.nativeEvent.locationX);
    const y = Math.round(e.nativeEvent.locationY);
    const dx = x - arrowStartRef.current.x;
    const dy = y - arrowStartRef.current.y;
    const diameter = Math.max(8, Math.round(Math.sqrt(dx * dx + dy * dy) * 2));
    resizeArrow(webRef, diameter);
  };

  const handleArrowEnd = () => {
    if (!shapeMode || shapeType !== 'arrow' || !isDrawingArrowRef.current) {
      return;
    }
    isDrawingArrowRef.current = false;
    const num = ++arrowCounterRef.current;
    const name = `arrow_${Date.now()}_${num}`;
    pendingArrowNameRef.current = name;
    finalizeArrow(webRef, name, hexToKrpanoColor(selectedColor));
    postHotspotPointsDelayed(webRef, name, 'freehand_points', 60);
    arrowStartRef.current = null;
    // Thoát chế độ vẽ để có thể xoay 360 ngay sau khi thả
    setShapeMode(false);
  };

  // Vẽ trái tim: start/move/end
  const handleHeartStart = (e: any) => {
    if (!shapeMode || shapeType !== 'heart') {
      return;
    }
    const x = Math.round(e.nativeEvent.locationX);
    const y = Math.round(e.nativeEvent.locationY);
    isDrawingHeartRef.current = true;
    heartStartRef.current = {x, y};
    startPathShape(webRef, x, y, HEART_PATH_D, 'heart_temp');
  };

  const handleHeartMove = (e: any) => {
    if (
      !shapeMode ||
      shapeType !== 'heart' ||
      !isDrawingHeartRef.current ||
      !heartStartRef.current
    ) {
      return;
    }
    const x = Math.round(e.nativeEvent.locationX);
    const y = Math.round(e.nativeEvent.locationY);
    const dx = x - heartStartRef.current.x;
    const dy = y - heartStartRef.current.y;
    const diameter = Math.sqrt(dx * dx + dy * dy) * 2;
    resizePathShape(webRef, HEART_PATH_D, diameter, 'heart_temp');
  };

  const handleHeartEnd = () => {
    if (!shapeMode || shapeType !== 'heart' || !isDrawingHeartRef.current) {
      return;
    }

    // Thêm timeout để tránh app bị đứng yên
    const timeoutId = setTimeout(() => {
      console.warn('Heart finalize timeout, resetting state...');
      isDrawingHeartRef.current = false;
      heartStartRef.current = null;
      setShapeMode(false);
    }, 3000); // 3 giây timeout

    try {
      isDrawingHeartRef.current = false;
      const num = ++heartCounterRef.current;
      const name = `heart_${Date.now()}_${num}`;
      pendingHeartNameRef.current = name;

      console.log('Finalizing heart:', name);

      // Wrap finalizeHeart trong try-catch riêng
      try {
        finalizePathShape(
          webRef,
          name,
          HEART_PATH_D,
          'heart_temp',
          hexToKrpanoColor(selectedColor),
        );
        console.log('Heart finalized successfully');
      } catch (finalizeError) {
        console.error('Lỗi khi finalize heart:', finalizeError);
      }

      // Post hotspot points với timeout ngắn hơn
      setTimeout(() => {
        try {
          postHotspotPointsDelayed(webRef, name, 'freehand_points', 60);
        } catch (error) {
          console.error('Lỗi khi post hotspot points:', error);
        }
      }, 50);

      heartStartRef.current = null;
      // Thoát chế độ vẽ để có thể xoay 360 ngay sau khi thả
      setShapeMode(false);

      // Clear timeout nếu thành công
      clearTimeout(timeoutId);
    } catch (error) {
      console.error('Lỗi khi finalize heart:', error);
      // Reset state để tránh app bị đứng yên
      isDrawingHeartRef.current = false;
      heartStartRef.current = null;
      setShapeMode(false);
      clearTimeout(timeoutId);
    }
  };

  // Vẽ kim cương: start/move/end
  const handleDiamondStart = (e: any) => {
    if (!shapeMode || shapeType !== 'diamond') {
      return;
    }
    const x = Math.round(e.nativeEvent.locationX);
    const y = Math.round(e.nativeEvent.locationY);
    isDrawingDiamondRef.current = true;
    diamondStartRef.current = {x, y};
    startDiamond(webRef, x, y);
  };

  const handleDiamondMove = (e: any) => {
    if (
      !shapeMode ||
      shapeType !== 'diamond' ||
      !isDrawingDiamondRef.current ||
      !diamondStartRef.current
    ) {
      return;
    }
    const x = Math.round(e.nativeEvent.locationX);
    const y = Math.round(e.nativeEvent.locationY);
    const dx = x - diamondStartRef.current.x;
    const dy = y - diamondStartRef.current.y;
    const diameter = Math.sqrt(dx * dx + dy * dy) * 2;
    resizeDiamond(webRef, diameter);
  };

  const handleDiamondEnd = () => {
    if (!shapeMode || shapeType !== 'diamond' || !isDrawingDiamondRef.current) {
      return;
    }
    try {
      isDrawingDiamondRef.current = false;
      const num = ++diamondCounterRef.current;
      const name = `diamond_${Date.now()}_${num}`;
      pendingDiamondNameRef.current = name;

      console.log('Finalizing diamond:', name);
      finalizeDiamond(webRef, name, hexToKrpanoColor(selectedColor));

      // Thêm timeout để tránh app bị đứng yên
      setTimeout(() => {
        try {
          postHotspotPointsDelayed(webRef, name, 'freehand_points', 60);
        } catch (error) {
          console.error('Lỗi khi post hotspot points:', error);
        }
      }, 100);

      diamondStartRef.current = null;
      // Thoát chế độ vẽ để có thể xoay 360 ngay sau khi thả
      setShapeMode(false);
    } catch (error) {
      console.error('Lỗi khi finalize diamond:', error);
      // Reset state để tránh app bị đứng yên
      isDrawingDiamondRef.current = false;
      diamondStartRef.current = null;
      setShapeMode(false);
    }
  };

  // Các hàm xử lý chế độ di chuyển (pan gesture)
  // Ref để lưu trữ vị trí touch cuối cùng để tính toán độ lệch
  const lastTouchRef = React.useRef<{x: number; y: number} | null>(null);
  // Ref để lưu trữ kích thước ban đầu khi bắt đầu phóng to/thu nhỏ
  const initialSizeRef = React.useRef<{width: number; height: number} | null>(
    null,
  );
  // Ref lưu khoảng cách kéo trước đó để tính delta cho scale theo hướng kéo
  const prevDragDistanceRef = React.useRef<number>(0);
  // Tích luỹ hệ số scale từ khi bắt đầu (chỉ cho stroke)
  const cumulativeScaleRef = React.useRef<number>(1);
  // Ref để lưu trữ khoảng cách ban đầu giữa 2 ngón tay (cho pinch gesture) - đã thay thế bằng kéo từ góc
  // const initialDistanceRef = React.useRef<number | null>(null);

  // Hàm xử lý bắt đầu di chuyển khi người dùng chạm vào màn hình
  const onMoveStart = (e: any) => {
    // Nếu không ở chế độ di chuyển thì bỏ qua
    if (!moveMode) {
      return;
    }
    const x = Math.round(e.nativeEvent.locationX);
    const y = Math.round(e.nativeEvent.locationY);
    lastTouchRef.current = {x, y};

    // Lưu vị trí cũ của stroke đang được chọn để có thể redo
    if (selectedStrokeRef.current) {
      const currentStroke = savedStrokes.find(
        s => s.name === selectedStrokeRef.current,
      );
      if (currentStroke) {
        console.log('Lưu vị trí cũ của stroke:', currentStroke.name);
        setPositionHistory(prev => [...prev, {...currentStroke}]);
      }
    }

    // Lưu vị trí cũ của circle đang được chọn để có thể redo
    if (selectedCircleRef.current) {
      const currentCircle = savedCircles.find(
        c => c.name === selectedCircleRef.current,
      );
      if (currentCircle) {
        setCirclePositionHistory(prev => [...prev, {...currentCircle}]);
      }
    }

    // Hit-test để chọn stroke dưới ngón tay
    const names = savedStrokes.map(s => s.name);
    if (names.length) {
      hitTestStrokes(webRef, names, x, y, 50, 'hit_stroke');
    }
    // Hit-test circle
    const cnames = savedCircles.map(c => c.name);
    if (cnames.length) {
      hitTestCircles(webRef, cnames, x, y, 50, 'hit_circle');
    }
  };

  // Hàm xử lý di chuyển trong khi người dùng kéo ngón tay
  const onMove = (e: any) => {
    // Nếu không ở chế độ di chuyển hoặc chưa có vị trí bắt đầu thì bỏ qua
    if (!moveMode || !lastTouchRef.current) {
      return;
    }
    // Lấy vị trí touch trước đó đã lưu
    const prev = lastTouchRef.current;
    // Lấy vị trí touch hiện tại
    const cur = {
      x: Math.round(e.nativeEvent.locationX), // Tọa độ X làm tròn
      y: Math.round(e.nativeEvent.locationY), // Tọa độ Y làm tròn
    };
    // Nếu vị trí không thay đổi (x, y giống nhau) thì bỏ qua
    if (prev.x === cur.x && prev.y === cur.y) {
      return;
    }

    // Di chuyển dựa trên chế độ vẽ đang hoạt động
    if (drawMode) {
      // Nếu đang ở chế độ vẽ điểm thì di chuyển tất cả điểm
      movePoint(webRef, prev.x, prev.y, cur.x, cur.y);
    } else if (freeHandMode) {
      // Nếu đang vẽ tự do thì di chuyển path tạm
      moveAllFreehand(webRef, prev.x, prev.y, cur.x, cur.y);
    } else if (moveMode) {
      // Kéo stroke đã chọn bởi hit-test
      const target = selectedStrokeRef.current;
      if (target) {
        const meta = savedStrokes.find(s => s.name === target);
        if (meta) {
          moveStroke(webRef, target, prev.x, prev.y, cur.x, cur.y);
        }
      }
      // Di chuyển circle nếu có
      if (selectedCircleRef.current) {
        const cname = selectedCircleRef.current;
        moveCircle(webRef, cname, prev.x, prev.y, cur.x, cur.y);
      }
    }
    // Cập nhật vị trí cuối cùng để sử dụng cho lần di chuyển tiếp theo
    lastTouchRef.current = cur;
  };

  // Hàm xử lý kết thúc di chuyển khi người dùng nhấc ngón tay
  const onMoveEnd = () => {
    // Reset vị trí touch cuối cùng về null
    // Nếu đang di chuyển một stroke, sau khi thả tay thì lưu lại điểm mới vào state + local
    if (moveMode) {
      if (selectedStrokeRef.current) {
        const name = selectedStrokeRef.current;
        postHotspotPoints(webRef, name, 'stroke_points_update');
      }
      if (selectedCircleRef.current) {
        const cname = selectedCircleRef.current;
        postHotspotProps(webRef, cname, 'circle_update');
      }
    }
    lastTouchRef.current = null;
  };

  // Hàm helper tính khoảng cách giữa 2 điểm touch
  const calculateDistance = (
    touch1: {x: number; y: number},
    touch2: {x: number; y: number},
  ): number => {
    const dx = touch1.x - touch2.x;
    const dy = touch1.y - touch2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Hàm xử lý bắt đầu phóng to/thu nhỏ
  const onScaleStart = (e: any) => {
    if (!scaleMode) {
      console.log('Scale mode not active');
      return;
    }

    console.log('Scale start triggered');
    // Lấy thông tin touch events
    const touches = e.nativeEvent.touches;

    if (touches.length === 1) {
      const x = Math.round(touches[0].locationX);
      const y = Math.round(touches[0].locationY);

      console.log('Touch position:', {x, y});

      // Lưu vị trí bắt đầu để tính toán khoảng cách kéo
      lastTouchRef.current = {x, y};
      prevDragDistanceRef.current = 0;
      cumulativeScaleRef.current = 1;

      // Thử chọn circle trước
      const cnames = savedCircles.map(c => c.name);
      if (cnames.length) {
        console.log('Testing circles:', cnames);
        hitTestCircles(webRef, cnames, x, y, 50, 'select_circle_for_scale');
      }

      // Thử chọn stroke (luôn thử, không phụ thuộc vào selectedCircleRef)
      const names = savedStrokes.map(s => s.name);
      if (names.length) {
        console.log('Testing strokes:', names);
        hitTestStrokes(webRef, names, x, y, 50, 'select_stroke_for_scale');
      }

      // Lưu kích thước ban đầu của hotspot đang được chọn
      if (selectedCircleRef.current) {
        const currentCircle = savedCircles.find(
          c => c.name === selectedCircleRef.current,
        );
        if (currentCircle) {
          initialSizeRef.current = {
            width: currentCircle.diameter,
            height: currentCircle.diameter,
          };
          console.log('Initial size for circle:', initialSizeRef.current);
        }
      } else if (selectedStrokeRef.current) {
        // Lưu kích thước của stroke (có thể cần implement)
        initialSizeRef.current = {width: 100, height: 100}; // Default size
        console.log('Initial size for stroke:', initialSizeRef.current);
      } else {
        console.log('No hotspot selected yet');
      }
    }
  };

  // Hàm xử lý phóng to/thu nhỏ trong khi người dùng kéo ngón tay
  const onScale = (e: any) => {
    if (!scaleMode || !lastTouchRef.current || !initialSizeRef.current) {
      console.log('Scale mode not ready:', {
        scaleMode,
        hasLastTouch: !!lastTouchRef.current,
        hasInitialSize: !!initialSizeRef.current,
      });
      return;
    }

    const touches = e.nativeEvent.touches;
    if (touches.length === 1) {
      const currentX = touches[0].locationX;
      const currentY = touches[0].locationY;

      // Tính khoảng cách từ vị trí bắt đầu đến vị trí hiện tại (kéo từ góc)
      const dragDistance = calculateDistance(lastTouchRef.current, {
        x: currentX,
        y: currentY,
      });

      console.log('Scale calculation:', {
        dragDistance,
        initialWidth: initialSizeRef.current.width,
        selectedCircle: selectedCircleRef.current,
        selectedStroke: selectedStrokeRef.current,
      });

      // Circle: dùng absolute width theo khoảng cách từ điểm bắt đầu
      const scaleRatio = Math.max(0.1, 1 + (dragDistance - 50) / 100);
      let newWidth = Math.round(initialSizeRef.current.width * scaleRatio);
      // Giới hạn min/max cho circle
      newWidth = Math.max(
        MIN_CIRCLE_DIAMETER,
        Math.min(MAX_CIRCLE_DIAMETER, newWidth),
      );

      console.log('New width calculated:', newWidth, 'scaleRatio:', scaleRatio);

      // Áp dụng kích thước mới cho hotspot đang được chọn
      if (selectedCircleRef.current) {
        console.log(
          'Resizing circle:',
          selectedCircleRef.current,
          'to width:',
          newWidth,
        );
        const cname = selectedCircleRef.current;
        if (cname) {
          sendKrpano(
            webRef,
            `if(hotspot['${cname}'], set(hotspot['${cname}'].width, ${newWidth}); set(hotspot['${cname}'].height, ${newWidth}); );`,
          );
        }
      } else if (selectedStrokeRef.current) {
        // Stroke: scale theo delta quãng kéo (kéo ra -> factor > 1, kéo vào -> factor < 1)
        const prev = prevDragDistanceRef.current;
        const delta = dragDistance - prev;
        // Nhạy vừa phải: mỗi 60px thay đổi ~ 1.0 lần
        let factor = 1 + delta / 120;
        // Giới hạn mỗi bước để không nhảy quá mạnh
        factor = Math.max(0.7, Math.min(1.3, factor));
        if (Math.abs(delta) > 0.5) {
          // Áp dụng giới hạn tổng thể
          const currentTotal = cumulativeScaleRef.current;
          let nextTotal = currentTotal * factor;
          nextTotal = Math.max(
            MIN_SCALE_FACTOR,
            Math.min(MAX_SCALE_FACTOR, nextTotal),
          );
          // Hệ số thực sự cần apply ở bước này để không vượt quá min/max
          const stepFactor = nextTotal / currentTotal;
          if (Math.abs(stepFactor - 1) > 0.001) {
            console.log(
              'Scaling stroke step:',
              selectedStrokeRef.current,
              'delta:',
              delta,
              'factor:',
              stepFactor,
              'total:',
              nextTotal,
            );
            scaleStroke(webRef, selectedStrokeRef.current, stepFactor);
            cumulativeScaleRef.current = nextTotal;
          }
          prevDragDistanceRef.current = dragDistance;
        }
      }
    }
  };

  // Hàm xử lý kết thúc phóng to/thu nhỏ
  const onScaleEnd = () => {
    if (scaleMode) {
      // Lưu kích thước mới vào state
      if (selectedCircleRef.current) {
        postHotspotProps(webRef, selectedCircleRef.current, 'circle_update');
      }
      // Lưu lại điểm mới của stroke sau khi scale để đồng bộ local
      if (selectedStrokeRef.current) {
        const name = selectedStrokeRef.current;
        postHotspotPoints(webRef, name, 'stroke_points_update');
      }
    }
    lastTouchRef.current = null;
    initialSizeRef.current = null;
    cumulativeScaleRef.current = 1;
    prevDragDistanceRef.current = 0;
  };

  // Hàm xử lý hoàn tác (undo) - xóa nét vẽ cuối cùng
  const undo = async () => {
    // Nếu có stroke đã lưu trong state thì xóa stroke cuối cùng
    if (savedStrokes.length > 0) {
      const last = savedStrokes[savedStrokes.length - 1];
      removeStroke(webRef, last.name);
      const next = savedStrokes.slice(0, -1);

      // Lưu stroke bị xóa vào lịch sử undo để có thể redo
      setUndoHistory(prev => [...prev, last]);

      setSavedStrokes(next);
      await AsyncStorage.setItem(
        'freehand_strokes',
        JSON.stringify(next),
      ).catch(() => {});
      selectedStrokeRef.current = next.length
        ? next[next.length - 1].name
        : null;
      return;
    }
    // Undo circle nếu có circle đã lưu
    if (savedCircles.length > 0) {
      const last = savedCircles[savedCircles.length - 1];
      removeCircle(webRef, last.name);
      const next = savedCircles.slice(0, -1);
      setCircleUndoHistory(prev => [...prev, last]);
      setSavedCircles(next);
      await AsyncStorage.setItem('circles', JSON.stringify(next)).catch(
        () => {},
      );
      selectedCircleRef.current = next.length
        ? next[next.length - 1].name
        : null;
      return;
    }
    // Nếu state chưa có, thử lấy từ AsyncStorage để đảm bảo reset xong vẫn undo được
    try {
      const raw = await AsyncStorage.getItem('freehand_strokes');
      if (raw) {
        const parsed: {name: string; points: SpherePoint[]}[] = JSON.parse(raw);
        if (parsed.length > 0) {
          const last = parsed[parsed.length - 1];
          removeStroke(webRef, last.name);
          const next = parsed.slice(0, -1);

          // Lưu stroke bị xóa vào lịch sử undo để có thể redo
          setUndoHistory(prev => [...prev, last]);

          setSavedStrokes(next);
          await AsyncStorage.setItem(
            'freehand_strokes',
            JSON.stringify(next),
          ).catch(() => {});
          selectedStrokeRef.current = next.length
            ? next[next.length - 1].name
            : null;
          return;
        }
      }
    } catch (_) {
      // noop
    }
    // Nếu không có stroke đã lưu, xử lý theo chế độ hiện tại
    if (freeHandMode) {
      undoFreehand(webRef);
    } else {
      undoPoint(webRef);
    }
  };

  // Hàm xử lý làm lại (redo) - khôi phục vị trí cũ khi di chuyển
  const redo = async () => {
    console.log('Redo được gọi');
    console.log('Position history length:', positionHistory.length);
    console.log('Undo history length:', undoHistory.length);

    // Nếu có lịch sử vị trí thì khôi phục vị trí cũ
    if (positionHistory.length > 0) {
      console.log('Khôi phục vị trí cũ');
      // Lấy vị trí cũ cuối cùng
      const lastPosition = positionHistory[positionHistory.length - 1];
      const nextPositionHistory = positionHistory.slice(0, -1);

      // Khôi phục vị trí cũ của stroke
      renderFreehandStroke(
        webRef,
        lastPosition.name,
        lastPosition.points,
        lastPosition.color || hexToKrpanoColor(selectedColor),
      );

      // Cập nhật stroke trong danh sách đã lưu
      const nextStrokes = savedStrokes.map(s =>
        s.name === lastPosition.name ? lastPosition : s,
      );
      setSavedStrokes(nextStrokes);

      // Cập nhật lịch sử vị trí
      setPositionHistory(nextPositionHistory);

      // Lưu vào AsyncStorage
      await AsyncStorage.setItem(
        'freehand_strokes',
        JSON.stringify(nextStrokes),
      ).catch(() => {});

      // Cập nhật stroke được chọn
      selectedStrokeRef.current = lastPosition.name;
      console.log('Đã khôi phục vị trí cũ của stroke:', lastPosition.name);
      return;
    }

    // Nếu không có lịch sử vị trí stroke: khôi phục vị trí circle
    if (circlePositionHistory.length > 0) {
      const last = circlePositionHistory[circlePositionHistory.length - 1];
      const nextPos = circlePositionHistory.slice(0, -1);
      renderCircle(webRef, last.name, last.ath, last.atv, last.diameter);
      const nextCircles = savedCircles.map(c =>
        c.name === last.name ? last : c,
      );
      setSavedCircles(nextCircles);
      setCirclePositionHistory(nextPos);
      await AsyncStorage.setItem('circles', JSON.stringify(nextCircles)).catch(
        () => {},
      );
      selectedCircleRef.current = last.name;
      return;
    }

    // Nếu không có lịch sử vị trí thì khôi phục stroke đã bị xóa (logic cũ)
    if (undoHistory.length > 0) {
      console.log('Khôi phục stroke đã bị xóa');
      // Khôi phục tất cả stroke đã bị xóa
      undoHistory.forEach(stroke => {
        renderFreehandStroke(
          webRef,
          stroke.name,
          stroke.points,
          stroke.color || hexToKrpanoColor(selectedColor),
        );
      });

      // Thêm tất cả stroke vào danh sách đã lưu
      const nextStrokes = [...savedStrokes, ...undoHistory];
      setSavedStrokes(nextStrokes);

      // Reset lịch sử undo
      setUndoHistory([]);

      // Lưu vào AsyncStorage
      await AsyncStorage.setItem(
        'freehand_strokes',
        JSON.stringify(nextStrokes),
      ).catch(() => {});

      // Cập nhật stroke được chọn (stroke cuối cùng)
      if (nextStrokes.length > 0) {
        selectedStrokeRef.current = nextStrokes[nextStrokes.length - 1].name;
      }
      console.log('Đã khôi phục stroke đã bị xóa');
      return;
    }
    // Khôi phục circle đã bị xóa
    if (circleUndoHistory.length > 0) {
      circleUndoHistory.forEach(c => {
        renderCircle(webRef, c.name, c.ath, c.atv, c.diameter);
      });
      const nextCircles = [...savedCircles, ...circleUndoHistory];
      setSavedCircles(nextCircles);
      setCircleUndoHistory([]);
      await AsyncStorage.setItem('circles', JSON.stringify(nextCircles)).catch(
        () => {},
      );
      if (nextCircles.length > 0) {
        selectedCircleRef.current = nextCircles[nextCircles.length - 1].name;
      }
      return;
    }

    console.log('Không có gì để redo');
  };

  // Hàm xử lý xóa (clear) - xóa tất cả nét vẽ hiện tại
  const clear = async () => {
    // Nếu đang ở chế độ xóa theo ý muốn và có nét được chọn => xóa nét đó
    if (deleteOneMode) {
      if (selectedStrokeRef.current) {
        const target = selectedStrokeRef.current;
        removeStroke(webRef, target);
        const next = savedStrokes.filter(s => s.name !== target);
        const deletedStroke = savedStrokes.find(s => s.name === target);
        if (deletedStroke) {
          setUndoHistory(prev => [...prev, deletedStroke]);
        }
        setSavedStrokes(next);
        await AsyncStorage.setItem(
          'freehand_strokes',
          JSON.stringify(next),
        ).catch(() => {});
        selectedStrokeRef.current = null;
        return;
      }
      if (selectedCircleRef.current) {
        const target = selectedCircleRef.current;
        removeCircle(webRef, target);
        const nextC = savedCircles.filter(c => c.name !== target);
        const deletedCircle = savedCircles.find(c => c.name === target);
        if (deletedCircle) {
          setCircleUndoHistory(prev => [...prev, deletedCircle]);
        }
        setSavedCircles(nextC);
        await AsyncStorage.setItem('circles', JSON.stringify(nextC)).catch(
          () => {},
        );
        selectedCircleRef.current = null;
        return;
      }
    }
    // Còn lại: Xóa toàn bộ (giữ logic cũ)
    clearPoint(webRef);
    clearFreehand(webRef);
    const raw = await AsyncStorage.getItem('freehand_strokes').catch(
      () => null,
    );
    let list: {name: string; points: SpherePoint[]}[] = savedStrokes;
    try {
      if ((!list || list.length === 0) && raw) {
        list = JSON.parse(raw);
      }
    } catch (_) {
      // noop
    }
    if (list && list.length) {
      // Lưu tất cả stroke bị xóa vào lịch sử undo để có thể redo
      // KHÔNG reset lịch sử undo ở đây để có thể redo
      setUndoHistory(prev => [...prev, ...list]);

      list.forEach(s => removeStroke(webRef, s.name));
    }
    setSavedStrokes([]);
    selectedStrokeRef.current = null;
    setSavedCircles([]);
    selectedCircleRef.current = null;
    // KHÔNG reset lịch sử undo khi xóa toàn bộ - để có thể redo
    // Reset lịch sử vị trí khi xóa toàn bộ
    setPositionHistory([]);
    await AsyncStorage.removeItem('freehand_strokes').catch(() => {});
    await AsyncStorage.removeItem('circles').catch(() => {});
  };

  // Hàm chuyển đổi chế độ vẽ điểm (toggle)
  const toggleDrawMode = () => {
    // Đảo ngược trạng thái chế độ vẽ điểm (true ↔ false)
    setDrawMode(v => !v);
    // Tắt chế độ vẽ tự do khi bật chế độ vẽ điểm
    setFreeHandMode(false);
    // Tắt chế độ di chuyển và phóng to/thu nhỏ khi bật chế độ vẽ điểm
    setMoveMode(false);
    setScaleMode(false);
  };

  // Hàm chuyển đổi chế độ vẽ tự do (toggle)
  const toggleFreeHandMode = () => {
    // Đảo ngược trạng thái chế độ vẽ tự do (true ↔ false)
    setFreeHandMode(v => !v);
    // Tắt chế độ vẽ điểm khi bật chế độ vẽ tự do
    setDrawMode(false);
    // Tắt chế độ di chuyển và phóng to/thu nhỏ khi bật chế độ vẽ tự do
    setMoveMode(false);
    setScaleMode(false);
    // Tắt chế độ vẽ hình
    setShapeMode(false);
  };

  // Hàm chuyển đổi chế độ di chuyển (toggle)
  const toggleMoveMode = () => {
    const next = !moveMode;
    // Chuyển trạng thái di chuyển
    setMoveMode(next);
    if (next) {
      // Tắt các chế độ vẽ khi bật di chuyển
      setDrawMode(false);
      setFreeHandMode(false);
      setShapeMode(false);
      setScaleMode(false);
      // Tự động chọn stroke cuối cùng
      if (savedStrokes.length) {
        const last = savedStrokes[savedStrokes.length - 1].name;
        selectedStrokeRef.current = last;
        setStrokeSelected(webRef, last, true);
      }
      // Tự động chọn circle cuối cùng
      if (savedCircles.length) {
        const lastC = savedCircles[savedCircles.length - 1].name;
        selectedCircleRef.current = lastC;
        setCircleSelected(webRef, lastC, true);
      }
    } else {
      // Tắt highlight khi tắt di chuyển
      if (selectedStrokeRef.current) {
        setStrokeSelected(webRef, selectedStrokeRef.current, false);
        selectedStrokeRef.current = null;
      }
      if (selectedCircleRef.current) {
        setCircleSelected(webRef, selectedCircleRef.current, false);
        selectedCircleRef.current = null;
      }
    }
  };

  // Bật/Tắt chế độ xóa theo ý muốn
  const toggleDeleteOneMode = () => {
    const next = !deleteOneMode;
    setDeleteOneMode(next);
    if (!next && selectedStrokeRef.current) {
      setStrokeSelected(webRef, selectedStrokeRef.current, false);
      selectedStrokeRef.current = null;
    }
    if (!next && selectedCircleRef.current) {
      setCircleSelected(webRef, selectedCircleRef.current, false);
      selectedCircleRef.current = null;
    }
  };

  // Toggle unified shape mode
  const toggleShapeMode = () => {
    setShapeMode(v => !v);
    setDrawMode(false);
    setFreeHandMode(false);
    setMoveMode(false);
    setScaleMode(false);
  };

  // Hook useEffect để đồng bộ trạng thái được chọn giữa các chế độ vẽ
  React.useEffect(() => {
    // Nếu đang ở chế độ vẽ điểm
    if (drawMode) {
      // Làm nổi bật shape điểm (màu xanh, viền dày)
      setPointSelected(webRef, true);
      // Bỏ nổi bật nét tự do (màu đỏ, viền mỏng)
      setFreehandSelected(webRef, false);
    } else if (freeHandMode) {
      // Nếu đang ở chế độ vẽ tự do
      // Bỏ nổi bật shape điểm (màu đỏ, viền mỏng)
      setPointSelected(webRef, false);
      // Làm nổi bật nét tự do (màu xanh, viền dày)
      setFreehandSelected(webRef, true);
    } else {
      // Nếu không ở chế độ vẽ nào
      // Bỏ nổi bật cả shape điểm và nét tự do
      setPointSelected(webRef, false);
      setFreehandSelected(webRef, false);
    }
  }, [drawMode, freeHandMode]); // Chạy lại khi drawMode hoặc freeHandMode thay đổi

  // Hydrate các nét đã lưu từ AsyncStorage
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('freehand_strokes');
        if (!cancelled && raw) {
          const parsed: {name: string; points: SpherePoint[]}[] =
            JSON.parse(raw);
          setSavedStrokes(parsed);
        }
        const rawCir = await AsyncStorage.getItem('circles');
        if (!cancelled && rawCir) {
          const parsedCir: {
            name: string;
            ath: number;
            atv: number;
            diameter: number;
          }[] = JSON.parse(rawCir);
          setSavedCircles(parsedCir);
        }
      } catch (_) {
        // noop
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Khi WebView sẵn sàng, vẽ lại tất cả nét đã lưu
  React.useEffect(() => {
    if (!webReady) {
      return;
    }
    savedStrokes.forEach(s => {
      renderFreehandStroke(
        webRef,
        s.name,
        s.points,
        s.color || hexToKrpanoColor(selectedColor),
      );
    });
  }, [webReady, savedStrokes, selectedColor]);

  React.useEffect(() => {
    if (!webReady) {
      return;
    }
    savedCircles.forEach(c => {
      renderCircle(webRef, c.name, c.ath, c.atv, c.diameter);
    });
  }, [webReady, savedCircles]);

  React.useEffect(() => {
    if (!webReady) {
      return;
    }
    savedCircles.forEach(c => {
      renderCircle(webRef, c.name, c.ath, c.atv, c.diameter);
    });
  }, [webReady, savedCircles]);

  // Hàm chuyển đổi chế độ phóng to/thu nhỏ (toggle)
  const toggleScaleMode = () => {
    const next = !scaleMode;
    // Chuyển trạng thái phóng to/thu nhỏ
    setScaleMode(next);
    if (next) {
      // Tắt các chế độ vẽ khi bật phóng to/thu nhỏ
      setDrawMode(false);
      setFreeHandMode(false);
      setShapeMode(false);
      setMoveMode(false);
      // Tự động chọn stroke cuối cùng
      if (savedStrokes.length) {
        const last = savedStrokes[savedStrokes.length - 1].name;
        selectedStrokeRef.current = last;
        setStrokeSelected(webRef, last, true);
      }
      // Tự động chọn circle cuối cùng
      if (savedCircles.length) {
        const lastC = savedCircles[savedCircles.length - 1].name;
        selectedCircleRef.current = lastC;
        setCircleSelected(webRef, lastC, true);
      }
    } else {
      // Tắt highlight khi tắt phóng to/thu nhỏ
      if (selectedStrokeRef.current) {
        setStrokeSelected(webRef, selectedStrokeRef.current, false);
        selectedStrokeRef.current = null;
      }
      if (selectedCircleRef.current) {
        setCircleSelected(webRef, selectedCircleRef.current, false);
        selectedCircleRef.current = null;
      }
    }
  };

  // Render UI của component
  return (
    // Container chính của ứng dụng
    <View style={styles.container}>
      {/* Ẩn thanh status bar để tận dụng toàn bộ màn hình */}
      <StatusBar hidden />
      {/* WebView hiển thị krpano viewer 360 độ */}
      <WebView
        // Ref để tương tác với WebView từ code
        ref={webRef}
        // URL của tour 360 độ Paris từ krpano
        source={{uri: 'https://krpano.com/tours/paris/'}}
        // Style cho WebView - chiếm toàn bộ container
        style={styles.web}
        // Bật JavaScript để chạy krpano viewer
        javaScriptEnabled
        // Bật DOM storage để lưu trữ dữ liệu
        domStorageEnabled
        // Đánh dấu đã load xong để có thể hydrate strokes
        onLoadEnd={() => setWebReady(true)}
        // Lắng nghe message trả về từ WebView (danh sách điểm đã vẽ)
        onMessage={async evt => {
          try {
            const data = JSON.parse(evt.nativeEvent.data);
            if (
              data &&
              data.type === 'freehand_points' &&
              Array.isArray(data.points)
            ) {
              const strokeName: string =
                data.name ||
                pendingStrokeNameRef.current ||
                `freehand_${Date.now()}`;
              const points: SpherePoint[] = data.points;
              setSavedStrokes(prev => {
                const next = [
                  ...prev,
                  {
                    name: strokeName,
                    points,
                    color: hexToKrpanoColor(selectedColor),
                  },
                ];
                AsyncStorage.setItem(
                  'freehand_strokes',
                  JSON.stringify(next),
                ).catch(() => {});
                return next;
              });
              // Reset lịch sử undo khi có stroke mới (vì đã có thay đổi mới)
              setUndoHistory([]);
              // Reset lịch sử vị trí khi có stroke mới
              setPositionHistory([]);
              pendingStrokeNameRef.current = null;
              return;
            }
            if (
              data &&
              data.type === 'circle_props' &&
              typeof data.ath === 'number' &&
              typeof data.atv === 'number'
            ) {
              const cname: string =
                data.name ||
                pendingCircleNameRef.current ||
                `circle_${Date.now()}`;
              const diameter: number =
                typeof data.width === 'number' ? Number(data.width) : 20;
              const meta = {
                name: cname,
                ath: Number(data.ath),
                atv: Number(data.atv),
                diameter,
              };
              setSavedCircles(prev => {
                const next = [...prev, meta];
                AsyncStorage.setItem('circles', JSON.stringify(next)).catch(
                  () => {},
                );
                return next;
              });
              pendingCircleNameRef.current = null;
              return;
            }
            if (data && data.type === 'hit_stroke') {
              const name: string | null = data.name || null;
              if (name) {
                // Lưu vị trí cũ của stroke trước khi chọn để có thể redo
                if (
                  selectedStrokeRef.current &&
                  selectedStrokeRef.current !== name
                ) {
                  const currentStroke = savedStrokes.find(
                    s => s.name === selectedStrokeRef.current,
                  );
                  if (currentStroke) {
                    setPositionHistory(prev => [...prev, {...currentStroke}]);
                  }
                }

                if (
                  selectedStrokeRef.current &&
                  selectedStrokeRef.current !== name
                ) {
                  setStrokeSelected(webRef, selectedStrokeRef.current, false);
                }
                selectedStrokeRef.current = name;
                setStrokeSelected(webRef, name, true);
              }
              return;
            }
            if (data && data.type === 'hit_circle') {
              const name: string | null = data.name || null;
              if (name) {
                if (
                  selectedCircleRef.current &&
                  selectedCircleRef.current !== name
                ) {
                  setCircleSelected(webRef, selectedCircleRef.current, false);
                }
                selectedCircleRef.current = name;
                setCircleSelected(webRef, name, true);
              }
              return;
            }
            // Xử lý chọn circle cho chế độ phóng to/thu nhỏ
            if (data && data.type === 'select_circle_for_scale') {
              const name: string | null = data.name || null;
              console.log('Circle selected for scale:', name);
              if (name) {
                // Bỏ chọn circle cũ nếu có
                if (
                  selectedCircleRef.current &&
                  selectedCircleRef.current !== name
                ) {
                  setCircleSelected(webRef, selectedCircleRef.current, false);
                }
                // Bỏ chọn stroke nếu có
                if (selectedStrokeRef.current) {
                  setStrokeSelected(webRef, selectedStrokeRef.current, false);
                  selectedStrokeRef.current = null;
                }
                // Chọn circle mới
                selectedCircleRef.current = name;
                setCircleSelected(webRef, name, true);
                console.log('Circle selected successfully:', name);
              }
              return;
            }
            // Xử lý chọn stroke cho chế độ phóng to/thu nhỏ
            if (data && data.type === 'select_stroke_for_scale') {
              const name: string | null = data.name || null;
              if (name) {
                // Bỏ chọn stroke cũ nếu có
                if (
                  selectedStrokeRef.current &&
                  selectedStrokeRef.current !== name
                ) {
                  setStrokeSelected(webRef, selectedStrokeRef.current, false);
                }
                // Bỏ chọn circle nếu có
                if (selectedCircleRef.current) {
                  setCircleSelected(webRef, selectedCircleRef.current, false);
                  selectedCircleRef.current = null;
                }
                // Chọn stroke mới
                selectedStrokeRef.current = name;
                setStrokeSelected(webRef, name, true);
              }
              return;
            }
            if (
              data &&
              data.type === 'circle_update' &&
              data.name &&
              typeof data.ath === 'number' &&
              typeof data.atv === 'number'
            ) {
              const updatedName: string = data.name;
              const diameter: number =
                typeof data.width === 'number' ? Number(data.width) : 20;
              setSavedCircles(prev => {
                const next = prev.map(c =>
                  c.name === updatedName
                    ? {
                        ...c,
                        ath: Number(data.ath),
                        atv: Number(data.atv),
                        diameter,
                      }
                    : c,
                );
                AsyncStorage.setItem('circles', JSON.stringify(next)).catch(
                  () => {},
                );
                return next;
              });
              return;
            }
            if (
              data &&
              data.type === 'stroke_points_update' &&
              data.name &&
              Array.isArray(data.points)
            ) {
              // Cập nhật vị trí mới của stroke vừa kéo và lưu ngay vào local
              const updatedName: string = data.name;
              const updatedPoints: SpherePoint[] = data.points;
              setSavedStrokes(prev => {
                const next = prev.map(s =>
                  s.name === updatedName ? {...s, points: updatedPoints} : s,
                );
                AsyncStorage.setItem(
                  'freehand_strokes',
                  JSON.stringify(next),
                ).catch(() => {});
                return next;
              });
              // Reset lịch sử undo khi có stroke được cập nhật (vì đã có thay đổi mới)
              setUndoHistory([]);
              // KHÔNG reset lịch sử vị trí khi stroke được cập nhật - để có thể redo
              return;
            }
          } catch (_) {
            // noop
          }
        }}
        // Điều khiển sự kiện touch: 'none' khi đang vẽ/di chuyển, 'auto' khi không
        pointerEvents={
          drawMode || freeHandMode || shapeMode || moveMode || scaleMode
            ? 'none'
            : 'auto'
        }
      />

      {/* Overlay để bắt sự kiện tap khi ở chế độ vẽ điểm và không di chuyển/phóng to */}
      {drawMode && !moveMode && !scaleMode && (
        <TouchableOpacity
          // Style overlay phủ toàn màn hình
          style={styles.overlay}
          // Không có hiệu ứng opacity khi touch
          activeOpacity={1}
          // Xử lý sự kiện tap để tạo điểm
          onPress={handleTap}
        />
      )}

      {/* Overlay để bắt sự kiện vẽ tự do khi ở chế độ vẽ tự do và không di chuyển/phóng to */}
      {freeHandMode && !moveMode && !scaleMode && (
        <View
          // Style overlay phủ toàn màn hình
          style={styles.overlay}
          // Luôn bắt đầu responder khi touch
          onStartShouldSetResponder={() => true}
          // Luôn bắt đầu responder khi di chuyển
          onMoveShouldSetResponder={() => true}
          // Xử lý bắt đầu vẽ tự do
          onResponderGrant={handleFreeHandStart}
          // Xử lý di chuyển trong khi vẽ tự do
          onResponderMove={handleFreeHandMove}
          // Xử lý kết thúc vẽ tự do
          onResponderRelease={handleFreeHandEnd}
          // Xử lý khi bị gián đoạn vẽ tự do
          onResponderTerminate={handleFreeHandEnd}
        />
      )}

      {/* Overlay unified shape (tròn/sao) */}
      {shapeMode && !moveMode && !scaleMode && (
        <View
          style={styles.overlay}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={e => {
            if (shapeType === 'circle') {
              handleCircleStart(e);
            } else if (shapeType === 'star') {
              handleStarStart(e);
            } else if (shapeType === 'arrow') {
              handleArrowStart(e);
            } else if (shapeType === 'heart') {
              handleHeartStart(e);
            } else if (shapeType === 'diamond') {
              handleDiamondStart(e);
            }
          }}
          onResponderMove={e => {
            if (shapeType === 'circle') {
              handleCircleMove(e);
            } else if (shapeType === 'star') {
              handleStarMove(e);
            } else if (shapeType === 'arrow') {
              handleArrowMove(e);
            } else if (shapeType === 'heart') {
              handleHeartMove(e);
            } else if (shapeType === 'diamond') {
              handleDiamondMove(e);
            }
          }}
          onResponderRelease={() => {
            if (shapeType === 'circle') {
              handleCircleEnd();
            } else if (shapeType === 'star') {
              handleStarEnd();
            } else if (shapeType === 'arrow') {
              handleArrowEnd();
            } else if (shapeType === 'heart') {
              handleHeartEnd();
            } else if (shapeType === 'diamond') {
              handleDiamondEnd();
            }
          }}
          onResponderTerminate={() => {
            if (shapeType === 'circle') {
              handleCircleEnd();
            } else if (shapeType === 'star') {
              handleStarEnd();
            } else if (shapeType === 'arrow') {
              handleArrowEnd();
            } else if (shapeType === 'heart') {
              handleHeartEnd();
            } else if (shapeType === 'diamond') {
              handleDiamondEnd();
            }
          }}
        />
      )}

      {/* Overlay để bắt sự kiện di chuyển khi ở chế độ di chuyển */}
      {moveMode && (
        <View
          // Style overlay phủ toàn màn hình
          style={styles.overlay}
          // Luôn bắt đầu responder khi touch
          onStartShouldSetResponder={() => true}
          // Luôn bắt đầu responder khi di chuyển
          onMoveShouldSetResponder={() => true}
          // Xử lý bắt đầu di chuyển
          onResponderGrant={onMoveStart}
          // Xử lý di chuyển
          onResponderMove={onMove}
          // Xử lý kết thúc di chuyển
          onResponderRelease={onMoveEnd}
          // Xử lý khi bị gián đoạn di chuyển
          onResponderTerminate={onMoveEnd}
        />
      )}

      {/* Overlay để bắt sự kiện phóng to/thu nhỏ khi ở chế độ phóng to/thu nhỏ */}
      {scaleMode && (
        <View
          // Style overlay phủ toàn màn hình
          style={styles.overlay}
          // Luôn bắt đầu responder khi touch
          onStartShouldSetResponder={() => true}
          // Luôn bắt đầu responder khi di chuyển
          onMoveShouldSetResponder={() => true}
          // Xử lý bắt đầu phóng to/thu nhỏ
          onResponderGrant={onScaleStart}
          // Xử lý phóng to/thu nhỏ
          onResponderMove={onScale}
          // Xử lý kết thúc phóng to/thu nhỏ
          onResponderRelease={onScaleEnd}
          // Xử lý khi bị gián đoạn phóng to/thu nhỏ
          onResponderTerminate={onScaleEnd}
        />
      )}

      {/* Overlay chọn nét để xóa theo ý muốn */}
      {deleteOneMode && (
        <View
          style={styles.overlay}
          onStartShouldSetResponder={() => true}
          onResponderGrant={e => {
            const x = Math.round(e.nativeEvent.locationX);
            const y = Math.round(e.nativeEvent.locationY);
            const names = savedStrokes.map(s => s.name);
            if (names.length) {
              hitTestStrokes(webRef, names, x, y, 50, 'hit_stroke');
            }
            const cnames = savedCircles.map(c => c.name);
            if (cnames.length) {
              hitTestCircles(webRef, cnames, x, y, 50, 'hit_circle');
            }
          }}
        />
      )}

      {/* Container chứa các button toggle chế độ vẽ ở góc trên phải */}
      <View style={styles.topButtons} pointerEvents="box-none">
        {/* Button toggle chế độ vẽ điểm */}
        <TouchableOpacity
          // Style button với trạng thái active khi drawMode = true
          style={[styles.toggleBtn, drawMode && styles.toggleOnDraw]}
          // Xử lý sự kiện press để toggle chế độ vẽ điểm
          onPress={toggleDrawMode}>
          <Text style={styles.toggleText}>
            {/* Hiển thị text khác nhau dựa trên trạng thái drawMode */}
            {drawMode ? '✏️ Đang vẽ' : '✏️ Vẽ'}
          </Text>
        </TouchableOpacity>

        {/* Button toggle chế độ vẽ tự do */}
        <TouchableOpacity
          // Style button với trạng thái active khi freeHandMode = true
          style={[styles.toggleBtn, freeHandMode && styles.toggleOnFreehand]}
          // Xử lý sự kiện press để toggle chế độ vẽ tự do
          onPress={toggleFreeHandMode}>
          <Text style={styles.toggleText}>
            {/* Hiển thị text khác nhau dựa trên trạng thái freeHandMode */}
            {freeHandMode ? '🖌️ Đang vẽ tự do' : '🖌️ Vẽ tự do'}
          </Text>
        </TouchableOpacity>

        {/* Button toggle chế độ vẽ hình (gộp) */}
        <TouchableOpacity
          style={[styles.toggleBtn, shapeMode && styles.toggleOnCircle]}
          onPress={toggleShapeMode}>
          <Text style={styles.toggleText}>
            {shapeMode ? '🔷 Đang vẽ hình' : '🔷 Vẽ hình'}
          </Text>
        </TouchableOpacity>

        {/* Selector loại hình khi bật vẽ hình */}
        {shapeMode && (
          <View style={styles.shapeSelector}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                shapeType === 'circle' && styles.toggleOnCircle,
              ]}
              onPress={() => setShapeType('circle')}>
              <Text style={styles.toggleText}>⭕ Tròn</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                shapeType === 'star' && styles.toggleOnCircle,
              ]}
              onPress={() => setShapeType('star')}>
              <Text style={styles.toggleText}>⭐ Sao</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                shapeType === 'arrow' && styles.toggleOnCircle,
              ]}
              onPress={() => setShapeType('arrow')}>
              <Text style={styles.toggleText}>➡️ Mũi tên</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                shapeType === 'heart' && styles.toggleOnCircle,
              ]}
              onPress={() => setShapeType('heart')}>
              <Text style={styles.toggleText}>💖 Trái tim</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                shapeType === 'diamond' && styles.toggleOnCircle,
              ]}
              onPress={() => setShapeType('diamond')}>
              <Text style={styles.toggleText}>💎 Kim cương</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Export strokes */}
        <TouchableOpacity style={styles.toggleBtn} onPress={exportStrokes}>
          <Text style={styles.toggleText}>📤 Xuất</Text>
        </TouchableOpacity>
        {/* Save to file */}
        <TouchableOpacity style={styles.toggleBtn} onPress={saveStrokesToFile}>
          <Text style={styles.toggleText}>💾 Lưu file</Text>
        </TouchableOpacity>
        {/* Import strokes */}
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => {
            setImportText('');
            setImportModalVisible(true);
          }}>
          <Text style={styles.toggleText}>📥 Nhập</Text>
        </TouchableOpacity>
      </View>

      {/* Container chứa các button điều khiển vẽ (hiển thị khi có chế độ thao tác) */}
      {(drawMode || freeHandMode || shapeMode || moveMode || scaleMode) && (
        <View style={styles.controlsVert} pointerEvents="box-none">
          {/* Button hoàn tác (undo) */}
          <TouchableOpacity style={[styles.btn, styles.undo]} onPress={undo}>
            <Text style={styles.btnText}>↩️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.btn,
              positionHistory.length > 0 ||
              undoHistory.length > 0 ||
              circlePositionHistory.length > 0 ||
              circleUndoHistory.length > 0
                ? styles.redo
                : styles.redoDisabled,
            ]}
            onPress={redo}
            disabled={
              positionHistory.length === 0 &&
              undoHistory.length === 0 &&
              circlePositionHistory.length === 0 &&
              circleUndoHistory.length === 0
            }>
            <Text style={styles.btnText}>↪️</Text>
          </TouchableOpacity>
          {/* Button xóa (clear) */}
          <TouchableOpacity style={[styles.btn, styles.clear]} onPress={clear}>
            <Text style={styles.btnText}>🗑️</Text>
          </TouchableOpacity>
          {/* Button toggle chế độ xóa theo ý muốn */}
          <TouchableOpacity
            style={[
              styles.btn,
              deleteOneMode ? styles.deleteOneOn : styles.deleteOne,
            ]}
            onPress={toggleDeleteOneMode}>
            <Text style={styles.btnText}>❎</Text>
          </TouchableOpacity>
          {/* Button toggle chế độ di chuyển */}
          <TouchableOpacity
            // Style button với trạng thái active khi moveMode = true
            style={[styles.btn, moveMode ? styles.moveOn : styles.move]}
            // Xử lý sự kiện press để toggle chế độ di chuyển
            onPress={toggleMoveMode}>
            <Text style={styles.btnText}>↔️</Text>
          </TouchableOpacity>
          {/* Button toggle chế độ phóng to/thu nhỏ */}
          <TouchableOpacity
            // Style button với trạng thái active khi scaleMode = true
            style={[styles.btn, scaleMode ? styles.scaleOn : styles.scale]}
            // Xử lý sự kiện press để toggle chế độ phóng to/thu nhỏ
            onPress={toggleScaleMode}>
            <Text style={styles.btnText}>🔍</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bảng màu ở bên phải */}
      <View style={styles.colorPaletteRight}>
        <TouchableOpacity
          style={[styles.colorPaletteBtn, {backgroundColor: selectedColor}]}
          onPress={() => setShowColorPalette(true)}>
          <Text style={styles.colorPaletteText}>🎨</Text>
        </TouchableOpacity>
      </View>

      {/* Modal nhập strokes */}
      <Modal visible={importModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Dán dữ liệu nét vẽ (JSON)</Text>
            <View style={styles.modalBody}>
              <TextInput
                style={styles.modalInput}
                multiline
                scrollEnabled
                autoCorrect={false}
                autoCapitalize="none"
                placeholder="Dán JSON..."
                placeholderTextColor="#999"
                value={importText}
                onChangeText={setImportText}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setImportModalVisible(false)}>
                <Text style={styles.modalBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalOk]}
                onPress={importStrokes}>
                <Text style={styles.modalBtnText}>Nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Color Palette Modal */}
      <ColorPalette
        visible={showColorPalette}
        onClose={() => setShowColorPalette(false)}
        onColorSelect={setSelectedColor}
        selectedColor={selectedColor}
      />
    </View>
  );
};

// Định nghĩa styles cho tất cả component trong ứng dụng
const styles = StyleSheet.create({
  // Style cho container chính - chiếm toàn màn hình với nền đen
  container: {flex: 1, backgroundColor: '#000'},
  // Style cho WebView - chiếm toàn bộ container với z-index thấp
  web: {flex: 1, zIndex: 1},
  // Style cho overlay - phủ toàn màn hình với z-index cao
  overlay: {
    position: 'absolute', // Vị trí tuyệt đối
    top: 0, // Căn trên cùng
    left: 0, // Căn trái cùng
    right: 0, // Căn phải cùng
    bottom: 0, // Căn dưới cùng
    zIndex: 12, // Thứ tự hiển thị cao hơn WebView
  },
  // Style cho container button ở góc trên phải
  topButtons: {
    position: 'absolute', // Vị trí tuyệt đối
    top: 40, // Cách đỉnh màn hình 40px
    right: 20, // Cách phải màn hình 20px
    zIndex: 30, // Thứ tự hiển thị cao nhất
    flexDirection: 'column', // Sắp xếp các button theo chiều dọc
    gap: 10, // Khoảng cách giữa các button là 10px
  },
  // Style cơ bản cho button toggle (chế độ vẽ điểm và tự do)
  toggleBtn: {
    backgroundColor: 'rgba(0,0,0,0.75)', // Nền đen trong suốt 75%
    paddingHorizontal: 16, // Padding ngang 16px
    paddingVertical: 10, // Padding dọc 10px
    borderRadius: 20, // Bo góc 20px để tạo hình tròn
  },
  // Style khi button toggle đang được bật (active state)
  toggleOnDraw: {backgroundColor: '#FF9F0A'}, // Cam đậm khi bật "Vẽ"
  toggleOnFreehand: {backgroundColor: '#0A84FF'}, // Xanh dương khi bật "Vẽ tự do"
  toggleOnCircle: {backgroundColor: '#32D74B'},
  // Style cho text trong button toggle
  toggleText: {color: '#fff', fontWeight: '700', fontSize: 12}, // Chữ trắng, đậm, size 12
  // Style cho container button điều khiển vẽ ở bên trái màn hình
  controlsVert: {
    position: 'absolute', // Vị trí tuyệt đối
    left: 20, // Cách trái màn hình 20px
    top: '50%', // Căn giữa theo chiều dọc
    transform: [{translateY: -60}], // Dịch chuyển lên trên 60px để căn giữa chính xác
    zIndex: 20, // Thứ tự hiển thị cao hơn WebView
  },
  // Style cơ bản cho các button điều khiển (undo, clear, move)
  btn: {
    width: 56, // Chiều rộng 56px
    height: 56, // Chiều cao 56px
    borderRadius: 28, // Bo góc 28px để tạo hình tròn hoàn hảo
    alignItems: 'center', // Căn giữa nội dung theo chiều ngang
    justifyContent: 'center', // Căn giữa nội dung theo chiều dọc
    marginBottom: 12, // Khoảng cách dưới 12px giữa các button
  },
  // Style cho button hoàn tác (undo) - màu cam
  undo: {backgroundColor: 'rgba(255,159,10,0.95)'}, // Cam trong suốt 95%
  // Style cho button xóa (clear) - màu đỏ
  clear: {backgroundColor: 'rgba(255,59,48,0.95)'}, // Đỏ trong suốt 95%
  // Style cho button di chuyển (move) - màu tím
  move: {backgroundColor: 'rgba(88,86,214,0.95)'}, // Tím trong suốt 95%
  // Style cho button di chuyển khi đang bật (active state) - màu xanh lá nổi bật
  moveOn: {backgroundColor: '#34C759'},
  // Style cho button phóng to/thu nhỏ (scale) - màu xanh dương
  scale: {backgroundColor: 'rgba(10,132,255,0.95)'}, // Xanh dương trong suốt 95%
  // Style cho button phóng to/thu nhỏ khi đang bật (active state) - màu xanh lá nổi bật
  scaleOn: {backgroundColor: '#30D158'},
  // Style cho text trong các button điều khiển
  btnText: {color: '#fff', fontSize: 22, fontWeight: '700'}, // Chữ trắng, size 22, đậm
  // Style cho nút xóa theo ý muốn
  // Nút "Xóa theo ý": màu xám khi tắt, đỏ tươi khi bật để tương phản mạnh
  deleteOne: {backgroundColor: 'rgba(60,60,67,0.85)'},
  deleteOneOn: {backgroundColor: '#FF3B30'},
  // Style cho nút redo (bật/tắt)
  redo: {backgroundColor: 'rgba(255,159,10,0.95)'},
  redoDisabled: {backgroundColor: 'rgba(60,60,67,0.85)'},
  // Style cho selector loại hình
  shapeSelector: {gap: 8},
  // Modal styles
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '86%',
    maxHeight: '80%',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {color: '#fff', fontWeight: '700', marginBottom: 8},
  modalBody: {flexGrow: 1},
  modalInput: {
    minHeight: 160,
    maxHeight: 420,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  modalCancel: {backgroundColor: 'rgba(60,60,67,0.85)'},
  modalOk: {backgroundColor: '#0A84FF'},
  modalBtnText: {color: '#fff', fontWeight: '700'},

  // Styles cho bảng màu
  colorPalette: {backgroundColor: 'rgba(255,107,53,0.95)'}, // Cam trong suốt
  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // Styles cho bảng màu bên phải
  colorPaletteRight: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{translateY: -28}],
    zIndex: 25,
  },
  colorPaletteBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  colorPaletteText: {
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
});
