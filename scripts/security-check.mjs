#!/usr/bin/env node

/**
 * Security Audit Script for AnimeMuseAI
 * Checks for common security vulnerabilities and best practices
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const SECURITY_RULES = {
  // File patterns that should not be committed
  sensitiveFiles: [
    '.env',
    '.env.local',
    '.env.production',
    'private.key',
    '*.pem',
    'secrets.json'
  ],
  
  // Patterns to check in source code
  codePatterns: [
    {
      pattern: /(api[_-]?key|apikey)\s*[:=]\s*['"][\w-]+['"]/gi,
      message: 'Potential API key exposure'
    },
    {
      pattern: /(password|pwd|pass)\s*[:=]\s*['"][\w-]+['"]/gi,
      message: 'Potential hardcoded password'
    },
    {
      pattern: /console\.log\(/gi,
      message: 'Console.log statements should be removed in production',
      warning: true
    },
    {
      pattern: /debugger;?/gi,
      message: 'Debugger statements should be removed in production'
    },
    {
      pattern: /eval\s*\(/gi,
      message: 'Use of eval() poses security risks'
    },
    {
      pattern: /innerHTML\s*=/gi,
      message: 'Direct innerHTML assignment can lead to XSS vulnerabilities',
      warning: true
    }
  ]
};

class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.checkedFiles = 0;
  }

  async checkFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      for (const rule of SECURITY_RULES.codePatterns) {
        const matches = content.match(rule.pattern);
        if (matches) {
          const issue = {
            file: relativePath,
            issue: rule.message,
            matches: matches.slice(0, 3), // Limit matches to avoid spam
            line: this.getLineNumber(content, matches[0])
          };
          
          if (rule.warning) {
            this.warnings.push(issue);
          } else {
            this.issues.push(issue);
          }
        }
      }
      
      this.checkedFiles++;
    } catch (error) {
      // Skip files that can't be read
    }
  }

  getLineNumber(content, match) {
    const lines = content.substring(0, content.indexOf(match)).split('\n');
    return lines.length;
  }

  async checkSensitiveFiles() {
    const sensitiveFound = [];
    
    for (const pattern of SECURITY_RULES.sensitiveFiles) {
      try {
        const files = await this.findFiles(pattern);
        if (files.length > 0) {
          sensitiveFound.push(...files);
        }
      } catch (error) {
        // Pattern not found
      }
    }
    
    return sensitiveFound;
  }

  async findFiles(pattern) {
    try {
      const command = process.platform === 'win32' 
        ? `dir /s /b "${pattern}" 2>nul` 
        : `find . -name "${pattern}" 2>/dev/null`;
      
      const output = execSync(command, { encoding: 'utf-8' });
      return output.trim().split('\n').filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  async checkGitIgnore() {
    try {
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      const content = await fs.readFile(gitignorePath, 'utf-8');
      
      const requiredPatterns = ['.env*', 'node_modules/', 'dist/', '*.log'];
      const missing = requiredPatterns.filter(pattern => !content.includes(pattern));
      
      return missing;
    } catch (error) {
      return ['No .gitignore file found'];
    }
  }

  async checkPackageVulnerabilities() {
    try {
      const auditOutput = execSync('npm audit --audit-level=moderate --json', { 
        encoding: 'utf-8',
        timeout: 30000 
      });
      const audit = JSON.parse(auditOutput);
      
      return {
        vulnerabilities: audit.metadata?.vulnerabilities || {},
        totalVulnerabilities: audit.metadata?.vulnerabilities?.total || 0
      };
    } catch (error) {
      return {
        vulnerabilities: {},
        totalVulnerabilities: 0,
        error: 'Could not run npm audit'
      };
    }
  }

  async scanSourceFiles() {
    const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    const directories = ['src', 'convex'];
    
    for (const dir of directories) {
      try {
        await this.scanDirectory(path.join(process.cwd(), dir), sourceExtensions);
      } catch (error) {
        console.log(`⚠️  Could not scan directory: ${dir}`);
      }
    }
  }

  async scanDirectory(dirPath, extensions) {
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          await this.scanDirectory(itemPath, extensions);
        } else if (stats.isFile()) {
          const ext = path.extname(item);
          if (extensions.includes(ext)) {
            await this.checkFile(itemPath);
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }

  async generateReport() {
    const reportPath = path.join(process.cwd(), 'security-report.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        filesScanned: this.checkedFiles,
        criticalIssues: this.issues.length,
        warnings: this.warnings.length,
        totalFindings: this.issues.length + this.warnings.length
      },
      criticalIssues: this.issues,
      warnings: this.warnings,
      recommendations: [
        'Remove console.log statements from production code',
        'Use environment variables for sensitive configuration',
        'Implement Content Security Policy (CSP) headers',
        'Enable HTTPS in production',
        'Regularly update dependencies to patch vulnerabilities',
        'Use sanitization libraries for user input'
      ]
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📋 Security report saved to: ${reportPath}`);
    
    return report;
  }

  async run() {
    console.log('🔒 Starting Security Audit for AnimeMuseAI\n');

    // Check for sensitive files
    console.log('🔍 Checking for sensitive files...');
    const sensitiveFiles = await this.checkSensitiveFiles();
    if (sensitiveFiles.length > 0) {
      console.log('⚠️  Found sensitive files:');
      sensitiveFiles.forEach(file => console.log(`   - ${file}`));
    }

    // Check .gitignore
    console.log('📄 Checking .gitignore configuration...');
    const missingGitIgnore = await this.checkGitIgnore();
    if (missingGitIgnore.length > 0) {
      console.log('⚠️  Missing .gitignore patterns:');
      missingGitIgnore.forEach(pattern => console.log(`   - ${pattern}`));
    }

    // Check package vulnerabilities
    console.log('📦 Checking npm vulnerabilities...');
    const vulnerabilities = await this.checkPackageVulnerabilities();
    if (vulnerabilities.totalVulnerabilities > 0) {
      console.log(`⚠️  Found ${vulnerabilities.totalVulnerabilities} vulnerabilities`);
    } else {
      console.log('✅ No known vulnerabilities found');
    }

    // Scan source files
    console.log('🔎 Scanning source files for security issues...');
    await this.scanSourceFiles();

    const report = await this.generateReport();

    console.log('\n🔒 Security Audit Summary:');
    console.log(`📁 Files Scanned: ${report.summary.filesScanned}`);
    console.log(`🚨 Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`📊 Total Findings: ${report.summary.totalFindings}\n`);

    if (report.summary.criticalIssues > 0) {
      console.log('🚨 Critical security issues found:');
      this.issues.forEach(issue => {
        console.log(`   ${issue.file}:${issue.line} - ${issue.issue}`);
      });
      console.log('\n⚠️  Please address these issues before deployment.');
      process.exit(1);
    } else if (report.summary.warnings > 0) {
      console.log('⚠️  Warnings found (consider addressing):');
      this.warnings.slice(0, 5).forEach(warning => {
        console.log(`   ${warning.file}:${warning.line} - ${warning.issue}`);
      });
      console.log('✅ No critical security issues found.');
    } else {
      console.log('🎉 No security issues found!');
    }
  }
}

// Run the security audit
const auditor = new SecurityAuditor();
auditor.run().catch(error => {
  console.error('💥 Security audit failed:', error);
  process.exit(1);
});
