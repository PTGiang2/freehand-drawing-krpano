// ================================================================
// Cầu nối (bridge) giữa React Native và krpano trong WebView
// - Cung cấp các hàm tiện ích để gửi lệnh (call) vào krpano
// - Lấy thông tin hotspot (điểm, polyline) và postMessage về RN
// - Thực hiện hit-test để chọn hotspot theo vị trí màn hình
// Toàn bộ comment bằng tiếng Việt để dễ bảo trì nội bộ
// ================================================================

// Import kiểu RefObject từ React để tham chiếu tới WebView
import type {RefObject} from 'react';
// Import kiểu WebView từ thư viện react-native-webview để tương tác với nội dung web
import type {WebView} from 'react-native-webview';

// Hàm tiện ích: làm sạch/chuẩn hoá chuỗi lệnh krpano trước khi inject
function sanitize(cmd: string): string {
  // Thay thế tất cả khoảng trắng liên tiếp (bao gồm \n, \t, space) thành một khoảng trắng duy nhất
  const collapsed = cmd.replace(/\s+/g, ' ');
  // Loại bỏ khoảng trắng ở đầu và cuối chuỗi
  const trimmed = collapsed.trim();
  // Kiểm tra nếu chuỗi đã kết thúc bằng dấu chấm phẩy thì giữ nguyên, nếu không thì thêm vào
  return trimmed.endsWith(';') ? trimmed : trimmed + ';';
}

/**
 * Gửi chuỗi lệnh krpano (k.call("...")) vào WebView an toàn.
 * - Tự động chuẩn hoá lệnh và bọc try/catch để tránh crash.
 * @param webRef Tham chiếu WebView đang chứa krpano
 * @param cmd Chuỗi lệnh krpano (các set/copy/call...) nối bằng dấu chấm phẩy
 */
export function sendKrpano(webRef: RefObject<WebView>, cmd: string): void {
  // Nếu chưa có tham chiếu WebView thì bỏ qua
  if (!webRef?.current) {
    return;
  }
  // Chuẩn hoá chuỗi lệnh trước khi gửi
  const safeCmd = sanitize(cmd);
  // Tạo đoạn JS để tìm và gọi interface krpano trong trang
  const js = `try{var getK=function(){try{return document.getElementById('krpanoSWFObject')||window.krpano||window.krpanoJS||window.krpanoInterface||(window.get&&window.get('global')&&window.get('global').krpano)}catch(e){return null}};var k=getK();if(k&&k.call){try{k.call(${JSON.stringify(
    safeCmd, // Chuỗi lệnh krpano đã được làm sạch
  )})}catch(e){}}}catch(e){}; true;`;
  // Thực thi JavaScript trong WebView
  try {
    // Gọi injectJavaScript để chạy đoạn JS ở trên trong WebView
    webRef.current.injectJavaScript(js);
  } catch (_) {
    // Nếu lỗi thì bỏ qua
    /* noop */
  }
}

/**
 * Yêu cầu krpano gửi về danh sách điểm (ath/atv) của một hotspot polyline.
 * - Dữ liệu trả về qua window.ReactNativeWebView.postMessage(JSON)
 * @param webRef WebView ref
 * @param hotspotName Tên hotspot (stroke) cần lấy các điểm
 * @param messageType Chuỗi type để phân biệt case xử lý ở RN (ví dụ 'stroke_points_update')
 */
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

/**
 * Yêu cầu krpano gửi về thuộc tính cơ bản của một hotspot không phải polyline
 * (ath, atv, width, height) – dùng cho circle/SVG preview.
 * @param webRef WebView ref
 * @param hotspotName Tên hotspot
 * @param messageType Chuỗi type để phân biệt khi nhận message ở RN
 */
export function postHotspotProps(
  webRef: RefObject<WebView>,
  hotspotName: string,
  messageType: string,
): void {
  if (!webRef?.current) {
    return;
  }
  const safeHotspot = String(hotspotName);
  const safeType = String(messageType);
  const js = `try{var getK=function(){try{return document.getElementById('krpanoSWFObject')||window.krpano||window.krpanoJS||window.krpanoInterface||(window.get&&window.get('global')&&window.get('global').krpano)}catch(e){return null}};var k=getK();if(!k){throw new Error('krpano not ready')}if(!k.get("hotspot['${safeHotspot}']")){throw new Error('no hotspot')}var ath=Number(k.get("hotspot['${safeHotspot}'].ath"));var atv=Number(k.get("hotspot['${safeHotspot}'].atv"));var w=Number(k.get("hotspot['${safeHotspot}'].width"));var h=Number(k.get("hotspot['${safeHotspot}'].height"));var ca=k.get("hotspot['${safeHotspot}'].userdata.center_ath");var cv=k.get("hotspot['${safeHotspot}'].userdata.center_atv");var rd=k.get("hotspot['${safeHotspot}'].userdata.radius_deg");var payload={type:'${safeType}', name:'${safeHotspot}', ath:ath, atv:atv, width:w, height:h};if(typeof ca!=='undefined'&&ca!==null){payload.centerAth=Number(ca)};if(typeof cv!=='undefined'&&cv!==null){payload.centerAtv=Number(cv)};if(typeof rd!=='undefined'&&rd!==null){payload.radiusDeg=Number(rd)};if(window&&window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){window.ReactNativeWebView.postMessage(JSON.stringify(payload))}}catch(e){}; true;`;
  try {
    webRef.current.injectJavaScript(js);
  } catch (_) {
    /* noop */
  }
}

