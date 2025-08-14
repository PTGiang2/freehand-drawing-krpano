import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';
import { sendKrpano } from './KrpanoBridge';

export function startNewPointShape(webRef: RefObject<WebView>) {
  const cmds = [
    "if(!global.shape_no, set(global.shape_no,0));",
    "inc(global.shape_no);",
    "set(global.point_idx,0);",
    "addhotspot('shape_' + global.shape_no);",
    "set(hotspot['shape_' + global.shape_no].renderer, webgl);",
    "set(hotspot['shape_' + global.shape_no].fillalpha,0);",
    "set(hotspot['shape_' + global.shape_no].borderwidth,3);",
    "set(hotspot['shape_' + global.shape_no].bordercolor,0xFF3B30);"
  ].join(' ');
  sendKrpano(webRef, cmds);
}

export function tapPoint(webRef: RefObject<WebView>, x: number, y: number) {
  const cmds = [
    `screentosphere(${x},${y},da,dv);`,
    "if(!global.shape_no, set(global.shape_no,1));",
    // ensure current shape hotspot exists
    "if(!hotspot['shape_' + global.shape_no], addhotspot('shape_' + global.shape_no); set(hotspot['shape_' + global.shape_no].renderer, webgl); set(hotspot['shape_' + global.shape_no].fillalpha,0); set(hotspot['shape_' + global.shape_no].borderwidth,3); set(hotspot['shape_' + global.shape_no].bordercolor,0xFF3B30); );",
    "if(!global.point_idx, set(global.point_idx,0));",
    // dot for this shape and point
    "addhotspot('dot_' + global.shape_no + '_' + global.point_idx);",
    "set(hotspot['dot_' + global.shape_no + '_' + global.point_idx].renderer, css3d);",
    "set(hotspot['dot_' + global.shape_no + '_' + global.point_idx].zorder, 99999);",
    "set(hotspot['dot_' + global.shape_no + '_' + global.point_idx].ath, get(da));",
    "set(hotspot['dot_' + global.shape_no + '_' + global.point_idx].atv, get(dv));",
    // add point to current shape polyline
    "set(hotspot['shape_' + global.shape_no].point[get(global.point_idx)].ath, get(da));",
    "set(hotspot['shape_' + global.shape_no].point[get(global.point_idx)].atv, get(dv));",
    "inc(global.point_idx);"
  ].join(' ');
  sendKrpano(webRef, cmds);
}

export function undoPoint(webRef: RefObject<WebView>) {
  const cmds = [
    "if(global.point_idx GT 0, ",
    "  dec(global.point_idx); ",
    "  removehotspot('dot_' + global.shape_no + '_' + global.point_idx); ",
    "  if(hotspot['shape_' + global.shape_no], removehotspot('shape_' + global.shape_no); ); ",
    "  if(global.point_idx GT 0, addhotspot('shape_' + global.shape_no); set(hotspot['shape_' + global.shape_no].renderer, webgl); set(hotspot['shape_' + global.shape_no].fillalpha,0); set(hotspot['shape_' + global.shape_no].borderwidth,3); set(hotspot['shape_' + global.shape_no].bordercolor,0xFF3B30); ); ",
    "  for(set(ii,0), ii LT global.point_idx, inc(ii), ",
    "    set(hotspot['shape_' + global.shape_no].point[get(ii)].ath, hotspot['dot_' + global.shape_no + '_' + get(ii)].ath); ",
    "    set(hotspot['shape_' + global.shape_no].point[get(ii)].atv, hotspot['dot_' + global.shape_no + '_' + get(ii)].atv); ",
    "  ); ",
    ")" 
  ].join('');
  sendKrpano(webRef, cmds);
}

export function clearPoint(webRef: RefObject<WebView>) {
  const cmds = [
    // remove all shapes and dots of all shapes
    "for(set(s,1), s LT 200, inc(s), if(hotspot['shape_' + get(s)], removehotspot('shape_' + get(s)); ); ); ",
    "for(set(s,1), s LT 200, inc(s), for(set(i,0), i LT 1000, inc(i), if(hotspot['dot_' + get(s) + '_' + get(i)], removehotspot('dot_' + get(s) + '_' + get(i)); ); ); ); ",
    "set(global.shape_no, 0); ",
    "set(global.point_idx, 0);"
  ].join('');
  sendKrpano(webRef, cmds);
}

export function movePoint(webRef: RefObject<WebView>, prevX: number, prevY: number, curX: number, curY: number) {
  const cmds = [
    `screentosphere(${prevX},${prevY},a1,v1);`,
    `screentosphere(${curX},${curY},a2,v2);`,
    `set(da, calc(a2 - a1));`,
    `set(dv, calc(v2 - v1));`,
    // move all dots of all shapes
    "for(set(s,1), s LT 200, inc(s), ",
    "  for(set(jj,0), jj LT 1000, inc(jj), ",
    "    if(hotspot['dot_' + get(s) + '_' + get(jj)], ",
    "      set(hotspot['dot_' + get(s) + '_' + get(jj)].ath, calc(hotspot['dot_' + get(s) + '_' + get(jj)].ath + get(da))); ",
    "      set(hotspot['dot_' + get(s) + '_' + get(jj)].atv, calc(hotspot['dot_' + get(s) + '_' + get(jj)].atv + get(dv))); ",
    "    ); ",
    "  ); ",
    "); ",
    // rebuild each shape polyline from its dots
    "for(set(s2,1), s2 LT 200, inc(s2), ",
    "  if(hotspot['shape_' + get(s2)], removehotspot('shape_' + get(s2)); ); ",
    "  if(hotspot['dot_' + get(s2) + '_0'], addhotspot('shape_' + get(s2)); set(hotspot['shape_' + get(s2)].renderer, webgl); set(hotspot['shape_' + get(s2)].fillalpha,0); set(hotspot['shape_' + get(s2)].borderwidth,3); set(hotspot['shape_' + get(s2)].bordercolor,0xFF3B30); ); ",
    "  for(set(ii,0), ii LT 1000, inc(ii), ",
    "    if(hotspot['dot_' + get(s2) + '_' + get(ii)], ",
    "      set(hotspot['shape_' + get(s2)].point[get(ii)].ath, hotspot['dot_' + get(s2) + '_' + get(ii)].ath); ",
    "      set(hotspot['shape_' + get(s2)].point[get(ii)].atv, hotspot['dot_' + get(s2) + '_' + get(ii)].atv); ",
    "    ); ",
    "  ); ",
    ");"
  ].join(' ');
  sendKrpano(webRef, cmds);
}
