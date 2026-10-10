const fs = require('fs');

const p = 'app/(app)/tasks/page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace("const [viewMode", "const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'danger' as 'danger' | 'warning' });\n  const [viewMode");

fs.writeFileSync(p, c);
console.log('Fixed confirmState');
