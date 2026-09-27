# TaskFlow Admin: Where Each Piece of Data Lives (S38)

Every attribute TaskFlow Admin stores, with its scope and the reason. Update this file when you add one.

| Data | Scope | Why | Where |
|---|---|---|---|
| the list's tasks, `stats`, `today`, filters | **request** | computed for this page, then thrown away | `TaskListServlet` |
| a task's `details` (task + category + owner + comments) | **request** | always fresh from the database | `TaskViewServlet` |
| a form's typed values + `errors` | **request** | shown again by a forward in the same request (37.05) | `TaskFormPage` |
| `pageTitle`, `csrfToken` (as read by views), `flash` (as read by views) | **request** | view inputs for this render | controllers |
| the loop variable in `<c:forEach var="task">` | **page** | exists only during the loop in one JSP | JSTL |
| the CSRF token | **session** | per user, must survive between the form's GET and its POST | `Csrf` |
| the flash message, until shown | **session** | must survive exactly one redirect (37.09) | `Flash` |
| recently viewed task ids (max 5) | **session** | per user, across requests; ids only (small, serialisable, never stale) | `RecentTasks` |
| the logged-in user (S41) | **session** | per user, across requests; id + display data only, never the password hash | S41 |
| `TaskService`, `CategoryService` | **application** | stateless, thread-safe, one per app | `AppContextListener` |
| the category catalogue | **application** | read on almost every page, rarely changed; immutable snapshot, refreshed on change | `CategoryCatalog` |
| request/session counters, most viewed tasks | **application** | global by definition; thread-safe types (`LongAdder`, `AtomicInteger`, `ConcurrentHashMap`) | `AppStats` |
| the language preference (S44) | **cookie** | must survive the session and be shared with the React app (`tf_lang`) | S44 |

## Rules we follow

1. Default to **request**. Move to a wider scope only for a reason you can write in the "Why" column.
2. **Session** holds small, serialisable, per-user state, never data that can be re-read from the database cheaply (it goes stale, and it costs memory × users).
3. **Application** holds only data that's the same for every user, in thread-safe or immutable objects. Never anything user-specific.
4. Sensitive data: never in application scope; in the session, only what's needed (an id, not a password hash).
