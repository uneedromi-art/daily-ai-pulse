const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function formatKSTDate(dateInput) {
    const date = dateInput ? new Date(dateInput) : new Date();
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().split('T')[0];
}

function getTodaySummary() {
    const newsPath = path.join(process.cwd(), 'public', 'data', 'news.json');
    if (!fs.existsSync(newsPath)) {
        return { date: formatKSTDate(), count: 0, headlines: [], isLatestFallback: false };
    }

    const posts = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
    const today = formatKSTDate();
    let targetDate = today;
    let todayPosts = posts
        .filter((p) => formatKSTDate(p.date) === today)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    let isLatestFallback = false;
    if (todayPosts.length === 0 && posts.length > 0) {
        targetDate = posts.reduce((latest, p) => {
            const d = formatKSTDate(p.date);
            return d > latest ? d : latest;
        }, formatKSTDate(posts[0].date));
        todayPosts = posts
            .filter((p) => formatKSTDate(p.date) === targetDate)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        isLatestFallback = targetDate !== today;
    }

    const headlines = todayPosts.slice(0, 5).map((p) => {
        const text = (p.summary_ko || p.content || '').replace(/\s+/g, ' ').trim();
        return text.length > 80 ? `${text.slice(0, 80)}…` : text;
    });

    return { date: targetDate, count: todayPosts.length, headlines, isLatestFallback, todayKST: today };
}

function buildMessage({ date, count, headlines, isLatestFallback, todayKST }) {
    const lines = [
        `📡 Daily AI Pulse — ${todayKST || date}`,
    ];

    if (isLatestFallback) {
        lines.push(
            `오늘(${todayKST}) 발행된 글은 없습니다. 최신 수집분(${date}) ${count}건입니다.`
        );
    } else if (count > 0) {
        lines.push(`오늘 ${count}건의 AI 뉴스가 업데이트되었습니다.`);
    } else {
        lines.push('수집된 뉴스가 없습니다. fetch 로그를 확인해 보세요.');
    }

    if (headlines.length > 0) {
        lines.push('');
        headlines.forEach((h, i) => lines.push(`${i + 1}. ${h}`));
    } else if (!isLatestFallback) {
        lines.push('', '오늘 수집된 뉴스가 없습니다. 사이트에서 날짜를 확인해 보세요.');
    }

    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    lines.push('', `👉 ${siteUrl}`);

    return lines.join('\n');
}

async function sendDiscord(message) {
    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (!webhook) return false;

    const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message.slice(0, 1900) }),
    });

    if (!res.ok) {
        throw new Error(`Discord webhook ${res.status}`);
    }
    return true;
}

function toUtf16LeBase64(text) {
    return Buffer.from(String(text), 'utf16le').toString('base64');
}

function getSiteUrl() {
    return (process.env.SITE_URL || 'http://localhost:3000').trim();
}

function buildToastBody(summary) {
    const { date, count, headlines } = summary;
    const lead = headlines[0]
        ? headlines[0].replace(/\s+/g, ' ').slice(0, 100)
        : '사이트에서 오늘 뉴스를 확인하세요.';
    return `${date} · 오늘 ${count}건\n${lead}`;
}

function sendWindowsToast(title, body) {
    if (process.platform !== 'win32') return false;
    if (process.env.NOTIFY_WINDOWS === 'false') return false;

    const titleB64 = toUtf16LeBase64(title);
    const bodyB64 = toUtf16LeBase64(body);
    const urlB64 = toUtf16LeBase64(getSiteUrl());
    const actionLabelB64 = toUtf16LeBase64('뉴스 보기');

    // 클릭 시 브라우저 열기: Activated 이벤트 + 하단 버튼(protocol)
    const ps1 = [
        '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
        'function Read-UniB64([string]$s) {',
        '  [System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String($s))',
        '}',
        `$title = [System.Security.SecurityElement]::Escape((Read-UniB64 '${titleB64}'))`,
        `$body  = [System.Security.SecurityElement]::Escape((Read-UniB64 '${bodyB64}'))`,
        `$siteUrl = Read-UniB64 '${urlB64}'`,
        `$actionLabel = [System.Security.SecurityElement]::Escape((Read-UniB64 '${actionLabelB64}'))`,
        '$urlArg = [System.Security.SecurityElement]::Escape($siteUrl)',
        '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null',
        '[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null',
        '$xml = New-Object Windows.Data.Xml.Dom.XmlDocument',
        '$xml.LoadXml([string]::Format(',
        "  '<toast launch=\"{0}\"><visual><binding template=\"{1}\"><text id=\"1\">{2}</text><text id=\"2\">{3}</text></binding></visual><actions><action content=\"{4}\" arguments=\"{0}\" activationType=\"protocol\"/></actions></toast>',",
        '  $urlArg, "ToastText02", $title, $body, $actionLabel))',
        '$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)',
        '$reg = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Daily AI Pulse")',
        '$handler = [Windows.Foundation.TypedEventHandler[Windows.UI.Notifications.ToastNotification, object]]::new({',
        '  param($sender, $e)',
        '  Start-Process $siteUrl',
        '})',
        '$toast.Add_Activated($handler)',
        '$reg.Show($toast)',
    ].join('\n');

    const encoded = Buffer.from(ps1, 'utf16le').toString('base64');
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`, {
        stdio: 'ignore',
    });
    return true;
}

async function notifyDailySummary() {
    const summary = getTodaySummary();
    const message = buildMessage(summary);
    const title = 'Daily AI Pulse';
    const toastBody = buildToastBody(summary);

    console.log('\n--- 알림 내용 ---\n');
    console.log(message);
    console.log('\n----------------\n');

    const results = [];

    try {
        if (await sendDiscord(message)) {
            results.push('discord');
            console.log('[notify] Discord 전송 완료');
        }
    } catch (e) {
        console.warn('[notify] Discord 실패:', e.message);
    }

    try {
        if (sendWindowsToast(title, toastBody)) {
            results.push('windows');
            console.log('[notify] Windows 알림 표시');
        }
    } catch (e) {
        console.warn('[notify] Windows 알림 실패:', e.message);
    }

    if (results.length === 0 && !process.env.DISCORD_WEBHOOK_URL) {
        console.log('[notify] DISCORD_WEBHOOK_URL 또는 Windows 알림을 설정하세요.');
    }

    return { summary, channels: results };
}

module.exports = { notifyDailySummary, getTodaySummary, buildMessage };
