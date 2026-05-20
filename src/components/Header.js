import styles from './Header.module.css';

export default function Header() {
    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    return (
        <header className={styles.container}>
            <div className={styles.topRow}>
                <span className={styles.brand}>Daily AI Pulse</span>
                <span className={styles.date}>{today}</span>
            </div>
            <h1 className={styles.title}>Good Morning!</h1>
            <p className={styles.subtitle}>Here is your daily dose of AI intelligence.</p>
        </header>
    );
}
