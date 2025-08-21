/**
 * SVG Path Extractor - Tool để tự động lấy path D và viewBox từ file SVG
 */

export interface SvgPathData {
  pathD: string;
  viewBox: {
    width: number;
    height: number;
  };
  originalViewBox?: string;
}

/**
 * Lấy path D và viewBox từ chuỗi SVG
 */
export function extractSvgPath(svgContent: string): SvgPathData | null {
  try {
    // Parse SVG content
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');

    if (!svgElement) {
      throw new Error('Không tìm thấy element SVG');
    }

    // Lấy viewBox
    const viewBox = svgElement.getAttribute('viewBox');
    let width = 0;
    let height = 0;

    if (viewBox) {
      const parts = viewBox.split(' ');
      if (parts.length >= 4) {
        width = parseFloat(parts[2]);
        height = parseFloat(parts[3]);
      }
    } else {
      // Fallback to width/height attributes
      width = parseFloat(svgElement.getAttribute('width') || '0');
      height = parseFloat(svgElement.getAttribute('height') || '0');
    }

    // Tìm path element
    const pathElement = svgElement.querySelector('path');
    if (!pathElement) {
      throw new Error('Không tìm thấy element path trong SVG');
    }

    const pathD = pathElement.getAttribute('d');
    if (!pathD) {
      throw new Error('Không tìm thấy thuộc tính d trong path');
    }

    return {
      pathD,
      viewBox: {width, height},
      originalViewBox: viewBox,
    };
  } catch (error) {
    console.error('Lỗi khi parse SVG:', error);
    return null;
  }
}

/**
 * Tạo code TypeScript cho constant từ SVG path data
 */
export function generateTypeScriptCode(
  svgPathData: SvgPathData,
  shapeName: string,
): string {
  const {pathD, viewBox} = svgPathData;
  const upperShapeName = shapeName.toUpperCase();

  return `// Hình ${shapeName}: path từ ${shapeName}.svg
const ${upperShapeName}_VIEWBOX = {width: ${viewBox.width}, height: ${viewBox.height}};
const ${upperShapeName}_PATH_D = "${pathD}";`;
}

/**
 * Tạo function cho shape từ SVG path data
 */
export function generateShapeFunctions(shapeName: string): string {
  const upperShapeName = shapeName.toUpperCase();
  const capitalizedShapeName =
    shapeName.charAt(0).toUpperCase() + shapeName.slice(1);

  return `
// ===== FUNCTIONS CHO HÌNH ${capitalizedShapeName.toUpperCase()} =====

export function start${capitalizedShapeName}(webRef: RefObject<WebView>, x: number, y: number) {
  startSvgShape(webRef, x, y, ${upperShapeName}_VIEWBOX, ${upperShapeName}_PATH_D, '${shapeName}_temp');
}

export function resize${capitalizedShapeName}(webRef: RefObject<WebView>, diameterPx: number) {
  resizeSvgShape(webRef, ${upperShapeName}_VIEWBOX, ${upperShapeName}_PATH_D, diameterPx, '${shapeName}_temp');
}

export function finalize${capitalizedShapeName}(webRef: RefObject<WebView>, name: string) {
  finalizeSvgPathShape(webRef, name, ${upperShapeName}_VIEWBOX, ${upperShapeName}_PATH_D, '${shapeName}_temp');
}`;
}

/**
 * Tạo toàn bộ code cho một shape mới
 */
export function generateCompleteShapeCode(
  svgPathData: SvgPathData,
  shapeName: string,
): string {
  const constants = generateTypeScriptCode(svgPathData, shapeName);
  const functions = generateShapeFunctions(shapeName);

  return `${constants}${functions}`;
}

/**
 * Lấy path D từ file SVG (cho React Native)
 */
export async function extractSvgPathFromFile(
  filePath: string,
): Promise<SvgPathData | null> {
  try {
    // Trong React Native, bạn có thể sử dụng react-native-fs để đọc file
    // const RNFS = require('react-native-fs');
    // const svgContent = await RNFS.readFile(filePath, 'utf8');

    // Hoặc nếu bạn có SVG content trực tiếp
    // return extractSvgPath(svgContent);

    throw new Error('Cần implement file reading cho React Native');
  } catch (error) {
    console.error('Lỗi khi đọc file SVG:', error);
    return null;
  }
}
