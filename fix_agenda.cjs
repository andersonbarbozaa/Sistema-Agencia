const fs = require('fs');

let c = fs.readFileSync('app/(app)/agenda/page.tsx', 'utf8');

const target = `    } finally {
      setIsDeleting(false);
    }
  };`;

const replacement = `    } finally {
      setIsDeleting(false);
    }
      },
      onCancel: () => setConfirmState((prev: any) => ({ ...prev, isOpen: false })),
      type: 'danger'
    });
  };`;

c = c.replace(target, replacement);

fs.writeFileSync('app/(app)/agenda/page.tsx', c);
console.log('Fixed agenda page');
