#!/usr/bin/env node

/**
 * Asset Validation Script
 * Validates that all assets referenced in the manifest exist and are valid
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = __dirname;
const MANIFEST_PATH = path.join(ASSETS_DIR, 'assets-manifest.json');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateImageFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    
    // Check PNG signature (first 8 bytes)
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const fileSignature = buffer.slice(0, 8);
    
    if (!pngSignature.equals(fileSignature)) {
      return { valid: false, error: 'Not a valid PNG file (invalid signature)' };
    }
    
    // Get image dimensions from IHDR chunk
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    
    return { 
      valid: true, 
      dimensions: `${width}x${height}`,
      size: buffer.length 
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function validateManifest() {
  // Check if manifest exists
  if (!fs.existsSync(MANIFEST_PATH)) {
    log('❌ Manifest file not found!', 'red');
    return false;
  }
  
  log('\n📋 Loading asset manifest...', 'cyan');
  
  let manifest;
  try {
    const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
    manifest = JSON.parse(manifestContent);
  } catch (error) {
    log(`❌ Failed to parse manifest: ${error.message}`, 'red');
    return false;
  }
  
  log(`✅ Manifest loaded (version ${manifest.version})`, 'green');
  
  return manifest;
}

function validateAssets(manifest) {
  log('\n🔍 Validating assets...', 'cyan');
  
  let totalAssets = 0;
  let validAssets = 0;
  let missingAssets = 0;
  let invalidAssets = 0;
  const issues = [];
  
  // Iterate through categories
  for (const [categoryName, category] of Object.entries(manifest.categories)) {
    log(`\n📁 Category: ${categoryName}`, 'blue');
    log(`   Path: ${category.path}`, 'blue');
    
    for (const asset of category.assets) {
      totalAssets++;
      const assetPath = path.join(ASSETS_DIR, categoryName, asset.filename);
      
      // Check if file exists
      if (!fs.existsSync(assetPath)) {
        missingAssets++;
        const msg = `   ❌ Missing: ${asset.filename} (${asset.id})`;
        log(msg, 'red');
        issues.push({ type: 'missing', category: categoryName, asset: asset.id, file: asset.filename });
        continue;
      }
      
      // Validate image file
      const validation = validateImageFile(assetPath);
      
      if (!validation.valid) {
        invalidAssets++;
        const msg = `   ❌ Invalid: ${asset.filename} - ${validation.error}`;
        log(msg, 'red');
        issues.push({ type: 'invalid', category: categoryName, asset: asset.id, error: validation.error });
        continue;
      }
      
      // Check dimensions match
      if (asset.dimensions && validation.dimensions !== asset.dimensions) {
        const msg = `   ⚠️  Dimension mismatch: ${asset.filename} (expected ${asset.dimensions}, got ${validation.dimensions})`;
        log(msg, 'yellow');
        issues.push({ 
          type: 'warning', 
          category: categoryName, 
          asset: asset.id, 
          message: `Dimension mismatch: expected ${asset.dimensions}, got ${validation.dimensions}` 
        });
      }
      
      // Check required metadata
      const requiredFields = ['id', 'filename', 'type', 'purpose', 'format', 'license'];
      const missingFields = requiredFields.filter(field => !asset[field]);
      
      if (missingFields.length > 0) {
        const msg = `   ⚠️  Missing metadata in ${asset.filename}: ${missingFields.join(', ')}`;
        log(msg, 'yellow');
        issues.push({ 
          type: 'warning', 
          category: categoryName, 
          asset: asset.id, 
          message: `Missing metadata fields: ${missingFields.join(', ')}` 
        });
      }
      
      validAssets++;
      log(`   ✅ ${asset.filename} (${validation.dimensions}, ${(validation.size / 1024).toFixed(2)} KB)`, 'green');
    }
  }
  
  return {
    total: totalAssets,
    valid: validAssets,
    missing: missingAssets,
    invalid: invalidAssets,
    issues: issues
  };
}

function checkOrphanedFiles(manifest) {
  log('\n🔍 Checking for orphaned files...', 'cyan');
  
  const orphanedFiles = [];
  const excludePatterns = ['.py', '.js', '.json', '.md', '.txt', '.sh'];
  
  for (const [categoryName, category] of Object.entries(manifest.categories)) {
    const categoryDir = path.join(ASSETS_DIR, categoryName);
    
    if (!fs.existsSync(categoryDir)) {
      continue;
    }
    
    const files = fs.readdirSync(categoryDir);
    const manifestFiles = category.assets.map(a => a.filename);
    
    for (const file of files) {
      // Skip excluded patterns
      if (excludePatterns.some(pattern => file.endsWith(pattern))) {
        continue;
      }
      
      if (!manifestFiles.includes(file)) {
        orphanedFiles.push({ category: categoryName, file });
        log(`   ⚠️  Orphaned file: ${categoryName}/${file} (not in manifest)`, 'yellow');
      }
    }
  }
  
  if (orphanedFiles.length === 0) {
    log('   ✅ No orphaned files found', 'green');
  }
  
  return orphanedFiles;
}

function generateReport(results, orphanedFiles) {
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 VALIDATION REPORT', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\nTotal Assets: ${results.total}`);
  log(`Valid: ${results.valid}`, results.valid === results.total ? 'green' : 'yellow');
  log(`Missing: ${results.missing}`, results.missing > 0 ? 'red' : 'green');
  log(`Invalid: ${results.invalid}`, results.invalid > 0 ? 'red' : 'green');
  log(`Orphaned Files: ${orphanedFiles.length}`, orphanedFiles.length > 0 ? 'yellow' : 'green');
  
  // Summary by issue type
  const warnings = results.issues.filter(i => i.type === 'warning').length;
  const errors = results.missing + results.invalid;
  
  log(`\nWarnings: ${warnings}`, warnings > 0 ? 'yellow' : 'green');
  log(`Errors: ${errors}`, errors > 0 ? 'red' : 'green');
  
  // Overall status
  log('\n' + '='.repeat(60), 'cyan');
  if (errors === 0 && warnings === 0 && orphanedFiles.length === 0) {
    log('✅ ALL CHECKS PASSED!', 'green');
  } else if (errors === 0) {
    log('⚠️  VALIDATION PASSED WITH WARNINGS', 'yellow');
  } else {
    log('❌ VALIDATION FAILED', 'red');
  }
  log('='.repeat(60), 'cyan');
  
  // Exit code
  return errors === 0 ? 0 : 1;
}

function main() {
  log('🎮 MMO Asset Validation Tool', 'cyan');
  log('='.repeat(60), 'cyan');
  
  // Validate manifest
  const manifest = validateManifest();
  if (!manifest) {
    process.exit(1);
  }
  
  // Validate assets
  const results = validateAssets(manifest);
  
  // Check for orphaned files
  const orphanedFiles = checkOrphanedFiles(manifest);
  
  // Generate report
  const exitCode = generateReport(results, orphanedFiles);
  
  // Save report to file
  const report = {
    timestamp: new Date().toISOString(),
    results: results,
    orphanedFiles: orphanedFiles,
    summary: {
      passed: exitCode === 0,
      errors: results.missing + results.invalid,
      warnings: results.issues.filter(i => i.type === 'warning').length
    }
  };
  
  const reportPath = path.join(ASSETS_DIR, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Full report saved to: validation-report.json`, 'cyan');
  
  process.exit(exitCode);
}

main();
