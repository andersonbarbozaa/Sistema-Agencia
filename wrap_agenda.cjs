const fs = require('fs');

let t = fs.readFileSync('app/(app)/agenda/page.tsx', 'utf8');

if (!t.includes("import ModalPortal from '@/components/ModalPortal';")) {
  t = t.replace(
    "import { CalendarEvent } from '@/types';",
    "import { CalendarEvent } from '@/types';\nimport ModalPortal from '@/components/ModalPortal';"
  );
}

t = t.replace(
  "{showCreateModal && (",
  "{showCreateModal && (<ModalPortal>"
);
t = t.replace(
  "        </div>\n      )}\n\n      {/* TASK PREVIEW MODAL (Vindo do Tasks) */}",
  "        </div>\n      </ModalPortal>)}\n\n      {/* TASK PREVIEW MODAL (Vindo do Tasks) */}"
);

t = t.replace(
  "{selectedTaskPreview && (",
  "{selectedTaskPreview && (<ModalPortal>"
);
t = t.replace(
  "        </div>\n      )}\n\n      {/* ======================================================== */}\n      {/* MODAL VIEW / DELETE EVENT                                */}",
  "        </div>\n      </ModalPortal>)}\n\n      {/* ======================================================== */}\n      {/* MODAL VIEW / DELETE EVENT                                */}"
);

t = t.replace(
  "{selectedEvent && (",
  "{selectedEvent && (<ModalPortal>"
);
t = t.replace(
  "        </div>\n      )}\n    </div>\n  );\n}",
  "        </div>\n      </ModalPortal>)}\n    </div>\n  );\n}"
);

fs.writeFileSync('app/(app)/agenda/page.tsx', t);
console.log('Fixed AgendaPage');
