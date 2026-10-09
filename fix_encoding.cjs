const fs = require('fs');
const files = [
  'app/api/finance/summary/route.ts',
  'app/api/dashboard/route.ts',
  'app/api/reports/route.ts',
  'app/api/finance/route.ts'
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/type = 'Sa[^']*'/g, "type = 'Saída'")
         .replace(/type === 'Sa[^']*'/g, "type === 'Saída'")
         .replace(/'Entrada', 'Sa[^']*'/g, "'Entrada', 'Saída'")
         .replace(/or Sa[^']*'/g, "or Saída'");
    fs.writeFileSync(f, c, 'utf8');
    console.log('Fixed', f);
  }
});
