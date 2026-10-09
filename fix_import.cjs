const fs = require('fs');

function fixImport(f) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(
    "import { useState, useEffect }\nimport ModalPortal from '@/components/ModalPortal'; from 'react';",
    "import { useState, useEffect } from 'react';\nimport ModalPortal from '@/components/ModalPortal';"
  );
  fs.writeFileSync(f, c);
}

fixImport('app/(app)/tasks/page.tsx');
fixImport('app/(app)/agenda/page.tsx');
console.log('Fixed imports');
