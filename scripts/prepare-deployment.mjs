#!/usr/bin/env node

/**
 * Deployment preparation script for AnimeMuseAI
 * This ensures the correct environment variables are set for production
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 Preparing AnimeMuseAI for production deployment...');

// Check if we're in the right directory
if (!fs.existsSync('convex.json')) {
  console.error('❌ Error: convex.json not found. Are you in the project root?');
  process.exit(1);
}

// Read and validate convex.json
const convexConfig = JSON.parse(fs.readFileSync('convex.json', 'utf8'));
console.log('✅ Convex config found');
console.log(`   Production URL: ${convexConfig.prodUrl}`);

// Create .env.production if it doesn't exist
const envProdPath = '.env.production';
const prodEnvContent = `# Production Environment Variables for Vercel
VITE_CONVEX_URL=${convexConfig.prodUrl}
`;

fs.writeFileSync(envProdPath, prodEnvContent);
console.log('✅ Created .env.production file');

// Display Vercel setup instructions
console.log('\n📋 VERCEL SETUP INSTRUCTIONS:');
console.log('1. Go to your Vercel project dashboard');
console.log('2. Navigate to Settings → Environment Variables');
console.log('3. Add the following environment variable:');
console.log(`   Name: VITE_CONVEX_URL`);
console.log(`   Value: ${convexConfig.prodUrl}`);
console.log(`   Environment: Production (and Preview if desired)`);
console.log('\n4. Redeploy your project after adding the environment variable');

console.log('\n🎉 Production deployment preparation complete!');
console.log('\n💡 Remember to run "npx convex deploy" before deploying to Vercel');
