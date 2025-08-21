// ================================================================
// Bộ máy thống nhất cho các hình (Unified)
// - Gom API start/resize/finalize cho: circle (polyline thủ công) và
//   các hình SVG: star, arrow, heart, diamond (dùng SvgShapeHotspot)
// - Mục tiêu: một nơi tập trung để Simple360Painter gọi tới gọn gàng
// ================================================================

import type {RefObject} from 'react';
import type {WebView} from 'react-native-webview';
import {
  startSvgShape,
  resizeSvgShape,
  finalizeSvgPathShape,
} from './SvgShapeHotspot';

// ===== CÁC HÌNH MẪU =====

// Hình sao: path từ star.svg
const STAR_VIEWBOX = {width: 193, height: 182};
const STAR_PATH_D =
  'M118.588 69.5986L118.7 69.9434H190.542L132.715 111.958L132.421 112.172L132.533 112.517L154.62 180.496L96.7939 138.483L96.5 138.27L96.2061 138.483L38.3789 180.496L60.4668 112.517L60.5791 112.172L60.2852 111.958L2.45801 69.9434H74.2998L74.4121 69.5986L96.5 1.61719L118.588 69.5986Z';

// Hình mũi tên: path từ arrow.svg
const ARROW_VIEWBOX = {width: 234, height: 151};
const ARROW_PATH_D = 'M157.5 45H0.5V109H157.5V149.5L233 74L157.5 1.5V45Z';

// Hình heart: path từ heart.svg
const HEART_VIEWBOX = {width: 100, height: 100};
const HEART_PATH_D =
  'M50 15C50 15 35 5 20 15C5 25 5 45 20 55C35 65 50 85 50 85C50 85 65 65 80 55C95 45 95 25 80 15C65 5 50 15 50 15Z';
// ===== FUNCTIONS CHO HÌNH HEART =====

/** Bắt đầu preview trái tim tại vị trí (x,y) màn hình. */
export function startHeart(webRef: RefObject<WebView>, x: number, y: number) {
  startSvgShape(webRef, x, y, HEART_VIEWBOX, HEART_PATH_D, 'heart_temp');
}

/** Resize preview trái tim theo đường kính px. */
export function resizeHeart(webRef: RefObject<WebView>, diameterPx: number) {
  resizeSvgShape(webRef, HEART_VIEWBOX, HEART_PATH_D, diameterPx, 'heart_temp');
}

