const fs = require('fs');
const file = 'app/api/dashboard/route.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace all corrupted Saida strings
content = content.replace(/'Sa\ufffda'/g, "'Saída'")
                 .replace(/'Sa\u01dfda'/g, "'Saída'")
                 .replace(/'Sada'/g, "'Saída'")
                 .replace(/'Sa.da'/g, "'Saída'");

// Remove workspace_id checks from SQL queries completely
content = content.replace(/WHERE \(workspace_id = \? OR \(workspace_id IS NULL AND \? = 'ws_default'\)\)/g, 'WHERE 1=1')
                 .replace(/AND \(t\.workspace_id = \? OR \(t\.workspace_id IS NULL AND \? = 'ws_default'\)\)/g, '')
                 .replace(/AND \(p\.workspace_id = \? OR \(p\.workspace_id IS NULL AND \? = 'ws_default'\)\)/g, '')
                 .replace(/AND \(e\.workspace_id = \? OR \(e\.workspace_id IS NULL AND \? = 'ws_default'\)\)/g, '')
                 .replace(/AND \(l\.workspace_id = \? OR \(l\.workspace_id IS NULL AND \? = 'ws_default'\)\)/g, '')
                 .replace(/AND \(ba\.workspace_id = \? OR \(ba\.workspace_id IS NULL AND \? = 'ws_default'\)\)/g, '')
                 .replace(/AND \(ft\.workspace_id = \? OR \(ft\.workspace_id IS NULL AND \? = 'ws_default'\)\)/g, '')
                 .replace(/AND \(u\.workspace_id = \? OR \(u\.workspace_id IS NULL AND \? = 'ws_default'\)\)/g, '');

// Also remove the bound parameters wsId for those queries
// Most queries have .bind(wsId, wsId)
content = content.replace(/\.bind\(wsId, wsId\)/g, '');
// partner stats has .bind(wsId, wsId, wsId, wsId)
content = content.replace(/\.bind\(wsId, wsId, wsId, wsId\)/g, '');

fs.writeFileSync(file, content);
console.log('Fixed dashboard API');
