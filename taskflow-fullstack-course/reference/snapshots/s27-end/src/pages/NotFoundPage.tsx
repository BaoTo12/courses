import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <>
      <h1 className="page__title">{t('notFound.title')}</h1>
      <p className="text-muted">{t('notFound.text')}</p>
      <Link className="btn btn--primary btn--sm" to="/tasks">
        {t('notFound.back')}
      </Link>
    </>
  );
}
