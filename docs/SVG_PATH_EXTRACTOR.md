# SVG Path Extractor Tool

Tool này giúp bạn tự động lấy path D từ file SVG và tạo code TypeScript để sử dụng trong `UnifiedShapeHotspot.ts`.

## Cách sử dụng

### 1. Sử dụng Command Line (Khuyến nghị)

```bash
# Cách 1: Sử dụng npm script
npm run extract-svg src/assets/svg/star.svg star

# Cách 2: Chạy trực tiếp
node scripts/extract-svg-path.js src/assets/svg/arrow.svg arrow

# Cách 3: Không chỉ định tên shape (sẽ lấy từ tên file)
npm run extract-svg src/assets/svg/heart.svg
```

### 2. Sử dụng Component React Native

Import và sử dụng component trong app:

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

## Output

Tool sẽ tạo ra code TypeScript như sau:

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

## Cách thêm vào UnifiedShapeHotspot.ts

1. Copy code được tạo ra
2. Paste vào file `src/components/drawing/UnifiedShapeHotspot.ts` sau phần `// ===== CÁC HÌNH MẪU =====`
3. Export các function mới trong phần export cuối file

## Yêu cầu file SVG

File SVG phải có:

- Element `<svg>` với thuộc tính `viewBox` hoặc `width`/`height`
- Element `<path>` với thuộc tính `d`

Ví dụ file SVG hợp lệ:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M50 10L60 40H90L65 60L75 90L50 70L25 90L35 60L10 40H40L50 10Z"/>
</svg>
```

## Troubleshooting

### Lỗi "Không tìm thấy element path"

- Kiểm tra file SVG có element `<path>` không
- Nếu SVG sử dụng `<polygon>` hoặc `<rect>`, cần convert sang path trước

### Lỗi "Không thể parse file SVG"

- Kiểm tra file SVG có đúng format XML không
- Đảm bảo file không bị corrupt

### Lỗi viewBox

- Nếu SVG không có `viewBox`, tool sẽ sử dụng `width` và `height`
- Đảm bảo các giá trị này là số hợp lệ

## Ví dụ sử dụng

```bash
# Extract từ file star.svg
npm run extract-svg src/assets/svg/star.svg star

# Extract từ file arrow.svg
npm run extract-svg src/assets/svg/arrow.svg arrow

# Extract từ file heart.svg (tên tự động)
npm run extract-svg src/assets/svg/heart.svg
```

## Lưu ý

- Tool chỉ hỗ trợ SVG có một element `<path>` duy nhất
- Nếu SVG có nhiều path, chỉ path đầu tiên sẽ được sử dụng
- Tên shape sẽ được viết hoa cho constant và viết hoa chữ cái đầu cho function
