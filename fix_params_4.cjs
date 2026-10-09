const fs = require('fs');
const path = require('path');

const files = [
  'app/api/tasks/[id]/time-logs/route.ts',
  'app/api/tasks/[id]/time-logs/[logId]/route.ts',
  'app/api/tasks/[id]/time-logs/start/route.ts',
  'app/api/tasks/[id]/time-logs/stop/route.ts'
];

for (const f of files) {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace("{ params }: { params: { id: string } }", "{ params }: { params: Promise<{ id: string }> }");
    c = c.replace("{ params }: { params: { id: string; logId: string } }", "{ params }: { params: Promise<{ id: string; logId: string }> }");
    
    // inject await
    c = c.replace("params.id", "(await params).id");
    c = c.replace("params.logId", "(await params).logId");
    c = c.replace("const { id } = params;", "const { id } = await params;");
    c = c.replace("const { id, logId } = params;", "const { id, logId } = await params;");

    c = c.replace("request: Request,", "request: any,");
    fs.writeFileSync(f, c);
    console.log('Fixed', f);
  } else {
    console.log('Not found', f);
  }
}
