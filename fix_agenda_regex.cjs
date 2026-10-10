const fs = require('fs');

let c = fs.readFileSync('app/(app)/agenda/page.tsx', 'utf8');

c = c.replace(/} finally \{\s*setIsDeleting\(false\);\s*\}\s*\};\s*/, `} finally {
      setIsDeleting(false);
    }
      },
      onCancel: () => setConfirmState((prev: any) => ({ ...prev, isOpen: false })),
      type: 'danger'
    });
  };

  `);

fs.writeFileSync('app/(app)/agenda/page.tsx', c);
console.log('Fixed agenda page using regex');
