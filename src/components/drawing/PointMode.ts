// Import kiểu RefObject từ React để tham chiếu đến WebView component
import type {RefObject} from 'react';
// Import kiểu WebView từ thư viện react-native-webview để tương tác với web content
import type {WebView} from 'react-native-webview';
// Import hàm tiện ích để gửi lệnh JavaScript vào krpano viewer trong WebView
import {sendKrpano} from './KrpanoBridge';

// Tạo một điểm mới khi người dùng tap vào màn hình
export function tapPoint(webRef: RefObject<WebView>, x: number, y: number) {
  // Tạo mảng chứa các lệnh krpano để tạo điểm mới
  const cmds = [
    // Chuyển đổi tọa độ màn hình (x,y) sang tọa độ cầu (da,dv) trong krpano
    `screentosphere(${x},${y},da,dv);`,
    // Kiểm tra nếu biến global.painter_idx chưa tồn tại thì khởi tạo bằng 0
    'if(!global.painter_idx, set(global.painter_idx,0));',
    // Kiểm tra xem có chấm tròn nào gần điểm tap không để snap vào
    'set(snap_distance, 20); ', // Ngưỡng khoảng cách để snap (đơn vị pixel)
    'set(snapped, false); ',
    'set(snap_ath, get(da)); ',
    'set(snap_atv, get(dv)); ',
    // Tìm chấm tròn gần nhất để snap vào (kiểm tra trên màn hình)
    'if(global.painter_idx GT 0, ',
    '  for(set(i,0), i LT global.painter_idx, inc(i), ',
    "    if(hotspot[calc('rn_dot_' + get(i))], ",
    "      spheretoscreen(hotspot[calc('rn_dot_' + get(i))].ath, hotspot[calc('rn_dot_' + get(i))].atv, dot_x, dot_y); ",
    `      set(dist_x, abs(get(dot_x) - ${x})); `,
    `      set(dist_y, abs(get(dot_y) - ${y})); `,
    '      if(get(dist_x) LT snap_distance AND get(dist_y) LT snap_distance, ',
    "        set(snap_ath, hotspot[calc('rn_dot_' + get(i))].ath); ",
    "        set(snap_atv, hotspot[calc('rn_dot_' + get(i))].atv); ",
    '        set(snapped, true); ',
    '        break; ',
    '      ); ',
    '    ); ',
    '  ); ',
    '); ',
    // Tạo hotspot mới với tên 'rn_dot_' + số thứ tự để hiển thị điểm
    "addhotspot(calc('rn_dot_' + global.painter_idx));",
    // Dùng renderer webgl để hiển thị ảnh SVG làm chấm tròn đỏ
    "set(hotspot[calc('rn_dot_' + global.painter_idx)].renderer, webgl);",
    // Thiết lập thứ tự hiển thị cao (zorder) để điểm luôn ở trên đường nối
    "set(hotspot[calc('rn_dot_' + global.painter_idx)].zorder, 100000);",
    // Thiết lập ảnh SVG dạng data URL cho chấm tròn đỏ lớn viền trắng
    'set(hotspot[calc(\'rn_dot_\' + global.painter_idx)].url, \'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="%23FF3B30" stroke="white" stroke-width="2"/></svg>\');',
    // Gán tọa độ cầu ath (kinh độ) cho hotspot điểm - sử dụng tọa độ đã snap
    "set(hotspot[calc('rn_dot_' + global.painter_idx)].ath, get(snap_ath));",
    // Gán tọa độ cầu atv (vĩ độ) cho hotspot điểm - sử dụng tọa độ đã snap
    "set(hotspot[calc('rn_dot_' + global.painter_idx)].atv, get(snap_atv));",
    // Xóa bất kỳ polygon cũ nào nếu có (phòng trường hợp còn sót)
    "if(hotspot['painter_shape'], removehotspot('painter_shape'); );",
    // Tăng chỉ số điểm lên 1 để sẵn sàng cho điểm tiếp theo
    'inc(global.painter_idx);',
    // Kiểm tra nếu đây là điểm đầu tiên (rn_dot_0) để tạo đa giác
    'if(global.painter_idx GE 3, ',
    '  set(i, calc(global.painter_idx - 1)); ',
    // Kiểm tra near bằng ngưỡng độ (đơn vị độ cầu)
    '  set(th, 1.0); ',
    "  if(abs(hotspot[calc('rn_dot_' + i)].ath - hotspot['rn_dot_0'].ath) LT th AND abs(hotspot[calc('rn_dot_' + i)].atv - hotspot['rn_dot_0'].atv) LT th, ",
    // Debug: log khi tạo đa giác
    '    trace("Creating polygon with ", global.painter_idx, " points"); ',
    // Tạo đa giác đi qua tất cả các điểm
    "    addhotspot('painter_shape'); ",
    "    set(hotspot['painter_shape'].renderer, webgl); ",
    "    set(hotspot['painter_shape'].polyline, true); ",
    "    set(hotspot['painter_shape'].closepath, true); ",
    "    set(hotspot['painter_shape'].fillalpha, 0.1); ",
    "    set(hotspot['painter_shape'].bordercolor, 0xFF3B30); ",
    "    set(hotspot['painter_shape'].borderwidth, 3); ",
    "    set(hotspot['painter_shape'].zorder, 99998); ",
    // Thêm tất cả điểm vào đa giác (bao gồm cả điểm đóng)
    '    for(set(j,0), j LT global.painter_idx, inc(j), ',
    "      set(hotspot['painter_shape'].point[get(j)].ath, hotspot[calc('rn_dot_' + get(j))].ath); ",
    "      set(hotspot['painter_shape'].point[get(j)].atv, hotspot[calc('rn_dot_' + get(j))].atv); ",
    '    ); ',
    // Thêm điểm cuối trùng với điểm đầu để đóng kín
    "    set(hotspot['painter_shape'].point[global.painter_idx].ath, hotspot['rn_dot_0'].ath); ",
    "    set(hotspot['painter_shape'].point[global.painter_idx].atv, hotspot['rn_dot_0'].atv); ",
    // Ẩn tất cả các nút tròn
    '    for(set(k,0), k LT global.painter_idx, inc(k), ',
    "      set(hotspot[calc('rn_dot_' + get(k))].visible, false); ",
    '    ); ',
    '  ); ',
    '); ',
    // Nếu đã có ít nhất 2 chấm, nối 2 chấm cuối bằng một polyline mới và giữ lại các đoạn trước đó
    'if(global.painter_idx GE 2, ',
    '  set(i2, calc(global.painter_idx - 1)); set(i1, calc(i2 - 1)); ',
    "  addhotspot(calc('painter_pair_' + i1));",
    "  set(hotspot[calc('painter_pair_' + i1)].renderer, webgl);",
    "  set(hotspot[calc('painter_pair_' + i1)].polyline, true);",
    "  set(hotspot[calc('painter_pair_' + i1)].closepath, false);",
    "  set(hotspot[calc('painter_pair_' + i1)].fillalpha,0);",
    "  set(hotspot[calc('painter_pair_' + i1)].borderwidth,3);",
    "  set(hotspot[calc('painter_pair_' + i1)].bordercolor,0xFF3B30);",
    "  set(hotspot[calc('painter_pair_' + i1)].zorder, 99999);",
    "  copy(hotspot[calc('painter_pair_' + i1)].point[0].ath, hotspot[calc('rn_dot_' + i1)].ath); ",
    "  copy(hotspot[calc('painter_pair_' + i1)].point[0].atv, hotspot[calc('rn_dot_' + i1)].atv); ",
    "  copy(hotspot[calc('painter_pair_' + i1)].point[1].ath, hotspot[calc('rn_dot_' + i2)].ath); ",
    "  copy(hotspot[calc('painter_pair_' + i1)].point[1].atv, hotspot[calc('rn_dot_' + i2)].atv); ",
    ');',
  ].join(' '); // Nối tất cả lệnh thành một chuỗi JavaScript duy nhất
  // Gửi chuỗi lệnh JavaScript vào krpano thông qua WebView
  sendKrpano(webRef, cmds);
}

