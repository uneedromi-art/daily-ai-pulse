const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function saveAuth() {
    const userDataDir = path.join(__dirname, '../auth_session');

    console.log("Launching browser for manual login...");
    console.log(`Session data will be saved to: ${userDataDir}`);

    const browserContext = await chromium.launchPersistentContext(userDataDir, {
        headless: false, // Must be visible for manual login
        viewport: { width: 1280, height: 720 }
    });

    const page = await browserContext.newPage();

    console.log("Navigating to https://x.com/i/flow/login ...");
    await page.goto('https://x.com/i/flow/login');

    console.log("\n==================================================");
    console.log("👉 ACTION REQUIRED: Please log in to Twitter manually in the opened browser window.");
    console.log("   (If verification code is required, please enter it safely)");
    console.log("👉 Once you are successfully logged into the Home feed, close the browser window.");
    console.log("==================================================\n");

    // Keep the script running until the user closes the browser
    // We check periodically if the context is still open
    // Note: launchPersistentContext doesn't have an easy 'on close' for the whole app, 
    // but we can just wait indefinitely or wait for user to close.
    // Ideally, we wait for the user to close the browser manually.

    await new Promise(resolve => {
        browserContext.on('close', () => {
            console.log("Browser closed. Session saved!");
            resolve();
        });

        // Also safeguard: if page is closed
        page.on('close', () => {
            console.log("Page closed. Make sure you logged in!");
        });
    });

    // Alternatively, just wait for a long time if the above event loop is tricky in node
    // But 'close' event on context usually works for persistent context if user closes window.
}

saveAuth().catch(console.error);
