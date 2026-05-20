const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
    const USERNAME = process.env.TWITTER_USERNAME;
    const PASSWORD = process.env.TWITTER_PASSWORD;

    if (!USERNAME || !PASSWORD) {
        console.error('Set TWITTER_USERNAME and TWITTER_PASSWORD env vars (archived script).');
        process.exit(1);
    }

    const HANDLE = '@gimsaelomi51331';

    const path = require('path');
    const COOKIE_PATH = path.join(__dirname, '../../../twitter_cookies.json');
    let hasCookies = false;

    // Check if cookies exist
    if (fs.existsSync(COOKIE_PATH)) {
        console.log("🍪 Found 'twitter_cookies.json'. Will try to use them.");
        hasCookies = true;
    }

    console.error("Launching Browser with User Context...");
    // const userDataDir = path.join(__dirname, '../auth_session'); // Using memory context with cookies instead

    // Launch standard browser, context will be created below
    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
    });

    if (hasCookies) {
        try {
            const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf8'));
            const extraCookies = cookies.map(c => ({ ...c, domain: '.twitter.com' }));
            await context.addCookies([...cookies, ...extraCookies]);
            console.log("✅ Cookies loaded into context (x.com & twitter.com).");
        } catch (e) {
            console.error("❌ Failed to load cookies:", e);
        }
    }

    const page = await context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    try {
        // 1. Check if already logged in
        console.error("Checking login status...");
        await page.goto('https://x.com/home');

        try {
            // Check for Home link or Tweet button which confirms login
            await page.waitForSelector('[data-testid="AppTabBar_Home_Link"]', { timeout: 10000 }).catch(() => {
                return page.waitForSelector('[data-testid="SideNav_NewTweet_Button"]', { timeout: 5000 });
            });
            console.error("✅ Already logged in! Skipping login flow.");
        } catch (e) {
            console.error("⚠️ Not logged in or session expired. Attempting automated login...");
            await page.screenshot({ path: 'debug_session_check_fail.png' });
            console.error("Saved debug_session_check_fail.png");

            await page.goto('https://x.com/i/flow/login');

            // Wait for username input
            try {
                console.log("Waiting for username input...");
                const usernameInput = await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 });
                await usernameInput.click();
                await page.keyboard.type(HANDLE, { delay: 100 });
                await page.waitForTimeout(2000);

                // Find Next button
                const nextButton = await page.locator('button').filter({ hasText: '다음' }).first();
                if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
                    await nextButton.click();
                } else {
                    await page.keyboard.press('Enter');
                }

                await page.waitForTimeout(2000);

            } catch (e) {
                console.error("Username input error:", e);
            }

            // Check for verification (unusual activity) or password
            try {
                // Check for Password field
                const passwordInput = await page.waitForSelector('input[name="password"]', { timeout: 5000 }).catch(() => null);
                if (passwordInput) {
                    console.log("Password field detected.");
                } else {
                    console.log("Password field not found. checking for other states...");
                    const textInput = await page.$('input[name="text"]');
                    if (textInput && await textInput.isVisible()) {
                        console.log("Verification screen detected. Retrying with Email...");

                        await textInput.click();
                        await textInput.fill('');
                        await textInput.type(USERNAME, { delay: 100 });
                        await page.waitForTimeout(1000);
                        await page.keyboard.press('Enter');
                    }
                }
            } catch (e) {
                console.error("Error in verifying state:", e);
            }

            // Password
            console.error("Entering Password...");
            await page.waitForSelector('input[name="password"]', { state: 'visible', timeout: 30000 });
            await page.fill('input[name="password"]', PASSWORD);
            await page.keyboard.press('Enter');

            // Wait for login to complete
            await page.waitForSelector('[data-testid="PrimaryColumn"]', { timeout: 30000 });
            console.error("Login Successful!");
        }

        // 2. Search
        const QUERY = 'Artificial Intelligence min_faves:50 filter:media';
        const SEARCH_URL = `https://x.com/search?q=${encodeURIComponent(QUERY)}&src=typed_query&f=live`;

        console.error(`Searching: ${QUERY}`);
        await page.goto(SEARCH_URL);
        await page.waitForSelector('[data-testid="tweet"]', { timeout: 15000 });

        // 3. Scrape
        const tweets = await page.evaluate(() => {
            const items = document.querySelectorAll('[data-testid="tweet"]');
            const results = [];

            items.forEach(item => {
                if (results.length >= 5) return;

                try {
                    const userEl = item.querySelector('[data-testid="User-Name"]');
                    const textEl = item.querySelector('[data-testid="tweetText"]');
                    const timeEl = item.querySelector('time');
                    const imgEl = item.querySelector('[data-testid="tweetPhoto"] img');
                    const linkEl = item.querySelector('a[href*="/status/"]');

                    if (!textEl) return;

                    const name = userEl ? userEl.innerText.split('\n')[0] : "Unknown";
                    const handle = userEl ? userEl.innerText.split('\n')[1] : "@unknown";
                    const content = textEl.innerText;
                    const url = linkEl ? `https://x.com${linkEl.getAttribute('href')}` : "#";
                    const image = imgEl ? imgEl.src : null;
                    const date = timeEl ? timeEl.getAttribute('datetime') : new Date().toISOString();

                    results.push({
                        id: `twitter-${url.split('/').pop()}`,
                        platform: "Twitter",
                        author: {
                            name: name,
                            handle: handle,
                            avatar_color: "#1DA1F2",
                            // Avatar URL is hard to get reliably without clicking, using default
                            avatar_url: null
                        },
                        content: content,
                        url: url,
                        image: image,
                        date: date,
                        likes: 0, // Hard to parse localized numbers quickly, skipping for MVP
                        comments: 0
                    });
                } catch (e) {
                    // skip broken item
                }
            });
            return results;
        });

        console.log(JSON.stringify(tweets)); // Output valid JSON to stdout

    } catch (error) {
        console.error("Fatal Error:", error);
        try {
            const screenshotPath = require('path').join(process.cwd(), 'twitter_error.png');
            await page.screenshot({ path: screenshotPath });
            console.error(`Screenshot saved to ${screenshotPath}`);
        } catch (e) {
            console.error("Failed to save screenshot", e);
        }
        console.log("[]"); // Return empty JSON on failure
    } finally {
        await browser.close();
    }
}

main();