// Xóa điểm cuối cùng (undo) - chỉ xóa điểm, không lưu vào krpano
export function undoPoint(webRef: RefObject<WebView>) {
  const cmds = [
    // Kiểm tra nếu có điểm nào để xóa
    'if(global.painter_idx GT 0, ',
    // Debug: hiển thị thông tin về điểm sẽ xóa
    "  trace('Undo point: current index =', global.painter_idx, 'will remove dot', global.painter_idx - 1); ",
    // Xóa đoạn nối giữa điểm hiện tại và điểm trước đó (nếu có)
    '  if(global.painter_idx GT 1, ',
    "    trace('Removing line between dots', global.painter_idx - 2, 'and', global.painter_idx - 1); ",
    "    removehotspot(calc('painter_pair_' + (global.painter_idx - 2))); ",
    '  ); ',
    // Xóa điểm cuối cùng - sử dụng cú pháp trực tiếp và đảm bảo xóa đúng điểm
    "  set(dot_to_remove, calc('rn_dot_' + (global.painter_idx - 1))); ",
    "  trace('Will remove dot:', get(dot_to_remove)); ",
    "  set(hotspot[get(dot_to_remove)].visible, true); ", // Đảm bảo điểm hiển thị trước khi xóa
    "  removehotspot(get(dot_to_remove)); ",
    // Giảm chỉ số điểm sau khi đã xóa
    '  dec(global.painter_idx); ',
    // Nếu có đa giác, xóa nó và hiện lại các nút tròn
    "  if(hotspot['painter_shape'], ",
    "    trace('Removing polygon and showing remaining dots'); ",
    "    removehotspot('painter_shape'); ",
    '  ); ',
    // Đảm bảo tất cả các điểm còn lại đều hiển thị
    '  for(set(k,0), k LT global.painter_idx, inc(k), ',
    "    trace('Making dot visible:', 'rn_dot_' + get(k)); ",
    "    if(hotspot[calc('rn_dot_' + get(k))], set(hotspot[calc('rn_dot_' + get(k))].visible, true); ); ",
    '  ); ',
    // Đảm bảo tất cả các đoạn nối còn lại đều hiển thị
    '  for(set(m,0), m LT calc(global.painter_idx - 1), inc(m), ',
    "    trace('Making line visible:', 'painter_pair_' + get(m)); ",
    "    if(hotspot[calc('painter_pair_' + get(m))], set(hotspot[calc('painter_pair_' + get(m))].visible, true); ); ",
    '  ); ',
    ')'
  ].join(' '); // Sửa lại join('') thành join(' ') để đảm bảo các lệnh được nối với khoảng trắng
  sendKrpano(webRef, cmds);
}

