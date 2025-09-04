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

/**
 * Xoá các hotspot ở gần một điểm màn hình (chế độ tẩy).
 * - Dựng toạ độ màn hình từ (ath,atv) rồi đo khoảng cách 2D.
 * - Xoá theo từng hotspot nhỏ (ví dụ: rn_dot_*, painter_pair_*),
 *   đồng thời hỗ trợ cả stroke/circle đã lưu qua danh sách tên.
 */
export function eraseAtScreenPoint(
  webRef: RefObject<WebView>,
  x: number,
  y: number,
  radiusPx: number,
  strokeNames: string[],
  circleNames: string[],
): void {
  if (!webRef?.current) {
    return;
  }
  const namesJson = JSON.stringify((strokeNames || []).map(n => String(n)));
  const circlesJson = JSON.stringify((circleNames || []).map(n => String(n)));
  const js = `try{var getK=function(){try{return document.getElementById('krpanoSWFObject')||window.krpano||window.krpanoJS||window.krpanoInterface||(window.get&&window.get('global')&&window.get('global').krpano)}catch(e){return null}};var k=getK();if(!k){throw new Error('krpano not ready')}
var px=${Number(x)||0}, py=${Number(y)||0};
var rx=${Number(radiusPx)||20};
function distPointToSeg(x,y,x1,y1,x2,y2){var A=x-x1,B=y-y1,C=x2-x1,D=y2-y1;var dot=A*C+B*D;var len=C*C+D*D;var t=len>0?Math.max(0,Math.min(1,dot/len)):0;var xx=x1+t*C;var yy=y1+t*D;var dx=x-xx,dy=y-yy;return Math.sqrt(dx*dx+dy*dy)}
var deletedPairs=[];var deletedDots=[];var deletedShape=false;var deletedStrokes=[];var deletedCircles=[];
var i=0,j=0,ni=0,ci=0;var n='';var dn='';var cn='';
var ax,ay,bx,by,cx,cy,w;var sx,sy,sx1,sy1,sx2,sy2;var psx=0,psy=0;var havePrev=false;var best,bestd,minD;var ii=0;var d,dd,edge,dx,dy;var r;

// 1) Xoá các đoạn nối painter_pair_*
var pcount=Number(k.get('global.painter_idx'));if(isFinite(pcount)&&pcount>1){for(i=0;i<pcount-1;i++){n='painter_pair_'+i;if(k.get("hotspot['"+n+"']")){ax=k.get("hotspot['"+n+"'].point[0].ath");ay=k.get("hotspot['"+n+"'].point[0].atv");bx=k.get("hotspot['"+n+"'].point[1].ath");by=k.get("hotspot['"+n+"'].point[1].atv");if(ax!=null&&ay!=null&&bx!=null&&by!=null){k.call('spheretoscreen('+ax+','+ay+',__a1x,__a1y)');k.call('spheretoscreen('+bx+','+by+',__b1x,__b1y)');sx1=Number(k.get('__a1x'));sy1=Number(k.get('__a1y'));sx2=Number(k.get('__b1x'));sy2=Number(k.get('__b1y'));d=distPointToSeg(px,py,sx1,sy1,sx2,sy2);if(d<=rx){k.call("removehotspot('"+n+"')");deletedPairs.push(n);}}}}}

// 2) Xoá các chấm rn_dot_*
var dcount=Number(k.get('global.painter_idx'));if(isFinite(dcount)&&dcount>0){for(j=0;j<dcount;j++){dn='rn_dot_'+j;if(k.get("hotspot['"+dn+"']")){cx=Number(k.get("hotspot['"+dn+"'].ath"));cy=Number(k.get("hotspot['"+dn+"'].atv"));k.call('spheretoscreen('+cx+','+cy+',__dx,__dy)');sx=Number(k.get('__dx'));sy=Number(k.get('__dy'));dx=px-sx;dy=py-sy;dd=Math.sqrt(dx*dx+dy*dy);if(dd<=rx){k.call("removehotspot('"+dn+"')");deletedDots.push(dn);}}}}

// 3) Xoá polygon painter_shape nếu gần
if(k.get("hotspot['painter_shape']")){minD=1e15;ii=0;havePrev=false;psx=0;psy=0;for(;;){ax=k.get("hotspot['painter_shape'].point["+ii+"].ath");ay=k.get("hotspot['painter_shape'].point["+ii+"].atv");if(ax===undefined||ay===undefined||ax===null||ay===null){break}k.call('spheretoscreen('+ax+','+ay+',__sx,__sy)');sx=Number(k.get('__sx'));sy=Number(k.get('__sy'));if(havePrev){d=distPointToSeg(px,py,psx,psy,sx,sy);if(d<minD){minD=d}}psx=sx;psy=sy;havePrev=true;ii++}if(minD<=rx){k.call("removehotspot('painter_shape')");deletedShape=true}}

// 4) Xoá circle theo danh sách
var circles=${circlesJson};for(ci=0;ci<circles.length;ci++){cn=circles[ci];if(k.get("hotspot['"+cn+"']")){w=Number(k.get("hotspot['"+cn+"'].width"));cx=Number(k.get("hotspot['"+cn+"'].ath"));cy=Number(k.get("hotspot['"+cn+"'].atv"));k.call('spheretoscreen('+cx+','+cy+',__cx,__cy)');sx=Number(k.get('__cx'));sy=Number(k.get('__cy'));r=isFinite(w)?w/2:16;dx=px-sx;dy=py-sy;edge=Math.abs(Math.sqrt(dx*dx+dy*dy)-r);if(edge<=rx){k.call("removehotspot('"+cn+"')");deletedCircles.push(cn);}}}

// 5) Tẩy một phần stroke theo danh sách (polyline)
var names=${namesJson};
var addedStrokeParts=[];
for(ni=0;ni<names.length;ni++){
  n=names[ni];
  if(!k.get("hotspot['"+n+"']")) { continue }
  // Thu thập tất cả điểm của stroke
  var pts=[]; var spts=[]; i=0;
  for(;;){
    ax=k.get("hotspot['"+n+"'].point["+i+"].ath");
    ay=k.get("hotspot['"+n+"'].point["+i+"].atv");
    if(ax===undefined||ay===undefined||ax===null||ay===null){break}
    pts.push({ath:Number(ax),atv:Number(ay)});
    k.call('spheretoscreen('+ax+','+ay+',__hx,__hy)');
    spts.push({x:Number(k.get('__hx')), y:Number(k.get('__hy'))});
    i++;
  }
  if(pts.length<2){ continue }
  // Tìm các đoạn gần bút cần cắt
  var cuts=[]; // cắt giữa i và i+1
  for(i=0;i<pts.length-1;i++){
    sx1=spts[i].x; sy1=spts[i].y; sx2=spts[i+1].x; sy2=spts[i+1].y;
    d=distPointToSeg(px,py,sx1,sy1,sx2,sy2);
    cuts.push(d<=rx);
  }
  // Nếu không có đoạn nào bị cắt thì bỏ qua
  var anyCut=false; for(i=0;i<cuts.length;i++){ if(cuts[i]){ anyCut=true; break; } }
  if(!anyCut){ continue }
  // Tạo các phần liên tục không bị cắt
  var parts=[]; var cur=[]; cur.push(pts[0]);
  for(i=0;i<cuts.length;i++){
    if(cuts[i]){ // kết thúc phần hiện tại
      if(cur.length>=2){ parts.push(cur) }
      cur=[]; cur.push(pts[i+1]);
    } else {
      cur.push(pts[i+1]);
    }
  }
  if(cur.length>=2){ parts.push(cur) }
  // Sao chép style từ stroke gốc
  var bw=k.get("hotspot['"+n+"'].borderwidth");
  var bc=k.get("hotspot['"+n+"'].bordercolor");
  var safeBw = (typeof bw==='number'||!isNaN(Number(bw)))?Number(bw):3;
  var safeBc = (typeof bc==='string' || typeof bc==='number')?bc:0xFF3B30;
  // Tạo các hotspot phần và thu thập payload trả về
  for(i=0;i<parts.length;i++){
    var p=parts[i];
    var newname = n + '_p_' + Date.now() + '_' + i;
    k.call("addhotspot('"+newname+"')");
    k.call("set(hotspot['"+newname+"'].renderer, webgl)");
    k.call("set(hotspot['"+newname+"'].polyline, true)");
    k.call("set(hotspot['"+newname+"'].closepath, false)");
    k.call("set(hotspot['"+newname+"'].fillalpha, 0)");
    k.call("set(hotspot['"+newname+"'].borderwidth, "+safeBw+")");
    k.call("set(hotspot['"+newname+"'].bordercolor, "+safeBc+")");
    k.call("set(hotspot['"+newname+"'].zorder, 99998)");
    for(j=0;j<p.length;j++){
      k.call("set(hotspot['"+newname+"'].point["+j+"].ath, "+p[j].ath+")");
      k.call("set(hotspot['"+newname+"'].point["+j+"].atv, "+p[j].atv+")");
    }
    k.call("set(hotspot['"+newname+"'].userdata.point_count, "+p.length+")");
    addedStrokeParts.push({name:newname, points:p});
  }
  // Xoá stroke gốc
  k.call("removehotspot('"+n+"')");
  deletedStrokes.push(n);
}

// Thông báo về RN để đồng bộ state
if(window&&window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){window.ReactNativeWebView.postMessage(JSON.stringify({type:'erase_result', deletedPairs:deletedPairs, deletedDots:deletedDots, deletedShape:deletedShape, deletedStrokes:deletedStrokes, deletedCircles:deletedCircles, addedStrokeParts:addedStrokeParts}))}
}catch(e){}; true;`;
  try {
    webRef.current.injectJavaScript(js);
  } catch (_) {
    /* noop */
  }
}
