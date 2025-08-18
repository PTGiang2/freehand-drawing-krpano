// Import kiểu RefObject từ React để tham chiếu đến WebView component
import type {RefObject} from 'react';
// Import kiểu WebView từ thư viện react-native-webview để tương tác với web content
import type {WebView} from 'react-native-webview';
// Import hàm tiện ích để gửi lệnh JavaScript vào krpano viewer trong WebView
import {sendKrpano} from './KrpanoBridge';

// Kiểu điểm trên mặt cầu
export type SpherePoint = {ath: number; atv: number};

// Bắt đầu một nét vẽ tự do mới dưới dạng một hotspot polyline duy nhất
export function startFreehand(
  // Tham chiếu đến WebView component đang hiển thị krpano viewer
  webRef: RefObject<WebView>,
  // Tọa độ X trên màn hình (đơn vị pixel)
  x: number,
  // Tọa độ Y trên màn hình (đơn vị pixel)
  y: number,
) {
  // Tạo mảng chứa các lệnh krpano cần thực thi theo thứ tự
  const cmds = [
    // Chuyển đổi tọa độ màn hình (x,y) sang tọa độ cầu (da,dv) trong krpano
    `screentosphere(${x},${y},da,dv);`,
    // Reset biến đếm số điểm trong polyline về 0
    'set(global.freehand_idx, 0);',
    // Kiểm tra nếu đã tồn tại hotspot 'freehand_path' thì xóa nó trước khi tạo mới
    "if(hotspot['freehand_path'], removehotspot('freehand_path'); );",
    // Tạo hotspot mới với tên 'freehand_path' trong krpano
    "addhotspot('freehand_path');",
    // Thiết lập renderer cho hotspot là webgl để hiển thị đẹp hơn
    "set(hotspot['freehand_path'].renderer, webgl);",
    // Bật chế độ polyline để vẽ đường cong từ nhiều điểm
    "set(hotspot['freehand_path'].polyline, true);",
    // Không đóng đường (open path) để tạo đường cong mở
    "set(hotspot['freehand_path'].closepath, false);",
    // Không tô nền (fillalpha = 0) để chỉ hiển thị viền
    "set(hotspot['freehand_path'].fillalpha,0);",
    // Thiết lập độ dày viền là 3 pixel
    "set(hotspot['freehand_path'].borderwidth,3);",
    // Thiết lập màu viền là đỏ (0xFF3B30) cho hotspot
    "set(hotspot['freehand_path'].bordercolor,0xFF3B30);",
    // Gán điểm đầu tiên với tọa độ cầu da (kinh độ) vừa tính được
    "set(hotspot['freehand_path'].point[0].ath, get(da));",
    // Gán điểm đầu tiên với tọa độ cầu dv (vĩ độ) vừa tính được
    "set(hotspot['freehand_path'].point[0].atv, get(dv));",
    // Tăng chỉ số điểm lên 1 vì đã có 1 điểm đầu tiên
    'set(global.freehand_idx, 1);',
  ].join(' '); // Nối tất cả lệnh thành một chuỗi JavaScript duy nhất
  // Gửi chuỗi lệnh JavaScript vào krpano thông qua WebView
  sendKrpano(webRef, cmds);
}

