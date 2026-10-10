const fs = require('fs');

const file = 'app/(app)/layout.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace('h-screen', 'h-[100dvh]');
c = c.replace('className="p-3.5 sm:p-6"', 'className="p-3.5 sm:p-6 pb-[130px] md:pb-6"');

fs.writeFileSync(file, c);
console.log('Fixed padding in layout');
