const fs = require('fs');

let t = fs.readFileSync('app/(app)/tasks/page.tsx', 'utf8');

// Add import
if (!t.includes("import ModalPortal from '@/components/ModalPortal';")) {
  t = t.replace(
    "import TaskTimeTracker from '@/components/TaskTimeTracker';",
    "import TaskTimeTracker from '@/components/TaskTimeTracker';\nimport ModalPortal from '@/components/ModalPortal';"
  );
}

// Wrap selectedTask
t = t.replace(
  "{selectedTask && (",
  "{selectedTask && (<ModalPortal>"
);
// we need to replace the `)}` that corresponds to it, which is before `{/* MODAL: SOLICITAR ALTERAÇÃO`
t = t.replace(
  "        </div>\n      )}\n\n      {/* ======================================================== */}\n      {/* MODAL: SOLICITAR ALTERAÇÃO",
  "        </div>\n      </ModalPortal>)}\n\n      {/* ======================================================== */}\n      {/* MODAL: SOLICITAR ALTERAÇÃO"
);

// Wrap showChangeRequestModal
t = t.replace(
  "{showChangeRequestModal && (",
  "{showChangeRequestModal && (<ModalPortal>"
);
t = t.replace(
  "        </div>\n      )}\n\n      {/* ======================================================== */}\n      {/* MODAL: SOLICITAR EXCLUSÃO",
  "        </div>\n      </ModalPortal>)}\n\n      {/* ======================================================== */}\n      {/* MODAL: SOLICITAR EXCLUSÃO"
);

// Wrap showDeleteRequestModal
t = t.replace(
  "{showDeleteRequestModal && (",
  "{showDeleteRequestModal && (<ModalPortal>"
);
t = t.replace(
  "        </div>\n      )}\n\n      {/* ======================================================== */}\n      {/* MODAL: CRIAR / EDITAR TAREFA",
  "        </div>\n      </ModalPortal>)}\n\n      {/* ======================================================== */}\n      {/* MODAL: CRIAR / EDITAR TAREFA"
);

// Wrap showTaskModal
t = t.replace(
  "{showTaskModal && (",
  "{showTaskModal && (<ModalPortal>"
);
t = t.replace(
  "        </div>\n      )}\n\n      {/* ======================================================== */}\n      {/* MODAL: DELETE (Admin Direto)",
  "        </div>\n      </ModalPortal>)}\n\n      {/* ======================================================== */}\n      {/* MODAL: DELETE (Admin Direto)"
);

// Wrap showAdminDeleteModal
t = t.replace(
  "{showAdminDeleteModal && (",
  "{showAdminDeleteModal && (<ModalPortal>"
);
t = t.replace(
  "        </div>\n      )}\n    </div>\n  );\n}",
  "        </div>\n      </ModalPortal>)}\n    </div>\n  );\n}"
);

fs.writeFileSync('app/(app)/tasks/page.tsx', t);
console.log('Fixed TasksPage');
