const fs = require('fs');
let c = fs.readFileSync('app/api/tasks/[id]/route.ts', 'utf8');

c = c.replace(
  `    const task = await db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .bind(id)
      .first<any>();

    if (!task) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }`,
  `    const res = await db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .bind(id)
      .all<any>();
    const task = res.results?.[0];

    if (!task) {
      if (isAdmin(user)) {
        await db.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
      }
      return NextResponse.json({ message: 'Tarefa excluída (não encontrada no select)' });
    }`
);

fs.writeFileSync('app/api/tasks/[id]/route.ts', c);
