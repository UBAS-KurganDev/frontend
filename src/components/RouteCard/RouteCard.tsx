import React from 'react';
import { FlightRoute } from '../../types/route';
import styles from './RouteCard.module.scss';
import { WarningList } from '../WarningList/WarningList';

interface Props {
  route: FlightRoute;
  onSelect?: () => void;
}

// Функция для расчёта времени пересадки с учётом многосуточных стоповеров
const calculateLayover = (arrivalIso: string, departureIso: string): string => {
  const arrival = new Date(arrivalIso).getTime();
  const departure = new Date(departureIso).getTime();
  const diffMs = departure - arrival;

  if (diffMs <= 0) return '0м';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) {
    let result = `${days}д ${hours}ч`;
    if (minutes > 0 && days < 2) { // Для 1-2 дней можно добавить минуты для точного расчёта
      result += ` ${minutes}м`;
    }
    return result;
  }

  return `${hours}ч ${minutes}м`;
};

export const RouteCard: React.FC<Props> = ({ route, onSelect }) => {
  const formatMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(amount);
  const candidate = route.rankedRoute.route;
  return (
    <div className={styles.routeCard}>
      <div className={styles.segmentsList}>
        {route.segments.map((segment, index) => {
          const nextSegment = route.segments[index + 1];
          
          // Вычисляем параметры стыковки из соседних сегментов
          const layoverDuration = nextSegment 
            ? calculateLayover(segment.arrivalTime, nextSegment.departureTime) 
            : null;
            
          const isAirportChange = nextSegment 
            ? segment.arrivalCode !== nextSegment.departureCode 
            : false;

          return (
            <React.Fragment key={index}>
              {/* Карточка сегмента полёта */}
              <div className={styles.segmentItem}>
                <div className={styles.point}>
                  <span className={styles.time}>{segment.departureTimeFormatted}</span>
                  <span className={styles.city}>
                    {segment.departureCity} ({segment.departureCode})
                  </span>
                </div>

                <div className={styles.flightPath}>
                  <span className={styles.duration}>{segment.duration}</span>
                  <div className={styles.line} />
                </div>

                <div className={styles.point}>
                  <span className={styles.time}>{segment.arrivalTimeFormatted}</span>
                  <span className={styles.city}>
                    {segment.arrivalCity} ({segment.arrivalCode})
                  </span>
                </div>
              </div>

              {/* Динамический блок пересадки (если есть следующий сегмент) */}
              {nextSegment && layoverDuration && (
                <div
                  className={`${styles.layoverBlock} ${
                    isAirportChange ? styles.airportChange : ''
                  }`}
                >
                  <div className={styles.layoverContent}>
                    <span className={styles.layoverIcon}>⏳</span>
                    <span className={styles.layoverText}>
                      Пересадка в г. <strong>{segment.arrivalCity}</strong> —{' '}
                      <strong>{layoverDuration}</strong>
                    </span>
                  </div>

                  {/* Предупреждение о смене аэропорта внутри города */}
                  {isAirportChange && (
                    <div className={styles.changeBadge}>
                      ⚠️ Смена аэропорта: прилёт в {segment.arrivalCode}, вылёт из {nextSegment.departureCode}
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className={styles.footer}>
        <div className={styles.info}>
          <span className={styles.durationTotal}>Общее время: {route.totalDuration}</span>
          <span>Оценка маршрута: {route.rankedRoute.score.total.toLocaleString('ru-RU')} / 100</span>
          {candidate.metrics.self_transfer && <span>Самостоятельная пересадка</span>}
          <span className={styles.transfers}>
            {route.transfersCount === 0
              ? 'Прямой рейс'
              : `Пересадок: ${route.transfersCount}`}
          </span>
        </div>
        <div className={styles.priceSection}>
          <span className={styles.price}>{formatMoney(route.totalPrice, route.currency)}</span>
          <button className={styles.selectButton} onClick={() => onSelect?.()}>
            Выбрать
          </button>
        </div>
      </div>
      <div>
        Билеты: {formatMoney(Number(candidate.ticket_cost.amount), candidate.ticket_cost.currency ?? 'RUB')}
        {' · '}Виза: {formatMoney(Number(candidate.visa_cost.amount), candidate.visa_cost.currency ?? 'RUB')}
      </div>
      <WarningList warnings={candidate.warnings} />
    </div>
  );
};
