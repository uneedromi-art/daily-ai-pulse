import Link from 'next/link';
import styles from './ArchiveNav.module.css';
import { formatKSTDate } from '../lib/dateUtils';

const ArchiveNav = ({ currentDate }) => {
    // currentDate is YYYY-MM-DD string (already in KST from PostList)

    // Create a Date object for the current KST date.
    // Since kstString is YYYY-MM-DD, new Date(kstString) creates a UTC date at 00:00:00.
    // This is fine for date manipulation (add/subtract days) as long as we format it back properly.
    const curr = new Date(currentDate);

    const prevDate = new Date(curr);
    prevDate.setDate(curr.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    const nextDate = new Date(curr);
    nextDate.setDate(curr.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    // Determine "Today" in KST for disabling the "Tomorrow" link if strict checking is needed,
    // but usually checking against real today is good.
    const todayStr = formatKSTDate(new Date());
    const isToday = currentDate === todayStr;

    return (
        <nav className={styles.nav}>
            <Link href={`/?date=${prevDateStr}`} className={styles.link}>
                ← <span className={styles.label}>Yesterday</span>
            </Link>

            <span className={styles.current}>
                {curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>

            {isToday ? (
                <span className={`${styles.link} ${styles.disabled}`}>
                    <span className={styles.label}>Tomorrow</span> →
                </span>
            ) : (
                <Link href={`/?date=${nextDateStr}`} className={styles.link}>
                    <span className={styles.label}>Tomorrow</span> →
                </Link>
            )}
        </nav>
    );
};

export default ArchiveNav;
