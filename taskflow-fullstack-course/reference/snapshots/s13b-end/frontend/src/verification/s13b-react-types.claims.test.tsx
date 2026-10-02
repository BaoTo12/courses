// S13B claims: every example in the S13B theory lectures that is NOT project code is pinned here.
// Two layers of evidence:
//   1. `npm run build` (tsc -b) type-checks this file: expectTypeOf(…) assertions must hold, and every
//      `@ts-expect-error` line must REALLY be an error (an unused directive is itself a compile error).
//   2. Vitest runs the runtime parts (rendering to a string with react-dom/server: no DOM needed).
import {
  createContext,
  createRef,
  memo,
  useContext,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
} from 'react';
import type {
  ChangeEvent,
  ComponentProps,
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  Dispatch,
  ElementType,
  JSX,
  KeyboardEvent,
  MouseEvent,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  Reducer,
  Ref,
  RefObject,
  SetStateAction,
  SubmitEvent,
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Link, MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Task, User } from '../domain/types';

/** Compile-only checks: the JSX inside is type-checked, never rendered. */
const compiles = (check: () => unknown) => expect(check).toBeTypeOf('function');

// ─────────────────────────────────────────────────────────────────────────────
describe('13B.01 · element types', () => {
  it('a JSX expression is React.JSX.Element, a ReactElement, a ReactNode', () => {
    const element = <p>hi</p>;
    expectTypeOf(element).toEqualTypeOf<JSX.Element>();
    expectTypeOf<JSX.Element>().toExtend<ReactElement>();
    expectTypeOf<ReactElement>().toExtend<ReactNode>();
  });

  it('ReactNode is wider: strings, numbers, null, undefined, booleans, arrays', () => {
    expectTypeOf<string>().toExtend<ReactNode>();
    expectTypeOf<number>().toExtend<ReactNode>();
    expectTypeOf<null>().toExtend<ReactNode>();
    expectTypeOf<undefined>().toExtend<ReactNode>();
    expectTypeOf<boolean>().toExtend<ReactNode>();
    expectTypeOf<ReactNode[]>().toExtend<ReactNode>();
    expectTypeOf<string>().not.toExtend<ReactElement>();
    expectTypeOf<{ title: string }>().not.toExtend<ReactNode>();
  });

  it('a component may return any ReactNode (a string, null…)', () => {
    function Maybe({ show }: { show: boolean }) {
      return show ? 'visible text' : null;
    }
    expect(renderToStaticMarkup(<Maybe show />)).toBe('visible text');
    expect(renderToStaticMarkup(<Maybe show={false} />)).toBe('');
  });

  it('a function returning a plain object is not a component', () => {
    function NotAComponent() {
      return { title: 'x' };
    }
    compiles(() => (
      // @ts-expect-error: '{ title: string }' is not a valid JSX element type
      <NotAComponent />
    ));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('13B.02 · props', () => {
  interface BadgeProps {
    label: string;
    tone?: 'info' | 'danger';
  }
  function Badge({ label, tone = 'info' }: BadgeProps) {
    return <span className={`badge badge--${tone}`}>{label}</span>;
  }

  it('optional props with defaults; unknown and missing props are errors', () => {
    expect(renderToStaticMarkup(<Badge label="New" />)).toBe('<span class="badge badge--info">New</span>');
    compiles(() => (
      <>
        {/* @ts-expect-error: `label` is required */}
        <Badge tone="danger" />
        {/* @ts-expect-error: `colour` is not a prop of Badge (excess property check) */}
        <Badge label="x" colour="red" />
        {/* @ts-expect-error: 'warning' is not in the tone union */}
        <Badge label="x" tone="warning" />
      </>
    ));
  });

  it('children must be declared: PropsWithChildren or children: ReactNode', () => {
    function Card({ title, children }: PropsWithChildren<{ title: string }>) {
      return (
        <section>
          <h2>{title}</h2>
          {children}
        </section>
      );
    }
    function Plain({ title }: { title: string }) {
      return <h2>{title}</h2>;
    }
    expect(renderToStaticMarkup(<Card title="T">body</Card>)).toBe('<section><h2>T</h2>body</section>');
    compiles(() => (
      // @ts-expect-error: Plain doesn't accept children
      <Plain title="T">body</Plain>
    ));
  });

  it('children can be restricted: a render function', () => {
    function Toggle({ children }: { children: (on: boolean) => ReactNode }) {
      const [on] = useState(true);
      return <div>{children(on)}</div>;
    }
    expect(renderToStaticMarkup(<Toggle>{(on) => (on ? 'ON' : 'OFF')}</Toggle>)).toBe('<div>ON</div>');
    compiles(() => (
      // @ts-expect-error: a string is not a (on: boolean) => ReactNode
      <Toggle>text</Toggle>
    ));
  });

  it('discriminated-union props: each variant has its own required props', () => {
    type AlertProps = { kind: 'message'; text: string } | { kind: 'error'; error: Error; onRetry: () => void };
    function Alert(props: AlertProps) {
      switch (props.kind) {
        case 'message':
          return <p>{props.text}</p>;
        case 'error':
          return (
            <p role="alert">
              {props.error.message} <button onClick={props.onRetry}>Retry</button>
            </p>
          );
      }
    }
    expect(renderToStaticMarkup(<Alert kind="message" text="Saved" />)).toBe('<p>Saved</p>');
    compiles(() => (
      <>
        <Alert kind="error" error={new Error('x')} onRetry={() => {}} />
        {/* @ts-expect-error: an 'error' alert needs `error` and `onRetry`, not `text` */}
        <Alert kind="error" text="x" />
      </>
    ));
  });

  it('mutually exclusive props with `never`', () => {
    type IconButtonProps = { icon: string } & (
      | { label: string; 'aria-label'?: never }
      | { label?: never; 'aria-label': string }
    );
    function IconButton({ icon, label, ...aria }: IconButtonProps) {
      return (
        <button type="button" {...aria}>
          {icon} {label}
        </button>
      );
    }
    expect(renderToStaticMarkup(<IconButton icon="×" aria-label="Close" />)).toContain('aria-label="Close"');
    compiles(() => (
      <>
        <IconButton icon="+" label="Add" />
        {/* @ts-expect-error: both a visible label and an aria-label */}
        <IconButton icon="+" label="Add" aria-label="Add" />
        {/* @ts-expect-error: neither: an icon-only button needs an accessible name */}
        <IconButton icon="+" />
      </>
    ));
  });

  it('callback props returning void accept functions that return something', () => {
    function Row({ onSelect }: { onSelect: (id: number) => void }) {
      return <button onClick={() => onSelect(1)}>select</button>;
    }
    const selected: number[] = [];
    compiles(() => <Row onSelect={(id) => selected.push(id)} />); // push returns a number: fine for `void`
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('13B.03 · DOM props and ref', () => {
  it('ComponentProps<"input"> has every native attribute, typed', () => {
    expectTypeOf<ComponentPropsWithoutRef<'input'>['type']>().toEqualTypeOf<
      'button' | 'checkbox' | 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'hidden' | 'image' | 'month'
      | 'number' | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'submit' | 'tel' | 'text' | 'time' | 'url'
      | 'week' | (string & {}) | undefined
    >();
    expectTypeOf<ComponentPropsWithoutRef<'input'>>().not.toHaveProperty('ref');
    expectTypeOf<ComponentPropsWithRef<'input'>>().toHaveProperty('ref');
  });

  it('ref is an ordinary prop in React 19: no forwardRef', () => {
    function TextInput({ ref, ...rest }: ComponentPropsWithRef<'input'>) {
      return <input ref={ref} className="form-field__input" {...rest} />;
    }
    expect(renderToStaticMarkup(<TextInput placeholder="Title" />)).toBe(
      '<input class="form-field__input" placeholder="Title"/>',
    );
    compiles(() => (
      <>
        <TextInput ref={createRef<HTMLInputElement>()} />
        {/* @ts-expect-error: a ref to a <div> can't hold an <input> */}
        <TextInput ref={createRef<HTMLDivElement>()} />
      </>
    ));
  });

  it('a clashing prop must be removed with Omit before redefining it', () => {
    type Clash = ComponentPropsWithoutRef<'input'> & { size: 'sm' | 'md' };
    type Fixed = Omit<ComponentPropsWithoutRef<'input'>, 'size'> & { size: 'sm' | 'md' };
    expectTypeOf<Clash['size']>().toEqualTypeOf<never>(); // number & ('sm' | 'md') has no values
    expectTypeOf<Fixed['size']>().toEqualTypeOf<'sm' | 'md'>();
  });

  it('ComponentProps<typeof X> reads the props of any component, including libraries', () => {
    type LinkProps = ComponentProps<typeof Link>;
    expectTypeOf<LinkProps>().toHaveProperty('to');
    expectTypeOf<LinkProps['replace']>().toEqualTypeOf<boolean | undefined>();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('13B.04 · events', () => {
  it('inline handlers get their event type from the element (contextual typing)', () => {
    compiles(() => (
      <>
        <input onChange={(e) => expectTypeOf(e.target.value).toEqualTypeOf<string>()} />
        <select onChange={(e) => expectTypeOf(e.currentTarget).toExtend<HTMLSelectElement>()} />
        <form onSubmit={(e) => expectTypeOf(e).toEqualTypeOf<SubmitEvent<HTMLFormElement>>()} />
        <button onClick={(e) => expectTypeOf(e).toEqualTypeOf<MouseEvent<HTMLButtonElement>>()} />
        <input onKeyDown={(e) => expectTypeOf(e.key).toEqualTypeOf<string>()} />
      </>
    ));
  });

  it('target vs currentTarget: only currentTarget is known to be the element', () => {
    function handleClick(e: MouseEvent<HTMLButtonElement>) {
      expectTypeOf(e.currentTarget).toExtend<HTMLButtonElement>();
      expectTypeOf(e.target).toEqualTypeOf<EventTarget>(); // could be a child <span> of the button
    }
    compiles(() => <button onClick={handleClick} />);
  });

  it('named handlers need the event type spelled out', () => {
    function handleChange(e: ChangeEvent<HTMLInputElement>) {
      expectTypeOf(e.target.checked).toEqualTypeOf<boolean>();
    }
    function handleKey(e: KeyboardEvent<HTMLInputElement>) {
      if (e.key === 'Escape') e.currentTarget.blur();
    }
    compiles(() => <input type="checkbox" onChange={handleChange} onKeyDown={handleKey} />);
    compiles(() => (
      // @ts-expect-error: a handler for <input> changes doesn't fit a <select>'s onChange
      <select onChange={handleChange} />
    ));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('13B.05 · refs', () => {
  it('useRef overloads (React 19 types)', () => {
    function Refs() {
      const input = useRef<HTMLInputElement>(null);
      const count = useRef(0);
      const timer = useRef<number | undefined>(undefined);
      // Refs are read and written in handlers/effects, never during render (lint rule react/refs)
      function handleFocus() {
        expectTypeOf(input).toEqualTypeOf<RefObject<HTMLInputElement | null>>();
        expectTypeOf(count).toEqualTypeOf<RefObject<number>>();
        expectTypeOf(timer).toEqualTypeOf<RefObject<number | undefined>>();
        count.current += 1; // every RefObject is mutable in React 19
        timer.current = window.setTimeout(() => input.current?.select(), 0);
      }
      return <input ref={input} onFocus={handleFocus} />;
    }
    expect(renderToStaticMarkup(<Refs />)).toBe('<input/>');
  });

  it('callback refs may return a cleanup function, but nothing else', () => {
    const seen: string[] = [];
    compiles(() => (
      <>
        <div
          ref={(node) => {
            if (node) seen.push(node.tagName);
            return () => {
              seen.push('cleanup'); // braces: the cleanup must return void (`() => seen.push(…)` returns a number)
            };
          }}
        />
        {/* @ts-expect-error: a cleanup that returns a value (push returns the new length) is rejected */}
        <div ref={() => () => seen.push('cleanup')} />
        {/* @ts-expect-error: an implicit return of the node is not a cleanup function (React 19) */}
        <div ref={(node) => node} />
      </>
    ));
  });

  it('useImperativeHandle: expose a small typed API instead of the DOM node', () => {
    interface DialogHandle {
      open: () => void;
      close: () => void;
    }
    function Dialog({ ref }: { ref?: Ref<DialogHandle> }) {
      const [isOpen, setIsOpen] = useState(false);
      useImperativeHandle(ref, () => ({ open: () => setIsOpen(true), close: () => setIsOpen(false) }), []);
      return isOpen ? <dialog open /> : null;
    }
    const dialog = createRef<DialogHandle>();
    compiles(() => <Dialog ref={dialog} />);
    expect(renderToStaticMarkup(<Dialog ref={dialog} />)).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('13B.06 · hooks', () => {
  it('useState: inferred from the initial value, explicit when it is null or []', () => {
    function States() {
      const [count, setCount] = useState(0);
      const [user] = useState<User | null>(null);
      const [ids] = useState<number[]>([]);
      const [untyped] = useState([]);
      const [lazy] = useState(() => new Map<number, string>());
      expectTypeOf(count).toEqualTypeOf<number>();
      expectTypeOf(setCount).toEqualTypeOf<Dispatch<SetStateAction<number>>>();
      expectTypeOf(user).toEqualTypeOf<User | null>();
      expectTypeOf(ids).toEqualTypeOf<number[]>();
      expectTypeOf(untyped).toEqualTypeOf<never[]>(); // the classic trap: nothing can ever be added
      expectTypeOf(lazy).toEqualTypeOf<Map<number, string>>();
      return null;
    }
    expect(renderToStaticMarkup(<States />)).toBe('');
  });

  it('useReducer: the action union types dispatch', () => {
    type CounterAction = { type: 'incremented' } | { type: 'added'; amount: number };
    function counter(state: number, action: CounterAction): number {
      return action.type === 'incremented' ? state + 1 : state + action.amount;
    }
    function Counter() {
      const [value, dispatch] = useReducer(counter, 0);
      expectTypeOf(value).toEqualTypeOf<number>();
      expectTypeOf<Parameters<typeof dispatch>[0]>().toEqualTypeOf<CounterAction>();
      compiles(() => {
        dispatch({ type: 'added', amount: 2 });
        // @ts-expect-error: 'added' requires an amount
        dispatch({ type: 'added' });
      });
      return <output>{value}</output>;
    }
    expect(renderToStaticMarkup(<Counter />)).toBe('<output>0</output>');
  });

  it('useEffect: an async callback is rejected (it would return a Promise, not a cleanup)', () => {
    function Loader({ load }: { load: () => Promise<void> }) {
      useEffect(() => {
        void load(); // fire-and-forget inside a sync callback: the supported shape
      }, [load]);
      /* oxlint-disable react-hooks/exhaustive-deps -- the linter ALSO flags this: "Effect callbacks are synchronous" */
      // @ts-expect-error: Promise<void> is not a valid effect return value
      useEffect(async () => {
        await load();
      }, [load]);
      /* oxlint-enable react-hooks/exhaustive-deps */
      return null;
    }
    expect(renderToStaticMarkup(<Loader load={async () => {}} />)).toBe('');
  });

  it('useReducer: React 18-style explicit generics no longer fit the React 19 signature', () => {
    type Action = { type: 'reset' };
    const reducer = (state: number, action: Action) => (action.type === 'reset' ? 0 : state);
    function Probe() {
      // @ts-expect-error: React 19's useReducer<S, A> takes the STATE type first, not a Reducer type
      const [old] = useReducer<Reducer<number, Action>>(reducer, 0);
      const [value] = useReducer(reducer, 0); // just let inference work
      return <output>{String(old) + value}</output>;
    }
    expect(renderToStaticMarkup(<Probe />)).toBe('<output>00</output>');
  });

  it('custom hooks: return a tuple `as const`, or an object', () => {
    function useToggleWrong(initial: boolean) {
      const [on, setOn] = useState(initial);
      return [on, () => setOn((v) => !v)];
    }
    function useToggle(initial: boolean) {
      const [on, setOn] = useState(initial);
      return [on, () => setOn((v) => !v)] as const;
    }
    function Probe() {
      const wrong = useToggleWrong(false);
      const right = useToggle(false);
      expectTypeOf(wrong).toEqualTypeOf<(boolean | (() => void))[]>();
      expectTypeOf(right).toEqualTypeOf<readonly [boolean, () => void]>();
      return null;
    }
    expect(renderToStaticMarkup(<Probe />)).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('13B.07 · context', () => {
  /** One helper instead of the same 12 lines per context (theme, toast, auth, tasks…). */
  function createSafeContext<T>(name: string) {
    const Context = createContext<T | null>(null);
    function useSafeContext(): T {
      const value = useContext(Context);
      if (value === null) throw new Error(`use${name} must be used inside <${name}Provider>`);
      return value;
    }
    return [Context, useSafeContext] as const;
  }

  const [CounterContext, useCounter] = createSafeContext<{ count: number }>('Counter');

  function Display() {
    const { count } = useCounter();
    expectTypeOf(useCounter).returns.toEqualTypeOf<{ count: number }>(); // never `| null` for callers
    return <span>{count}</span>;
  }

  it('React 19: <Context value> is the provider', () => {
    expect(
      renderToStaticMarkup(
        <CounterContext value={{ count: 3 }}>
          <Display />
        </CounterContext>,
      ),
    ).toBe('<span>3</span>');
  });

  it('outside the provider: a clear error instead of a null crash later', () => {
    expect(() => renderToStaticMarkup(<Display />)).toThrow('useCounter must be used inside <CounterProvider>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('13B.10 · generic components', () => {
  /** One column per key of T; `render` receives THAT key's value type (a mapped union). */
  type Column<T> = {
    [K in keyof T & string]: { key: K; header: string; render?: (value: T[K], row: T) => ReactNode };
  }[keyof T & string];

  function DataTable<T extends { id: number }>({ rows, columns }: { rows: readonly T[]; columns: readonly Column<T>[] }) {
    return (
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row[c.key], row) : String(row[c.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const task: Task = {
    id: 1, title: 'Write report', description: '', status: 'TODO', priority: 'HIGH',
    dueDate: null, categoryId: null, ownerId: 1, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
  };

  it('each column is typed by its own key', () => {
    const html = renderToStaticMarkup(
      <DataTable
        rows={[task]}
        columns={[
          { key: 'title', header: 'Title' },
          {
            key: 'dueDate',
            header: 'Due',
            render: (due) => {
              expectTypeOf(due).toEqualTypeOf<string | null>();
              return due ?? '—';
            },
          },
        ]}
      />,
    );
    expect(html).toContain('<td>Write report</td><td>—</td>');
    compiles(() => (
      // @ts-expect-error: 'password' is not a key of Task
      <DataTable rows={[task]} columns={[{ key: 'password', header: 'Password' }]} />
    ));
  });

  it('memo() fixes T to its constraint; a commented cast restores the generic signature', () => {
    function List<T extends { id: number }>({ items, renderItem }: { items: readonly T[]; renderItem: (item: T) => ReactNode }) {
      return <ul>{items.map((item) => <li key={item.id}>{renderItem(item)}</li>)}</ul>;
    }
    const cats = [{ id: 1, name: 'Work' }];
    const MemoList = memo(List);
    const GenericMemoList = memo(List) as typeof List; // accepted assertion: memo() can't preserve generics
    compiles(() => (
      <>
        {/* @ts-expect-error: through memo(), `c` is { id: number }, so `name` is unknown */}
        <MemoList items={cats} renderItem={(c) => c.name} />
        <GenericMemoList items={cats} renderItem={(c) => c.name} />
      </>
    ));
    expect(renderToStaticMarkup(<GenericMemoList items={cats} renderItem={(c) => c.name} />)).toBe('<ul><li>Work</li></ul>');
  });

  it('a generic arrow function in a .tsx file needs <T,>', () => {
    const first = <T,>(items: readonly T[]): T | undefined => items[0];
    expectTypeOf(first(['a'])).toEqualTypeOf<string | undefined>();
    expect(first([1, 2])).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('13B.11 · polymorphic components', () => {
  type BoxProps<E extends ElementType> = { as?: E } & Omit<ComponentPropsWithoutRef<E>, 'as'>;

  /** Renders any element or component; the props follow `as`. */
  function Box<E extends ElementType = 'div'>({ as, ...rest }: BoxProps<E>) {
    const Component: ElementType = as ?? 'div'; // the ONE place we widen: TS can't relate `rest` to a generic E
    return <Component {...rest} />;
  }

  it('the allowed props follow the `as` element', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Box className="x">div</Box>
        <Box as="a" href="/help">
          a
        </Box>
        <Box as={Link} to="/tasks">
          link
        </Box>
      </MemoryRouter>,
    );
    expect(html).toBe('<div class="x">div</div><a href="/help">a</a><a href="/tasks" data-discover="true">link</a>');
    compiles(() => (
      <>
        {/* @ts-expect-error: a <button> has no href */}
        <Box as="button" href="/x" />
        {/* @ts-expect-error: Link requires `to` */}
        <Box as={Link}>link</Box>
      </>
    ));
  });
});

describe('13B.11 · polymorphic components with ref and own props', () => {
  type PolymorphicProps<E extends ElementType, Own = object> = Own & { as?: E } & Omit<
    ComponentPropsWithRef<E>,
    'as' | keyof Own
  >;

  function Text<E extends ElementType = 'p'>({ as, tone, ...rest }: PolymorphicProps<E, { tone?: 'muted' | 'danger' }>) {
    const Component: ElementType = as ?? 'p';
    return <Component className={tone ? `text-${tone}` : undefined} {...rest} />;
  }

  it('ref follows the element; own props win', () => {
    expect(renderToStaticMarkup(<Text tone="muted">x</Text>)).toBe('<p class="text-muted">x</p>');
    compiles(() => (
      <>
        <Text ref={createRef<HTMLParagraphElement>()}>p</Text>
        <Text as="span" ref={createRef<HTMLSpanElement>()}>span</Text>
        {/* @ts-expect-error: a <span> ref can't hold the default <p> */}
        <Text ref={createRef<HTMLSpanElement>()}>p</Text>
        {/* @ts-expect-error: 'warning' is not one of our tones */}
        <Text tone="warning">p</Text>
      </>
    ));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('13B.12 · library types', () => {
  it('useParams: every param is string | undefined', () => {
    function Probe() {
      const params = useParams<'id'>();
      expectTypeOf(params.id).toEqualTypeOf<string | undefined>();
      const location = useLocation();
      expectTypeOf(location.state).toBeAny(); // `any`, NOT unknown: validate it yourself (12.11)
      return <span>{params.id}</span>;
    }
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tasks/7']}>
        <Routes>
          <Route path="tasks/:id" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(html).toBe('<span>7</span>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('13B.13 · enterprise conventions', () => {
  type Brand<T, B extends string> = T & { readonly __brand: B };
  type TaskId = Brand<number, 'TaskId'>;
  type UserId = Brand<number, 'UserId'>;
  const taskId = (n: number) => n as TaskId; // the only place a plain number becomes a TaskId
  const userId = (n: number) => n as UserId;
  const openTask = (id: TaskId) => `/tasks/${id}`;

  it('branded ids: a UserId can’t be passed where a TaskId is expected', () => {
    expect(openTask(taskId(5))).toBe('/tasks/5');
    compiles(() => {
      // @ts-expect-error: UserId is not assignable to TaskId
      openTask(userId(5));
      // @ts-expect-error: neither is a plain number
      openTask(5);
    });
  });

  it('exhaustiveness without a helper: `satisfies never` in the default branch', () => {
    type Shape = { kind: 'circle'; r: number } | { kind: 'square'; side: number };
    function area(shape: Shape): number {
      switch (shape.kind) {
        case 'circle':
          return Math.PI * shape.r ** 2;
        case 'square':
          return shape.side ** 2;
        default:
          shape satisfies never; // becomes a compile error the day a third kind is added
          throw new Error('unreachable');
      }
    }
    function areaIncomplete(shape: Shape): number {
      switch (shape.kind) {
        case 'circle':
          return 1;
        default:
          // @ts-expect-error: 'square' is not handled, so shape is not never
          shape satisfies never;
          return 0;
      }
    }
    expect(area({ kind: 'square', side: 2 })).toBe(4);
    expect(areaIncomplete({ kind: 'circle', r: 1 })).toBe(1);
  });

  it('satisfies checks a value against a type without widening it', () => {
    const labels = { TODO: 'To do', DONE: 'Done' } satisfies Record<string, string>;
    expectTypeOf(labels.TODO).toEqualTypeOf<string>(); // contextual type `string`: widened
    expectTypeOf(labels).not.toHaveProperty('IN_PROGRESS'); // …but the KEYS are exact, unlike `: Record<string, string>`
    const routes = { tasks: '/tasks', dashboard: '/dashboard' } satisfies Record<string, `/${string}`>;
    expectTypeOf(routes.tasks).toEqualTypeOf<'/tasks'>(); // a literal-ish contextual type keeps the literal
    const annotated: Record<string, `/${string}`> = routes;
    expectTypeOf(annotated.tasks).toEqualTypeOf<`/${string}` | undefined>(); // annotation: exact keys lost (noUncheckedIndexedAccess)
    compiles(() => {
      // @ts-expect-error: 'dashboard' doesn't start with '/'
      const bad = { dashboard: 'dashboard' } satisfies Record<string, `/${string}`>;
      return bad;
    });
  });
});
