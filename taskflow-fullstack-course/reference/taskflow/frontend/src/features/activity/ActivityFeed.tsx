// S51: the dashboard's activity feed (GET /api/activity). Refreshed by activityListeners after every recorded write.
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../i18n/useErrorMessage';
import { useGetActivityQuery } from './activityApi';

export function ActivityFeed() {
  const { data: events = [], isLoading, isError, error } = useGetActivityQuery();
  const { t, i18n } = useTranslation();
  const errorMessage = useErrorMessage();
  const time = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading">{t('activity.title')}</h2>
      {isLoading && <p className="text-muted">{t('loading')}</p>}
      {isError && <p role="alert" className="text-danger">{errorMessage(error)}</p>}
      {!isLoading && !isError && events.length === 0 && <p className="text-muted">{t('activity.empty')}</p>}
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            <span className="text-muted">{time.format(new Date(event.at))}</span> · {t(`activity.types.${event.type}`)}: {event.details}
          </li>
        ))}
      </ul>
    </section>
  );
}