import styles from '../../styles/AppShellLoader.module.css';

export function AppShellLoader({ label }) {
  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        <span className={styles.orb} />
        <p>{label}</p>
      </div>
    </div>
  );
}
