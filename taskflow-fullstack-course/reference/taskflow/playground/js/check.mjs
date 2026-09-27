import { count, increment } from './counter.js';
console.log('live1', count); increment(); console.log('live2', count);
try { eval('count = 5'); } catch (e) { console.log('assign import:', e.constructor.name, e.message); }
console.log({ ...{ a: 1, b: 2 }, b: 3, ...{ a: 4 } });
const a = { user: { name: 'An' } }; const b = { ...a }; b.user.name = 'Binh'; console.log(a.user.name, a === b, a.user === b.user);
const includeOwner = false; console.log({ x: 1, ...(includeOwner && { ownerId: 9 }) });
const byId = { 1: {id:1}, 2: {id:2} }; const { [2]: removed, ...restById } = byId; console.log(restById, removed);
console.log([1,2,3].toSpliced(1,0,9), [1,2,3].with(0,7), [3,1,2].toSorted());
const t = Object.freeze({ title: 'A', tags: ['x'] }); try { t.title = 'B'; } catch (e) { console.log('freeze:', e.message); } t.tags.push('y'); console.log(t.tags);
for (var i = 0; i < 3; i++) setTimeout(() => console.log('var', i));
for (let j = 0; j < 3; j++) setTimeout(() => console.log('let', j));
