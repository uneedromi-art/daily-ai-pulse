export const KOREA_TIME_OFFSET = 9 * 60; // 9 hours in minutes

// Helper to get a Date object representing the time in KST
export const getKSTDate = (dateInput) => {
    const date = dateInput ? new Date(dateInput) : new Date();
    // We want a Date object where .toISOString() returns the KST time.
    // So we add 9 hours to the UTC timestamp.
    // This creates a "shifted" Date object. 
    // real UTC: 23:00. KST: 08:00 (+1 day).
    // shift: +9h.
    // shifted UTC: 08:00 (+1 day). .toISOString() -> ...T08:00...
    return new Date(date.getTime() + (3600000 * 9));
};

// Helper to format a date as YYYY-MM-DD in KST
export const formatKSTDate = (dateInput) => {
    const kstDate = getKSTDate(dateInput);
    return kstDate.toISOString().split('T')[0];
};

// Helper to format for display (e.g., "Feb 3")
export const displayKSTDate = (dateInput) => {
    const kstDate = getKSTDate(dateInput);
    return kstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