/** Finalize preview trái tim thành hotspot polyline cố định theo tên. */
export function finalizeHeart(webRef: RefObject<WebView>, name: string) {
  try {
    // Thử finalize bình thường trước
    finalizeSvgPathShape(
      webRef,
      name,
      HEART_VIEWBOX,
      HEART_PATH_D,
      'heart_temp',
    );
  } catch (error) {
    console.error(
      'Lỗi khi finalize heart với SVG path, sử dụng fallback:',
      error,
    );

    // Fallback: tạo hình trái tim đơn giản bằng polyline
    const safe = name.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const cmds = [
      `if(hotspot['heart_temp'], `,
      `  copy(__ca, hotspot['heart_temp'].ath);`,
      `  copy(__cv, hotspot['heart_temp'].atv);`,
      `  set(__d, get(hotspot['heart_temp'].width));`,
      '  set(__rpx, calc(__d * 0.5));',
      `  addhotspot('${safe}');`,
      `  set(hotspot['${safe}'].renderer, webgl);`,
      `  set(hotspot['${safe}'].polyline, true);`,
      `  set(hotspot['${safe}'].closepath, true);`,
      `  set(hotspot['${safe}'].fillalpha, 0);`,
      `  set(hotspot['${safe}'].borderwidth, 3);`,
      `  set(hotspot['${safe}'].bordercolor, 0xFF3B30);`,
      `  set(hotspot['${safe}'].zorder, 99998);`,
      `  set(hotspot['${safe}'].visible, true);`,
      '  spheretoscreen(get(__ca), get(__cv), __sx, __sy);',
      // Tạo hình trái tim đơn giản bằng các điểm cơ bản
      "  set(__dx, calc(-0.5 * __rpx)); set(__dy, calc(-0.4 * __rpx)); screentosphere(calc(__sx + __dx), calc(__sy + __dy), __ax, __av); set(hotspot['" +
        safe +
        "'].point[0].ath, get(__ax)); set(hotspot['" +
        safe +
        "'].point[0].atv, get(__av));",
      "  set(__dx, calc(-0.3 * __rpx)); set(__dy, calc(-0.5 * __rpx)); screentosphere(calc(__sx + __dx), calc(__sy + __dy), __ax, __av); set(hotspot['" +
        safe +
        "'].point[1].ath, get(__ax)); set(hotspot['" +
        safe +
        "'].point[1].atv, get(__av));",
      "  set(__dx, calc(0 * __rpx)); set(__dy, calc(-0.6 * __rpx)); screentosphere(calc(__sx + __dx), calc(__sy + __dy), __ax, __av); set(hotspot['" +
        safe +
        "'].point[2].ath, get(__ax)); set(hotspot['" +
        safe +
        "'].point[2].atv, get(__av));",
      "  set(__dx, calc(0.3 * __rpx)); set(__dy, calc(-0.5 * __rpx)); screentosphere(calc(__sx + __dx), calc(__sy + __dy), __ax, __av); set(hotspot['" +
        safe +
        "'].point[3].ath, get(__ax)); set(hotspot['" +
        safe +
        "'].point[3].atv, get(__av));",
      "  set(__dx, calc(0.5 * __rpx)); set(__dy, calc(-0.4 * __rpx)); screentosphere(calc(__sx + __dx), calc(__sy + __dy), __ax, __av); set(hotspot['" +
        safe +
        "'].point[4].ath, get(__ax)); set(hotspot['" +
        safe +
        "'].point[4].atv, get(__av));",
      "  set(__dx, calc(0.4 * __rpx)); set(__dy, calc(0 * __rpx)); screentosphere(calc(__sx + __dx), calc(__sy + __dy), __ax, __av); set(hotspot['" +
        safe +
        "'].point[5].ath, get(__ax)); set(hotspot['" +
        safe +
        "'].point[5].atv, get(__av));",
      "  set(__dx, calc(0.3 * __rpx)); set(__dy, calc(0.3 * __rpx)); screentosphere(calc(__sx + __dx), calc(__sy + __dy), __ax, __av); set(hotspot['" +
        safe +
        "'].point[6].ath, get(__ax)); set(hotspot['" +
        safe +
        "'].point[6].atv, get(__av));",
      "  set(__dx, calc(0 * __rpx)); set(__dy, calc(0.4 * __rpx)); screentosphere(calc(__sx + __dx), calc(__sy + __dy), __ax, __av); set(hotspot['" +
        safe +
        "'].point[7].ath, get(__ax)); set(hotspot['" +
        safe +
        "'].point[7].atv, get(__av));",
      "  set(__dx, calc(-0.3 * __rpx)); set(__dy, calc(0.3 * __rpx)); screentosphere(calc(__sx + __dx), calc(__sy + __dy), __ax, __av); set(hotspot['" +
        safe +
        "'].point[8].ath, get(__ax)); set(hotspot['" +
        safe +
        "'].point[8].atv, get(__av));",
      "  set(__dx, calc(-0.4 * __rpx)); set(__dy, calc(0 * __rpx)); screentosphere(calc(__sx + __dx), calc(__sy + __dy), __ax, __av); set(hotspot['" +
        safe +
        "'].point[9].ath, get(__ax)); set(hotspot['" +
        safe +
        "'].point[9].atv, get(__av));",
      "  set(__dx, calc(-0.5 * __rpx)); set(__dy, calc(-0.4 * __rpx)); screentosphere(calc(__sx + __dx), calc(__sy + __dy), __ax, __av); set(hotspot['" +
        safe +
        "'].point[10].ath, get(__ax)); set(hotspot['" +
        safe +
        "'].point[10].atv, get(__av));",
      `  set(hotspot['${safe}'].userdata.point_count, 11);`,
      `  removehotspot('heart_temp');`,
      ');',
    ].join(' ');

    sendKrpano(webRef, cmds);
  }
}

