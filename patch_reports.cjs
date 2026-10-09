const fs = require('fs');
const file = 'app/api/reports/route.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace all corrupted Saida strings
content = content.replace(/'Sa\ufffda'/g, "'Saída'")
                 .replace(/'Sa\u01dfda'/g, "'Saída'")
                 .replace(/'Sada'/g, "'Saída'")
                 .replace(/'Sa.da'/g, "'Saída'");

// Remove workspace_id checks from SQL queries completely
content = content.replace(/AND \(workspace_id = \? OR \(workspace_id IS NULL AND \? = 'ws_default'\)\)/g, '')
                 .replace(/AND \(ft\.workspace_id = \? OR \(ft\.workspace_id IS NULL AND \? = 'ws_default'\)\)/g, '')
                 .replace(/AND \(c\.workspace_id = \? OR \(c\.workspace_id IS NULL AND \? = 'ws_default'\)\)/g, '')
                 .replace(/AND \(u\.workspace_id = \? OR \(u\.workspace_id IS NULL AND \? = 'ws_default'\)\)/g, '');

// Also remove the bound parameters wsId for those queries
// For monthlyData: .bind(year, wsId, wsId) -> .bind(year)
content = content.replace(/\.bind\(year, wsId, wsId\)/g, '.bind(year)');
// For categorySpending: .bind(wsId, wsId) -> .bind()
content = content.replace(/\.bind\(wsId, wsId\)/g, '');
// For clientBilling: .bind(wsId, wsId, wsId, wsId) -> .bind()
content = content.replace(/\.bind\(wsId, wsId, wsId, wsId\)/g, '');

fs.writeFileSync(file, content);
console.log('Fixed reports API');
