'use client';

import styles from './LiftLoader.module.css';

export default function LiftLoader({ label = 'Loading your lifts…' }: { label?: string }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.bar} aria-hidden="true">
        <span className={styles.plate} style={{ height: 44, animationDelay: '0s' }} />
        <span className={styles.plate} style={{ height: 34, animationDelay: '.12s' }} />
        <span className={styles.plate} style={{ height: 24, animationDelay: '.24s' }} />
        <span className={styles.rod} />
        <span className={styles.plate} style={{ height: 24, animationDelay: '.24s' }} />
        <span className={styles.plate} style={{ height: 34, animationDelay: '.12s' }} />
        <span className={styles.plate} style={{ height: 44, animationDelay: '0s' }} />
      </div>
      <p className={styles.label}>{label}</p>
    </div>
  );
}
