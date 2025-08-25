// ================================================================
// Bộ máy chung cho hotpot SVG-path
// - Xem trước SVG (preview) bằng cách render URL data:image/svg+xml
// - Chuyển path SVG (2D) thành danh sách điểm trên mặt cầu để tạo polyline
// - Hỗ trợ start/resize/finalize cho các hình SVG như sao, mũi tên, trái tim...
// ================================================================

import type {RefObject} from 'react';
import type {WebView} from 'react-native-webview';
import {sendKrpano} from './KrpanoBridge';

type ViewBox = {width: number; height: number};
type Pt = {x: number; y: number};

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

/**
 * Tạo data URL SVG cho preview một path với kích thước đường kính cho trước.
 */
export function makeSvgDataFromPath(
  viewBox: ViewBox,
  pathD: string,
  diameter: number,
): string {
  const d = Math.max(8, Math.round(diameter));
  const {width: vw, height: vh} = viewBox;
  const svg = `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${d}\" height=\"${d}\" viewBox=\"0 0 ${vw} ${vh}\"><path d=\"${pathD}\" fill=\"none\" stroke=\"black\"/></svg>`;
  return svgToDataUrl(svg);
}

// Parser cải tiến hỗ trợ M/L/H/V/Z/C và số tuyệt đối
/**
 * Parser đơn giản path SVG -> danh sách điểm 2D (Pt{x,y}).
 * Hỗ trợ các lệnh M/L/H/V/Z/C phổ biến. Với C (cubic), nội suy thêm các điểm.
 */
export function parseSvgPathToPoints(d: string): Pt[] {
  const pts: Pt[] = [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  const len = d.length;

  const skipWS = () => {
    while (i < len && /[\s,]/.test(d[i])) i++;
  };

  const readNumber = (): number => {
    skipWS();
    const start = i;
    while (i < len && /[-+0-9.eE]/.test(d[i])) i++;
    const num = Number(d.slice(start, i));
    return isNaN(num) ? 0 : num;
  };

  // Hàm tạo điểm từ Bezier curve (đơn giản hóa)
  const sampleBezierCurve = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x: number,
    y: number,
    steps: number = 5,
  ) => {
    const points: Pt[] = [];
    for (let t = 0; t <= 1; t += 1 / steps) {
      const t2 = t * t;
      const t3 = t2 * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;

      const px = mt3 * cx + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x;
      const py = mt3 * cy + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y;

      points.push({x: px, y: py});
    }
    return points;
  };

  try {
    while (i < len) {
      const ch = d[i];
      if (/[MLHVZC]/i.test(ch)) {
        cmd = ch.toUpperCase();
        i++;
        continue;
      }

      if (cmd === 'M' || cmd === 'L') {
        const x = readNumber();
        const y = readNumber();
        if (!isNaN(x) && !isNaN(y)) {
          cx = x;
          cy = y;
          pts.push({x, y});
        }
        continue;
      }

      if (cmd === 'H') {
        const x = readNumber();
        if (!isNaN(x)) {
          cx = x;
          pts.push({x, y: cy});
        }
        continue;
      }

      if (cmd === 'V') {
        const y = readNumber();
        if (!isNaN(y)) {
          cy = y;
          pts.push({x: cx, y});
        }
        continue;
      }

      if (cmd === 'C') {
        // Cubic Bezier curve: C x1 y1 x2 y2 x y
        const x1 = readNumber();
        const y1 = readNumber();
        const x2 = readNumber();
        const y2 = readNumber();
        const x = readNumber();
        const y = readNumber();

        if (
          !isNaN(x1) &&
          !isNaN(y1) &&
          !isNaN(x2) &&
          !isNaN(y2) &&
          !isNaN(x) &&
          !isNaN(y)
        ) {
          // Tạo các điểm mẫu từ Bezier curve
          const bezierPoints = sampleBezierCurve(x1, y1, x2, y2, x, y);
          pts.push(...bezierPoints);
          cx = x;
          cy = y;
        }
        continue;
      }

      if (cmd === 'Z') {
        // Đóng path bằng cách nối về điểm đầu
        if (pts.length > 0) {
          pts.push({x: pts[0].x, y: pts[0].y});
        }
        break;
      }

      i++;
    }
  } catch (error) {
    console.error('Lỗi khi parse SVG path:', error);
    return pts;
  }

  return pts;
}

