import React, { useState } from 'react';
import { AirportAutocomplete } from '../../components/AirportAutocomplete/AirportAutocomplete';
import { AirportOption } from '../../types/airport';
import styles from './SearchPage.module.scss';

export const SearchPage: React.FC = () => {
  const [origin, setOrigin] = useState<AirportOption | null>(null);
  const [destination, setDestination] = useState<AirportOption | null>(null);

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) {
      alert('Пожалуйста, выберите город отправления и назначения из списка');
      return;
    }
    console.log('Поиск рейса:', {
      from: origin.code,
      to: destination.code,
    });
    // Здесь переход на страницу результатов / вызов роутера
  };

  return (
    <main className={styles.searchPage}>
      <div className={styles.container}>
        <h1 className={styles.title}>Поиск авиабилетов</h1>
        
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <div className={styles.fieldsRow}>
            <AirportAutocomplete
              label="Откуда"
              value={origin ? `${origin.cityName} (${origin.code})` : ''}
              onChange={setOrigin}
              placeholder="Город или код (напр., SVX)"
            />

            <button
              type="button"
              className={styles.swapButton}
              onClick={handleSwap}
              title="Поменять местами"
            >
              ⇄
            </button>

            <AirportAutocomplete
              label="Куда"
              value={destination ? `${destination.cityName} (${destination.code})` : ''}
              onChange={setDestination}
              placeholder="Город или код (напр., IST)"
            />
          </div>

          <button type="submit" className={styles.submitButton}>
            Найти билеты
          </button>
        </form>
      </div>
    </main>
  );
};