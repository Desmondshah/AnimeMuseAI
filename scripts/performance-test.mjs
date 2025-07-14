#!/usr/bin/env node

/**
 * Performance Testing Script for AnimeMuseAI
 * Tests application performance under load
 */

import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';

const PERFORMANCE_THRESHOLDS = {
  buildTime: 30000, // 30 seconds
  bundleSize: 2000000, // 2MB
  chunkCount: 15, // Max number of chunks
  cssSize: 500000, // 500KB
};

class PerformanceTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {},
      passed: 0,
      failed: 0
    };
  }

  async runTest(name, testFn, threshold, unit = 'ms') {
    console.log(`🧪 Running ${name}...`);
    const startTime = performance.now();
    
    try {
      const result = await testFn();
      const duration = performance.now() - startTime;
      const passed = threshold ? result <= threshold : true;
      
      this.results.tests.push({
        name,
        result,
        duration,
        threshold,
        unit,
        passed,
        timestamp: new Date().toISOString()
      });

      if (passed) {
        this.results.passed++;
        console.log(`✅ ${name}: ${result}${unit} (${duration.toFixed(2)}ms)`);
      } else {
        this.results.failed++;
        console.log(`❌ ${name}: ${result}${unit} exceeds threshold ${threshold}${unit} (${duration.toFixed(2)}ms)`);
      }

      return { result, duration, passed };
    } catch (error) {
      this.results.failed++;
      console.log(`💥 ${name} failed:`, error.message);
      this.results.tests.push({
        name,
        error: error.message,
        duration: performance.now() - startTime,
        passed: false,
        timestamp: new Date().toISOString()
      });
      return { error, passed: false };
    }
  }

  async testBuildSize() {
    try {
      const distPath = path.join(process.cwd(), 'dist');
      const stats = await this.getDirectorySize(distPath);
      return stats.totalSize;
    } catch (error) {
      throw new Error(`Build output not found. Run 'npm run build' first.`);
    }
  }

  async testChunkCount() {
    try {
      const distPath = path.join(process.cwd(), 'dist', 'assets');
      const files = await fs.readdir(distPath);
      const jsFiles = files.filter(file => file.endsWith('.js'));
      return jsFiles.length;
    } catch (error) {
      throw new Error(`Assets directory not found. Run 'npm run build' first.`);
    }
  }

  async testCSSSize() {
    try {
      const distPath = path.join(process.cwd(), 'dist', 'assets');
      const files = await fs.readdir(distPath);
      const cssFiles = files.filter(file => file.endsWith('.css'));
      
      let totalSize = 0;
      for (const file of cssFiles) {
        const stats = await fs.stat(path.join(distPath, file));
        totalSize += stats.size;
      }
      return totalSize;
    } catch (error) {
      throw new Error(`CSS files not found. Run 'npm run build' first.`);
    }
  }

  async getDirectorySize(dirPath) {
    let totalSize = 0;
    let fileCount = 0;

    async function traverse(currentPath) {
      const items = await fs.readdir(currentPath);
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          await traverse(itemPath);
        } else {
          totalSize += stats.size;
          fileCount++;
        }
      }
    }

    await traverse(dirPath);
    return { totalSize, fileCount };
  }

  async testMemoryUsage() {
    const memUsage = process.memoryUsage();
    return Math.round(memUsage.heapUsed / 1024 / 1024); // MB
  }

  async generateReport() {
    const reportPath = path.join(process.cwd(), 'performance-report.json');
    
    this.results.summary = {
      totalTests: this.results.tests.length,
      passed: this.results.passed,
      failed: this.results.failed,
      successRate: `${Math.round((this.results.passed / this.results.tests.length) * 100)}%`,
      duration: this.results.tests.reduce((sum, test) => sum + (test.duration || 0), 0)
    };

    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📊 Performance report saved to: ${reportPath}`);
    
    return this.results;
  }

  async run() {
    console.log('🚀 Starting Performance Tests for AnimeMuseAI\n');

    // Test build output size
    await this.runTest(
      'Bundle Size', 
      () => this.testBuildSize(), 
      PERFORMANCE_THRESHOLDS.bundleSize, 
      ' bytes'
    );

    // Test chunk count
    await this.runTest(
      'Chunk Count', 
      () => this.testChunkCount(), 
      PERFORMANCE_THRESHOLDS.chunkCount, 
      ' files'
    );

    // Test CSS size
    await this.runTest(
      'CSS Size', 
      () => this.testCSSSize(), 
      PERFORMANCE_THRESHOLDS.cssSize, 
      ' bytes'
    );

    // Test memory usage
    await this.runTest(
      'Memory Usage', 
      () => this.testMemoryUsage(), 
      null, 
      'MB'
    );

    const report = await this.generateReport();

    console.log('\n📈 Performance Test Summary:');
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`📊 Success Rate: ${report.summary.successRate}`);
    console.log(`⏱️  Total Duration: ${report.summary.duration.toFixed(2)}ms\n`);

    if (report.summary.failed > 0) {
      console.log('⚠️  Some performance tests failed. Check the report for details.');
      process.exit(1);
    } else {
      console.log('🎉 All performance tests passed!');
    }
  }
}

// Run the performance tests
const tester = new PerformanceTester();
tester.run().catch(error => {
  console.error('💥 Performance testing failed:', error);
  process.exit(1);
});
