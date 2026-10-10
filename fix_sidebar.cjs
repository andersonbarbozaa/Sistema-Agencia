const fs = require('fs');

const file = 'components/layout/Sidebar.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace('className="border-t border-gray-800/80 p-3.5 bg-gray-950/60"', 'className="border-t border-gray-800/80 p-3.5 pb-8 bg-gray-950/60"');

fs.writeFileSync(file, c);
console.log('Fixed Sidebar pb-8');
