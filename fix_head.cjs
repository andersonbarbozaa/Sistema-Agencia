const fs = require('fs');

const p = 'app/layout.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace('<html lang="pt-BR">', `<html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>`);

fs.writeFileSync(p, c);
console.log('Updated app/layout.tsx');