// Thêm một điểm mới vào polyline hiện tại khi người dùng kéo chuột
export function moveFreehand(webRef: RefObject<WebView>, x: number, y: number) {
  // Tạo mảng chứa các lệnh krpano để thêm điểm mới
  const cmds = [
    // Chuyển đổi tọa độ màn hình (x,y) sang tọa độ cầu (da,dv)
    `screentosphere(${x},${y},da,dv);`,
    // Kiểm tra nếu hotspot 'freehand_path' tồn tại thì thực hiện thêm điểm
    "if(hotspot['freehand_path'], ",
    // Đảm bảo hotspot đang ở chế độ polyline
    "  set(hotspot['freehand_path'].polyline, true); ",
    // Đảm bảo không đóng đường (open path)
    "  set(hotspot['freehand_path'].closepath, false); ",
    // Gán tọa độ cầu ath (kinh độ) cho điểm tại vị trí freehand_idx hiện tại
    "  set(hotspot['freehand_path'].point[get(global.freehand_idx)].ath, get(da)); ",
    // Gán tọa độ cầu atv (vĩ độ) cho điểm tại vị trí freehand_idx hiện tại
    "  set(hotspot['freehand_path'].point[get(global.freehand_idx)].atv, get(dv)); ",
    // Tăng chỉ số điểm lên 1 để sẵn sàng cho điểm tiếp theo
    '  inc(global.freehand_idx); ',
    // Kết thúc câu lệnh if
    ');',
  ].join(' '); // Nối tất cả lệnh thành một chuỗi JavaScript duy nhất
  // Gửi chuỗi lệnh JavaScript vào krpano
  sendKrpano(webRef, cmds);
}

// Di chuyển toàn bộ polyline theo độ lệch giữa hai lần chạm/kéo (pan gesture)
export function moveAllFreehand(
  // Tham chiếu đến WebView component
  webRef: RefObject<WebView>,
  // Vị trí chạm trước đó trên màn hình (pixel)
  prevX: number,
  prevY: number,
  // Vị trí chạm hiện tại trên màn hình (pixel)
  curX: number,
  curY: number,
) {
  // Tạo mảng chứa các lệnh krpano để di chuyển polyline
  const cmds = [
    // Chuyển đổi vị trí trước đó sang tọa độ cầu và lưu vào a1, v1
    `screentosphere(${prevX},${prevY},a1,v1);`,
    // Chuyển đổi vị trí hiện tại sang tọa độ cầu và lưu vào a2, v2
    `screentosphere(${curX},${curY},a2,v2);`,
    // Tính toán độ lệch theo kinh độ (da) bằng cách lấy a2 trừ a1
    'set(da, calc(a2 - a1));',
    // Tính toán độ lệch theo vĩ độ (dv) bằng cách lấy v2 trừ v1
    'set(dv, calc(v2 - v1));',
    // Kiểm tra nếu có hotspot 'freehand_path' và có ít nhất 1 điểm thì di chuyển
    "if(hotspot['freehand_path'] AND global.freehand_idx GT 0, ",
    // Lặp qua từng điểm từ 0 đến freehand_idx - 1
    '  for(set(ii,0), ii LT global.freehand_idx, inc(ii), ',
    // Cộng thêm độ lệch da vào kinh độ của điểm thứ ii
    "    set(hotspot['freehand_path'].point[get(ii)].ath, calc(hotspot['freehand_path'].point[get(ii)].ath + get(da))); ",
    // Cộng thêm độ lệch dv vào vĩ độ của điểm thứ ii
    "    set(hotspot['freehand_path'].point[get(ii)].atv, calc(hotspot['freehand_path'].point[get(ii)].atv + get(dv))); ",
    // Kết thúc vòng lặp for
    '  ); ',
    // Kết thúc câu lệnh if
    ');',
  ].join(' '); // Nối tất cả lệnh thành một chuỗi JavaScript duy nhất
  // Gửi chuỗi lệnh JavaScript vào krpano
  sendKrpano(webRef, cmds);
}

// Xóa toàn bộ nét vẽ tự do (undo) - hiện tại xóa hết, có thể cải thiện sau để chỉ xóa điểm cuối
export function undoFreehand(webRef: RefObject<WebView>) {
  // Tạo mảng chứa các lệnh krpano để xóa polyline
  const cmds = [
    // Kiểm tra nếu có hotspot 'freehand_path' thì xóa nó
    "if(hotspot['freehand_path'], removehotspot('freehand_path'); );",
    // Đặt lại số lượng điểm về 0
    'set(global.freehand_idx, 0);',
  ].join(' '); // Nối tất cả lệnh thành một chuỗi JavaScript duy nhất
  // Gửi chuỗi lệnh JavaScript vào krpano
  sendKrpano(webRef, cmds);
}

