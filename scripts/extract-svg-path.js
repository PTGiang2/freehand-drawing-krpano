#!/usr/bin/env node

/**
 * Script để tự động lấy path D từ file SVG
 * Usage: node scripts/extract-svg-path.js <path-to-svg-file> [shape-name]
 */

const fs = require('fs');
const path = require('path');
const {DOMParser} = require('xmldom');

function extractSvgPath(svgContent) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = doc.getElementsByTagName('svg')[0];

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
    const pathElements = doc.getElementsByTagName('path');
    if (pathElements.length === 0) {
      throw new Error('Không tìm thấy element path trong SVG');
    }

    const pathElement = pathElements[0];
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

function generateTypeScriptCode(svgPathData, shapeName) {
  const {pathD, viewBox} = svgPathData;
  const upperShapeName = shapeName.toUpperCase();

  return `// Hình ${shapeName}: path từ ${shapeName}.svg
const ${upperShapeName}_VIEWBOX = {width: ${viewBox.width}, height: ${viewBox.height}};
const ${upperShapeName}_PATH_D = "${pathD}";`;
}

function generateShapeFunctions(shapeName) {
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

function generateCompleteShapeCode(svgPathData, shapeName) {
  const constants = generateTypeScriptCode(svgPathData, shapeName);
  const functions = generateShapeFunctions(shapeName);

  return `${constants}${functions}`;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(
      'Usage: node scripts/extract-svg-path.js <path-to-svg-file> [shape-name]',
    );
    console.log('');
    console.log('Examples:');
    console.log(
      '  node scripts/extract-svg-path.js src/assets/svg/star.svg star',
    );
    console.log(
      '  node scripts/extract-svg-path.js src/assets/svg/arrow.svg arrow',
    );
    console.log('');
    console.log(
      'Output sẽ là code TypeScript để copy vào UnifiedShapeHotspot.ts',
    );
    process.exit(1);
  }

  const svgFilePath = args[0];
  const shapeName = args[1] || path.basename(svgFilePath, '.svg');

  try {
    // Đọc file SVG
    const svgContent = fs.readFileSync(svgFilePath, 'utf8');

    // Extract path data
    const svgPathData = extractSvgPath(svgContent);

    if (!svgPathData) {
      console.error('❌ Không thể parse file SVG');
      process.exit(1);
    }

    // Generate code
    const code = generateCompleteShapeCode(svgPathData, shapeName);

    console.log('✅ Đã extract thành công từ:', svgFilePath);
    console.log(
      '📏 ViewBox:',
      svgPathData.viewBox.width,
      'x',
      svgPathData.viewBox.height,
    );
    console.log('📝 Path D length:', svgPathData.pathD.length, 'characters');
    console.log('');
    console.log('📋 Code để copy vào UnifiedShapeHotspot.ts:');
    console.log('='.repeat(60));
    console.log(code);
    console.log('='.repeat(60));
    console.log('');
    console.log(
      '💡 Copy code trên vào file UnifiedShapeHotspot.ts sau phần "// ===== CÁC HÌNH MẪU ====="',
    );
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

// Chạy script
if (require.main === module) {
  main();
}

module.exports = {
  extractSvgPath,
  generateTypeScriptCode,
  generateShapeFunctions,
  generateCompleteShapeCode,
};