/** Bắt đầu preview một shape SVG tạm tại vị trí x,y (màn hình). */
function startSvgShape(
  webRef: RefObject<WebView>,
  x: number,
  y: number,
  viewBox: ViewBox,
  pathD: string,
  tempName: string = 'shape_temp',
) {
  const initialD = 40;
  const url = makeSvgDataFromPath(viewBox, pathD, initialD);
  const cmds = [
    `screentosphere(${x},${y},__sa,__sv);`,
    `if(hotspot['${tempName}'], removehotspot('${tempName}'); );`,
    `addhotspot('${tempName}');`,
    `set(hotspot['${tempName}'].renderer, webgl);`,
    `set(hotspot['${tempName}'].url, '${url}');`,
    `set(hotspot['${tempName}'].width, ${initialD}); set(hotspot['${tempName}'].height, ${initialD});`,
    `set(hotspot['${tempName}'].ath, get(__sa));`,
    `set(hotspot['${tempName}'].atv, get(__sv));`,
    `set(hotspot['${tempName}'].zorder, 100000);`,
  ].join(' ');
  sendKrpano(webRef, cmds);
}

/** Cập nhật kích thước preview shape SVG tạm theo đường kính px. */
function resizeSvgShape(
  webRef: RefObject<WebView>,
  viewBox: ViewBox,
  pathD: string,
  diameterPx: number,
  tempName: string = 'shape_temp',
) {
  const d = Math.max(8, Math.round(diameterPx));
  const url = makeSvgDataFromPath(viewBox, pathD, d);
  const cmds = [
    `if(hotspot['${tempName}'], `,
    `  set(hotspot['${tempName}'].width, ${d}); set(hotspot['${tempName}'].height, ${d});`,
    `  set(hotspot['${tempName}'].url, '${url}');`,
    ');',
  ].join(' ');
  sendKrpano(webRef, cmds);
}

/**
 * Chuyển preview shape SVG tạm thành hotspot polyline cố định.
 * - Parse d -> points, map về sphere theo viewBox và đường kính thực tế.
 */
