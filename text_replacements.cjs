const fs = require('fs');

function replaceAll(file, replacements) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
}

// 1. Finance Page
replaceAll('app/(app)/finance/page.tsx', [
  ["Visão Geral/Dashboard", "Geral"],
  ["Todos os lançamentos", "Todos"],
  ["Entradas", "Renda"],
  ["Saídas", "Despesas"],
  ["Comparativo entre Sócios/Parceiros", "Usuários"],
  ["Relatórios & DRE Anual", "Tendência"],
  ["Financeiro & Gestão de Caixa", "Financeiro"]
]);

// 2. Sidebar
replaceAll('components/layout/Sidebar.tsx', [
  ["Agenda & Calendário", "Agenda"],
  ["Carteira de Clientes", "Clientes"],
  ["Tarefas & Produção", "Tarefas"]
]);

// 3. Agenda Page
replaceAll('app/(app)/agenda/page.tsx', [
  ["Agenda & Calendário", "Agenda"]
]);

// 4. Clients Page
replaceAll('app/(app)/clients/page.tsx', [
  ["Carteira de Clientes", "Clientes"]
]);

// 5. Tasks Page
replaceAll('app/(app)/tasks/page.tsx', [
  ["Tarefas & Produção", "Tarefas"]
]);

// 6. Dashboard Page
replaceAll('app/(app)/dashboard/page.tsx', [
  ["Painel Financeiro do Mês", "Financeiro"],
  ["Próximas Entregas (Tarefas)", "Próximas Entregas"]
]);

console.log('Text replacements done.');
