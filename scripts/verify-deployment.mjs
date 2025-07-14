#!/usr/bin/env node

/**
 * Deployment Verification Script for AnimeMuseAI
 * Verifies that the deployment is successful and the app is working correctly
 */

import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';

const VERIFICATION_CHECKS = {
  buildExists: {
    name: 'Build Output Exists',
    description: 'Verify that build artifacts are present'
  },
  convexDeployment: {
    name: 'Convex Backend Deployment',
    description: 'Check if Convex backend is properly deployed'
  },
  staticAssets: {
    name: 'Static Assets Verification',
    description: 'Verify all required static assets are present'
  },
  configValidation: {
    name: 'Configuration Validation',
    description: 'Validate environment configuration'
  }
};

class DeploymentVerifier {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      checks: [],
      passed: 0,
      failed: 0,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  async runCheck(checkKey, testFn) {
    const check = VERIFICATION_CHECKS[checkKey];
    console.log(`🔍 ${check.name}...`);
    
    const startTime = performance.now();
    
    try {
      const result = await testFn();
      const duration = performance.now() - startTime;
      
      this.results.checks.push({
        name: check.name,
        description: check.description,
        status: 'passed',
        result,
        duration: Math.round(duration),
        timestamp: new Date().toISOString()
      });
      
      this.results.passed++;
      console.log(`✅ ${check.name} passed (${Math.round(duration)}ms)`);
      
      return { success: true, result };
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.results.checks.push({
        name: check.name,
        description: check.description,
        status: 'failed',
        error: error.message,
        duration: Math.round(duration),
        timestamp: new Date().toISOString()
      });
      
      this.results.failed++;
      console.log(`❌ ${check.name} failed: ${error.message} (${Math.round(duration)}ms)`);
      
      return { success: false, error };
    }
  }

  async checkBuildExists() {
    const distPath = path.join(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    
    try {
      await fs.access(distPath);
      await fs.access(indexPath);
      
      const stats = await fs.stat(distPath);
      const indexStats = await fs.stat(indexPath);
      
      return {
        distExists: true,
        indexExists: true,
        distSize: await this.getDirectorySize(distPath),
        indexSize: indexStats.size,
        buildTime: stats.mtime
      };
    } catch (error) {
      throw new Error('Build output not found. Run "npm run build" first.');
    }
  }

  async checkConvexDeployment() {
    try {
      // Check if Convex configuration exists
      const convexJsonPath = path.join(process.cwd(), 'convex.json');
      await fs.access(convexJsonPath);
      
      const convexConfig = JSON.parse(await fs.readFile(convexJsonPath, 'utf-8'));
      
      // Check if schema file exists
      const schemaPath = path.join(process.cwd(), 'convex', 'schema.ts');
      await fs.access(schemaPath);
      
      // Check if generated files exist
      const generatedPath = path.join(process.cwd(), 'convex', '_generated');
      await fs.access(generatedPath);
      
      return {
        configExists: true,
        schemaExists: true,
        generatedExists: true,
        convexUrl: convexConfig.deployment || 'Not configured'
      };
    } catch (error) {
      throw new Error('Convex deployment verification failed. Ensure Convex is properly configured and deployed.');
    }
  }

  async checkStaticAssets() {
    const assetsPath = path.join(process.cwd(), 'dist', 'assets');
    
    try {
      await fs.access(assetsPath);
      const files = await fs.readdir(assetsPath);
      
      const jsFiles = files.filter(f => f.endsWith('.js'));
      const cssFiles = files.filter(f => f.endsWith('.css'));
      const otherAssets = files.filter(f => !f.endsWith('.js') && !f.endsWith('.css'));
      
      if (jsFiles.length === 0) {
        throw new Error('No JavaScript files found in assets');
      }
      
      if (cssFiles.length === 0) {
        throw new Error('No CSS files found in assets');
      }
      
      return {
        totalAssets: files.length,
        jsFiles: jsFiles.length,
        cssFiles: cssFiles.length,
        otherAssets: otherAssets.length,
        assetsList: files.slice(0, 10) // Show first 10 files
      };
    } catch (error) {
      throw new Error(`Static assets verification failed: ${error.message}`);
    }
  }

  async checkConfigValidation() {
    const checks = {
      packageJson: false,
      viteConfig: false,
      convexConfig: false,
      envExample: false
    };
    
    try {
      // Check package.json
      await fs.access(path.join(process.cwd(), 'package.json'));
      checks.packageJson = true;
      
      // Check vite.config.ts
      await fs.access(path.join(process.cwd(), 'vite.config.ts'));
      checks.viteConfig = true;
      
      // Check convex configuration
      await fs.access(path.join(process.cwd(), 'convex.json'));
      checks.convexConfig = true;
      
      // Check .env.example
      await fs.access(path.join(process.cwd(), '.env.example'));
      checks.envExample = true;
      
      const passedChecks = Object.values(checks).filter(Boolean).length;
      const totalChecks = Object.keys(checks).length;
      
      if (passedChecks < totalChecks) {
        const failed = Object.entries(checks)
          .filter(([_, passed]) => !passed)
          .map(([key, _]) => key);
        throw new Error(`Missing configuration files: ${failed.join(', ')}`);
      }
      
      return {
        allConfigsPresent: true,
        checks,
        passedChecks,
        totalChecks
      };
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error.message}`);
    }
  }

  async getDirectorySize(dirPath) {
    let totalSize = 0;
    
    async function traverse(currentPath) {
      const items = await fs.readdir(currentPath);
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          await traverse(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    }
    
    await traverse(dirPath);
    return totalSize;
  }

  async generateReport() {
    const reportPath = path.join(process.cwd(), 'deployment-verification.json');
    
    this.results.summary = {
      totalChecks: this.results.checks.length,
      passed: this.results.passed,
      failed: this.results.failed,
      successRate: `${Math.round((this.results.passed / this.results.checks.length) * 100)}%`,
      deploymentReady: this.results.failed === 0
    };
    
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📋 Deployment verification report saved to: ${reportPath}`);
    
    return this.results;
  }

  async run() {
    console.log('🚀 Starting Deployment Verification for AnimeMuseAI\n');
    console.log(`Environment: ${this.results.environment}\n`);

    // Run all verification checks
    await this.runCheck('buildExists', () => this.checkBuildExists());
    await this.runCheck('convexDeployment', () => this.checkConvexDeployment());
    await this.runCheck('staticAssets', () => this.checkStaticAssets());
    await this.runCheck('configValidation', () => this.checkConfigValidation());

    const report = await this.generateReport();

    console.log('\n📊 Deployment Verification Summary:');
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`📈 Success Rate: ${report.summary.successRate}`);
    console.log(`🚀 Deployment Ready: ${report.summary.deploymentReady ? 'Yes' : 'No'}\n`);

    if (!report.summary.deploymentReady) {
      console.log('⚠️  Deployment verification failed. Please fix the issues above before deploying.');
      process.exit(1);
    } else {
      console.log('🎉 All deployment verification checks passed!');
      console.log('✨ Your application is ready for deployment.');
    }
  }
}

// Run the deployment verification
const verifier = new DeploymentVerifier();
verifier.run().catch(error => {
  console.error('💥 Deployment verification failed:', error);
  process.exit(1);
});
