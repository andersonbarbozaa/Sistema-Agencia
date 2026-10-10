const fs = require('fs');

const p = 'app/(app)/tasks/page.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Import ConfirmModal
c = c.replace("import ModalPortal from '@/components/ModalPortal';", "import ModalPortal from '@/components/ModalPortal';\nimport ConfirmModal from '@/components/ConfirmModal';");

// 2. Add confirmState
const stateAnchor = "const [selectedTask, setSelectedTask] = useState<Task | null>(null);";
c = c.replace(stateAnchor, stateAnchor + "\n  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'danger' as 'danger' | 'warning' });");

// 3. Replace confirm
const confirmStr = `if (!confirm('Deseja realmente excluir esta tarefa permanentemente?')) return;
      const res = await fetch(\`/api/tasks/\${selectedTask.id}\`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedTask(null);
        setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
      }`;

const newConfirm = `setConfirmState({
        isOpen: true,
        title: 'Confirmar Exclusão',
        message: 'Deseja realmente excluir esta tarefa permanentemente?',
        type: 'danger',
        onConfirm: async () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          const res = await fetch(\`/api/tasks/\${selectedTask.id}\`, { method: 'DELETE' });
          if (res.ok) {
            setSelectedTask(null);
            setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
          }
        }
      });`;

c = c.replace(confirmStr, newConfirm);

// 4. Append ConfirmModal
const returnEnd = `</div>\n  );\n}`;
const newReturnEnd = `
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}`;
c = c.replace(returnEnd, newReturnEnd);

fs.writeFileSync(p, c);
console.log('ConfirmModal integrated');
