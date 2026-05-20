import { getKSTDate, formatKSTDate } from '../src/lib/dateUtils.js';

const runTests = () => {
    console.log("Running KST Date Verification...");

    // Test 1: Late night UTC (e.g. Feb 2nd 23:00 UTC) -> should be Feb 3rd KST
    const lateNightUTC = new Date('2024-02-02T23:00:00Z');
    const kstDate1 = getKSTDate(lateNightUTC);
    const dateStr1 = formatKSTDate(lateNightUTC);

    console.log(`Input: ${lateNightUTC.toISOString()}`);
    console.log(`KST Object: ${kstDate1.toISOString()}`);
    console.log(`Formatted KST: ${dateStr1}`);

    if (dateStr1 === '2024-02-03') {
        console.log("✅ Test 1 Passed: Late night UTC is next day KST");
    } else {
        console.error(`❌ Test 1 Failed: Expected 2024-02-03, got ${dateStr1}`);
    }

    // Test 2: Early morning UTC (e.g. Feb 3rd 01:00 UTC) -> should be Feb 3rd KST
    const morningUTC = new Date('2024-02-03T01:00:00Z');
    const dateStr2 = formatKSTDate(morningUTC);

    console.log(`Input: ${morningUTC.toISOString()}`);
    console.log(`Formatted KST: ${dateStr2}`);

    if (dateStr2 === '2024-02-03') {
        console.log("✅ Test 2 Passed: Early morning UTC is same day KST");
    } else {
        console.error(`❌ Test 2 Failed: Expected 2024-02-03, got ${dateStr2}`);
    }

    // Test 3: Formatting current time
    const now = new Date();
    console.log(`Current System Time (UTC probably): ${now.toISOString()}`);
    console.log(`Current KST Date: ${formatKSTDate(now)}`);
};

runTests();
