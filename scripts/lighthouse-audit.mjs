#!/usr/bin/env node

/**
 * Lighthouse Performance Audit Script
 * Runs automated Lighthouse audits for performance, accessibility, and best practices
 */

import lighthouse from 'lighthouse';
import { launch } from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0
    },
    emulatedFormFactor: 'mobile',
    audits: [
      'first-contentful-paint',
      'largest-contentful-paint',
      'cumulative-layout-shift',
      'total-blocking-time',
      'speed-index'
    ]
  }
};

const PERFORMANCE_THRESHOLDS = {
  performance: 80,
  accessibility: 90,
  'best-practices': 80,
  seo: 80,
  'first-contentful-paint': 2000, // 2 seconds
  'largest-contentful-paint': 4000, // 4 seconds
  'cumulative-layout-shift': 0.1,
  'total-blocking-time': 300 // 300ms
};

class LighthouseAuditor {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      audits: [],
      summary: {}
    };
  }

  async runAudit(url) {
    console.log(`🔍 Running Lighthouse audit for: ${url}`);
    
    let browser;
    try {
      browser = await launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-dev-shm-usage']
      });

      const result = await lighthouse(url, {
        port: new URL(browser.wsEndpoint()).port,
        output: 'json',
        logLevel: 'info'
      }, LIGHTHOUSE_CONFIG);

      if (!result) {
        throw new Error('Lighthouse audit failed to run');
      }

      return this.processResults(result.lhr, url);
    } catch (error) {
      console.error(`❌ Lighthouse audit failed:`, error.message);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  processResults(lhr, url) {
    const audit = {
      url,
      timestamp: new Date().toISOString(),
      scores: {},
      metrics: {},
      recommendations: []
    };

    // Extract category scores
    for (const [categoryId, category] of Object.entries(lhr.categories)) {
      const score = Math.round(category.score * 100);
      audit.scores[categoryId] = score;
      
      const threshold = PERFORMANCE_THRESHOLDS[categoryId];
      const passed = threshold ? score >= threshold : true;
      
      console.log(`${passed ? '✅' : '❌'} ${category.title}: ${score}/100`);
      
      if (!passed) {
        audit.recommendations.push({
          category: categoryId,
          issue: `${category.title} score (${score}) is below threshold (${threshold})`,
          suggestions: this.getCategorySuggestions(categoryId)
        });
      }
    }

    // Extract key metrics
    const metrics = [
      'first-contentful-paint',
      'largest-contentful-paint',
      'cumulative-layout-shift',
      'total-blocking-time',
      'speed-index'
    ];

    for (const metricId of metrics) {
      if (lhr.audits[metricId]) {
        const auditData = lhr.audits[metricId];
        const value = auditData.numericValue;
        const displayValue = auditData.displayValue;
        
        audit.metrics[metricId] = {
          value,
          displayValue,
          score: auditData.score ? Math.round(auditData.score * 100) : 0
        };

        const threshold = PERFORMANCE_THRESHOLDS[metricId];
        if (threshold && value > threshold) {
          audit.recommendations.push({
            metric: metricId,
            issue: `${auditData.title} (${displayValue}) exceeds threshold`,
            threshold: threshold,
            suggestions: this.getMetricSuggestions(metricId)
          });
        }
      }
    }

    this.results.audits.push(audit);
    return audit;
  }

  getCategorySuggestions(categoryId) {
    const suggestions = {
      performance: [
        'Optimize images and use modern formats (WebP, AVIF)',
        'Minimize JavaScript bundle size',
        'Enable text compression (gzip/brotli)',
        'Use efficient caching strategies',
        'Preload critical resources'
      ],
      accessibility: [
        'Add alt text to images',
        'Ensure sufficient color contrast',
        'Use semantic HTML elements',
        'Add keyboard navigation support',
        'Include proper ARIA labels'
      ],
      'best-practices': [
        'Use HTTPS in production',
        'Avoid deprecated APIs',
        'Ensure no console errors',
        'Use modern JavaScript features',
        'Implement proper error handling'
      ],
      seo: [
        'Add meta descriptions',
        'Use proper heading hierarchy',
        'Include structured data',
        'Ensure mobile-friendly design',
        'Optimize page titles'
      ]
    };

    return suggestions[categoryId] || [];
  }

  getMetricSuggestions(metricId) {
    const suggestions = {
      'first-contentful-paint': [
        'Optimize server response time',
        'Minimize render-blocking resources',
        'Use resource hints (preload, prefetch)',
        'Optimize web fonts loading'
      ],
      'largest-contentful-paint': [
        'Optimize largest image or text block',
        'Use efficient image formats',
        'Implement lazy loading',
        'Minimize CSS and JavaScript'
      ],
      'cumulative-layout-shift': [
        'Set size attributes on images and videos',
        'Reserve space for ad slots',
        'Use transform animations instead of layout changes',
        'Preload fonts to avoid font swapping'
      ],
      'total-blocking-time': [
        'Split large JavaScript bundles',
        'Use code splitting and lazy loading',
        'Minimize main thread work',
        'Remove unused JavaScript'
      ]
    };

    return suggestions[metricId] || [];
  }

  async generateReport() {
    const reportPath = path.join(process.cwd(), 'lighthouse-report.json');
    const htmlReportPath = path.join(process.cwd(), 'lighthouse-report.html');
    
    // Calculate summary
    if (this.results.audits.length > 0) {
      const latestAudit = this.results.audits[this.results.audits.length - 1];
      
      this.results.summary = {
        totalAudits: this.results.audits.length,
        latestScores: latestAudit.scores,
        averagePerformance: Math.round(
          this.results.audits.reduce((sum, audit) => sum + (audit.scores.performance || 0), 0) / this.results.audits.length
        ),
        totalRecommendations: latestAudit.recommendations.length,
        passed: Object.values(latestAudit.scores).every(score => score >= 80)
      };
    }

    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`📊 Lighthouse report saved to: ${reportPath}`);
    
    return this.results;
  }

  async runPreviewAudit() {
    console.log('🚀 Starting Lighthouse audit on preview server...\n');
    
    // Try to run preview server audit
    try {
      // Check if preview is available on default port
      const previewUrl = 'http://localhost:4173';
      const audit = await this.runAudit(previewUrl);
      
      console.log('\n📊 Lighthouse Audit Results:');
      console.log(`🌐 URL: ${audit.url}`);
      
      Object.entries(audit.scores).forEach(([category, score]) => {
        const threshold = PERFORMANCE_THRESHOLDS[category] || 80;
        const status = score >= threshold ? '✅' : '❌';
        console.log(`${status} ${category}: ${score}/100`);
      });
      
      if (audit.recommendations.length > 0) {
        console.log('\n🔧 Recommendations:');
        audit.recommendations.slice(0, 5).forEach(rec => {
          console.log(`   • ${rec.issue}`);
        });
      }
      
      await this.generateReport();
      
      return audit;
    } catch (error) {
      console.log('⚠️  Could not run audit on preview server.');
      console.log('📝 To run Lighthouse audit:');
      console.log('   1. Run: npm run preview');
      console.log('   2. In another terminal: npm run performance:lighthouse');
      throw error;
    }
  }
}

// Run the Lighthouse audit
const auditor = new LighthouseAuditor();
auditor.runPreviewAudit().catch(error => {
  console.error('💥 Lighthouse audit failed:', error.message);
  process.exit(1);
});
