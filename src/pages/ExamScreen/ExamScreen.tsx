import styles from './ExamScreen.module.scss';

export default function ExamScreen() {
  const questions = [
    {id: 1, title: 'Что называется рангом матрицы?', subtitle: 'Ранг матрицы — понятие в линейной алгебре...'},
    {id: 2, title: 'Что называется рангом матрицы?', subtitle: 'Ранг матрицы — понятие в линейной алгебре...'},
    {id: 3, title: 'Что называется рангом матрицы?', subtitle: 'Ранг матрицы — понятие в линейной алгебре...'},
    {id: 4, title: 'Что такое ядро гомоморфизма?', subtitle: 'Ядро гомоморфизма — это множество элементов...'},
    {id: 5, title: 'Что называется рангом матрицы?', subtitle: 'Ранг матрицы — понятие в линейной алгебре...'},
  ];

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backButton}>←</button>
        <h1 className={styles.title}>Экзамен по алгему</h1>
        <span className={styles.dot}>•</span>
      </div>

      <div className={styles.list}>
        {questions.map((q) => (
          <div key={q.id} className={styles.item}>
            <div className={styles.itemNumber}>{q.id}</div>
            <div>
              <h2 className={styles.itemTitle}>{q.title}</h2>
              <p className={styles.itemSubtitle}>{q.subtitle}</p>
            </div>
          </div>
        ))}

        <div className={styles.addRow}>
          <div className={styles.addButton}>+</div>
        </div>
      </div>
    </div>
  );
}
