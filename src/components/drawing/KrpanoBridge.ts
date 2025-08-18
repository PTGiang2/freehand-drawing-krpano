// Import kiểu RefObject từ React để tham chiếu đến WebView component
import type {RefObject} from 'react';
// Import kiểu WebView từ thư viện react-native-webview để tương tác với web content
import type {WebView} from 'react-native-webview';

// Hàm tiện ích để làm sạch và chuẩn hóa chuỗi lệnh krpano
function sanitize(cmd: string): string {
  // Thay thế tất cả khoảng trắng liên tiếp (bao gồm \n, \t, space) thành một khoảng trắng duy nhất
  const collapsed = cmd.replace(/\s+/g, ' ');
  // Loại bỏ khoảng trắng ở đầu và cuối chuỗi
  const trimmed = collapsed.trim();
  // Kiểm tra nếu chuỗi đã kết thúc bằng dấu chấm phẩy thì giữ nguyên, nếu không thì thêm vào
  return trimmed.endsWith(';') ? trimmed : trimmed + ';';
}

// Hàm chính để gửi lệnh krpano vào WebView
export function sendKrpano(webRef: RefObject<WebView>, cmd: string): void {
  // Kiểm tra nếu webRef hoặc webRef.current không tồn tại thì thoát sớm
  if (!webRef?.current) {
    return;
  }
  // Làm sạch và chuẩn hóa chuỗi lệnh trước khi gửi
  const safeCmd = sanitize(cmd);
  // Tạo chuỗi JavaScript phức tạp để tìm và gọi krpano interface
  const js = `try{var getK=function(){try{return document.getElementById('krpanoSWFObject')||window.krpano||window.krpanoJS||window.krpanoInterface||(window.get&&window.get('global')&&window.get('global').krpano)}catch(e){return null}};var k=getK();if(k&&k.call){try{k.call(${JSON.stringify(
    safeCmd, // Chuỗi lệnh krpano đã được làm sạch
  )})}catch(e){}}}catch(e){}; true;`;
  // Thử thực thi JavaScript trong WebView
  try {
    // Gọi phương thức injectJavaScript để chạy code JavaScript trong WebView
    webRef.current.injectJavaScript(js);
  } catch (_) {
    // Nếu có lỗi thì bỏ qua (no operation) - không làm gì cả
    /* noop */
  }
}

// Gửi danh sách điểm (ath/atv) của một hotspot về React Native thông qua postMessage
export function postHotspotPoints(
  webRef: RefObject<WebView>,
  hotspotName: string,
  messageType: string,
): void {
  if (!webRef?.current) {
    return;
  }
  const safeHotspot = String(hotspotName);
  const safeType = String(messageType);
  const js = `try{var getK=function(){try{return document.getElementById('krpanoSWFObject')||window.krpano||window.krpanoJS||window.krpanoInterface||(window.get&&window.get('global')&&window.get('global').krpano)}catch(e){return null}};var k=getK();if(!k){throw new Error('krpano not ready')}var points=[];var i=0;for(;;){var ath=k.get("hotspot['${safeHotspot}'].point["+i+"].ath");var atv=k.get("hotspot['${safeHotspot}'].point["+i+"].atv");if(typeof ath==='undefined'||typeof atv==='undefined'||ath===null||atv===null){break}points.push({ath:Number(ath),atv:Number(atv)});i++}if(window&&window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){window.ReactNativeWebView.postMessage(JSON.stringify({type:'${safeType}', name:'${safeHotspot}', points:points}))}}catch(e){}; true;`;
  try {
    webRef.current.injectJavaScript(js);
  } catch (_) {
    /* noop */
  }
}

// Hit-test: chọn hotspot (stroke) gần vị trí màn hình (x,y) nhất trong bán kính cho trước
export function hitTestStrokes(
  webRef: RefObject<WebView>,
  strokeNames: string[],
  x: number,
  y: number,
  radiusPx: number,
  messageType: string,
): void {
  if (!webRef?.current) {
    return;
  }
  const namesJson = JSON.stringify(strokeNames.map(n => String(n)));
  const js = `try{var getK=function(){try{return document.getElementById('krpanoSWFObject')||window.krpano||window.krpanoJS||window.krpanoInterface||(window.get&&window.get('global')&&window.get('global').krpano)}catch(e){return null}};var k=getK();if(!k){throw new Error('krpano not ready')}
var names=${namesJson};
var rx=${Number(radiusPx) || 20};
var px=${Number(x) || 0}, py=${Number(y) || 0};
function distPointToSeg(x,y,x1,y1,x2,y2){var A=x-x1,B=y-y1,C=x2-x1,D=y2-y1;var dot=A*C+B*D;var len=C*C+D*D;var t=len>0?Math.max(0,Math.min(1,dot/len)):0;var xx=x1+t*C;var yy=y1+t*D;var dx=x-xx,dy=y-yy;return Math.sqrt(dx*dx+dy*dy)}
var best=null;var bestd=1e15;
for(var ni=0;ni<names.length;ni++){var n=names[ni];try{if(!k.get("hotspot['"+n+"']")){continue}var i=0;var prev=null;for(;;){var ath=k.get("hotspot['"+n+"'].point["+i+"].ath");var atv=k.get("hotspot['"+n+"'].point["+i+"].atv");if(ath===undefined||atv===undefined||ath===null||atv===null){break}k.call('spheretoscreen('+ath+','+atv+',__hx,__hy)');var sx=Number(k.get('__hx'));var sy=Number(k.get('__hy'));if(isFinite(sx)&&isFinite(sy)){if(prev){var d=distPointToSeg(px,py,prev.x,prev.y,sx,sy);if(d<bestd){bestd=d;best=n}}prev={x:sx,y:sy}}i++}}
catch(e){}}
var name=(bestd<=rx)?best:null;
if(window&&window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){window.ReactNativeWebView.postMessage(JSON.stringify({type:'${messageType}', name:name, distance:bestd}))}
}catch(e){}; true;`;
  try {
    webRef.current.injectJavaScript(js);
  } catch (_) {
    /* noop */
  }
}
