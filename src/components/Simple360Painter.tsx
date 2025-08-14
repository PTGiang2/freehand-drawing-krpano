import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { sendKrpano } from './drawing/KrpanoBridge';
import { tapPoint, undoPoint, clearPoint, movePoint, startNewPointShape } from './drawing/PointMode';
import { startFreehand, moveFreehand, undoFreehand, clearFreehand, moveAllFreehand } from './drawing/FreehandMode';

const DOT_HTML = "<div style='width:18px;height:18px;background:#FF3B30;border-radius:9px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.45)'></div>";

export const Simple360Painter: React.FC = () => {
  const [drawMode, setDrawMode] = useState<boolean>(false);
  const [freeHandMode, setFreeHandMode] = useState<boolean>(false);
  const [moveMode, setMoveMode] = useState<boolean>(false);
  const webRef = React.useRef<WebView>(null);
  const isDrawingRef = React.useRef<boolean>(false);
  const lineIndexRef = React.useRef<number>(0);

  const handleTap = (e: any) => {
    if (!drawMode) return;
    const x = Math.round(e.nativeEvent.locationX);
    const y = Math.round(e.nativeEvent.locationY);
    tapPoint(webRef, x, y);
  };

  const onNewShape = () => {
    startNewPointShape(webRef);
  };

  // Free hand drawing handlers
  const handleFreeHandStart = (e: any) => {
    if (!freeHandMode) return;
    isDrawingRef.current = true;
    const x = Math.round(e.nativeEvent.locationX);
    const y = Math.round(e.nativeEvent.locationY);
    startFreehand(webRef, x, y);
  };

  const handleFreeHandMove = (e: any) => {
    if (!freeHandMode || !isDrawingRef.current) return;
    const x = Math.round(e.nativeEvent.locationX);
    const y = Math.round(e.nativeEvent.locationY);
    moveFreehand(webRef, x, y, lineIndexRef.current);
    lineIndexRef.current++;
  };

  const handleFreeHandEnd = () => {
    isDrawingRef.current = false;
  };

  // Move mode gestures
  const lastTouchRef = React.useRef<{ x: number; y: number } | null>(null);
  const onMoveStart = (e: any) => {
    if (!moveMode) return;
    lastTouchRef.current = {
      x: Math.round(e.nativeEvent.locationX),
      y: Math.round(e.nativeEvent.locationY),
    };
  };

  const onMove = (e: any) => {
    if (!moveMode || !lastTouchRef.current) return;
    const prev = lastTouchRef.current;
    const cur = {
      x: Math.round(e.nativeEvent.locationX),
      y: Math.round(e.nativeEvent.locationY),
    };
    if (prev.x === cur.x && prev.y === cur.y) return;

    movePoint(webRef, prev.x, prev.y, cur.x, cur.y);
    moveAllFreehand(webRef, prev.x, prev.y, cur.x, cur.y);
    lastTouchRef.current = cur;
  };

  const onMoveEnd = () => {
    lastTouchRef.current = null;
  };

  const undo = () => {
    if (freeHandMode) {
      undoFreehand(webRef, lineIndexRef.current - 1);
      if (lineIndexRef.current > 0) lineIndexRef.current--;
    } else {
      undoPoint(webRef);
    }
  };

  const clear = () => {
    clearPoint(webRef);
    clearFreehand(webRef);
    lineIndexRef.current = 0;
  };

  const toggleDrawMode = () => {
    setDrawMode(v => !v);
    setFreeHandMode(false);
    setMoveMode(false);
  };

  const toggleFreeHandMode = () => {
    setFreeHandMode(v => !v);
    setDrawMode(false);
    setMoveMode(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <WebView 
        ref={webRef}
        source={{ uri: 'https://krpano.com/tours/paris/' }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        pointerEvents={drawMode || freeHandMode || moveMode ? 'none' : 'auto'}
      />

      {drawMode && (
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleTap} />
      )}

      {freeHandMode && (
        <View
          style={styles.overlay}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleFreeHandStart}
          onResponderMove={handleFreeHandMove}
          onResponderRelease={handleFreeHandEnd}
          onResponderTerminate={handleFreeHandEnd}
        />
      )}

      {moveMode && (
        <View
          style={styles.overlay}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={onMoveStart}
          onResponderMove={onMove}
          onResponderRelease={onMoveEnd}
          onResponderTerminate={onMoveEnd}
        />
      )}

      <View style={styles.topButtons} pointerEvents="box-none">
        <TouchableOpacity 
          style={[styles.toggleBtn, drawMode && styles.toggleOn]} 
          onPress={toggleDrawMode}
        >
          <Text style={styles.toggleText}>{drawMode ? '✏️ Đang vẽ' : '✏️ Vẽ'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.toggleBtn, freeHandMode && styles.toggleOn]} 
          onPress={toggleFreeHandMode}
        >
          <Text style={styles.toggleText}>{freeHandMode ? '🖌️ Đang vẽ tự do' : '🖌️ Vẽ tự do'}</Text>
        </TouchableOpacity>

        {drawMode && (
          <TouchableOpacity 
            style={[styles.toggleBtn, { backgroundColor: '#34C759' }]}
            onPress={onNewShape}
          >
            <Text style={styles.toggleText}>➕ Tạo hình mới</Text>
          </TouchableOpacity>
        )}
      </View>

      {(drawMode || freeHandMode) && (
        <View style={styles.controlsVert} pointerEvents="box-none">
          <TouchableOpacity style={[styles.btn, styles.undo]} onPress={undo}>
            <Text style={styles.btnText}>↩️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.clear]} onPress={clear}>
            <Text style={styles.btnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      )}

      {!drawMode && !freeHandMode && (
        <View style={styles.controlsVert} pointerEvents="box-none">
          <TouchableOpacity style={[styles.btn, moveMode ? styles.moveOn : styles.move]} onPress={() => { setMoveMode(v => !v); if (!moveMode) { setDrawMode(false); setFreeHandMode(false); } }}>
            <Text style={styles.btnText}>↔️</Text>
          </TouchableOpacity>
          {moveMode && (
            <TouchableOpacity style={[styles.btn, styles.clear]} onPress={clear}>
              <Text style={styles.btnText}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  web: { flex: 1, zIndex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 12 },
  topButtons: {
    position: 'absolute', 
    top: 40, 
    right: 20, 
    zIndex: 30,
    flexDirection: 'column',
    gap: 10,
  },
  toggleBtn: {
    backgroundColor: 'rgba(0,0,0,0.75)', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20,
  },
  toggleOn: { backgroundColor: '#007AFF' },
  toggleText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  controlsVert: {
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: [{ translateY: -60 }],
    zIndex: 20,
  },
  btn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  undo: { backgroundColor: 'rgba(255,159,10,0.95)' },
  clear: { backgroundColor: 'rgba(255,59,48,0.95)' },
  move: { backgroundColor: 'rgba(88,86,214,0.95)' },
  moveOn: { backgroundColor: '#34C759' },
  btnText: { color: '#fff', fontSize: 22, fontWeight: '700' },
});
