// Import React và hook useState để quản lý state của component
import React, {useState} from 'react';
// Import các component UI cơ bản từ React Native
import {
  View, // Component container chính để bọc các element khác
  TouchableOpacity, // Component button có thể touch được với hiệu ứng opacity
  Text, // Component hiển thị văn bản
  StyleSheet, // API để tạo styles cho component
  StatusBar, // Component để điều khiển thanh status bar của device
} from 'react-native';
// Import WebView để hiển thị nội dung web (krpano viewer) trong app
import {WebView} from 'react-native-webview';

// Import các hàm xử lý vẽ điểm từ module PointMode
import {
  tapPoint, // Tạo điểm mới khi tap
  undoPoint, // Hoàn tác điểm cuối cùng
  clearPoint, // Xóa tất cả điểm
  movePoint, // Di chuyển tất cả điểm
  setPointSelected, // Làm nổi bật/bỏ nổi bật shape điểm
} from './drawing/PointMode';

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
} from './drawing/FreehandMode';
import {postHotspotPoints, hitTestStrokes} from './drawing/KrpanoBridge';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Component chính Simple360Painter - ứng dụng vẽ 360 độ
export const Simple360Painter: React.FC = () => {
  // State quản lý chế độ vẽ điểm (true = đang bật, false = đang tắt)
  const [drawMode, setDrawMode] = useState<boolean>(false);
  // State quản lý chế độ vẽ tự do (true = đang bật, false = đang tắt)
  const [freeHandMode, setFreeHandMode] = useState<boolean>(false);
  // State quản lý chế độ di chuyển (true = đang bật, false = đang tắt)
  const [moveMode, setMoveMode] = useState<boolean>(false);

  // Ref tham chiếu đến WebView component để tương tác với krpano
  const webRef = React.useRef<WebView>(null);
  // Ref để theo dõi trạng thái đang vẽ tự do hay không
  const isDrawingRef = React.useRef<boolean>(false);
  // Theo dõi tên stroke đang chờ lưu
  const pendingStrokeNameRef = React.useRef<string | null>(null);
  // Bộ đếm sinh tên stroke duy nhất
  const strokeCounterRef = React.useRef<number>(0);
  // Danh sách các nét đã lưu
  const [savedStrokes, setSavedStrokes] = useState<
    {name: string; points: SpherePoint[]}[]
  >([]);
  // Lịch sử undo/redo để khôi phục các nét vẽ đã bị xóa
  const [undoHistory, setUndoHistory] = useState<
    {name: string; points: SpherePoint[]}[]
  >([]);
  // Lịch sử vị trí để khôi phục vị trí cũ khi redo
  const [positionHistory, setPositionHistory] = useState<
    {name: string; points: SpherePoint[]}[]
  >([]);
  // Tên stroke đang được chọn (mặc định chọn stroke cuối cùng)
  const selectedStrokeRef = React.useRef<string | null>(null);
  // Chế độ xóa theo ý muốn (chọn 1 nét để xóa)
  const [deleteOneMode, setDeleteOneMode] = useState<boolean>(false);
  // WebView đã sẵn sàng
  const [webReady, setWebReady] = useState<boolean>(false);

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
    tapPoint(webRef, x, y);
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
    startFreehand(webRef, x, y);
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
    finalizeFreehand(webRef, name);
    postHotspotPoints(webRef, name, 'freehand_points');
  };

  // Các hàm xử lý chế độ di chuyển (pan gesture)
  // Ref để lưu trữ vị trí touch cuối cùng để tính toán độ lệch
  const lastTouchRef = React.useRef<{x: number; y: number} | null>(null);

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
      const currentStroke = savedStrokes.find(s => s.name === selectedStrokeRef.current);
      if (currentStroke) {
        console.log('Lưu vị trí cũ của stroke:', currentStroke.name);
        setPositionHistory(prev => [...prev, {...currentStroke}]);
      }
    }
    
    // Hit-test để chọn stroke dưới ngón tay
    const names = savedStrokes.map(s => s.name);
    if (names.length) {
      hitTestStrokes(webRef, names, x, y, 50, 'hit_stroke');
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
    }
    // Cập nhật vị trí cuối cùng để sử dụng cho lần di chuyển tiếp theo
    lastTouchRef.current = cur;
  };

  // Hàm xử lý kết thúc di chuyển khi người dùng nhấc ngón tay
  const onMoveEnd = () => {
    // Reset vị trí touch cuối cùng về null
    // Nếu đang di chuyển một stroke, sau khi thả tay thì lưu lại điểm mới vào state + local
    if (moveMode && selectedStrokeRef.current) {
      const name = selectedStrokeRef.current;
      postHotspotPoints(webRef, name, 'stroke_points_update');
    }
    lastTouchRef.current = null;
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
      renderFreehandStroke(webRef, lastPosition.name, lastPosition.points);
      
      // Cập nhật stroke trong danh sách đã lưu
      const nextStrokes = savedStrokes.map(s => 
        s.name === lastPosition.name ? lastPosition : s
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
    
    // Nếu không có lịch sử vị trí thì khôi phục stroke đã bị xóa (logic cũ)
    if (undoHistory.length > 0) {
      console.log('Khôi phục stroke đã bị xóa');
      // Khôi phục tất cả stroke đã bị xóa
      undoHistory.forEach(stroke => {
        renderFreehandStroke(webRef, stroke.name, stroke.points);
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
    
    console.log('Không có gì để redo');
  };

  // Hàm xử lý xóa (clear) - xóa tất cả nét vẽ hiện tại
  const clear = async () => {
    // Nếu đang ở chế độ xóa theo ý muốn và có nét được chọn => xóa nét đó
    if (deleteOneMode && selectedStrokeRef.current) {
      const target = selectedStrokeRef.current;
      removeStroke(webRef, target);
      const next = savedStrokes.filter(s => s.name !== target);
      
      // Lưu stroke bị xóa vào lịch sử undo để có thể redo
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
    // KHÔNG reset lịch sử undo khi xóa toàn bộ - để có thể redo
    // Reset lịch sử vị trí khi xóa toàn bộ
    setPositionHistory([]);
    await AsyncStorage.removeItem('freehand_strokes').catch(() => {});
  };

  // Hàm chuyển đổi chế độ vẽ điểm (toggle)
  const toggleDrawMode = () => {
    // Đảo ngược trạng thái chế độ vẽ điểm (true ↔ false)
    setDrawMode(v => !v);
    // Tắt chế độ vẽ tự do khi bật chế độ vẽ điểm
    setFreeHandMode(false);
    // Tắt chế độ di chuyển khi bật chế độ vẽ điểm
    setMoveMode(false);
  };

  // Hàm chuyển đổi chế độ vẽ tự do (toggle)
  const toggleFreeHandMode = () => {
    // Đảo ngược trạng thái chế độ vẽ tự do (true ↔ false)
    setFreeHandMode(v => !v);
    // Tắt chế độ vẽ điểm khi bật chế độ vẽ tự do
    setDrawMode(false);
    // Tắt chế độ di chuyển khi bật chế độ vẽ tự do
    setMoveMode(false);
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
      // Tự động chọn stroke cuối cùng
      if (savedStrokes.length) {
        const last = savedStrokes[savedStrokes.length - 1].name;
        selectedStrokeRef.current = last;
        setStrokeSelected(webRef, last, true);
      }
    } else {
      // Tắt highlight khi tắt di chuyển
      if (selectedStrokeRef.current) {
        setStrokeSelected(webRef, selectedStrokeRef.current, false);
        selectedStrokeRef.current = null;
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
      renderFreehandStroke(webRef, s.name, s.points);
    });
  }, [webReady, savedStrokes]);

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
                const next = [...prev, {name: strokeName, points}];
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
            if (data && data.type === 'hit_stroke') {
              const name: string | null = data.name || null;
              if (name) {
                // Lưu vị trí cũ của stroke trước khi chọn để có thể redo
                if (selectedStrokeRef.current && selectedStrokeRef.current !== name) {
                  const currentStroke = savedStrokes.find(s => s.name === selectedStrokeRef.current);
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
        pointerEvents={drawMode || freeHandMode || moveMode ? 'none' : 'auto'}
      />

      {/* Overlay để bắt sự kiện tap khi ở chế độ vẽ điểm và không di chuyển */}
      {drawMode && !moveMode && (
        <TouchableOpacity
          // Style overlay phủ toàn màn hình
          style={styles.overlay}
          // Không có hiệu ứng opacity khi touch
          activeOpacity={1}
          // Xử lý sự kiện tap để tạo điểm
          onPress={handleTap}
        />
      )}

      {/* Overlay để bắt sự kiện vẽ tự do khi ở chế độ vẽ tự do và không di chuyển */}
      {freeHandMode && !moveMode && (
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
      </View>

      {/* Container chứa các button điều khiển vẽ (hiển thị khi có chế độ thao tác) */}
      {(drawMode || freeHandMode || moveMode) && (
        <View style={styles.controlsVert} pointerEvents="box-none">
          {/* Button hoàn tác (undo) */}
          <TouchableOpacity style={[styles.btn, styles.undo]} onPress={undo}>
            <Text style={styles.btnText}>↩️</Text>
          </TouchableOpacity>
          {/* Button làm lại (redo) */}
          <TouchableOpacity 
            style={[
              styles.btn, 
              (positionHistory.length > 0 || undoHistory.length > 0) ? styles.redo : styles.redoDisabled
            ]} 
            onPress={redo}
            disabled={positionHistory.length === 0 && undoHistory.length === 0}
          >
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
        </View>
      )}
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
  // Style cho text trong các button điều khiển
  btnText: {color: '#fff', fontSize: 22, fontWeight: '700'}, // Chữ trắng, size 22, đậm
  // Style cho nút xóa theo ý muốn
  // Nút "Xóa theo ý": màu xám khi tắt, đỏ tươi khi bật để tương phản mạnh
  deleteOne: {backgroundColor: 'rgba(60,60,67,0.85)'},
  deleteOneOn: {backgroundColor: '#FF3B30'},
  // Style cho button làm lại (redo) khi có lịch sử undo
  redo: {backgroundColor: 'rgba(255,159,10,0.95)'}, // Cam trong suốt 95%
  // Style cho button làm lại (redo) khi không có lịch sử undo
  redoDisabled: {backgroundColor: 'rgba(60,60,67,0.85)'}, // Xám trong suốt 85%
});
