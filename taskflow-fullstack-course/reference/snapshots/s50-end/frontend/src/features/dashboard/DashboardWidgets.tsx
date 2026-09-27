// S21 (21.17): each widget selects ONLY what it shows, so each re-renders only when that data changes.
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { formatDue } from "../../i18n/format";
import { useAppSelector } from "../../app/hooks";
import { PriorityBadge } from "../../components/Badge";
import { ProgressRing } from "../../components/styled/ProgressRing";
import { PRIORITIES, TASK_STATUSES } from "../../domain/types";
import type { IsoDate } from "../../domain/types";
import {
  selectCompletionRate,
  selectOverdueTasks,
  selectPriorityCounts,
  selectStatusCounts,
} from "./dashboardSelectors";
import styles from "./Dashboard.module.scss";

export function CompletionWidget() {
  const counts = useAppSelector(selectStatusCounts);
  const rate = useAppSelector(selectCompletionRate); // a number: compared with ===
  const total = counts.TODO + counts.IN_PROGRESS + counts.DONE;
  const { t } = useTranslation("dashboard");
  return (
    <section className={styles.widget} aria-labelledby="completion-heading">
      <h2 id="completion-heading" className={styles.heading}>
        {t("completion.heading")}
      </h2>
      <ProgressRing done={counts.DONE} total={total} />
      {/* `count` picks the plural form; `rate` is just interpolated (25.09) */}
      <p className="text-muted">
        {t("completion.summary", { count: total, rate })}
      </p>
    </section>
  );
}

export function StatusWidget() {
  const counts = useAppSelector(selectStatusCounts); // memoised: the same object until tasks change
  const { t } = useTranslation(["dashboard", "common"]);
  return (
    <section className={styles.widget} aria-labelledby="status-heading">
      <h2 id="status-heading" className={styles.heading}>
        {t("byStatus")}
      </h2>
      <dl className={styles.counts}>
        {TASK_STATUSES.map((status) => (
          <div key={status}>
            <dt>{t(`common:status.${status}`)}</dt>
            <dd>{counts[status]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function PriorityWidget() {
  const counts = useAppSelector(selectPriorityCounts);
  const { t } = useTranslation("dashboard");
  return (
    <section className={styles.widget} aria-labelledby="priority-heading">
      <h2 id="priority-heading" className={styles.heading}>
        {t("byPriority")}
      </h2>
      <dl className={styles.counts}>
        {PRIORITIES.map((priority) => (
          <div key={priority}>
            <dt>
              <PriorityBadge priority={priority} />
            </dt>
            <dd>{counts[priority]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function OverdueWidget({ today }: { today: IsoDate }) {
  const overdue = useAppSelector((state) => selectOverdueTasks(state, today));
  const { t, i18n } = useTranslation("dashboard");
  return (
    <section className={styles.widget} aria-labelledby="overdue-heading">
      <h2 id="overdue-heading" className={styles.heading}>
        {t("overdue.heading")}{" "}
        <span className={styles.badge}>{overdue.length}</span>
      </h2>
      {overdue.length === 0 ? (
        <p className="text-muted">{t("overdue.none")}</p>
      ) : (
        <>
          <p>{t("overdue.summary", { count: overdue.length })}</p>
          <ul className={styles.overdue}>
            {overdue.map((task) => (
              <li key={task.id}>
                <Link to={`/tasks/${task.id}`}>{task.title}</Link>
                {task.dueDate && (
                  <span className="text-danger">
                    {" "}
                    {t("overdue.due", {
                      when: formatDue(task.dueDate, today, i18n.language),
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
