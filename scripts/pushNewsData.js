/**
 * 수집된 news.json을 GitHub에 push → Pages 재배포 트리거
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const NEWS_PATH = path.join(ROOT, 'public', 'data', 'news.json');
const CIO_LOG_PATH = path.join(ROOT, 'public', 'data', 'cio-fetch-log.json');
const JOB_LOG_PATH = path.join(ROOT, 'public', 'data', 'daily-job-log.json');
const DATA_FILES = [NEWS_PATH, CIO_LOG_PATH];

function execGit(cmd, options = {}) {
    const result = execSync(cmd, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: options.stdio || ['pipe', 'pipe', 'pipe'],
        ...options,
    });
    if (result == null || result === undefined) return '';
    return String(result).trim();
}

function writeJobLog(entry) {
    const payload = {
        ...entry,
        at: new Date().toISOString(),
    };
    try {
        fs.writeFileSync(JOB_LOG_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    } catch (e) {
        console.warn('[push] job log write failed:', e.message);
    }
    return payload;
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

function getAuthenticatedPushRemote(branch) {
    const token = process.env.GIT_PUSH_TOKEN?.trim();
    if (!token) return null;

    try {
        const origin = execGit('git remote get-url origin');
        const match = origin.match(/github\.com[:/](.+?)(?:\.git)?$/i);
        if (!match) return null;
        const repoPath = match[1].replace(/\.git$/i, '');
        return `https://x-access-token:${token}@github.com/${repoPath}.git`;
    } catch {
        return null;
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
    if (fs.existsSync(JOB_LOG_PATH)) {
        execGit('git add -- public/data/daily-job-log.json');
    }
}

function pushNewsData() {
    if (!isPushEnabled()) {
        const log = writeJobLog({ push: 'skipped', reason: 'PUSH_NEWS=false' });
        console.log('[push] PUSH_NEWS=false — GitHub push 건너뜀');
        return { pushed: false, reason: 'disabled', log };
    }

    if (!fs.existsSync(path.join(ROOT, '.git'))) {
        const log = writeJobLog({ push: 'failed', reason: 'not-a-repo' });
        console.warn('[push] git 저장소가 아닙니다 — push 건너뜀');
        return { pushed: false, reason: 'not-a-repo', log };
    }

    const branch = getTrackingBranch();
    const authRemote = getAuthenticatedPushRemote(branch);
    console.log(`[push] origin/${branch}에 news.json 반영 시도…`);
    if (!authRemote) {
        console.warn('[push] GIT_PUSH_TOKEN 없음 — 예약 작업에서는 push가 실패할 수 있습니다.');
    }

    try {
        syncWithRemote(branch);

        if (!hasDataChanges()) {
            const log = writeJobLog({ push: 'skipped', reason: 'no-changes', branch });
            console.log('[push] 변경 없음 — push 건너뜀');
            return { pushed: false, reason: 'no-changes', log };
        }

        stageDataFiles();

        const date = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        execGit(`git commit -m "chore(data): update daily news (local ${date})"`, { stdio: 'inherit' });

        let stashed = false;
        try {
            execGit('git diff --quiet');
            execGit('git diff --cached --quiet');
        } catch {
            execGit('git stash push -u -m "daily-ai-pulse-auto-stash"', { stdio: 'inherit' });
            stashed = true;
        }

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

        if (stashed) {
            try {
                execGit('git stash pop', { stdio: 'inherit' });
            } catch {
                console.warn('[push] stash pop 충돌 — 수동으로 git stash pop 해주세요.');
            }
        }

        if (authRemote) {
            execGit(`git push ${authRemote} HEAD:${branch}`, { stdio: 'inherit' });
        } else {
            execGit(`git push origin HEAD:${branch}`, { stdio: 'inherit' });
        }

        const log = writeJobLog({ push: 'success', branch, usedToken: Boolean(authRemote) });
        console.log('[push] GitHub push 완료 — Pages 배포가 곧 시작됩니다.');
        return { pushed: true, branch, log };
    } catch (e) {
        const log = writeJobLog({
            push: 'failed',
            branch,
            error: e.message,
            hint: 'GIT_PUSH_TOKEN을 .env.local에 추가하세요 (repo 권한 PAT)',
        });
        throw Object.assign(new Error(e.message), { log });
    }
}

module.exports = { pushNewsData, mergeNewsById, isPushEnabled, writeJobLog };
