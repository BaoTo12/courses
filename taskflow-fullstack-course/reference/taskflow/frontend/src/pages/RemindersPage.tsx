// S51: due-date reminders: overdue tasks, then one group per day for the next 7 days.
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../app/hooks';
import { useGetTasksQuery } from '../features/api/apiSlice';
import { selectReminders, REMINDER_DAYS } from '../features/reminders/reminderSelectors';
import { LIST_QUERY } from '../features/tasks/taskSelectors';
import { formatDate } from '../i18n/format';
import { useToday } from '../hooks/useToday';
import type { Task } from '../domain/types';

function ReminderList({ tasks }: { tasks: Task[] }) {
  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          <Link to={`/tasks/${task.id}`}>{task.title}</Link>
        </li>
      ))}
    </ul>
  );
}

export function RemindersPage() {
  const { isLoading } = useGetTasksQuery(LIST_QUERY, { selectFromResult: ({ isLoading }) => ({ isLoading }) });
  const today = useToday();
  // One memoised selector with `today` as its argument: re-renders only when the reminders really change.
  const { overdue, days } = useAppSelector((state) => selectReminders(state, today));
  const { t, i18n } = useTranslation();

  if (isLoading) return <p className="text-muted">{t('loading')}</p>;
  return (
    <>
      <h1 className="page__title">{t('reminders.title')}</h1>
      <p className="text-muted">{t('reminders.intro', { count: REMINDER_DAYS })}</p>
      {overdue.length > 0 && (
        <section aria-labelledby="reminders-overdue">
          <h2 id="reminders-overdue" className="text-danger">{t('reminders.overdue', { count: overdue.length })}</h2>
          <ReminderList tasks={overdue} />
        </section>
      )}
      {days.length === 0 && overdue.length === 0 && <p>{t('reminders.none')}</p>}
      {days.map((day) => (
        <section key={day.date} aria-labelledby={`reminders-${day.date}`}>
          <h2 id={`reminders-${day.date}`}>
            {day.date === today ? t('reminders.today') : formatDate(day.date, i18n.language)}
          </h2>
          <ReminderList tasks={day.tasks} />
        </section>
      ))}
    </>
  );
}