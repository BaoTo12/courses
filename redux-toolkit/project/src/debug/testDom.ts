// GIVEN (not part of the course): a fake browser page (jsdom) so the UI can run inside Node.
// Import this file FIRST in a demo, before anything that imports react-dom.
// It also gives small helpers to "use" the page like a person would, and to print the screen as text.
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); // tells React that `act` (below) is used

const { act } = await import('react');

export const rootElement = document.getElementById('root') as HTMLElement;

/** Runs `work`, then waits until React has finished every update it caused. */
export async function inAct(work: () => unknown): Promise<void> {
  await act(async () => {
    await work();
  });
}

export const find = <E extends Element = HTMLElement>(selector: string) =>
  rootElement.querySelector(selector) as E;
export const findAll = <E extends Element = HTMLElement>(selector: string) =>
  [...rootElement.querySelectorAll(selector)] as E[];
/** The first button whose text contains `label`. */
export const findButton = (label: string) =>
  findAll<HTMLButtonElement>('button').find((button) => button.textContent?.includes(label)) as HTMLButtonElement;

export async function click(element: Element): Promise<void> {
  await inAct(() => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
}

export async function typeText(input: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
  await inAct(() => {
    // set the value the way a browser does, so React's onChange sees it
    const prototype = input instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement : window.HTMLInputElement;
    Object.getOwnPropertyDescriptor(prototype.prototype, 'value')!.set!.call(input, text);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

export async function choose(select: HTMLSelectElement, value: string): Promise<void> {
  await inAct(() => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')!.set!.call(select, value);
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}

/** Lets `ms` milliseconds pass (for the fake server), letting React apply the updates that happen meanwhile. */
export async function wait(ms: number): Promise<void> {
  await inAct(() => new Promise((resolve) => setTimeout(resolve, ms)));
}

// ── printing the screen as text ──────────────────────────────────────────────
const BLOCKS = new Set(['MAIN', 'HEADER', 'FOOTER', 'SECTION', 'ARTICLE', 'FORM', 'DIV', 'UL', 'LI', 'P', 'H2', 'H3']);

function inlineText(node: Node): string {
  if (node.nodeType === 3) return node.textContent ?? '';
  if (!(node instanceof window.Element) || BLOCKS.has(node.tagName)) return '';
  if (node instanceof window.HTMLInputElement || node instanceof window.HTMLTextAreaElement) {
    return `[${node.value || node.placeholder}]`;
  }
  if (node instanceof window.HTMLSelectElement) {
    return `<${node.selectedOptions[0]?.textContent || 'choose'}>`;
  }
  if (node.tagName === 'BUTTON') {
    return `(${node.textContent})${(node as HTMLButtonElement).disabled ? '⊘' : ''}`;
  }
  return [...node.childNodes].map(inlineText).join('');
}

function blockLines(element: Element, depth: number, lines: string[]): void {
  const own = [...element.childNodes].map(inlineText).join('').replace(/\s+/g, ' ').trim();
  if (own) lines.push(`${'  '.repeat(depth)}${own}`);
  for (const child of element.children) {
    if (BLOCKS.has(child.tagName)) blockLines(child, own ? depth + 1 : depth, lines);
  }
}

/** Prints what a user would see, one line per block element. */
export function printScreen(title = 'screen'): void {
  const lines: string[] = [];
  blockLines(rootElement, 0, lines);
  console.log(`  ┌─ ${title}`);
  for (const line of lines) console.log(`  │ ${line}`);
  console.log('  └─');
}
