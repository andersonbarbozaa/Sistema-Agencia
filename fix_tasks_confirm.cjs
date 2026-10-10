const fs = require('fs');

const p = 'app/(app)/tasks/page.tsx';
let c = fs.readFileSync(p, 'utf8');

// The script before probably failed because the state anchor was different in the git version?
// In the git version, it is `const [selectedTask, setSelectedTask] = useState<Task | null>(null);`
// Let's check!
if (!c.includes('const [confirmState, setConfirmState]')) {
  const stateAnchor = "const [selectedTask, setSelectedTask] = useState<Task | null>(null);";
  c = c.replace(stateAnchor, stateAnchor + "\n  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'danger' as 'danger' | 'warning' });");
}

fs.writeFileSync(p, c);
console.log('Fixed confirmState in tasks');
