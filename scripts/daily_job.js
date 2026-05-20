/**
 * 매일 실행: 뉴스 수집 → 알림
 * 사용: npm run daily
 */

const { execSync } = require('child_process');
const path = require('path');
const { loadEnvLocal } = require('./translateKo');
const { notifyDailySummary } = require('./notify');

loadEnvLocal();

async function run() {
    console.log('=== Daily AI Pulse Job ===');
    console.log(`시작: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (KST)\n`);

    try {
        execSync('node scripts/fetch_news.js', {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit',
            env: process.env,
        });
    } catch (e) {
        console.error('뉴스 수집 실패:', e.message);
        process.exitCode = 1;
    }

    await notifyDailySummary();

    console.log('완료.');
}

run();
