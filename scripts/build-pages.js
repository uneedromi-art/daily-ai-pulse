const { execSync } = require('child_process');

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/daily-ai-pulse';
process.env.NEXT_PUBLIC_BASE_PATH = basePath;

console.log(`[build:pages] NEXT_PUBLIC_BASE_PATH=${basePath}`);
execSync('npm run build', { stdio: 'inherit', env: process.env });
