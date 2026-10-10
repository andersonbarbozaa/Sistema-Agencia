const fs = require('fs');
const lines = fs.readFileSync('components/FloatingAIAssistant.tsx', 'utf8').split('\n');
console.log(lines.slice(290, 360).join('\n'));
