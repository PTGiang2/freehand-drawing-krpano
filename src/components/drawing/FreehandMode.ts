import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';
import { sendKrpano } from './KrpanoBridge';

export function startFreehand(webRef: RefObject<WebView>, x: number, y: number) {
  const cmds = [
    // clear old freehand set before starting
    "for(set(i,0), i LT 10000, inc(i), if(hotspot['freehand_line_' + get(i)], removehotspot('freehand_line_' + get(i)); ); );",
    `screentosphere(${x},${y},da,dv);`,
    "set(global.freehand_line_count, 0);",
    "set(global.freehand_ath, get(da));",
    "set(global.freehand_atv, get(dv));"
  ].join(' ');
  sendKrpano(webRef, cmds);
}

export function moveFreehand(webRef: RefObject<WebView>, x: number, y: number, idx: number) {
  const cmds = [
    `screentosphere(${x},${y},da,dv);`,
    `addhotspot('freehand_line_${idx}');`,
    `set(hotspot['freehand_line_${idx}'].renderer, webgl);`,
    `set(hotspot['freehand_line_${idx}'].zorder, 99998);`,
    `set(hotspot['freehand_line_${idx}'].fillalpha,0);`,
    `set(hotspot['freehand_line_${idx}'].borderwidth,3);`,
    `set(hotspot['freehand_line_${idx}'].bordercolor,0xFF3B30);`,
    `set(hotspot['freehand_line_${idx}'].point[0].ath, get(global.freehand_ath));`,
    `set(hotspot['freehand_line_${idx}'].point[0].atv, get(global.freehand_atv));`,
    `set(hotspot['freehand_line_${idx}'].point[1].ath, get(da));`,
    `set(hotspot['freehand_line_${idx}'].point[1].atv, get(dv));`,
    "set(global.freehand_ath, get(da));",
    "set(global.freehand_atv, get(dv));",
    "inc(global.freehand_line_count);"
  ].join(' ');
  sendKrpano(webRef, cmds);
}

export function moveAllFreehand(webRef: RefObject<WebView>, prevX: number, prevY: number, curX: number, curY: number) {
  const cmds = [
    `screentosphere(${prevX},${prevY},a1,v1);`,
    `screentosphere(${curX},${curY},a2,v2);`,
    `set(da, calc(a2 - a1));`,
    `set(dv, calc(v2 - v1));`,
    // Iterate through a safe upper bound to move all, independent of counters
    "for(set(ff,0), ff LT 10000, inc(ff), ",
    "  if(hotspot['freehand_line_' + get(ff)], ",
    "    set(hotspot['freehand_line_' + get(ff)].point[0].ath, calc(hotspot['freehand_line_' + get(ff)].point[0].ath + get(da))); ",
    "    set(hotspot['freehand_line_' + get(ff)].point[0].atv, calc(hotspot['freehand_line_' + get(ff)].point[0].atv + get(dv))); ",
    "    set(hotspot['freehand_line_' + get(ff)].point[1].ath, calc(hotspot['freehand_line_' + get(ff)].point[1].ath + get(da))); ",
    "    set(hotspot['freehand_line_' + get(ff)].point[1].atv, calc(hotspot['freehand_line_' + get(ff)].point[1].atv + get(dv))); ",
    "  ); ",
    ");"
  ].join(' ');
  sendKrpano(webRef, cmds);
}

export function undoFreehand(webRef: RefObject<WebView>, idx: number) {
  const cmds = [
    `if(hotspot['freehand_line_${idx}'], removehotspot('freehand_line_${idx}'); );`,
    `if(global.freehand_line_count GT 0, dec(global.freehand_line_count); );`
  ].join(' ');
  sendKrpano(webRef, cmds);
}

export function clearFreehand(webRef: RefObject<WebView>) {
  const cmds = [
    // While-loop deletion ensures everything is removed immediately
    "set(ii,0);",
    "while(hotspot['freehand_line_' + get(ii)], removehotspot('freehand_line_' + get(ii)); inc(ii); );",
    "set(global.freehand_line_count, 0);",
    "set(global.freehand_ath, 0);",
    "set(global.freehand_atv, 0);"
  ].join(' ');
  sendKrpano(webRef, cmds);
}