// Khôi phục điểm - sử dụng tọa độ từ React Native state
export function redoPoint(webRef: RefObject<WebView>, ath: number, atv: number) {
  console.log('redoPoint called with coordinates:', ath, atv);
  
  const cmds = [
    "trace('REDO POINT FUNCTION CALLED');",
    "addhotspot(calc('rn_dot_' + global.painter_idx));",
    "set(hotspot[calc('rn_dot_' + global.painter_idx)].renderer, webgl);",
    "set(hotspot[calc('rn_dot_' + global.painter_idx)].zorder, 100000);",
    '  set(hotspot[calc(\'rn_dot_\' + global.painter_idx)].url, \'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="%23FF3B30" stroke="white" stroke-width="2"/></svg>\');',
    `set(hotspot[calc('rn_dot_' + global.painter_idx)].ath, ${ath});`,
    `set(hotspot[calc('rn_dot_' + global.painter_idx)].atv, ${atv});`,
    "if(hotspot['painter_shape'], removehotspot('painter_shape'); );",
    'inc(global.painter_idx);',
    'if(global.painter_idx GE 2,',
    '  set(i2, calc(global.painter_idx - 1));',
    '  set(i1, calc(i2 - 1));',
    "  addhotspot(calc('painter_pair_' + i1));",
    "  set(hotspot[calc('painter_pair_' + i1)].renderer, webgl);",
    "  set(hotspot[calc('painter_pair_' + i1)].polyline, true);",
    "  set(hotspot[calc('painter_pair_' + i1)].closepath, false);",
    "  set(hotspot[calc('painter_pair_' + i1)].fillalpha,0);",
    "  set(hotspot[calc('painter_pair_' + i1)].borderwidth,3);",
    "  set(hotspot[calc('painter_pair_' + i1)].bordercolor,0xFF3B30);",
    "  set(hotspot[calc('painter_pair_' + i1)].zorder, 99999);",
    "  copy(hotspot[calc('painter_pair_' + i1)].point[0].ath, hotspot[calc('rn_dot_' + i1)].ath);",
    "  copy(hotspot[calc('painter_pair_' + i1)].point[0].atv, hotspot[calc('rn_dot_' + i1)].atv);",
    "  copy(hotspot[calc('painter_pair_' + i1)].point[1].ath, hotspot[calc('rn_dot_' + i2)].ath);",
    "  copy(hotspot[calc('painter_pair_' + i1)].point[1].atv, hotspot[calc('rn_dot_' + i2)].atv);",
    ');',
    "trace('REDO POINT COMPLETED');"
  ].join(' ');
  sendKrpano(webRef, cmds);
}

// Xóa tất cả điểm và shape (clear) - làm sạch hoàn toàn
export function clearPoint(webRef: RefObject<WebView>) {
  const cmds = [
    // Xóa đa giác nếu tồn tại
    "if(hotspot['painter_shape'], removehotspot('painter_shape'); ); ",
    // Xóa tất cả các đoạn nối
    "if(global.painter_idx, for(set(i,0), i LT global.painter_idx - 1, inc(i), if(hotspot['painter_pair_' + get(i)], removehotspot('painter_pair_' + get(i)); ); ); ); ",
    // Xóa tất cả các chấm
    "if(global.painter_idx, for(set(i,0), i LT global.painter_idx, inc(i), if(hotspot['rn_dot_' + get(i)], removehotspot('rn_dot_' + get(i)); ); ); ); ",
    'set(global.painter_idx, 0);',
    // Xóa redo variables
    'set(global.point_redo_ath, "");',
    'set(global.point_redo_atv, "");',
  ].join(' ');
  sendKrpano(webRef, cmds);
}