function finalizeSvgPathShape(
  webRef: RefObject<WebView>,
  name: string,
  viewBox: ViewBox,
  pathD: string,
  tempName: string = 'shape_temp',
  color: string = '0xFF3B30',
) {
  try {
    console.log(
      `Finalizing SVG shape: ${name}, pathD: ${pathD}, viewBox:`,
      viewBox,
    );

    const safe = name.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const pts = parseSvgPathToPoints(pathD);

    // Kiểm tra pts có tồn tại và có đủ điểm không
    if (!pts || !Array.isArray(pts)) {
      console.error(`Không thể parse SVG path: ${pathD}`);
      return;
    }

    console.log(`Parsed ${pts.length} points:`, pts);

    if (pts.length < 3) {
      console.error(`Không đủ điểm để tạo polyline: ${pts.length}`);
      return;
    }

    const cx = viewBox.width / 2;
    const cy = viewBox.height / 2;
    const rx = viewBox.width / 2;
    const ry = viewBox.height / 2;

    const cmdsForPts = pts
      .map((p, i) => {
        const nx = (p.x - cx) / rx;
        const ny = (p.y - cy) / ry;
        return `set(__dx, calc(${nx} * __rpx)); set(__dy, calc(${ny} * __rpx)); screentosphere(calc(__sx + __dx), calc(__sy + __dy), __ax, __av); set(hotspot['${safe}'].point[${i}].ath, get(__ax)); set(hotspot['${safe}'].point[${i}].atv, get(__av));`;
      })
      .join(' ');

    const cmds = [
      `if(hotspot['${tempName}'], `,
      `  copy(__ca, hotspot['${tempName}'].ath);`,
      `  copy(__cv, hotspot['${tempName}'].atv);`,
      `  set(__d, get(hotspot['${tempName}'].width));`,
      '  set(__rpx, calc(__d * 0.5));',
      `  addhotspot('${safe}');`,
      `  set(hotspot['${safe}'].renderer, webgl);`,
      `  set(hotspot['${safe}'].polyline, true);`,
      `  set(hotspot['${safe}'].closepath, true);`,
      `  set(hotspot['${safe}'].fillalpha, 0);`,
      `  set(hotspot['${safe}'].borderwidth, 3);`,
      `  set(hotspot['${safe}'].bordercolor, ${color});`,
      `  set(hotspot['${safe}'].zorder, 99998);`,
      `  set(hotspot['${safe}'].visible, true);`,
      '  spheretoscreen(get(__ca), get(__cv), __sx, __sy);',
      cmdsForPts,
      `  set(hotspot['${safe}'].point[${
        pts.length - 1
      }].ath, get(__ax)); set(hotspot['${safe}'].point[${
        pts.length - 1
      }].atv, get(__av));`,
      `  set(hotspot['${safe}'].userdata.point_count, ${pts.length});`,
      `  removehotspot('${tempName}');`,
      ');',
    ].join(' ');

    console.log(`Sending commands for ${name}:`, cmds);
    sendKrpano(webRef, cmds);
  } catch (error) {
    console.error(`Lỗi khi finalize SVG shape ${name}:`, error);
    // Fallback: tạo một hotspot đơn giản
    const safe = name.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const fallbackCmds = [
      `if(hotspot['${tempName}'], `,
      `  copy(__ca, hotspot['${tempName}'].ath);`,
      `  copy(__cv, hotspot['${tempName}'].atv);`,
      `  addhotspot('${safe}');`,
      `  set(hotspot['${safe}'].renderer, webgl);`,
      `  set(hotspot['${safe}'].polyline, true);`,
      `  set(hotspot['${safe}'].closepath, true);`,
      `  set(hotspot['${safe}'].fillalpha, 0);`,
      `  set(hotspot['${safe}'].borderwidth, 3);`,
      `  set(hotspot['${safe}'].bordercolor, ${color});`,
      `  set(hotspot['${safe}'].zorder, 99998);`,
      `  set(hotspot['${safe}'].visible, true);`,
      `  set(hotspot['${safe}'].point[0].ath, get(__ca)); set(hotspot['${safe}'].point[0].atv, get(__cv));`,
      `  set(hotspot['${safe}'].point[1].ath, get(__ca)); set(hotspot['${safe}'].point[1].atv, get(__cv));`,
      `  set(hotspot['${safe}'].point[2].ath, get(__ca)); set(hotspot['${safe}'].point[2].atv, get(__cv));`,
      `  set(hotspot['${safe}'].userdata.point_count, 3);`,
      `  removehotspot('${tempName}');`,
      ');',
    ].join(' ');

    sendKrpano(webRef, fallbackCmds);
  }
}

// ===== WRAPPERS: ONLY pathD (assume normalized to 0..100 viewBox) =====

const DEFAULT_VIEWBOX: ViewBox = {width: 100, height: 100};

/** Start a temporary SVG path hotspot at screen x,y using only pathD (normalized to 0..100). */
export function startPathShape(
  webRef: RefObject<WebView>,
  x: number,
  y: number,
  pathD: string,
  tempName: string = 'shape_temp',
) {
  startSvgShape(webRef, x, y, DEFAULT_VIEWBOX, pathD, tempName);
}

/** Resize a temporary SVG path hotspot using only pathD (normalized). */
export function resizePathShape(
  webRef: RefObject<WebView>,
  pathD: string,
  diameterPx: number,
  tempName: string = 'shape_temp',
) {
  resizeSvgShape(webRef, DEFAULT_VIEWBOX, pathD, diameterPx, tempName);
}

/** Finalize a temporary SVG path hotspot into a polyline using only pathD (normalized). */
export function finalizePathShape(
  webRef: RefObject<WebView>,
  name: string,
  pathD: string,
  tempName: string = 'shape_temp',
  color: string = '0xFF3B30',
) {
  finalizeSvgPathShape(webRef, name, DEFAULT_VIEWBOX, pathD, tempName, color);
}
