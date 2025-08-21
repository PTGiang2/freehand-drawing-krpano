# 🎨 SVG Path Extractor Tool

Tool tự động lấy path D từ file SVG và tạo code TypeScript cho `UnifiedShapeHotspot.ts`

## 🚀 Tính năng

- ✅ Tự động extract path D và viewBox từ file SVG
- ✅ Tạo code TypeScript hoàn chỉnh cho shape mới
- ✅ Hỗ trợ cả command line và React Native component
- ✅ Tự động thêm shape vào file UnifiedShapeHotspot.ts
- ✅ Backup file trước khi chỉnh sửa

## 📦 Cài đặt

Tool đã được tích hợp sẵn trong project. Các dependencies cần thiết:

```bash
npm install --save-dev xmldom ts-node
npm install react-native-document-picker
```

## 🛠️ Cách sử dụng

### 1. Command Line (Khuyến nghị)

#### Chỉ extract và hiển thị code:

```bash
# Cách 1: Sử dụng npm script
npm run extract-svg src/assets/svg/star.svg star

# Cách 2: Chạy trực tiếp
node scripts/extract-svg-path.js src/assets/svg/arrow.svg arrow

# Cách 3: Không chỉ định tên shape (tự động lấy từ tên file)
npm run extract-svg src/assets/svg/heart.svg
```

#### Tự động thêm vào UnifiedShapeHotspot.ts:

```bash
npm run add-shape src/assets/svg/star.svg star
```

### 2. React Native Component

```tsx
import SvgPathExtractor from '../components/SvgPathExtractor';

// Trong component của bạn
<SvgPathExtractor
  onCodeGenerated={(code, shapeName) => {
    console.log('Generated code for:', shapeName);
    console.log(code);
  }}
/>;
```

## 📋 Output mẫu

Tool sẽ tạo ra code như sau:

```typescript
// Hình star: path từ star.svg
const STAR_VIEWBOX = {width: 193, height: 182};
const STAR_PATH_D =
  'M118.588 69.5986L118.7 69.9434H190.542L132.715 111.958L132.421 112.172L132.533 112.517L154.62 180.496L96.7939 138.483L96.5 138.27L96.2061 138.483L38.3789 180.496L60.4668 112.517L60.5791 112.172L60.2852 111.958L2.45801 69.9434H74.2998L74.4121 69.5986L96.5 1.61719L118.588 69.5986Z';

// ===== FUNCTIONS CHO HÌNH STAR =====

export function startStar(webRef: RefObject<WebView>, x: number, y: number) {
  startSvgShape(webRef, x, y, STAR_VIEWBOX, STAR_PATH_D, 'star_temp');
}

export function resizeStar(webRef: RefObject<WebView>, diameterPx: number) {
  resizeSvgShape(webRef, STAR_VIEWBOX, STAR_PATH_D, diameterPx, 'star_temp');
}

export function finalizeStar(webRef: RefObject<WebView>, name: string) {
  finalizeSvgPathShape(webRef, name, STAR_VIEWBOX, STAR_PATH_D, 'star_temp');
}
```

## 📁 Cấu trúc files

```
MyApp/
├── src/
│   ├── utils/
│   │   └── svgPathExtractor.ts          # Core utility functions
│   ├── components/
│   │   ├── SvgPathExtractor.tsx         # React Native component
│   │   └── drawing/
│   │       └── UnifiedShapeHotspot.ts   # File đích để thêm shape
│   └── assets/
│       └── svg/                         # Thư mục chứa file SVG
├── scripts/
│   ├── extract-svg-path.js              # Script extract path D
│   └── add-shape-to-unified.ts          # Script tự động thêm shape
└── docs/
    └── SVG_PATH_EXTRACTOR.md            # Hướng dẫn chi tiết
```

## 🎯 Workflow sử dụng

### Bước 1: Chuẩn bị file SVG

- File SVG phải có element `<path>` với thuộc tính `d`
- Có `viewBox` hoặc `width`/`height` attributes
- Đặt file trong thư mục `src/assets/svg/`

### Bước 2: Extract và thêm shape

```bash
# Tự động thêm shape vào UnifiedShapeHotspot.ts
npm run add-shape src/assets/svg/your-shape.svg your-shape-name
```

### Bước 3: Sử dụng trong code

```tsx
import {
  startYourShape,
  resizeYourShape,
  finalizeYourShape,
} from './UnifiedShapeHotspot';

// Sử dụng các function đã được tạo
startYourShape(webRef, x, y);
resizeYourShape(webRef, diameter);
finalizeYourShape(webRef, 'shape-name');
```

## 🔧 Yêu cầu file SVG

File SVG phải có format như sau:

```xml
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 10L60 40H90L65 60L75 90L50 70L25 90L35 60L10 40H40L50 10Z"/>
</svg>
```

**Lưu ý:**

- Chỉ hỗ trợ SVG có một element `<path>` duy nhất
- Nếu có nhiều path, chỉ path đầu tiên được sử dụng
- Tên shape sẽ được viết hoa cho constant và viết hoa chữ cái đầu cho function

## 🚨 Troubleshooting

### Lỗi "Không tìm thấy element path"

- Kiểm tra file SVG có element `<path>` không
- Nếu SVG sử dụng `<polygon>` hoặc `<rect>`, cần convert sang path trước

### Lỗi "Không thể parse file SVG"

- Kiểm tra file SVG có đúng format XML không
- Đảm bảo file không bị corrupt

### Lỗi viewBox

- Nếu SVG không có `viewBox`, tool sẽ sử dụng `width` và `height`
- Đảm bảo các giá trị này là số hợp lệ

## 📝 Ví dụ thực tế

### Tạo shape mới từ file SVG:

1. **Tạo file SVG** `src/assets/svg/diamond.svg`:

```xml
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 10L90 50L50 90L10 50L50 10Z"/>
</svg>
```

2. **Chạy script**:

```bash
npm run add-shape src/assets/svg/diamond.svg diamond
```

3. **Kết quả**: Shape diamond đã được thêm vào `UnifiedShapeHotspot.ts` với các function:

- `startDiamond()`
- `resizeDiamond()`
- `finalizeDiamond()`

## 🎉 Lợi ích

- ⚡ **Tiết kiệm thời gian**: Không cần copy/paste thủ công path D
- 🔄 **Tự động hóa**: Script tự động tạo code hoàn chỉnh
- 🛡️ **An toàn**: Backup file trước khi chỉnh sửa
- 📱 **Đa nền tảng**: Hỗ trợ cả command line và React Native
- 🎯 **Chính xác**: Tự động lấy viewBox và path D chính xác

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy kiểm tra:

1. File SVG có đúng format không
2. Dependencies đã được cài đặt chưa
3. File backup có được tạo không (`.backup` extension)
