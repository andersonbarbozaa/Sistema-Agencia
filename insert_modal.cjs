const fs = require('fs');
let c = fs.readFileSync('app/(app)/agenda/page.tsx', 'utf8');

const modalCode = `
      {/* Modal de Pré-visualização de Tarefa */}
      {selectedTaskPreview && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900">Detalhes da Tarefa</h3>
              <button
                onClick={() => setSelectedTaskPreview(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Título</label>
                <p className="text-sm text-gray-900">{selectedTaskPreview.title}</p>
              </div>
              
              {selectedTaskPreview.client_name && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente</label>
                  <p className="text-sm text-gray-900">{selectedTaskPreview.client_name}</p>
                </div>
              )}

              {selectedTaskPreview.project_name && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Projeto</label>
                  <p className="text-sm text-gray-900">{selectedTaskPreview.project_name}</p>
                </div>
              )}

              {selectedTaskPreview.description && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição</label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedTaskPreview.description}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Data de Entrega</label>
                <p className="text-sm text-gray-900">
                  {selectedTaskPreview.event_date ? new Date(selectedTaskPreview.event_date).toLocaleDateString('pt-BR') : 'Sem data'}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
              <button
                onClick={async () => {
                  if (!confirm(\`Tem certeza que deseja excluir a tarefa "\${selectedTaskPreview.title}"?\`)) return;
                  try {
                    const res = await fetch(\`/api/tasks/\${selectedTaskPreview.id}\`, { method: 'DELETE' });
                    if (res.ok) {
                      setSelectedTaskPreview(null);
                      await fetchData();
                    } else {
                      const err = await res.json();
                      alert(err.error || 'Erro ao excluir tarefa.');
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-semibold transition-colors"
              >
                Excluir
              </button>
              
              <button
                onClick={() => window.location.href = \`/tasks?id=\${selectedTaskPreview.id}\`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex-1 text-center"
              >
                Editar Completo
              </button>
            </div>
          </div>
        </div>
      )}

      `;

c = c.replace('{selectedEvent && (', modalCode + '{selectedEvent && (');
fs.writeFileSync('app/(app)/agenda/page.tsx', c);
