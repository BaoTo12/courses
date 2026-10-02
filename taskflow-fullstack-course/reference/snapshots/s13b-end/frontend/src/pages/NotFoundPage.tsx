import { ButtonLink } from '../components/ButtonLink';

export function NotFoundPage() {
  return (
    <>
      <h1 className="page__title">Page not found</h1>
      <p className="text-muted">The page or task you're looking for doesn't exist (or was deleted).</p>
      <ButtonLink variant="primary" size="sm" to="/tasks">
        Go to tasks
      </ButtonLink>
    </>
  );
}