// Xóa nét vẽ tự do hiện tại (clear)
export function clearFreehand(webRef: RefObject<WebView>) {
  // Tạo mảng chứa các lệnh krpano để xóa polyline
  const cmds = [
    // Kiểm tra nếu có hotspot 'freehand_path' thì xóa nó
    "if(hotspot['freehand_path'], removehotspot('freehand_path'); );",
    // Đặt lại số lượng điểm về 0
    'set(global.freehand_idx, 0);',
  ].join(' '); // Nối tất cả lệnh thành một chuỗi JavaScript duy nhất
  // Gửi chuỗi lệnh JavaScript vào krpano
  sendKrpano(webRef, cmds);
}

// Làm nổi bật (chọn) hoặc bỏ nổi bật nét vẽ tự do bằng cách thay đổi màu và độ dày viền
export function setFreehandSelected(
  // Tham chiếu đến WebView component
  webRef: RefObject<WebView>,
  // Trạng thái được chọn hay không (true = được chọn, false = không được chọn)
  selected: boolean,
) {
  // Chọn màu viền: xanh lá (0x34C759) khi được chọn, đỏ (0xFF3B30) khi không được chọn
  const color = selected ? '0x34C759' : '0xFF3B30';
  // Chọn độ dày viền: 4 pixel khi được chọn, 3 pixel khi không được chọn
  const width = selected ? 4 : 3;
  // Tạo mảng chứa các lệnh krpano để cập nhật thuộc tính hotspot
  const cmds = [
    // Kiểm tra nếu có hotspot 'freehand_path' thì cập nhật thuộc tính
    "if(hotspot['freehand_path'], ",
    // Thay đổi màu viền của hotspot theo trạng thái selected
    `  set(hotspot['freehand_path'].bordercolor, ${color}); `,
    // Thay đổi độ dày viền của hotspot theo trạng thái selected
    `  set(hotspot['freehand_path'].borderwidth, ${width}); `,
    // Kết thúc câu lệnh if
    ');',
  ].join(''); // Nối tất cả lệnh thành một chuỗi JavaScript duy nhất
  // Gửi chuỗi lệnh JavaScript vào krpano
  sendKrpano(webRef, cmds);
}

// Đặt trạng thái highlight cho một stroke đã lưu (theo tên hotspot)
export function setStrokeSelected(
  webRef: RefObject<WebView>,
  strokeName: string,
  selected: boolean,
) {
  const color = selected ? '0x34C759' : '0xFF3B30';
  const width = selected ? 4 : 3;
  const safeName = strokeName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const cmds = [
    `if(hotspot['${safeName}'], `,
    `  set(hotspot['${safeName}'].bordercolor, ${color}); `,
    `  set(hotspot['${safeName}'].borderwidth, ${width}); `,
    ');',
  ].join('');
  sendKrpano(webRef, cmds);
}

// Xóa một stroke đã lưu theo tên
export function removeStroke(webRef: RefObject<WebView>, strokeName: string) {
  const safeName = strokeName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const cmds = `if(hotspot['${safeName}'], removehotspot('${safeName}'); );`;
  sendKrpano(webRef, cmds);
}

