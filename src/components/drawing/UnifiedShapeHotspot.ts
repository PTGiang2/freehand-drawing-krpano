// ================================================================
// Bộ máy thống nhất cho các hình (Unified)
// - Gom API start/resize/finalize cho: circle (polyline thủ công) và
//   các hình SVG: star, arrow, heart, diamond (dùng SvgShapeHotspot)
// - Mục tiêu: một nơi tập trung để Simple360Painter gọi tới gọn gàng
// ================================================================

import type {RefObject} from 'react';
import type {WebView} from 'react-native-webview';
import {startPathShape, resizePathShape, finalizePathShape} from './SvgShapeHotspot';

// ===== CÁC HÌNH MẪU =====

// Hình sao: path từ star.svg
const STAR_VIEWBOX = {width: 193, height: 182};
const STAR_PATH_D =
  'M118.588 69.5986L118.7 69.9434H190.542L132.715 111.958L132.421 112.172L132.533 112.517L154.62 180.496L96.7939 138.483L96.5 138.27L96.2061 138.483L38.3789 180.496L60.4668 112.517L60.5791 112.172L60.2852 111.958L2.45801 69.9434H74.2998L74.4121 69.5986L96.5 1.61719L118.588 69.5986Z';

// Hình mũi tên: path từ arrow.svg
const ARROW_VIEWBOX = {width: 234, height: 151};
const ARROW_PATH_D = 'M157.5 45H0.5V109H157.5V149.5L233 74L157.5 1.5V45Z';

// Hình heart: path từ heart.svg
export const HEART_VIEWBOX = {width: 100, height: 100};
export const HEART_PATH_D =
  'M50 15C50 15 35 5 20 15C5 25 5 45 20 55C35 65 50 85 50 85C50 85 65 65 80 55C95 45 95 25 80 15C65 5 50 15 50 15Z';

// Hình tròn: xấp xỉ bằng 4 đoạn Bezier để tương thích parser C/M/L/Z
export const CIRCLE_VIEWBOX = {width: 100, height: 100};
export const CIRCLE_PATH_D =
  'M50 0C77.614 0 100 22.386 100 50C100 77.614 77.614 100 50 100C22.386 100 0 77.614 0 50C0 22.386 22.386 0 50 0Z';
// ===== FUNCTIONS CHO HÌNH HEART =====

/** Bắt đầu preview trái tim tại vị trí (x,y) màn hình. */
export function startHeart(webRef: RefObject<WebView>, x: number, y: number) {
  startPathShape(webRef, x, y, HEART_PATH_D, 'heart_temp');
}

/** Resize preview trái tim theo đường kính px. */
export function resizeHeart(webRef: RefObject<WebView>, diameterPx: number) {
  resizePathShape(webRef, HEART_PATH_D, diameterPx, 'heart_temp');
}

/** Finalize preview trái tim thành hotspot polyline cố định theo tên. */
// finalizeHeart đã bị loại bỏ theo yêu cầu: dùng trực tiếp finalizeSvgPathShape bên ngoài

// Hình diamond: path từ diamond.svg
const DIAMOND_VIEWBOX = {width: 100, height: 100};
const DIAMOND_PATH_D = 'M50 10L90 50L50 90L10 50L50 10Z';
// ===== FUNCTIONS CHO HÌNH DIAMOND =====

/** Bắt đầu preview hình kim cương. */
export function startDiamond(webRef: RefObject<WebView>, x: number, y: number) {
  startPathShape(webRef, x, y, DIAMOND_PATH_D, 'diamond_temp');
}

/** Resize preview hình kim cương. */
export function resizeDiamond(webRef: RefObject<WebView>, diameterPx: number) {
  resizePathShape(webRef, DIAMOND_PATH_D, diameterPx, 'diamond_temp');
}

/** Finalize preview kim cương thành hotspot polyline cố định. */
export function finalizeDiamond(webRef: RefObject<WebView>, name: string, color: string = '0xFF3B30') {
  finalizePathShape(webRef, name, DIAMOND_PATH_D, 'diamond_temp', color);
}
// start/resize/finalize Circle đã bị loại bỏ theo yêu cầu: dùng CIRCLE_VIEWBOX/CIRCLE_PATH_D với API chung

// ===== FUNCTIONS CHO HÌNH SAO =====

/** Bắt đầu preview hình sao. */
export function startStar(webRef: RefObject<WebView>, x: number, y: number) {
  startPathShape(webRef, x, y, STAR_PATH_D, 'star_temp');
}

/** Resize preview hình sao. */
export function resizeStar(webRef: RefObject<WebView>, diameterPx: number) {
  resizePathShape(webRef, STAR_PATH_D, diameterPx, 'star_temp');
}

/** Finalize preview hình sao thành hotspot polyline cố định. */
export function finalizeStar(webRef: RefObject<WebView>, name: string, color: string = '0xFF3B30') {
  finalizePathShape(webRef, name, STAR_PATH_D, 'star_temp', color);
}

// ===== FUNCTIONS CHO HÌNH MŨI TÊN =====

/** Bắt đầu preview mũi tên. */
export function startArrow(webRef: RefObject<WebView>, x: number, y: number) {
  startPathShape(webRef, x, y, ARROW_PATH_D, 'arrow_temp');
}

/** Resize preview mũi tên. */
export function resizeArrow(webRef: RefObject<WebView>, diameterPx: number) {
  resizePathShape(webRef, ARROW_PATH_D, diameterPx, 'arrow_temp');
}

/** Finalize preview mũi tên thành hotspot polyline cố định. */
export function finalizeArrow(webRef: RefObject<WebView>, name: string, color: string = '0xFF3B30') {
  finalizePathShape(webRef, name, ARROW_PATH_D, 'arrow_temp', color);
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