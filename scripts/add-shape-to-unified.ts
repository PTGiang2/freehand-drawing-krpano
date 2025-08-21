#!/usr/bin/env node

/**
 * Script để tự động thêm shape mới vào UnifiedShapeHotspot.ts
 * Usage: node scripts/add-shape-to-unified.ts <svg-file> [shape-name]
 */

const fs = require('fs');
const path = require('path');
const { extractSvgPath, generateCompleteShapeCode } = require('./extract-svg-path.js');

function addShapeToUnified(svgFilePath: string, shapeName?: string) {
  try {
    // Đọc file SVG
    const svgContent = fs.readFileSync(svgFilePath, 'utf8');
    
    // Extract path data
    const svgPathData = extractSvgPath(svgContent);
    
    if (!svgPathData) {
      console.error('❌ Không thể parse file SVG');
      process.exit(1);
    }

    // Tạo tên shape
    const finalShapeName = shapeName || path.basename(svgFilePath, '.svg');
    
    // Generate code
    const code = generateCompleteShapeCode(svgPathData, finalShapeName);
    
    // Đọc file UnifiedShapeHotspot.ts
    const unifiedFilePath = path.join(__dirname, '../src/components/drawing/UnifiedShapeHotspot.ts');
    let unifiedContent = fs.readFileSync(unifiedFilePath, 'utf8');
    
    // Tìm vị trí để thêm code (sau phần CÁC HÌNH MẪU)
    const insertMarker = '// ===== CÁC HÌNH MẪU =====';
    const insertIndex = unifiedContent.indexOf(insertMarker);
    
    if (insertIndex === -1) {
      console.error('❌ Không tìm thấy marker "// ===== CÁC HÌNH MẪU =====" trong file');
      process.exit(1);
    }
    
    // Tìm vị trí kết thúc của phần constants
    const endMarker = '// ===== FUNCTIONS CHO HÌNH TRÒN =====';
    const endIndex = unifiedContent.indexOf(endMarker);
    
    if (endIndex === -1) {
      console.error('❌ Không tìm thấy marker "// ===== FUNCTIONS CHO HÌNH TRÒN =====" trong file');
      process.exit(1);
    }
    
    // Chèn code vào giữa
    const beforeConstants = unifiedContent.substring(0, endIndex);
    const afterConstants = unifiedContent.substring(endIndex);
    
    const newContent = beforeConstants + '\n' + code + '\n' + afterConstants;
    
    // Backup file cũ
    const backupPath = unifiedFilePath + '.backup';
    fs.writeFileSync(backupPath, unifiedContent);
    
    // Ghi file mới
    fs.writeFileSync(unifiedFilePath, newContent);
    
    console.log('✅ Đã thêm shape thành công!');
    console.log('📁 File backup:', backupPath);
    console.log('📝 Shape name:', finalShapeName);
    console.log('📏 ViewBox:', svgPathData.viewBox.width, 'x', svgPathData.viewBox.height);
    console.log('');
    console.log('💡 Bạn có thể sử dụng các function sau:');
    console.log(`   - start${finalShapeName.charAt(0).toUpperCase() + finalShapeName.slice(1)}()`);
    console.log(`   - resize${finalShapeName.charAt(0).toUpperCase() + finalShapeName.slice(1)}()`);
    console.log(`   - finalize${finalShapeName.charAt(0).toUpperCase() + finalShapeName.slice(1)}()`);
    
  } catch (error) {
    console.error('❌ Lỗi:', (error as Error).message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node scripts/add-shape-to-unified.ts <svg-file> [shape-name]');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/add-shape-to-unified.ts src/assets/svg/star.svg star');
    console.log('  node scripts/add-shape-to-unified.ts src/assets/svg/arrow.svg arrow');
    console.log('');
    console.log('Script sẽ tự động thêm shape vào UnifiedShapeHotspot.ts');
    process.exit(1);
  }

  const svgFilePath = args[0];
  const shapeName = args[1];
  
  addShapeToUnified(svgFilePath, shapeName);
}

// Chạy script
if (require.main === module) {
  main();
}

module.exports = { addShapeToUnified };
