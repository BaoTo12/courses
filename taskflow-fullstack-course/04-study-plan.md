# Study Plan

## 1. Suggested learning order (the full course)

```text
Part 0  Orientation ─→ Part 1A SCSS ─→ 1B JS/TS ─→ 1C React + styled-components
        ─→ 1D Redux track ─→ 1E Cookies · i18n · FE security · sprint
        ─→ Part 2A HTTP · Servlet · JSP ─→ 2B EL · JSTL · MVC ─→ 2C Filters · Auth · Advanced
        ─→ Part 3 JSON API (swap the mock) ─→ Part 4 Hybrid · Security review · Final
```

Why this order:
- **SCSS first** gives quick visual wins and produces a design system that both clients reuse.
- **JS → TS → React** before Redux: Redux is mostly plain functions and immutability, so these foundations make it click.
- **Redux in the official order:** Fundamentals (by hand) → Redux Toolkit → RTK Query.
- **Frontend before backend** is possible because of the mock API. Part 3 then becomes a satisfying "flip the switch" moment.
- **Security is woven in**, not bolted on at the end. Part 4 is a *review*, not the first exposure.

---

## 2. Two tracks

The course has **~760 lectures** (~720 marked ★). At 10–25 minutes each, that's roughly **180–200 hours** for everything.

| Track | Content | Realistic pace |
|---|---|---|
| **Intensive (15 days)** | ★ 📖 Theory, 🛠 Build, 🔓/🛡 labs, ✅ knowledge checks; **one** 🎯 + its 💡 per section; 🐞 debug lectures *read* (attempt 1–2 per section) | ~130 hours → ~9 focused hours/day |
| **Full** | Everything, including ＋ Extended lectures, every 🎯 challenge and every 🐞 attempted before reading the answer | ~6–8 weeks part-time |

**Being honest about 15 days:** doing all ~760 lectures deeply in 15 days isn't realistic, and rushing would defeat the goal of deep understanding. The intensive track keeps every *concept* and every security lab, but it does fewer repetitions (exercises and debug drills). Everything you skip stays available for the first weeks of your new job. That's where they'll be most useful anyway, because you'll see the same patterns in real code.

The lecture content itself is written **one lecture (or a small batch) at a time**, as you progress. The pace of the course follows your pace.

---

## 3. The 15-day intensive plan

Each day ends with the section ✅ knowledge checks. If a day runs over, use the **"if behind"** column. Never skip a ✅ check; that's where understanding is verified.

| Day | Sections | Focus | If behind, move to later |
|---|---|---|---|
| **1** | S00–S03 | Orientation, setup, SCSS fundamentals + architecture | S03 ＋ lectures (placeholders, advanced functions) |
| **2** | S04–S06 | Modern JS, TypeScript fundamentals + intermediate | S06 ＋ (conditional/mapped types) |
| **3** | S07–S08 | React fundamentals, hooks in depth | S08 ＋ (`useLayoutEffect`, `useId`) |
| **4** | S09–S11 | styled-components (fundamentals + theming), forms | S10 ＋ (testing styled components) |
| **5** | S12–S15 | Router, Axios + mock API, **Redux R1–R2** | S12 ＋ (lazy routes) |
| **6** | S16–S18 | **Redux R3–R5**: store by hand, React-Redux, thunk by hand | S16 ＋ (custom enhancer) |
| **7** | S19–S21 | **Redux R6–R8**: patterns, RTK migration, reselect + memoization | S21 ＋ (listener middleware extras) |
| **8** | S22–S25 | **RTK Query basics + advanced**, js-cookie, i18n | S23 ＋ (streaming updates) |
| **9** | S26–S29 | Frontend security, sprint (core parts), backend setup, HTTP | S27 ＋ features |
| **10** | S30–S33 | First Servlet → multiple Servlets → Servlet→JSP → JSP fundamentals | S33 ＋ (`jsp:useBean`) |
| **11** | S34–S36 | **EL, JSTL, MVC + SQL injection lab** | S35 ＋ (`c:catch`, `c:forTokens`) |
| **12** | S37–S40 | Forms + PRG + CSRF, scopes, reusable JSP, filters | S39 ＋ (layout alternatives) |
| **13** | S41–S44 | Sessions + auth, authorization + IDOR, errors, advanced JSP/EL/JSTL | S44 ＋ (custom tag handler) |
| **14** | S45–S48 | Advanced Servlet, JSON API, API security, swap the mock | S45 ＋ (async servlets) |
| **15** | S49–S51 | Hybrid JSP + React, security review, capstone walkthrough | Final project polish |

### Daily rhythm (intensive track)

```text
08:30–12:00  📖 Theory + 🛠 Build lectures (new concepts while fresh)
13:00–16:00  🎯 Your Turn + 🐞 Debug (struggle first, then 💡 solutions)
16:15–18:00  🔓/🛡 labs + ✅ knowledge check
Evening      30 minutes: write the day's "explain it to a junior" notes in docs/notes/
```

The evening notes matter more than they look. Explaining `${user.name}` resolution or `useSelector` re-render rules in your own words is the best preparation for technical interviews and for your first code reviews.

---

## 4. Priority if time gets very short

If you ever have to cut deeper, keep these (highest value first):

1. **Redux track S14–S23** (the whole mental model: store → middleware → thunk → RTK → reselect → RTK Query)
2. **HTTP + Servlet + Servlet→JSP + EL + JSTL (S29–S35)**
3. **Security labs**: XSS, SQL injection, CSRF, IDOR, session fixation
4. **TypeScript S05–S06** and **React hooks S08**
5. **Filters + sessions + auth (S40–S42)**
6. **styled-components + SCSS coexistence (S10)**
7. Everything else