// Hình diamond: path từ diamond.svg
const DIAMOND_VIEWBOX = {width: 100, height: 100};
const DIAMOND_PATH_D = 'M50 10L90 50L50 90L10 50L50 10Z';
// ===== FUNCTIONS CHO HÌNH DIAMOND =====

/** Bắt đầu preview hình kim cương. */
export function startDiamond(webRef: RefObject<WebView>, x: number, y: number) {
  startSvgShape(webRef, x, y, DIAMOND_VIEWBOX, DIAMOND_PATH_D, 'diamond_temp');
}

/** Resize preview hình kim cương. */
export function resizeDiamond(webRef: RefObject<WebView>, diameterPx: number) {
  resizeSvgShape(
    webRef,
    DIAMOND_VIEWBOX,
    DIAMOND_PATH_D,
    diameterPx,
    'diamond_temp',
  );
}

/** Finalize preview kim cương thành hotspot polyline cố định. */
export function finalizeDiamond(webRef: RefObject<WebView>, name: string) {
  finalizeSvgPathShape(
    webRef,
    name,
    DIAMOND_VIEWBOX,
    DIAMOND_PATH_D,
    'diamond_temp',
  );
}
// ===== FUNCTIONS CHO HÌNH TRÒN =====

/** Bắt đầu preview circle (vẽ SVG vòng tròn). */
export function startCircle(webRef: RefObject<WebView>, x: number, y: number) {
  const initialD = 20;
  const url = makeCircleSvgData(initialD);
  const cmds = [
    `screentosphere(${x},${y},__ca,__cv);`,
    "if(hotspot['circle_temp'], removehotspot('circle_temp'); );",
    "addhotspot('circle_temp');",
    "set(hotspot['circle_temp'].renderer, webgl);",
    `set(hotspot['circle_temp'].url, '${url}');`,
    `set(hotspot['circle_temp'].width, ${initialD}); set(hotspot['circle_temp'].height, ${initialD});`,
    "set(hotspot['circle_temp'].ath, get(__ca));",
    "set(hotspot['circle_temp'].atv, get(__cv));",
    "set(hotspot['circle_temp'].zorder, 100000);",
  ].join(' ');
  sendKrpano(webRef, cmds);
}

/** Resize preview circle (cập nhật width/height và url SVG). */
export function resizeCircle(webRef: RefObject<WebView>, diameterPx: number) {
  const d = Math.max(2, Math.round(diameterPx));
  const url = makeCircleSvgData(d);
  const cmds = [
    "if(hotspot['circle_temp'], ",
    `  set(hotspot['circle_temp'].width, ${d}); set(hotspot['circle_temp'].height, ${d});`,
    `  set(hotspot['circle_temp'].url, '${url}');`,
    ');',
  ].join(' ');
  sendKrpano(webRef, cmds);
}

