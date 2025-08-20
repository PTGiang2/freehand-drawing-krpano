// Bộ máy chung: xem trước SVG và chuyển path SVG (2D) -> danh sách điểm trên mặt cầu (lon/lat)

import type {RefObject} from 'react';
import type {WebView} from 'react-native-webview';
import {sendKrpano} from './KrpanoBridge';

type ViewBox = {width: number; height: number};
type Pt = {x: number; y: number};

function svgToDataUrl(svg: string): string {
  return 'data:image/svg+xml;utf8,' + svg
    .replace(/#/g, '%23')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .replace(/\t/g, '');
}

export function makeSvgDataFromPath(viewBox: ViewBox, pathD: string, diameter: number): string {
  const d = Math.max(8, Math.round(diameter));
  const {width: vw, height: vh} = viewBox;
  const svg = `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${d}\" height=\"${d}\" viewBox=\"0 0 ${vw} ${vh}\"><path d=\"${pathD}\" fill=\"none\" stroke=\"black\"/></svg>`;
  return svgToDataUrl(svg);
}

// Parser đơn giản hỗ trợ M/L/H/V/Z và số tuyệt đối; có thể mở rộng sau
export function parseSvgPathToPoints(d: string): Pt[] {
  const pts: Pt[] = [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  const len = d.length;
  const skipWS = () => { while (i < len && /[\s,]/.test(d[i])) i++; };
  const readNumber = (): number => {
    skipWS();
    const start = i;
    while (i < len && /[-+0-9.eE]/.test(d[i])) i++;
    return Number(d.slice(start, i));
  };
  while (i < len) {
    const ch = d[i];
    if (/[MLHVZ]/i.test(ch)) { cmd = ch; i++; continue; }
    if (cmd === 'M' || cmd === 'L') {
      const x = readNumber();
      const y = readNumber();
      cx = x; cy = y; pts.push({x, y});
      continue;
    }
    if (cmd === 'H') { const x = readNumber(); cx = x; pts.push({x, y: cy}); continue; }
    if (cmd === 'V') { const y = readNumber(); cy = y; pts.push({x: cx, y}); continue; }
    if (cmd === 'Z' || cmd === 'z') { break; }
    i++;
  }
  return pts;
}

export function startSvgShape(
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

export function resizeSvgShape(
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

export function finalizeSvgPathShape(
  webRef: RefObject<WebView>,
  name: string,
  viewBox: ViewBox,
  pathD: string,
  tempName: string = 'shape_temp',
) {
  const safe = name.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const pts = parseSvgPathToPoints(pathD);
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
    `  set(hotspot['${safe}'].bordercolor, 0xFF3B30);`,
    `  set(hotspot['${safe}'].zorder, 99998);`,
    `  set(hotspot['${safe}'].visible, true);`,
    '  spheretoscreen(get(__ca), get(__cv), __sx, __sy);',
    cmdsForPts,
    `  set(hotspot['${safe}'].userdata.point_count, ${pts.length});`,
    `  removehotspot('${tempName}');`,
    ');',
  ].join(' ');
  sendKrpano(webRef, cmds);
}


