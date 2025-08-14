import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';
import { sendKrpano } from './KrpanoBridge';

export function tapPoint(webRef: RefObject<WebView>, x: number, y: number) {
  const cmds = [
    `screentosphere(${x},${y},da,dv);`,
    "if(!global.painter_idx, set(global.painter_idx,0));",
    "addhotspot('rn_dot_' + global.painter_idx);",
    "set(hotspot['rn_dot_' + global.painter_idx].renderer, css3d);",
    "set(hotspot['rn_dot_' + global.painter_idx].zorder, 99999);",
    "set(hotspot['rn_dot_' + global.painter_idx].ath, get(da));",
    "set(hotspot['rn_dot_' + global.painter_idx].atv, get(dv));",
    "if(!hotspot['painter_shape'], addhotspot('painter_shape'); set(hotspot['painter_shape'].renderer, webgl); set(hotspot['painter_shape'].fillalpha,0); set(hotspot['painter_shape'].borderwidth,3); set(hotspot['painter_shape'].bordercolor,0xFF3B30); set(hotspot['painter_shape'].closed,false); set(hotspot['painter_shape'].close,false); );",
    "set(hotspot['painter_shape'].point[get(global.painter_idx)].ath, get(da));",
    "set(hotspot['painter_shape'].point[get(global.painter_idx)].atv, get(dv));",
    "inc(global.painter_idx);"
  ].join(' ');
  sendKrpano(webRef, cmds);
}

export function undoPoint(webRef: RefObject<WebView>) {
  const cmds = [
    "if(global.painter_idx GT 0, ",
    "  dec(global.painter_idx); ",
    "  removehotspot('rn_dot_' + global.painter_idx); ",
    "  if(hotspot['painter_shape'], removehotspot('painter_shape'); ); ",
    "  if(global.painter_idx GT 0, addhotspot('painter_shape'); set(hotspot['painter_shape'].renderer, webgl); set(hotspot['painter_shape'].fillalpha,0); set(hotspot['painter_shape'].borderwidth,3); set(hotspot['painter_shape'].bordercolor,0xFF3B30); set(hotspot['painter_shape'].closed,false); set(hotspot['painter_shape'].close,false); ); ",
    "  for(set(ii,0), ii LT global.painter_idx, inc(ii), ",
    "    set(hotspot['painter_shape'].point[get(ii)].ath, hotspot['rn_dot_' + get(ii)].ath); ",
    "    set(hotspot['painter_shape'].point[get(ii)].atv, hotspot['rn_dot_' + get(ii)].atv); ",
    "  ); ",
    ")" 
  ].join('');
  sendKrpano(webRef, cmds);
}

export function clearPoint(webRef: RefObject<WebView>) {
  const cmds = [
    "if(hotspot['painter_shape'], removehotspot('painter_shape'); ); ",
    "if(global.painter_idx, for(set(i,0), i LT global.painter_idx, inc(i), if(hotspot['rn_dot_' + get(i)], removehotspot('rn_dot_' + get(i)); ); ); ); ",
    "set(global.painter_idx, 0);"
  ].join(' ');
  sendKrpano(webRef, cmds);
}

export function movePoint(webRef: RefObject<WebView>, prevX: number, prevY: number, curX: number, curY: number) {
  const cmds = [
    `screentosphere(${prevX},${prevY},a1,v1);`,
    `screentosphere(${curX},${curY},a2,v2);`,
    `set(da, calc(a2 - a1));`,
    `set(dv, calc(v2 - v1));`,
    "if(global.painter_idx GT 0, ",
    "  if(hotspot['painter_shape'], ",
    "    for(set(ii,0), ii LT global.painter_idx, inc(ii), ",
    "      set(hotspot['painter_shape'].point[get(ii)].ath, calc(hotspot['painter_shape'].point[get(ii)].ath + get(da))); ",
    "      set(hotspot['painter_shape'].point[get(ii)].atv, calc(hotspot['painter_shape'].point[get(ii)].atv + get(dv))); ",
    "    ); ",
    "  ); ",
    "  for(set(jj,0), jj LT global.painter_idx, inc(jj), ",
    "    if(hotspot['rn_dot_' + get(jj)], ",
    "      set(hotspot['rn_dot_' + get(jj)].ath, calc(hotspot['rn_dot_' + get(jj)].ath + get(da))); ",
    "      set(hotspot['rn_dot_' + get(jj)].atv, calc(hotspot['rn_dot_' + get(jj)].atv + get(dv))); ",
    "    ); ",
    "  ); ",
    ") ;"
  ].join(' ');
  sendKrpano(webRef, cmds);
}
