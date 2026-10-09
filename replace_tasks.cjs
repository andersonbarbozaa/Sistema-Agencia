const fs = require('fs');
let c = fs.readFileSync('app/api/tasks/[id]/route.ts', 'utf8');

c = c.replace(
  `const task = await db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .bind(id)
      .first<any>();`,
  `const resTask = await db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .bind(id)
      .all<any>();
    const task = resTask.results?.[0];`
);

fs.writeFileSync('app/api/tasks/[id]/route.ts', c);
