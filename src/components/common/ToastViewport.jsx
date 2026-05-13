import { useApp } from '../../context/AppContext.jsx';
import styles from '../../styles/ToastViewport.module.css';

export function ToastViewport() {
  const { toasts } = useApp();

  return (
    <div className={styles.viewport}>
      {toasts.map((toast) => (
        <article key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`}>
          <strong>{toast.title}</strong>
          <p>{toast.description}</p>
        </article>
      ))}
    </div>
  );
}
