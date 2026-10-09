const fs = require('fs');
let c = fs.readFileSync('app/api/calendar/route.ts', 'utf8');
c = c.replace(/import \{ createNotification \} from '@\/lib\/notifications';/, "import { createNotification } from '@/lib/notifications';\n\nexport const dynamic = 'force-dynamic';");
fs.writeFileSync('app/api/calendar/route.ts', c);
