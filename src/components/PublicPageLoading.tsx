import styles from "./PublicPageLoading.module.css";

/** Server-rendered fallback: useful immediately, including before hydration. */
export function PublicPageLoading() {
  return (
    <main data-page-loading="true" className={styles.page} aria-busy="true" aria-label="Loading page">
      <p role="status" className={styles.status}><span aria-hidden="true" />Finding your next campus connection…</p>
      <div className={styles.hero} aria-hidden="true">
        <div className={styles.eyebrow} />
        <div className={styles.title} />
        <div className={styles.subtitle} />
        <div className={styles.search} />
      </div>
      <div className={styles.grid} aria-hidden="true">
        {[0, 1, 2].map((card) => <div className={styles.card} key={card}>
          <div className={styles.photo} />
          <div className={styles.body}><div className={styles.title} /><div className={styles.subtitle} /></div>
        </div>)}
      </div>
    </main>
  );
}
