const fs = require('fs');
let c = fs.readFileSync('app/(app)/agenda/page.tsx', 'utf8');

c = c.split('window.location.href = `/tasks?id=${item.id}`').join('setSelectedTaskPreview(item)');
c = c.split('window.location.href = `/tasks?id=${task.id}`').join('setSelectedTaskPreview(task)');

fs.writeFileSync('app/(app)/agenda/page.tsx', c);
