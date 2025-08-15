import type {RefObject} from 'react';
import type {WebView} from 'react-native-webview';
import {sendKrpano} from './KrpanoBridge';

// Start a new freehand stroke as a single polyline hotspot
export function startFreehand(
  webRef: RefObject<WebView>,
  x: number,
  y: number,
) {
  const cmds = [
    `screentosphere(${x},${y},da,dv);`,
    // reset and create single polyline
    'set(global.freehand_idx, 0);',
    "if(hotspot['freehand_path'], removehotspot('freehand_path'); );",
    "addhotspot('freehand_path');",
    "set(hotspot['freehand_path'].renderer, webgl);",
    "set(hotspot['freehand_path'].polyline, true);",
    "set(hotspot['freehand_path'].closepath, false);",
    "set(hotspot['freehand_path'].fillalpha,0);",
    "set(hotspot['freehand_path'].borderwidth,3);",
    "set(hotspot['freehand_path'].bordercolor,0xFF3B30);",
    // first point
    "set(hotspot['freehand_path'].point[0].ath, get(da));",
    "set(hotspot['freehand_path'].point[0].atv, get(dv));",
    'set(global.freehand_idx, 1);',
  ].join(' ');
  sendKrpano(webRef, cmds);
}

// Append a point to the single polyline
export function moveFreehand(webRef: RefObject<WebView>, x: number, y: number) {
  const cmds = [
    `screentosphere(${x},${y},da,dv);`,
    "if(hotspot['freehand_path'], ",
    "  set(hotspot['freehand_path'].polyline, true); ",
    "  set(hotspot['freehand_path'].closepath, false); ",
    "  set(hotspot['freehand_path'].point[get(global.freehand_idx)].ath, get(da)); ",
    "  set(hotspot['freehand_path'].point[get(global.freehand_idx)].atv, get(dv)); ",
    '  inc(global.freehand_idx); ',
    ');',
  ].join(' ');
  sendKrpano(webRef, cmds);
}

// Move the whole polyline by pan delta
export function moveAllFreehand(
  webRef: RefObject<WebView>,
  prevX: number,
  prevY: number,
  curX: number,
  curY: number,
) {
  const cmds = [
    `screentosphere(${prevX},${prevY},a1,v1);`,
    `screentosphere(${curX},${curY},a2,v2);`,
    'set(da, calc(a2 - a1));',
    'set(dv, calc(v2 - v1));',
    "if(hotspot['freehand_path'] AND global.freehand_idx GT 0, ",
    '  for(set(ii,0), ii LT global.freehand_idx, inc(ii), ',
    "    set(hotspot['freehand_path'].point[get(ii)].ath, calc(hotspot['freehand_path'].point[get(ii)].ath + get(da))); ",
    "    set(hotspot['freehand_path'].point[get(ii)].atv, calc(hotspot['freehand_path'].point[get(ii)].atv + get(dv))); ",
    '  ); ',
    ');',
  ].join(' ');
  sendKrpano(webRef, cmds);
}

// For now, undo clears the whole stroke (simple and fast). Can be improved later to drop last point.
export function undoFreehand(webRef: RefObject<WebView>) {
  const cmds = [
    "if(hotspot['freehand_path'], removehotspot('freehand_path'); );",
    'set(global.freehand_idx, 0);',
  ].join(' ');
  sendKrpano(webRef, cmds);
}

export function clearFreehand(webRef: RefObject<WebView>) {
  const cmds = [
    "if(hotspot['freehand_path'], removehotspot('freehand_path'); );",
    'set(global.freehand_idx, 0);',
  ].join(' ');
  sendKrpano(webRef, cmds);
}

// Highlight or unhighlight the freehand stroke
export function setFreehandSelected(
  webRef: RefObject<WebView>,
  selected: boolean,
) {
  const color = selected ? '0x34C759' : '0xFF3B30';
  const width = selected ? 4 : 3;
  const cmds = [
    "if(hotspot['freehand_path'], ",
    `  set(hotspot['freehand_path'].bordercolor, ${color}); `,
    `  set(hotspot['freehand_path'].borderwidth, ${width}); `,
    ');',
  ].join('');
  sendKrpano(webRef, cmds);
}
