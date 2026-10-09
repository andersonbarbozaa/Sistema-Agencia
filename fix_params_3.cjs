const fs = require('fs');
const glob = require('glob');

const files = glob.sync('app/api/tasks/[id]/time-logs/**/*.ts');
for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  
  c = c.replace("{ params }: { params: { id: string } }", "{ params }: { params: Promise<{ id: string }> }");
  c = c.replace("{ params }: { params: { id: string; logId: string } }", "{ params }: { params: Promise<{ id: string; logId: string }> }");
  c = c.replace("{ params }: { params: { id: string, logId: string } }", "{ params }: { params: Promise<{ id: string; logId: string }> }");

  // In Next.js 16, Request -> NextRequest to be safe if they imported from next/server
  c = c.replace("request: Request,", "request: any,");

  fs.writeFileSync(f, c);
}
