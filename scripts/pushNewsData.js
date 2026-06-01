/**
 * 수집된 news.json을 GitHub에 push → Pages 재배포 트리거
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const NEWS_PATH = path.join(ROOT, 'public', 'data', 'news.json');
const CIO_LOG_PATH = path.join(ROOT, 'public', 'data', 'cio-fetch-log.json');
const DATA_FILES = [NEWS_PATH, CIO_LOG_PATH];

function execGit(cmd, options = {}) {
    return execSync(cmd, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: options.stdio || ['pipe', 'pipe', 'pipe'],
        ...options,
    }).trim();
}

function isPushEnabled() {
    if (process.env.PUSH_NEWS === 'false') return false;
    return true;
}

function getTrackingBranch() {
    try {
        const branch = execGit('git rev-parse --abbrev-ref HEAD');
        const upstream = execGit(`git rev-parse --abbrev-ref ${branch}@{upstream}`);
        return upstream.replace(/^origin\//, '');
    } catch {
        return 'main';
    }
}

function readJsonFile(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, data) {
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function mergeNewsById(localPosts, remotePosts) {
    const map = new Map();
    for (const post of remotePosts || []) {
        if (post?.id) map.set(post.id, post);
    }
    for (const post of localPosts || []) {
        if (post?.id) map.set(post.id, post);
    }
    return [...map.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function syncWithRemote(branch) {
    execGit('git fetch origin', { stdio: 'inherit' });

    let remoteNews = [];
    try {
        const raw = execGit(`git show origin/${branch}:public/data/news.json`);
        remoteNews = JSON.parse(raw);
    } catch {
        /* remote에 파일 없음 */
    }

    const localNews = readJsonFile(NEWS_PATH) || [];
    const merged = mergeNewsById(localNews, remoteNews);
    writeJsonFile(NEWS_PATH, merged);

    console.log(`[push] news.json 병합: local ${localNews.length} + remote ${remoteNews.length} → ${merged.length}건`);
}

function fileChanged(relPath) {
    try {
        execGit(`git diff --quiet HEAD -- ${relPath}`);
        return false;
    } catch {
        return true;
    }
}

function hasDataChanges() {
    for (const file of DATA_FILES) {
        if (!fs.existsSync(file)) continue;
        const rel = path.relative(ROOT, file).replace(/\\/g, '/');
        if (fileChanged(rel)) return true;
    }
    return false;
}

function stageDataFiles() {
    for (const file of DATA_FILES) {
        if (fs.existsSync(file)) {
            const rel = path.relative(ROOT, file).replace(/\\/g, '/');
            execGit(`git add -- ${rel}`);
        }
    }
}

function pushNewsData() {
    if (!isPushEnabled()) {
        console.log('[push] PUSH_NEWS=false — GitHub push 건너뜀');
        return { pushed: false, reason: 'disabled' };
    }

    if (!fs.existsSync(path.join(ROOT, '.git'))) {
        console.warn('[push] git 저장소가 아닙니다 — push 건너뜀');
        return { pushed: false, reason: 'not-a-repo' };
    }

    const branch = getTrackingBranch();
    console.log(`[push] origin/${branch}에 news.json 반영 시도…`);

    syncWithRemote(branch);

    if (!hasDataChanges()) {
        console.log('[push] 변경 없음 — push 건너뜀');
        return { pushed: false, reason: 'no-changes' };
    }

    stageDataFiles();

    const date = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    execGit(`git commit -m "chore(data): update daily news (local ${date})"`, { stdio: 'inherit' });

    try {
        execGit(`git pull --rebase origin ${branch}`, { stdio: 'inherit' });
    } catch {
        console.warn('[push] rebase 충돌 — news.json 재병합');
        try {
            execGit('git rebase --abort');
        } catch {
            /* ignore */
        }
        syncWithRemote(branch);
        if (hasDataChanges()) {
            stageDataFiles();
            execGit(`git commit -m "chore(data): update daily news (local merge ${date})"`, { stdio: 'inherit' });
        }
        execGit(`git pull --rebase origin ${branch}`, { stdio: 'inherit' });
    }

    execGit(`git push origin HEAD:${branch}`, { stdio: 'inherit' });
    console.log('[push] GitHub push 완료 — Pages 배포가 곧 시작됩니다.');
    return { pushed: true, branch };
}

module.exports = { pushNewsData, mergeNewsById, isPushEnabled };
