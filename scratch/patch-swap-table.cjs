/**
 * Patch: substitui o layout de cards em ServiceSwapManager.tsx
 * por uma tabela estilo livro militar.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'components', 'ServiceSwapManager.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// ── Marcadores de início e fim do bloco a substituir ──
const START = '        <div className="space-y-4 print:hidden">';
const END   = '        </div>\r\n      )}\r\n';

const startIdx = content.indexOf(START);
if (startIdx === -1) { console.error('START marker not found!'); process.exit(1); }

// Encontrar o fim: o último </div> + )}  após startIdx
// END corresponde ao fechamento do bloco ternário ": ( ... )"
const endIdx = content.indexOf(END, startIdx);
if (endIdx === -1) { console.error('END marker not found!'); process.exit(1); }

const endPos = endIdx + END.length;

// ── Novo bloco (tabela estilo livro militar) ──
const newBlock = `        <div className="print:hidden">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Escalado</th>
                    <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Substituto</th>
                    <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-center whitespace-nowrap">Função</th>
                    <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Data</th>
                    <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Horário</th>
                    <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-center whitespace-nowrap">Obs.</th>
                    <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-center whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUnifiedSwaps.map(u => {
                    const isIdaEscalado    = u.ida.escaladoId  === currentUser.id;
                    const isIdaSubstituto  = u.ida.substitutoId === currentUser.id;
                    const isVoltaEscalado  = u.volta ? u.volta.escaladoId  === currentUser.id : false;
                    const isVoltaSubstituto= u.volta ? u.volta.substitutoId === currentUser.id : false;
                    const isUserInvolved   = isIdaEscalado || isIdaSubstituto || isVoltaEscalado || isVoltaSubstituto;

                    const isAprovado  = u.status === 'aprovado';
                    const isAguardando= u.status === 'aguardando_substituto';
                    const isPendente  = u.status === 'pendente';
                    const isRecusado  = u.status === 'recusado_substituto';
                    const isReprovado = u.status === 'reprovado';
                    const isCancelado = u.status === 'cancelado';
                    const dimRow      = isCancelado || isReprovado;

                    const shortStatus = isAprovado   ? 'OK'
                                      : isPendente   ? 'Pend.'
                                      : isAguardando ? 'Ag. Sub.'
                                      : isRecusado   ? 'Recusado'
                                      : isReprovado  ? 'Repr.'
                                      : 'Canc.';

                    const obs = u.status === 'recusado_substituto' && u.ida.observacao
                      ? \`Motivo: \${u.ida.observacao}\`
                      : u.ida.dataAprovacao && u.ida.aprovadorName
                      ? \`Autor.: \${u.ida.aprovadorName}\`
                      : '';

                    return (
                      <React.Fragment key={u.id}>
                        {/* ── IDA ROW ─────────────────────────────────────── */}
                        <tr className={\`border-l-4 border-l-blue-500 hover:bg-blue-50/30 transition-colors \${dimRow ? 'opacity-50' : ''}\`}>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className="text-[8px] font-black text-blue-500 uppercase block leading-none mb-0.5">📤 Escalado</span>
                            <span className="text-xs font-bold text-slate-800">{u.ida.escaladoName}</span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className="text-[8px] font-black text-indigo-500 uppercase block leading-none mb-0.5">Substituto</span>
                            <span className="text-xs font-bold text-slate-800">{u.ida.substitutoName}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={\`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase \${funcaoBadgeClass(u.funcao)}\`}>{u.funcao}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs font-bold text-slate-700 whitespace-nowrap">
                            {u.ida.data && u.ida.data !== '1970-01-01'
                              ? new Date(u.ida.data + 'T00:00:00').toLocaleDateString('pt-BR')
                              : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-xs font-bold text-slate-600 whitespace-nowrap">
                            {u.ida.horarioInicio}h × {u.ida.horarioFim}h
                          </td>
                          <td className="px-4 py-2.5 text-center max-w-[160px]">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={\`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase \${statusBadgeClass(u.status)}\`}>
                                {isAprovado   && <CheckCircle2 size={9} />}
                                {(isRecusado || isReprovado || isCancelado) && <XCircle size={9} />}
                                {(isAguardando || isPendente) && <Clock size={9} />}
                                {shortStatus}
                              </span>
                              {obs && (
                                <span className="text-[8px] text-slate-400 font-medium italic truncate max-w-[140px]" title={obs}>{obs}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              {u.status === 'aguardando_substituto' && u.ida.substitutoId === currentUser.id && (
                                <>
                                  <button onClick={() => handleAccept(u.ida)} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-black text-[8px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-0.5 shadow-sm">
                                    <Check size={10} /> Aceitar
                                  </button>
                                  <button onClick={() => setRejectModal({ isOpen: true, swapId: u.ida.id, reason: '' })} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md font-black text-[8px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-0.5 shadow-sm">
                                    <X size={10} /> Recusar
                                  </button>
                                </>
                              )}
                              {u.status === 'pendente' && currentUser.isAdmin && (
                                <>
                                  <button onClick={() => setEvaluationModal({ isOpen: true, swap: u.ida, action: 'aprovado', observation: '' })} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-black text-[8px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-0.5 shadow-sm">
                                    <Check size={10} /> Aprovar
                                  </button>
                                  <button onClick={() => setEvaluationModal({ isOpen: true, swap: u.ida, action: 'reprovado', observation: '' })} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md font-black text-[8px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-0.5 shadow-sm">
                                    <X size={10} /> Repr.
                                  </button>
                                </>
                              )}
                              {u.status !== 'cancelado' && (currentUser.isAdmin || (isUserInvolved && ['aguardando_substituto', 'pendente'].includes(u.status))) && (
                                <button onClick={() => setCancelSwapId(u.ida.id)} title="Cancelar Solicitação" className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-200 rounded-md transition-all active:scale-95">
                                  <XCircle size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* ── VOLTA ROW ────────────────────────────────────── */}
                        {u.volta ? (
                          <tr className={\`border-l-4 border-l-purple-400 bg-purple-500/[0.03] hover:bg-purple-50/40 transition-colors border-b-2 border-b-slate-200 \${dimRow ? 'opacity-50' : ''}\`}>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className="text-[8px] font-black text-purple-500 uppercase block leading-none mb-0.5">↩ Devolução — Escalado</span>
                              <span className="text-xs font-bold text-slate-700">{u.volta.escaladoName}</span>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className="text-[8px] font-black text-purple-400 uppercase block leading-none mb-0.5">Substituto</span>
                              <span className="text-xs font-bold text-slate-700">{u.volta.substitutoName}</span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={\`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase \${funcaoBadgeClass(u.funcao)}\`}>{u.funcao}</span>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {u.volta.data === '1970-01-01' ? (
                                <span className="text-amber-600 text-[9px] font-black uppercase animate-pulse flex items-center gap-1">
                                  <Clock size={9} /> A Definir
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-slate-700">
                                  {new Date(u.volta.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-bold text-slate-600 whitespace-nowrap">
                              {u.volta.data === '1970-01-01' ? '—' : \`\${u.volta.horarioInicio}h × \${u.volta.horarioFim}h\`}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {u.volta.data === '1970-01-01' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                  <Clock size={9} /> A Pagar
                                </span>
                              ) : (
                                <span className={\`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase \${statusBadgeClass(u.status)}\`}>
                                  {isAprovado && <CheckCircle2 size={9} />}
                                  {shortStatus}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {u.volta.data === '1970-01-01' && ['pendente', 'aprovado'].includes(u.status) && (isUserInvolved || currentUser.isAdmin) && (
                                <button
                                  onClick={() => setPaymentModal({ isOpen: true, swap: u.volta!, dataPagamento: '', horarioInicioPagamento: '08:00', horarioFimPagamento: '08:00' })}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-md font-black text-[8px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1"
                                >
                                  <Calendar size={10} /> Definir Data
                                </button>
                              )}
                            </td>
                          </tr>
                        ) : (
                          <tr className="border-b-2 border-b-slate-200"><td colSpan={7} className="py-0"></td></tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {filteredUnifiedSwaps.length} registro{filteredUnifiedSwaps.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}
`;

const before = content.substring(0, startIdx);
const after  = content.substring(endPos);
const patched = before + newBlock + after;

fs.writeFileSync(filePath, patched, 'utf8');
console.log('✅ Patch aplicado com sucesso!');
console.log('   Substituído de índice', startIdx, 'até', endPos);
console.log('   Tamanho original:', content.length, '| Novo:', patched.length);
