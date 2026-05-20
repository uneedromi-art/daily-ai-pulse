const fs = require('fs');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const COOKIE_PATH = path.join(__dirname, '../twitter_cookies.json');

console.log("==================================================");
console.log("🍪 Twitter Cookie Setup (Manual Extraction)");
console.log("==================================================");
console.log("Since automated login is blocked, we will use cookies from your working browser.");
console.log("\n[INSTRUCTIONS]");
console.log("1. Open your working browser (Chrome/Edge) where you are logged in to Twitter (X).");
console.log("2. Press F12 to open Developer Tools.");
console.log("3. Go to the 'Application' tab (top menu).");
console.log("4. In the left sidebar, expand 'Cookies' and click 'https://x.com'.");
console.log("5. Find the row named 'auth_token'. Double-click its Value and copy it.");
console.log("==================================================\n");

rl.question('Paste the "auth_token" value here: ', (authToken) => {
    rl.question('Paste the "ct0" value here (optional, press Enter to skip): ', (ct0) => {

        const cookies = [
            {
                "name": "auth_token",
                "value": authToken.trim(),
                "domain": ".x.com",
                "path": "/",
                "httpOnly": true,
                "secure": true,
                "sameSite": "None"
            }
        ];

        if (ct0 && ct0.trim()) {
            cookies.push({
                "name": "ct0",
                "value": ct0.trim(),
                "domain": ".x.com",
                "path": "/",
                "httpOnly": false,
                "secure": true,
                "sameSite": "Lax"
            });
        }

        fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));
        console.log(`\n✅ Cookies saved to: ${COOKIE_PATH}`);
        console.log("You can now run 'node scripts/fetch_twitter_browser.js' to scrape!");
        rl.close();
    });
});
