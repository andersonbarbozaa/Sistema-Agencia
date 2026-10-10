const fs = require('fs');

const file = 'components/FloatingAIAssistant.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace('className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40"', 'className="fixed bottom-[130px] sm:bottom-6 right-4 sm:right-6 z-40"');
c = c.replace('className="fixed bottom-18 sm:bottom-24 right-3 sm:right-6 left-3 sm:left-auto', 'className="fixed bottom-[200px] sm:bottom-24 right-3 sm:right-6 left-3 sm:left-auto');
// also adjust height so it doesn't get squished out of screen
c = c.replace('max-h-[calc(100vh-90px)] sm:max-h-[600px] h-[500px] sm:h-[560px]', 'max-h-[calc(100vh-210px)] sm:max-h-[600px] h-[500px] sm:h-[560px]');

fs.writeFileSync(file, c);
console.log('Fixed FloatingAIAssistant positions');