// Di chuyển tất cả điểm và shape theo độ lệch giữa hai lần chạm/kéo (pan gesture)
export function movePoint(
  // Tham chiếu đến WebView component
  webRef: RefObject<WebView>,
  // Vị trí chạm trước đó trên màn hình (pixel)
  prevX: number,
  prevY: number,
  // Vị trí chạm hiện tại trên màn hình (pixel)
  curX: number,
  curY: number,
) {
  const cmds = [
    `screentosphere(${prevX},${prevY},a1,v1);`,
    `screentosphere(${curX},${curY},a2,v2);`,
    'set(da, calc(a2 - a1));',
    'set(dv, calc(v2 - v1));',
    'if(global.painter_idx GT 0, ',
    // Di chuyển các chấm trước
    '  for(set(jj,0), jj LT global.painter_idx, inc(jj), ',
    "    if(hotspot['rn_dot_' + get(jj)], ",
    "      set(hotspot['rn_dot_' + get(jj)].ath, calc(hotspot['rn_dot_' + get(jj)].ath + get(da))); ",
    "      set(hotspot['rn_dot_' + get(jj)].atv, calc(hotspot['rn_dot_' + get(jj)].atv + get(dv))); ",
    '    ); ',
    '  ); ',
    // Di chuyển các đoạn nối
    '  if(global.painter_idx GT 1, ',
    '    for(set(kk,0), kk LT calc(global.painter_idx - 1), inc(kk), ',
    "      if(hotspot['painter_pair_' + get(kk)], ",
    "        set(hotspot['painter_pair_' + get(kk)].point[0].ath, calc(hotspot['painter_pair_' + get(kk)].point[0].ath + get(da))); ",
    "        set(hotspot['painter_pair_' + get(kk)].point[0].atv, calc(hotspot['painter_pair_' + get(kk)].point[0].atv + get(dv))); ",
    "        set(hotspot['painter_pair_' + get(kk)].point[1].ath, calc(hotspot['painter_pair_' + get(kk)].point[1].ath + get(da))); ",
    "        set(hotspot['painter_pair_' + get(kk)].point[1].atv, calc(hotspot['painter_pair_' + get(kk)].point[1].atv + get(dv))); ",
    '      ); ',
    '    ); ',
    '  ); ',
    // Cập nhật đa giác để đảm bảo khít với các điểm
    "  if(hotspot['painter_shape'], ",
    '    for(set(ii,0), ii LT global.painter_idx, inc(ii), ',
    "      set(hotspot['painter_shape'].point[get(ii)].ath, hotspot[calc('rn_dot_' + get(ii))].ath); ",
    "      set(hotspot['painter_shape'].point[get(ii)].atv, hotspot[calc('rn_dot_' + get(ii))].atv); ",
    '    ); ',
    // Đảm bảo điểm cuối trùng với điểm đầu
    "    set(hotspot['painter_shape'].point[global.painter_idx].ath, hotspot['rn_dot_0'].ath); ",
    "    set(hotspot['painter_shape'].point[global.painter_idx].atv, hotspot['rn_dot_0'].atv); ",
    '  ); ',
    ') ;',
  ].join(' ');
  sendKrpano(webRef, cmds);
}

// Làm nổi bật (chọn) hoặc bỏ nổi bật shape bằng cách thay đổi màu và độ dày viền
export function setPointSelected(
  // Tham chiếu đến WebView component
  webRef: RefObject<WebView>,
  // Trạng thái được chọn hay không (true = được chọn, false = không được chọn)
  selected: boolean,
) {
  // Chọn màu viền: xanh lá (0x34C759) khi được chọn, đỏ (0xFF3B30) khi không được chọn
  const color = selected ? '0x34C759' : '0xFF3B30';
  // Chọn độ dày viền: 4 pixel khi được chọn, 3 pixel khi không được chọn
  const width = selected ? 4 : 3;
  // Tạo mảng chứa các lệnh krpano để cập nhật thuộc tính shape
  const cmds = [
    // Kiểm tra nếu có hotspot 'painter_shape' thì cập nhật thuộc tính
    "if(hotspot['painter_shape'], ",
    // Thay đổi màu viền của shape theo trạng thái selected
    `  set(hotspot['painter_shape'].bordercolor, ${color}); `,
    // Thay đổi độ dày viền của shape theo trạng thái selected
    `  set(hotspot['painter_shape'].borderwidth, ${width}); `,
    // Kết thúc câu lệnh if
    ');',
  ].join(''); // Nối tất cả lệnh thành một chuỗi JavaScript duy nhất
  // Gửi chuỗi lệnh JavaScript vào krpano
  sendKrpano(webRef, cmds);
}
