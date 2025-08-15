import type {RefObject} from 'react';
import type {WebView} from 'react-native-webview';

function sanitize(cmd: string): string {
  const collapsed = cmd.replace(/\s+/g, ' ').trim();
  return collapsed.endsWith(';') ? collapsed : collapsed + ';';
}

export function sendKrpano(webRef: RefObject<WebView>, cmd: string): void {
  if (!webRef?.current) {
    return;
  }
  const safeCmd = sanitize(cmd);
  const js = `try{var getK=function(){try{return document.getElementById('krpanoSWFObject')||window.krpano||window.krpanoJS||window.krpanoInterface||(window.get&&window.get('global')&&window.get('global').krpano)}catch(e){return null}};var k=getK();if(k&&k.call){try{k.call(${JSON.stringify(
    safeCmd,
  )})}catch(e){}}}catch(e){}; true;`;
  try {
    webRef.current.injectJavaScript(js);
  } catch (_) {
    /* noop */
  }
}
