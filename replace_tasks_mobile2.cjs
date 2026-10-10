const fs = require('fs');

const tasksPagePath = 'app/(app)/tasks/page.tsx';
let tasksPageCode = fs.readFileSync(tasksPagePath, 'utf8');

const tableStartStr = '<div className="overflow-x-auto">';
const tableStart = tasksPageCode.indexOf(tableStartStr);

const tableEndStr = '            </table>\n          </div>';
let tableEnd = tasksPageCode.indexOf(tableEndStr, tableStart);

if (tableStart !== -1 && tableEnd !== -1) {
  tableEnd += tableEndStr.length;

  const newTableCode = `<div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 hidden md:table-header-group">
                <tr>
                  <th className="py-3.5 px-4">Tarefa</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Entrega</th>
                  <th className="py-3.5 px-4">Mídias</th>
                  <th className="py-3.5 px-4">Valor</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 flex flex-col md:table-row-group">
                {filteredTasks.length === 0 ? (
                  <tr className="block md:table-row">
                    <td colSpan={8} className="p-8 text-center text-gray-400 block md:table-cell">
                      Nenhuma tarefa encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const isDeletionPending = task.deletion_request_status === 'pending';

                    return (
                      <tr
                        key={task.id}
                        className={cn(
                          'hover:bg-gray-50/80 transition-colors cursor-pointer flex flex-col md:table-row py-3 px-4 md:py-0 md:px-0',
                          isDeletionPending ? 'bg-red-50/60 opacity-60 text-red-900 md:border-l-4 md:border-red-500' : ''
                        )}
                        onClick={() => openTaskDetail(task.id)}
                      >
                        {/* MOBILE VIEW */}
                        <td className="md:hidden flex flex-col gap-1.5 w-full">
                          <div className="flex justify-between items-start">
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", 
                              task.status === 'Em aprovação' ? 'bg-amber-100 text-amber-800' :
                              task.status === 'Aprovada' ? 'bg-emerald-100 text-emerald-800' :
                              task.status === 'Em alteração' ? 'bg-orange-100 text-orange-800' :
                              task.status === 'Concluída' ? 'bg-gray-100 text-gray-800' :
                              'bg-blue-100 text-blue-800'
                            )}>
                              {task.status}
                            </span>
                            {task.assignees && task.assignees.length > 0 && (
                              <div className="flex -space-x-1.5">
                                {task.assignees.map((a: any, i: number) => (
                                  <div key={i} className="w-6 h-6 rounded-full bg-blue-600 border border-white flex items-center justify-center text-[10px] text-white font-bold shadow-sm" title={a.name}>
                                    {a.name.charAt(0).toUpperCase()}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="font-semibold text-gray-900 text-base leading-tight mt-0.5">
                            {task.name}
                            {isDeletionPending && (
                              <span className="ml-2 px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold">
                                Exclusão
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 gap-2 mt-1">
                            <span className="font-medium text-gray-700">{formatDate(task.delivery_date)}</span>
                            <span>•</span>
                            <span className="truncate">{task.client_name || '-'}</span>
                          </div>
                        </td>

                        {/* DESKTOP VIEW */}
                        <td className="hidden md:table-cell py-3 px-4 font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: task.category_color || '#3b82f6' }}
                            />
                            <span className="truncate max-w-xs">{task.name}</span>
                            {isDeletionPending && (
                              <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold">
                                Exclusão solicitada
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="hidden md:table-cell py-3 px-4 text-gray-600 truncate max-w-[140px]">
                          {task.client_name || '-'}
                        </td>
                        <td className="hidden md:table-cell py-3 px-4">
                          <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold", 
                            task.status === 'Em aprovação' ? 'bg-amber-100 text-amber-800' :
                            task.status === 'Aprovada' ? 'bg-emerald-100 text-emerald-800' :
                            task.status === 'Em alteração' ? 'bg-orange-100 text-orange-800' :
                            task.status === 'Concluída' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          )}>
                            {task.status}
                          </span>
                        </td>
                        <td className="hidden md:table-cell py-3 px-4 text-gray-600">
                          {task.category_name || '-'}
                        </td>
                        <td className="hidden md:table-cell py-3 px-4 text-gray-700 font-medium">
                          {formatDate(task.delivery_date)}
                        </td>
                        <td className="hidden md:table-cell py-3 px-4">
                          {task.media_links_count ? (
                            <span className="flex items-center gap-1.5 text-blue-600 font-medium text-xs">
                              <Film size={14} /> {task.media_links_count}
                            </span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="hidden md:table-cell py-3 px-4 font-medium text-gray-900">
                          {task.value && task.value > 0 ? formatCurrency(task.value) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="hidden md:table-cell py-3 px-4 text-right">
                          <button className="text-gray-400 hover:text-blue-600 transition-colors">
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>`;
  
  tasksPageCode = tasksPageCode.substring(0, tableStart) + newTableCode + tasksPageCode.substring(tableEnd);
  fs.writeFileSync(tasksPagePath, tasksPageCode);
  console.log('Tasks list view updated for mobile');
} else {
  console.log('Could not find Tasks table to replace.');
}