/** Finalize circle: mẫu vòng tròn thành polyline bằng cách lấy mẫu trên màn hình. */
export function finalizeCircle(webRef: RefObject<WebView>, name: string) {
  const safe = name.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const cmds = [
    "if(hotspot['circle_temp'], ",
    // Capture center (ath/atv) and pixel radius from the temporary SVG hotspot
    "  copy(__ca, hotspot['circle_temp'].ath);",
    "  copy(__cv, hotspot['circle_temp'].atv);",
    "  set(__d, get(hotspot['circle_temp'].width));",
    '  set(__rpx, calc(__d * 0.5));',
    // Decide number of segments based on pixel radius (min 24, max 180)
    '  set(__cn, calc(round(max(24, min(180, __rpx * 2)))));',
    // Create destination polyline hotspot (stroke-like)
    `  addhotspot('${safe}');`,
    `  set(hotspot['${safe}'].renderer, webgl);`,
    `  set(hotspot['${safe}'].polyline, true);`,
    `  set(hotspot['${safe}'].closepath, true);`,
    `  set(hotspot['${safe}'].fillalpha, 0);`,
    `  set(hotspot['${safe}'].borderwidth, 3);`,
    `  set(hotspot['${safe}'].bordercolor, 0xFF3B30);`,
    `  set(hotspot['${safe}'].zorder, 99998);`,
    // Sample circle in screen space (radians) and map back to sphere for stability
    '  spheretoscreen(get(__ca), get(__cv), __sx, __sy);',
    '  for(set(ii,0), ii LT __cn, inc(ii), ',
    '    set(__ang, calc(360 * ii / __cn));',
    '    set(__rad, calc(__ang / 57.29577951308232));',
    '    set(__dx, calc(__rpx * cos(__rad)));',
    '    set(__dy, calc(__rpx * sin(__rad)));',
    '    screentosphere(calc(__sx + __dx), calc(__sy + __dy), __ax, __av);',
    `    set(hotspot['${safe}'].point[get(ii)].ath, get(__ax));`,
    `    set(hotspot['${safe}'].point[get(ii)].atv, get(__av));`,
    '  );',
    // Close the path explicitly
    `  copy(hotspot['${safe}'].point[get(__cn)].ath, hotspot['${safe}'].point[0].ath);`,
    `  copy(hotspot['${safe}'].point[get(__cn)].atv, hotspot['${safe}'].point[0].atv);`,
    // Store point count including closing point
    `  set(hotspot['${safe}'].userdata.point_count, calc(__cn + 1));`,
    `  set(hotspot['${safe}'].visible, true);`,
    // Cleanup temp hotspot
    "  removehotspot('circle_temp');",
    ');',
  ].join(' ');
  sendKrpano(webRef, cmds);
}

// ===== FUNCTIONS CHO HÌNH SAO =====

/** Bắt đầu preview hình sao. */
export function startStar(webRef: RefObject<WebView>, x: number, y: number) {
  startSvgShape(webRef, x, y, STAR_VIEWBOX, STAR_PATH_D, 'star_temp');
}

/** Resize preview hình sao. */
export function resizeStar(webRef: RefObject<WebView>, diameterPx: number) {
  resizeSvgShape(webRef, STAR_VIEWBOX, STAR_PATH_D, diameterPx, 'star_temp');
}

/** Finalize preview hình sao thành hotspot polyline cố định. */
export function finalizeStar(webRef: RefObject<WebView>, name: string) {
  finalizeSvgPathShape(webRef, name, STAR_VIEWBOX, STAR_PATH_D, 'star_temp');
}

// ===== FUNCTIONS CHO HÌNH MŨI TÊN =====

/** Bắt đầu preview mũi tên. */
export function startArrow(webRef: RefObject<WebView>, x: number, y: number) {
  startSvgShape(webRef, x, y, ARROW_VIEWBOX, ARROW_PATH_D, 'arrow_temp');
}

/** Resize preview mũi tên. */
export function resizeArrow(webRef: RefObject<WebView>, diameterPx: number) {
  resizeSvgShape(webRef, ARROW_VIEWBOX, ARROW_PATH_D, diameterPx, 'arrow_temp');
}

/** Finalize preview mũi tên thành hotspot polyline cố định. */
export function finalizeArrow(webRef: RefObject<WebView>, name: string) {
  finalizeSvgPathShape(webRef, name, ARROW_VIEWBOX, ARROW_PATH_D, 'arrow_temp');
}