/**
 * Hit-test các stroke (polyline) theo tọa độ màn hình.
 * - Tính khoảng cách ngắn nhất từ điểm (x,y) đến các đoạn của mỗi stroke.
 * - Trả về tên stroke gần nhất trong bán kính cho trước qua postMessage.
 * @param webRef WebView ref
 * @param strokeNames Danh sách tên stroke cần kiểm tra
 * @param x Tọa độ X màn hình
 * @param y Tọa độ Y màn hình
 * @param radiusPx Bán kính chọn (px)
 * @param messageType Type trả về (ví dụ 'hit_stroke' hoặc 'select_stroke_for_scale')
 */
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

/**
 * Hit-test circle theo khoảng cách biên trong không gian màn hình.
 * - Tính chênh lệch giữa khoảng cách đến tâm và bán kính (từ width/height).
 * - Trả về tên circle phù hợp trong bán kính dung sai.
 */
export function hitTestCircles(
  webRef: RefObject<WebView>,
  circleNames: string[],
  x: number,
  y: number,
  radiusPx: number,
  messageType: string,
): void {
  if (!webRef?.current) {
    return;
  }
  const namesJson = JSON.stringify(circleNames.map(n => String(n)));
  const js = `try{var getK=function(){try{return document.getElementById('krpanoSWFObject')||window.krpano||window.krpanoJS||window.krpanoInterface||(window.get&&window.get('global')&&window.get('global').krpano)}catch(e){return null}};var k=getK();if(!k){throw new Error('krpano not ready')}var names=${namesJson};var rx=${
    Number(radiusPx) || 20
  };var px=${Number(x) || 0},py=${
    Number(y) || 0
  };var best=null;var bestd=1e15;for(var i=0;i<names.length;i++){var n=names[i];try{if(!k.get("hotspot['"+n+"']")){continue}var w=Number(k.get("hotspot['"+n+"'].width"));var h=Number(k.get("hotspot['"+n+"'].height"));var cx=Number(k.get("hotspot['"+n+"'].ath"));var cy=Number(k.get("hotspot['"+n+"'].atv"));k.call('spheretoscreen('+cx+','+cy+',__cx,__cy)');var sx=Number(k.get('__cx'));var sy=Number(k.get('__cy'));var r=isFinite(w)?w/2:16;var dx=px-sx, dy=py-sy;var ed=Math.abs(Math.sqrt(dx*dx+dy*dy)-r); if(ed<bestd){bestd=ed;best=n}}catch(e){}}var name=(bestd<=rx)?best:null; if(window&&window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){window.ReactNativeWebView.postMessage(JSON.stringify({type:'${messageType}', name:name, distance:bestd}))}}catch(e){}; true;`;
  try {
    webRef.current.injectJavaScript(js);
  } catch (_) {
    /* noop */
  }
}

/**
 * Gửi yêu cầu post điểm (ath/atv) sau một khoảng delay nhỏ.
 * - Tránh race condition khi hotspot vừa được tạo.
 */
export function postHotspotPointsDelayed(
  webRef: RefObject<WebView>,
  hotspotName: string,
  messageType: string,
  delayMs: number = 20,
): void {
  if (!webRef?.current) {
    return;
  }
  const safeHotspot = String(hotspotName);
  const safeType = String(messageType);
  const delay = Math.max(0, Math.floor(delayMs));
  const js = `try{setTimeout(function(){try{var getK=function(){try{return document.getElementById('krpanoSWFObject')||window.krpano||window.krpanoJS||window.krpanoInterface||(window.get&&window.get('global')&&window.get('global').krpano)}catch(e){return null}};var k=getK();if(!k){return}var points=[];var i=0;for(;;){var ath=k.get("hotspot['${safeHotspot}'].point["+i+"].ath");var atv=k.get("hotspot['${safeHotspot}'].point["+i+"].atv");if(typeof ath==='undefined'||typeof atv==='undefined'||ath===null||atv===null){break}points.push({ath:Number(ath),atv:Number(atv)});i++}if(window&&window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){window.ReactNativeWebView.postMessage(JSON.stringify({type:'${safeType}', name:'${safeHotspot}', points:points}))}}catch(e){}}, ${delay});}catch(e){}; true;`;
  try {
    webRef.current.injectJavaScript(js);
  } catch (_) {
    /* noop */
  }
}
