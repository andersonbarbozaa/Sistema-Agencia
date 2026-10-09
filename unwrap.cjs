const fs = require('fs');

function unwrap(f) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/import ModalPortal from '@\/components\/ModalPortal';\r?\n?/g, '');
  c = c.replace(/<ModalPortal>/g, '');
  c = c.replace(/<\/ModalPortal>/g, '');
  fs.writeFileSync(f, c);
}

unwrap('app/(app)/tasks/page.tsx');
unwrap('app/(app)/agenda/page.tsx');
console.log('Unwrapped');
