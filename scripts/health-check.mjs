#!/usr/bin/env node

/**
 * Health Check Script for AnimeMuseAI
 * Comprehensive health check for the application
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

class HealthChecker {
  constructor() {
    this.checks = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runCheck(name, checkFn) {
    console.log(`🔍 Checking ${name}...`);
    
    try {
      const result = await checkFn();
      this.checks.push({ name, status: 'passed', result });
      this.passed++;
      console.log(`✅ ${name}: OK`);
      return true;
    } catch (error) {
      this.checks.push({ name, status: 'failed', error: error.message });
      this.failed++;
      console.log(`❌ ${name}: ${error.message}`);
      return false;
    }
  }

  async checkNodeVersion() {
    const version = process.version;
    const majorVersion = parseInt(version.substring(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error(`Node.js version ${version} is not supported. Please use Node.js 18 or higher.`);
    }
    
    return `Node.js ${version} (✓ supported)`;
  }

  async checkDependencies() {
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      
      // Check if node_modules exists
      await fs.access('node_modules');
      
      // Check critical dependencies
      const criticalDeps = ['react', 'convex', '@convex-dev/auth'];
      const missingDeps = [];
      
      for (const dep of criticalDeps) {
        try {
          await fs.access(path.join('node_modules', dep));
        } catch {
          missingDeps.push(dep);
        }
      }
      
      if (missingDeps.length > 0) {
        throw new Error(`Missing critical dependencies: ${missingDeps.join(', ')}`);
      }
      
      return `All critical dependencies installed`;
    } catch (error) {
      throw new Error(`Dependency check failed: ${error.message}`);
    }
  }

  async checkBuildSystem() {
    try {
      // Check if TypeScript can compile
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      
      // Check if Vite config is valid
      await fs.access('vite.config.ts');
      
      return 'Build system configuration valid';
    } catch (error) {
      throw new Error(`Build system check failed: ${error.message}`);
    }
  }

  async checkConvexSetup() {
    try {
      // Check Convex configuration
      await fs.access('convex.json');
      await fs.access('convex/schema.ts');
      
      // Check if generated files exist
      const generatedPath = 'convex/_generated';
      await fs.access(generatedPath);
      
      return 'Convex setup is valid';
    } catch (error) {
      throw new Error('Convex setup incomplete. Run "npx convex dev" first.');
    }
  }

  async checkEnvironment() {
    try {
      // Check if .env.example exists
      await fs.access('.env.example');
      
      // Check if essential environment variables are documented
      const envExample = await fs.readFile('.env.example', 'utf-8');
      const requiredVars = ['VITE_CONVEX_URL'];
      
      const missingVars = requiredVars.filter(varName => !envExample.includes(varName));
      
      if (missingVars.length > 0) {
        throw new Error(`Missing environment variables in .env.example: ${missingVars.join(', ')}`);
      }
      
      return 'Environment configuration documented';
    } catch (error) {
      throw new Error(`Environment check failed: ${error.message}`);
    }
  }

  async checkGitConfiguration() {
    try {
      // Check if .gitignore exists and has essential patterns
      const gitignore = await fs.readFile('.gitignore', 'utf-8');
      const essentialPatterns = ['node_modules', '.env', 'dist'];
      
      const missingPatterns = essentialPatterns.filter(pattern => !gitignore.includes(pattern));
      
      if (missingPatterns.length > 0) {
        throw new Error(`Missing .gitignore patterns: ${missingPatterns.join(', ')}`);
      }
      
      return 'Git configuration is correct';
    } catch (error) {
      throw new Error(`Git configuration check failed: ${error.message}`);
    }
  }

  async checkSecurity() {
    try {
      // Run basic npm audit
      const auditResult = execSync('npm audit --audit-level=high', { encoding: 'utf-8' });
      
      if (auditResult.includes('vulnerabilities')) {
        const lines = auditResult.split('\n');
        const vulnLine = lines.find(line => line.includes('vulnerabilities'));
        if (vulnLine && !vulnLine.includes('0 vulnerabilities')) {
          throw new Error(`Security vulnerabilities found: ${vulnLine.trim()}`);
        }
      }
      
      return 'No high-severity vulnerabilities found';
    } catch (error) {
      if (error.status === 1 && error.stdout) {
        throw new Error('High-severity vulnerabilities found. Run "npm audit fix"');
      }
      throw new Error(`Security check failed: ${error.message}`);
    }
  }

  async run() {
    console.log('🏥 Running Health Check for AnimeMuseAI\n');

    // Run all health checks
    await this.runCheck('Node.js Version', () => this.checkNodeVersion());
    await this.runCheck('Dependencies', () => this.checkDependencies());
    await this.runCheck('Build System', () => this.checkBuildSystem());
    await this.runCheck('Convex Setup', () => this.checkConvexSetup());
    await this.runCheck('Environment', () => this.checkEnvironment());
    await this.runCheck('Git Configuration', () => this.checkGitConfiguration());
    await this.runCheck('Security', () => this.checkSecurity());

    // Generate summary
    console.log('\n🏥 Health Check Summary:');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📊 Health Score: ${Math.round((this.passed / (this.passed + this.failed)) * 100)}%\n`);

    if (this.failed === 0) {
      console.log('🎉 All health checks passed! Your application is healthy.');
    } else {
      console.log('⚠️  Some health checks failed. Please address the issues above.');
      process.exit(1);
    }
  }
}

// Run health check
const checker = new HealthChecker();
checker.run().catch(error => {
  console.error('💥 Health check failed:', error);
  process.exit(1);
});
