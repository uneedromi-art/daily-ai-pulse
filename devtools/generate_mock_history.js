
const fs = require('fs');
const path = require('path');

const outputPath = path.join(process.cwd(), 'public', 'data', 'news.json');

// Helper to create mock post
function createMockPost(daysAgo, idSuffix) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
        id: `mock-history-${daysAgo}-${idSuffix}`,
        platform: "History",
        author: {
            name: "Time Traveler",
            handle: "@history_bot",
            avatar_color: "#888888",
            avatar_url: null
        },
        content: `News from ${daysAgo} days ago. This is a mock post to test archive navigation.`,
        summary_ko: `${daysAgo}일 전 뉴스입니다. 아카이브 탐색 기능을 테스트하기 위한 가짜 데이터입니다.`,
        url: "#",
        date: date.toISOString(),
        likes: 10 * daysAgo,
        comments: daysAgo
    };
}

// Generate last 5 days
const mockHistory = [];
for (let i = 1; i <= 5; i++) {
    for (let j = 0; j < 3; j++) {
        mockHistory.push(createMockPost(i, j));
    }
}

// Read existing and merge
let existing = [];
if (fs.existsSync(outputPath)) {
    existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
}

const combined = [...existing, ...mockHistory];
fs.writeFileSync(outputPath, JSON.stringify(combined, null, 2));
console.log(`Added ${mockHistory.length} mock history items.`);