// ===== FUNCTIONS HỖ TRỢ CHO CIRCLE (từ CircleHotspot.ts) =====

import {sendKrpano} from './KrpanoBridge';

// Chuyển chuỗi SVG thành data URL dùng được trong krpano
function svgToDataUrl(svg: string): string {
  return (
    'data:image/svg+xml;utf8,' +
    svg
      .replace(/#/g, '%23')
      .replace(/\n/g, '')
      .replace(/\r/g, '')
      .replace(/\t/g, '')
  );
}

// Tạo SVG hình tròn theo đường kính để hiển thị sắc nét khi preview
function makeCircleSvgData(diameter: number): string {
  const d = Math.max(2, Math.round(diameter));
  const r = d / 2;
  const stroke = 2; // px
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}" viewBox="0 0 ${d} ${d}"><circle cx="${r}" cy="${r}" r="${
    r - stroke / 2
  }" fill="none" stroke="black" stroke-width="${stroke}"/></svg>`;
  return svgToDataUrl(svg);
}

// Vẽ lại hình tròn từ metadata đã lưu (trường hợp khôi phục)
/** Vẽ lại một circle từ metadata đã lưu (phục hồi sau reload). */
export function renderCircle(
  webRef: RefObject<WebView>,
  name: string,
  ath: number,
  atv: number,
  diameterPx: number,
) {
  const safe = name.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const d = Math.max(2, Math.round(diameterPx));
  const url = makeCircleSvgData(d);
  const cmds = [
    `addhotspot('${safe}');`,
    `set(hotspot['${safe}'].renderer, webgl);`,
    `set(hotspot['${safe}'].url, '${url}');`,
    `set(hotspot['${safe}'].ath, ${ath});`,
    `set(hotspot['${safe}'].atv, ${atv});`,
    `set(hotspot['${safe}'].width, ${d}); set(hotspot['${safe}'].height, ${d});`,
    `set(hotspot['${safe}'].zorder, 100000);`,
    `set(hotspot['${safe}'].userdata.diameter, ${d});`,
  ].join(' ');
  sendKrpano(webRef, cmds);
}

/** Xóa một circle đã tồn tại theo tên. */
export function removeCircle(webRef: RefObject<WebView>, name: string) {
  const safe = name.replace(/[^a-zA-Z0-9_\-]/g, '_');
  sendKrpano(webRef, `if(hotspot['${safe}'], removehotspot('${safe}'); );`);
}

/** Bật/tắt highlight cho circle (đổi màu/độ dày viền). */
export function setCircleSelected(
  webRef: RefObject<WebView>,
  name: string,
  selected: boolean,
) {
  const safe = name.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const color = selected ? '0x34C759' : '0x000000';
  const width = selected ? 3 : 1;
  const cmds = [
    `if(hotspot['${safe}'], `,
    `  set(hotspot['${safe}'].bordercolor, ${color}); set(hotspot['${safe}'].borderwidth, ${width});`,
    ');',
  ].join(' ');
  sendKrpano(webRef, cmds);
}

/** Di chuyển circle theo độ lệch 2 điểm màn hình. */
export function moveCircle(
  webRef: RefObject<WebView>,
  name: string,
  prevX: number,
  prevY: number,
  curX: number,
  curY: number,
) {
  const safe = name.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const cmds = [
    `screentosphere(${prevX},${prevY},a1,v1);`,
    `screentosphere(${curX},${curY},a2,v2);`,
    'set(da, calc(a2 - a1));',
    'set(dv, calc(v2 - v1));',
    `if(hotspot['${safe}'], `,
    `  set(hotspot['${safe}'].ath, calc(hotspot['${safe}'].ath + get(da)));`,
    `  set(hotspot['${safe}'].atv, calc(hotspot['${safe}'].atv + get(dv)));`,
    ');',
  ].join(' ');
  sendKrpano(webRef, cmds);
}
