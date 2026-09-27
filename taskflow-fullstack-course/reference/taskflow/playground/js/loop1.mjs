console.log('1 sync');
setTimeout(() => console.log('2 timeout'), 0);
Promise.resolve().then(() => console.log('3 microtask'));
(async () => { console.log('4 async start (sync part)'); await null; console.log('5 after await (microtask)'); })();
console.log('6 sync end');
