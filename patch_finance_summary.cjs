const fs = require('fs');
const file = 'app/api/finance/summary/route.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace all corrupted Saida strings
content = content.replace(/'Sa\ufffda'/g, "'Saída'")
                 .replace(/'Sa\u01dfda'/g, "'Saída'")
                 .replace(/'Sada'/g, "'Saída'")
                 .replace(/'Sa.da'/g, "'Saída'");

// Remove workspace_id checks from SQL queries completely
content = content.replace(/AND \(workspace_id = \? OR \(workspace_id IS NULL AND \? = 'ws_default'\)\)/g, '')
                 .replace(/AND \(ba\.workspace_id = \? OR \(ba\.workspace_id IS NULL AND \? = 'ws_default'\)\)/g, '');

// Also remove the bound parameters wsId for those queries
content = content.replace(/\.bind\([^)]*wsId[^)]*\)/g, (match) => {
    return match.replace(/,\s*wsId\s*,\s*wsId/g, '');
});
// Need to be careful. The bind for bank_accounts is just .bind(wsId, wsId)
content = content.replace(/\.bind\(wsId,\s*wsId\)/g, '');

fs.writeFileSync(file, content);
console.log('Fixed finance summary API');
