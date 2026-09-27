const fns = []; for (let i = 0; i < 3; i++) fns.push(() => i * 10); console.log('closures', fns.map((f) => f()));
function tag(strings, ...values) { console.log(strings, values); return 'x'; }
const priority = 'HIGH'; tag`Task is ${priority} and due ${'Oct 3'}!`;
function css(strings, ...values) { return (props) => strings.reduce((out, str, i) => { let value = values[i]; if (typeof value === 'function') value = value(props); return out + str + (value ?? ''); }, ''); }
const buttonStyles = css`
  padding: 8px 16px;
  background: ${(p) => (p.variant === 'primary' ? '#4f46e5' : '#fff')};
  color: ${(p) => (p.variant === 'primary' ? '#fff' : '#0f172a')};
`;
console.log(buttonStyles({ variant: 'primary' }));
const t = (s, ...v) => `${s.length}:${v.length}`; console.log(t`a${1}b${2}c`, t`no values`);
const board = { name: 'Sprint 12', normal() { return this.name; }, arrow: () => this?.name };
const f = board.normal; let r; try { r = f(); } catch (e) { r = 'THROWS: ' + e.message; }
console.log('this', board.normal(), r, board.arrow());
