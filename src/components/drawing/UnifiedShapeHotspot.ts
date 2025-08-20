// Bộ máy thống nhất: vẽ hình tròn, sao, mũi tên bằng SVG preview + polyline finalize

import type {RefObject} from 'react';
import type {WebView} from 'react-native-webview';
import {startSvgShape, resizeSvgShape, finalizeSvgPathShape} from './SvgShapeHotspot';

// ===== CÁC HÌNH MẪU =====



// Hình sao: path từ star.svg
const STAR_VIEWBOX = {width: 193, height: 182};
const STAR_PATH_D = "M118.588 69.5986L118.7 69.9434H190.542L132.715 111.958L132.421 112.172L132.533 112.517L154.62 180.496L96.7939 138.483L96.5 138.27L96.2061 138.483L38.3789 180.496L60.4668 112.517L60.5791 112.172L60.2852 111.958L2.45801 69.9434H74.2998L74.4121 69.5986L96.5 1.61719L118.588 69.5986Z";

// Hình mũi tên: path từ arrow.svg  
const ARROW_VIEWBOX = {width: 234, height: 151};
const ARROW_PATH_D = "M157.5 45H0.5V109H157.5V149.5L233 74L157.5 1.5V45Z";

// ===== FUNCTIONS CHO HÌNH TRÒN =====

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

export function startStar(webRef: RefObject<WebView>, x: number, y: number) {
  startSvgShape(webRef, x, y, STAR_VIEWBOX, STAR_PATH_D, 'star_temp');
}

export function resizeStar(webRef: RefObject<WebView>, diameterPx: number) {
  resizeSvgShape(webRef, STAR_VIEWBOX, STAR_PATH_D, diameterPx, 'star_temp');
}

export function finalizeStar(webRef: RefObject<WebView>, name: string) {
  finalizeSvgPathShape(webRef, name, STAR_VIEWBOX, STAR_PATH_D, 'star_temp');
}

// ===== FUNCTIONS CHO HÌNH MŨI TÊN =====

export function startArrow(webRef: RefObject<WebView>, x: number, y: number) {
  startSvgShape(webRef, x, y, ARROW_VIEWBOX, ARROW_PATH_D, 'arrow_temp');
}

export function resizeArrow(webRef: RefObject<WebView>, diameterPx: number) {
  resizeSvgShape(webRef, ARROW_VIEWBOX, ARROW_PATH_D, diameterPx, 'arrow_temp');
}

export function finalizeArrow(webRef: RefObject<WebView>, name: string) {
  finalizeSvgPathShape(webRef, name, ARROW_VIEWBOX, ARROW_PATH_D, 'arrow_temp');
}

// ===== FUNCTIONS HỖ TRỢ CHO CIRCLE (từ CircleHotspot.ts) =====

import {sendKrpano} from './KrpanoBridge';

// Chuyển chuỗi SVG thành data URL dùng được trong krpano
function svgToDataUrl(svg: string): string {
  return 'data:image/svg+xml;utf8,' + svg
    .replace(/#/g, '%23')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .replace(/\t/g, '');
}

// Tạo SVG hình tròn theo đường kính để hiển thị sắc nét khi preview
function makeCircleSvgData(diameter: number): string {
  const d = Math.max(2, Math.round(diameter));
  const r = d / 2;
  const stroke = 2; // px
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}" viewBox="0 0 ${d} ${d}"><circle cx="${r}" cy="${r}" r="${r - stroke/2}" fill="none" stroke="black" stroke-width="${stroke}"/></svg>`;
  return svgToDataUrl(svg);
}

// Vẽ lại hình tròn từ metadata đã lưu (trường hợp khôi phục)
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

export function removeCircle(webRef: RefObject<WebView>, name: string) {
  const safe = name.replace(/[^a-zA-Z0-9_\-]/g, '_');
  sendKrpano(webRef, `if(hotspot['${safe}'], removehotspot('${safe}'); );`);
}

export function setCircleSelected(webRef: RefObject<WebView>, name: string, selected: boolean) {
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
