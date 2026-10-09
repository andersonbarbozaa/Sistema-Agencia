const fs = require('fs');
let c = fs.readFileSync('app/api/calendar/[id]/route.ts', 'utf8');
if (!c.includes("export const dynamic = 'force-dynamic';")) {
  c = c.replace(/import \{ createNotification \} from '@\/lib\/notifications';/, "import { createNotification } from '@/lib/notifications';\n\nexport const dynamic = 'force-dynamic';");
  fs.writeFileSync('app/api/calendar/[id]/route.ts', c);
}
