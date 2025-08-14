import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';

/**
 * Safe wrapper to call krpano commands inside a WebView.
 * Usage: sendKrpano(webRef, "addhotspot(hs)")
 */
export function sendKrpano(webRef: RefObject<WebView>, cmd: string): void {
  const js = `
    (function(){
      function getK(){
        try{ 
          return document.getElementById('krpanoSWFObject') || window.krpano || window.krpanoJS || window.krpanoInterface || (window.get && window.get('global') && window.get('global').krpano);
        }catch(e){ return null; }
      }
      var k = getK();
      if (k && k.call) {
        try { k.call(${JSON.stringify(cmd)}); } catch(e) {}
      }
    })();
    true;
  `;
  // Inject without throwing if ref missing
  try {
    // @ts-expect-error WebView type at runtime
    webRef?.current?.injectJavaScript?.(js);
  } catch {}
}
