const fs = require('fs');
const glob = require('glob'); // npm install glob or we can just list files manually
const files = [
  'app/api/finance/route.ts',
  'app/api/finance/summary/route.ts',
  'app/api/reports/route.ts',
  'app/api/dashboard/route.ts'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // We are replacing any corrupted 'Saida' string
    // In node, when reading UTF8, the corrupted char is often \ufffd
    content = content.replace(/'Sa\ufffda'/g, "'Saída'")
                     .replace(/'Sa\u01dfda'/g, "'Saída'")
                     .replace(/'Sa.da'/g, "'Saída'")
                     .replace(/'Sada'/g, "'Saída'")
                     .replace(/'Sada'/g, "'Saída'")
                     .replace(/"Sa\ufffda"/g, '"Saída"')
                     .replace(/"Sa\u01dfda"/g, '"Saída"')
                     .replace(/"Sa.da"/g, '"Saída"')
                     .replace(/"Sada"/g, '"Saída"')
                     .replace(/"Sada"/g, '"Saída"');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed ' + file);
  }
});
