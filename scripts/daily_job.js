/**
 * 매일 실행: 뉴스 수집 → 알림
 * 사용: npm run daily
 */

const { execSync } = require('child_process');
const path = require('path');
const { loadEnvLocal } = require('./translateKo');
const { notifyDailySummary } = require('./notify');
const { pushNewsData } = require('./pushNewsData');

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

    try {
        pushNewsData();
    } catch (e) {
        console.warn('[push] GitHub push 실패 (알림은 계속):', e.message);
        console.warn('[push] git 로그인/credential 확인 후 수동 push: git push origin main');
    }

    await notifyDailySummary();

    console.log('완료.');
}

run();