// Di chuyển một stroke đã lưu theo độ lệch chuột (dựa vào prev và cur screen xy)
export function moveStroke(
  webRef: RefObject<WebView>,
  strokeName: string,
  prevX: number,
  prevY: number,
  curX: number,
  curY: number,
) {
  const safeName = strokeName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const cmds = [
    `screentosphere(${prevX},${prevY},a1,v1);`,
    `screentosphere(${curX},${curY},a2,v2);`,
    'set(da, calc(a2 - a1));',
    'set(dv, calc(v2 - v1));',
    `if(hotspot['${safeName}'], `,
    // Dùng userdata.point_count nếu có, fallback 4096
    `  set(_cnt, get(hotspot['${safeName}'].userdata.point_count));`,
    '  if(!_cnt, set(_cnt, 4096));',
    '  for(set(ii,0), ii LT _cnt, inc(ii), ',
    `    if(hotspot['${safeName}'].point[get(ii)].ath, `,
    `      set(hotspot['${safeName}'].point[get(ii)].ath, calc(hotspot['${safeName}'].point[get(ii)].ath + get(da))); `,
    `      set(hotspot['${safeName}'].point[get(ii)].atv, calc(hotspot['${safeName}'].point[get(ii)].atv + get(dv))); `,
    '    );',
    '  );',
    ');',
  ].join(' ');
  sendKrpano(webRef, cmds);
}

// Hoàn tất nét vẽ hiện tại: sao chép từ 'freehand_path' sang hotspot cố định mới và dọn temp
export function finalizeFreehand(
  webRef: RefObject<WebView>,
  strokeName: string,
) {
  const safeName = strokeName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const cmds = [
    // Nếu có đường tạm thời và có điểm thì sao chép sang hotspot mới
    "if(hotspot['freehand_path'] AND global.freehand_idx GT 0, ",
    `  addhotspot('${safeName}');`,
    `  set(hotspot['${safeName}'].renderer, webgl);`,
    `  set(hotspot['${safeName}'].polyline, true);`,
    `  set(hotspot['${safeName}'].closepath, false);`,
    `  set(hotspot['${safeName}'].fillalpha, 0);`,
    `  set(hotspot['${safeName}'].borderwidth, 3);`,
    `  set(hotspot['${safeName}'].bordercolor, 0xFF3B30);`,
    `  set(hotspot['${safeName}'].zorder, 99998);`,
    // Sao chép toàn bộ điểm
    '  for(set(ii,0), ii LT global.freehand_idx, inc(ii), ',
    `    copy(hotspot['${safeName}'].point[get(ii)].ath, hotspot['freehand_path'].point[get(ii)].ath); `,
    `    copy(hotspot['${safeName}'].point[get(ii)].atv, hotspot['freehand_path'].point[get(ii)].atv); `,
    '  ); ',
    // Lưu tổng số điểm để hỗ trợ di chuyển sau này
    `  set(hotspot['${safeName}'].userdata.point_count, get(global.freehand_idx)); `,
    // Xóa đường tạm và reset chỉ số
    "  removehotspot('freehand_path'); ",
    '  set(global.freehand_idx, 0);',
    ');',
  ].join(' ');
  sendKrpano(webRef, cmds);
}

// Vẽ lại một nét vẽ từ danh sách điểm đã lưu
export function renderFreehandStroke(
  webRef: RefObject<WebView>,
  strokeName: string,
  points: SpherePoint[],
) {
  if (!points || points.length === 0) {
    return;
  }
  const safeName = strokeName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const base = [
    `addhotspot('${safeName}');`,
    `set(hotspot['${safeName}'].renderer, webgl);`,
    `set(hotspot['${safeName}'].polyline, true);`,
    `set(hotspot['${safeName}'].closepath, false);`,
    `set(hotspot['${safeName}'].fillalpha, 0);`,
    `set(hotspot['${safeName}'].borderwidth, 3);`,
    `set(hotspot['${safeName}'].bordercolor, 0xFF3B30);`,
    `set(hotspot['${safeName}'].zorder, 99998);`,
    `set(hotspot['${safeName}'].userdata.point_count, ${points.length});`,
  ];
  const pts = points
    .map(
      (p, i) =>
        `set(hotspot['${safeName}'].point[${i}].ath, ${p.ath}); set(hotspot['${safeName}'].point[${i}].atv, ${p.atv});`,
    )
    .join(' ');
  sendKrpano(webRef, [...base, pts].join(' '));
}
