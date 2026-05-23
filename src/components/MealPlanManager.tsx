import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';
import { Utensils, Plus, Send, Printer, ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react';

// Tipagem TypeScript para o Plano Alimentar
export interface Refeicao {
  cafe_manha: string[];
  lanche_manha: string[];
  almoco: string[];
  lanche_tarde: string[];
  jantar: string[];
}

export interface PlanConteudo {
  dias: {
    segunda: Refeicao;
    terca: Refeicao;
    quarta: Refeicao;
    quinta: Refeicao;
    sexta: Refeicao;
    sabado: Refeicao;
    domingo: Refeicao;
  };
}

type Paciente = Database['public']['Tables']['pacientes']['Row'];
type PlanoAlimentar = Database['public']['Tables']['planos_alimentares']['Row'];
type PacienteComConsultas = Paciente & {
  consultas?: Database['public']['Tables']['consultas']['Row'][];
  planos_alimentares?: PlanoAlimentar[];
};

interface MealPlanManagerProps {
  patient: PacienteComConsultas;
  onRefresh: () => Promise<any>;
}

const DIAS_CHAVES = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] as const;
type DiaChave = typeof DIAS_CHAVES[number];

const DIAS_NOMES: Record<DiaChave, string> = {
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
  domingo: 'Domingo'
};

const REFEICOES_INFO = [
  { key: 'cafe_manha', label: 'Café da Manhã', icon: '☀️' },
  { key: 'lanche_manha', label: 'Lanche da Manhã', icon: '🍎' },
  { key: 'almoco', label: 'Almoço', icon: '🍲' },
  { key: 'lanche_tarde', label: 'Lanche da Tarde', icon: '🥪' },
  { key: 'jantar', label: 'Jantar', icon: '🥗' }
] as const;

type RefeicaoChave = typeof REFEICOES_INFO[number]['key'];

// Auxiliar para criar um plano alimentar limpo
const createEmptyPlan = (): PlanConteudo => {
  const dias: any = {};
  DIAS_CHAVES.forEach(dia => {
    dias[dia] = {
      cafe_manha: ['', '', '', '', ''],
      lanche_manha: ['', '', '', '', ''],
      almoco: ['', '', '', '', ''],
      lanche_tarde: ['', '', '', '', ''],
      jantar: ['', '', '', '', '']
    };
  });
  return { dias };
};

// Verifica se um objeto é do novo formato estruturado
const isStructuredPlan = (conteudo: any): conteudo is PlanConteudo => {
  return (
    conteudo &&
    typeof conteudo === 'object' &&
    'dias' in conteudo &&
    typeof conteudo.dias === 'object' &&
    DIAS_CHAVES.every(dia => 
      dia in conteudo.dias &&
      typeof conteudo.dias[dia] === 'object' &&
      REFEICOES_INFO.every(ref => Array.isArray(conteudo.dias[dia][ref.key]))
    )
  );
};

export const MealPlanManager: React.FC<MealPlanManagerProps> = ({ patient, onRefresh }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanConteudo>(createEmptyPlan());
  const [activeDay, setActiveDay] = useState<DiaChave>('segunda');
  const [loading, setLoading] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // Geração de formato WhatsApp para o plano estruturado
  const handleSendWhatsApp = (plan: PlanConteudo) => {
    const telefone = patient.whatsapp || patient.telefone;
    if (!telefone) {
      alert('Paciente não possui WhatsApp ou telefone cadastrado.');
      return;
    }
    const cleanPhone = telefone.replace(/\D/g, '');
    const ddiPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;

    let text = `Olá, *${patient.nome}*! Segue o seu plano alimentar estruturado da *Nutrido JL*:\n\n`;

    DIAS_CHAVES.forEach(diaKey => {
      const diaNome = DIAS_NOMES[diaKey].toUpperCase();
      const refeicoes = plan.dias[diaKey];
      
      let dayHasContent = false;
      REFEICOES_INFO.forEach(ref => {
        const items = refeicoes[ref.key] || [];
        if (items.some(item => item.trim() !== '')) {
          dayHasContent = true;
        }
      });

      if (dayHasContent) {
        text += `*🟢 ${diaNome}*\n`;
        REFEICOES_INFO.forEach(ref => {
          const items = (refeicoes[ref.key] || []).filter(item => item.trim() !== '');
          if (items.length > 0) {
            text += `  ${ref.icon} *${ref.label}:*\n`;
            items.forEach(item => {
              text += `  • ${item}\n`;
            });
          }
        });
        text += `\n`;
      }
    });

    const link = `https://wa.me/${ddiPhone}?text=${encodeURIComponent(text.trim())}`;
    window.open(link, '_blank');
  };

  const handlePrintPlan = () => {
    window.print();
  };

  // Carregar um plano para edição
  const handleEditClick = (plan: PlanoAlimentar) => {
    if (isStructuredPlan(plan.conteudo)) {
      // Clona profundamente o conteúdo para evitar mutação direta
      setCurrentPlan(JSON.parse(JSON.stringify(plan.conteudo)));
    } else {
      // Fallback para planos antigos baseados em texto
      const legacyText = (plan.conteudo as any)?.texto || 'Sem conteúdo.';
      const newPlan = createEmptyPlan();
      // Insere o texto antigo no Café da Manhã da Segunda-feira e avisa
      newPlan.dias.segunda.cafe_manha[0] = `[Plano Antigo] ${legacyText}`;
      setCurrentPlan(newPlan);
      alert('Aviso: Este plano foi criado no formato de texto antigo. Ao editar e salvar, ele será convertido para o novo formato estruturado.');
    }
    setEditingPlanId(plan.id);
    setActiveDay('segunda');
    setIsEditing(true);
  };

  // Iniciar criação de um novo plano
  const handleNewPlanClick = () => {
    setCurrentPlan(createEmptyPlan());
    setEditingPlanId(null);
    setActiveDay('segunda');
    setIsEditing(true);
  };

  // Atualizar campo de input de alimento específico
  const handleInputChange = (dia: DiaChave, refeicao: RefeicaoChave, index: number, value: string) => {
    setCurrentPlan(prev => {
      const updated = JSON.parse(JSON.stringify(prev)) as PlanConteudo;
      updated.dias[dia][refeicao][index] = value;
      return updated;
    });
  };

  // Salvar no Supabase (Insert ou Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient.id) {
      alert('Erro: ID do paciente ausente.');
      return;
    }

    setLoading(true);
    try {
      if (editingPlanId) {
        // UPDATE
        const { error } = await supabase
          .from('planos_alimentares')
          .update({ conteudo: currentPlan as any })
          .eq('id', editingPlanId);

        if (error) throw error;
        alert('Plano alimentar atualizado com sucesso!');
      } else {
        // INSERT
        const { error } = await supabase
          .from('planos_alimentares')
          .insert({
            paciente_id: patient.id,
            conteudo: currentPlan as any
          });

        if (error) throw error;
        alert('Plano alimentar criado com sucesso!');
      }

      setIsEditing(false);
      setEditingPlanId(null);
      await onRefresh();
    } catch (err: any) {
      alert('Erro ao salvar plano alimentar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Excluir plano
  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este plano alimentar? Esta ação não pode ser desfeita.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('planos_alimentares')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      alert('Plano alimentar excluído com sucesso.');
      await onRefresh();
    } catch (err: any) {
      alert('Erro ao excluir plano alimentar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFormatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Data não disponível';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="meal-plan-manager">
      {isEditing ? (
        <form onSubmit={handleSave} className="meal-plan-form fade-in">
          <div className="form-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button type="button" className="btn-back-square" onClick={() => { setIsEditing(false); setEditingPlanId(null); }}>
                <ArrowLeft size={16} />
              </button>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {editingPlanId ? 'Editar Plano Alimentar Manual' : 'Novo Plano Alimentar Manual'}
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn-ghost" onClick={() => { setIsEditing(false); setEditingPlanId(null); }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{editingPlanId ? 'Atualizar Plano' : 'Salvar Plano'}</span>
              </button>
            </div>
          </div>

          {/* Abas dos Dias da Semana */}
          <div className="day-tabs-scroll-container">
            <div className="day-tabs">
              {DIAS_CHAVES.map(diaKey => {
                const hasContent = REFEICOES_INFO.some(ref => 
                  (currentPlan.dias[diaKey]?.[ref.key] || []).some(item => item.trim() !== '')
                );
                return (
                  <button
                    key={diaKey}
                    type="button"
                    className={`day-tab ${activeDay === diaKey ? 'active' : ''} ${hasContent ? 'has-content' : ''}`}
                    onClick={() => setActiveDay(diaKey)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <span>{DIAS_NOMES[diaKey]}</span>
                    {hasContent && (
                      <span 
                        className="day-tab-dot" 
                        style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          backgroundColor: 'var(--success-green)',
                          boxShadow: '0 0 4px var(--success-green)',
                          flexShrink: 0
                        }} 
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid de Refeições do Dia Ativo */}
          <div className="meals-grid">
            {REFEICOES_INFO.map(ref => {
              const items = currentPlan.dias[activeDay]?.[ref.key] || ['', '', '', '', ''];
              return (
                <div key={ref.key} className="meal-card">
                  <div className="meal-card-header">
                    <span className="meal-card-icon">{ref.icon}</span>
                    <h4 className="meal-card-title">{ref.label}</h4>
                  </div>
                  <div className="meal-inputs-container">
                    {items.map((item, idx) => (
                      <input
                        key={idx}
                        type="text"
                        className="meal-input"
                        placeholder={`Opção ${idx + 1}`}
                        value={item}
                        onChange={(e) => handleInputChange(activeDay, ref.key, idx, e.target.value)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </form>
      ) : (
        <div className="meal-plan-history fade-in">
          <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Histórico de Planos Alimentares</h3>
            <button className="btn-primary flex items-center gap-2" onClick={handleNewPlanClick}>
              <Plus size={18} />
              <span>Novo Plano Alimentar</span>
            </button>
          </div>

          {patient.planos_alimentares && patient.planos_alimentares.length > 0 ? (
            <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...patient.planos_alimentares]
                .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
                .map((plan, idx) => {
                  const isExpanded = expandedPlanId === plan.id;
                  const dataCriacao = getFormatDate(plan.created_at);
                  const isStructured = isStructuredPlan(plan.conteudo);

                  return (
                    <div key={plan.id} className="plan-history-item" style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', backgroundColor: 'var(--bg-sidebar)' }}>
                      <div 
                        onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                        className="plan-history-summary"
                        style={{ width: '100%', padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Utensils size={16} style={{ color: 'var(--success-green)' }} />
                          <span style={{ fontWeight: 500, fontSize: '14px' }}>
                            Plano Alimentar {idx === 0 ? '(Mais recente)' : `#${patient.planos_alimentares!.length - idx}`}
                            {!isStructured && <span className="badge-legacy" style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 6px', backgroundColor: '#eab308', color: '#000', borderRadius: '4px' }}>Texto Antigo</span>}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{dataCriacao}</span>
                          <button 
                            type="button" 
                            className="btn-action" 
                            style={{ 
                              padding: '4px 10px', 
                              fontSize: '12px', 
                              border: '1px solid var(--border-color)', 
                              borderRadius: '6px', 
                              cursor: 'pointer', 
                              backgroundColor: isExpanded ? 'var(--border-color)' : 'transparent',
                              color: 'var(--text-main)',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span>{isExpanded ? 'Recolher' : 'Visualizar / Editar'}</span>
                            <span style={{ fontSize: '10px', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>▼</span>
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="plan-history-details fade-in" style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                          {isStructured ? (
                            <div className="plan-structured-preview">
                              {/* Accordion ou Grid dos dias com conteúdo */}
                              <div className="preview-days-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                                {DIAS_CHAVES.map(diaKey => {
                                  const meals = (plan.conteudo as unknown as PlanConteudo).dias[diaKey];
                                  let hasContent = false;
                                  REFEICOES_INFO.forEach(ref => {
                                    if ((meals[ref.key] || []).some(item => item.trim() !== '')) {
                                      hasContent = true;
                                    }
                                  });

                                  if (!hasContent) return null;

                                  return (
                                    <div key={diaKey} className="preview-day-block" style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-sidebar)' }}>
                                      <h5 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: 'var(--success-green)', textTransform: 'uppercase' }}>
                                        {DIAS_NOMES[diaKey]}
                                      </h5>
                                      <div className="preview-meals-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                        {REFEICOES_INFO.map(ref => {
                                          const items = (meals[ref.key] || []).filter(item => item.trim() !== '');
                                          if (items.length === 0) return null;

                                          return (
                                            <div key={ref.key} style={{ fontSize: '12px' }}>
                                              <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-main)' }}>
                                                {ref.icon} {ref.label}
                                              </strong>
                                              <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--text-muted)' }}>
                                                {items.map((item, idx) => (
                                                  <li key={idx}>{item}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="plan-view-content" style={{ whiteSpace: 'pre-wrap', padding: '16px 0', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-main)' }}>
                              {(plan.conteudo as any)?.texto || 'Sem conteúdo.'}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                            {isStructured && (
                              <button 
                                type="button"
                                className="btn-action flex items-center gap-1"
                                style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent' }}
                                onClick={() => handleSendWhatsApp(plan.conteudo as unknown as PlanConteudo)}
                              >
                                <Send size={14} style={{ color: '#25D366' }} /> <span>Enviar WhatsApp</span>
                              </button>
                            )}
                            <button 
                              type="button"
                              className="btn-action flex items-center gap-1"
                              style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent' }}
                              onClick={handlePrintPlan}
                            >
                              <Printer size={14} /> <span>PDF / Imprimir</span>
                            </button>
                            <button 
                              type="button"
                              className="btn-action"
                              style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--success-green)', fontWeight: 600, border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent' }}
                              onClick={() => handleEditClick(plan)}
                            >
                              Editar
                            </button>
                            <button 
                              type="button"
                              className="btn-action"
                              style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444', fontWeight: 600, border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', marginLeft: 'auto' }}
                              onClick={() => handleDeletePlan(plan.id)}
                              disabled={loading}
                            >
                              <Trash2 size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Excluir
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              }
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '60px 0', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
              <Utensils size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 6px', fontSize: '16px' }}>Nenhum plano alimentar gerado ainda</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Clique no botão acima para criar o primeiro plano alimentar deste paciente.</p>
            </div>
          )}
        </div>
      )}

      {/* Layout invisível na tela comum, mas formatado e visível na impressão */}
      <div className="meal-plan-print-only">
        <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #15803d', paddingBottom: '16px' }}>
          <h1 style={{ fontSize: '24px', margin: '0 0 4px', color: '#15803d' }}>Nutrido JL</h1>
          <p style={{ fontSize: '12px', margin: 0, color: '#666' }}>Acompanhamento Nutricional Personalizado</p>
        </div>

        <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px', borderBottom: '1px solid #ddd', paddingBottom: '12px' }}>
          <div><strong>Paciente:</strong> {patient.nome}</div>
          <div><strong>Data:</strong> {new Date().toLocaleDateString('pt-BR')}</div>
          {patient.data_nascimento && (
            <div><strong>Nascimento:</strong> {new Date(patient.data_nascimento).toLocaleDateString('pt-BR')}</div>
          )}
          {patient.objetivo_texto && (
            <div><strong>Objetivo:</strong> {patient.objetivo_texto}</div>
          )}
        </div>

        <h2 style={{ fontSize: '18px', textAlign: 'center', marginBottom: '20px', color: '#333' }}>PLANO ALIMENTAR PERSONALIZADO</h2>

        {(() => {
          // Para impressão, usa o plano selecionado (se expandido ou em edição) ou o mais recente da lista
          let planToPrint: PlanConteudo | null = null;
          if (isEditing) {
            planToPrint = currentPlan;
          } else if (expandedPlanId) {
            const expPlan = patient.planos_alimentares?.find(p => p.id === expandedPlanId);
            if (expPlan && isStructuredPlan(expPlan.conteudo)) {
              planToPrint = expPlan.conteudo;
            }
          } else if (patient.planos_alimentares && patient.planos_alimentares.length > 0) {
            const sorted = [...patient.planos_alimentares].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
            if (isStructuredPlan(sorted[0].conteudo)) {
              planToPrint = sorted[0].conteudo;
            }
          }

          if (!planToPrint) {
            // Se for legacy ou não houver
            const legacyPlan = patient.planos_alimentares?.[0];
            const textoPlano = (legacyPlan?.conteudo as any)?.texto || 'Sem plano alimentar cadastrado.';
            return (
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
                {textoPlano}
              </div>
            );
          }

          return (
            <div className="print-days-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {DIAS_CHAVES.map(diaKey => {
                const meals = planToPrint!.dias[diaKey];
                let hasContent = false;
                REFEICOES_INFO.forEach(ref => {
                  if ((meals[ref.key] || []).some(item => item.trim() !== '')) {
                    hasContent = true;
                  }
                });

                if (!hasContent) return null;

                return (
                  <div key={diaKey} style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '14px', pageBreakInside: 'avoid', backgroundColor: '#fafafa' }}>
                    <h3 style={{ margin: '0 0 10px', fontSize: '14px', borderBottom: '1.5px solid #15803d', paddingBottom: '4px', color: '#15803d', textTransform: 'uppercase' }}>
                      {DIAS_NOMES[diaKey]}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                      {REFEICOES_INFO.map(ref => {
                        const items = (meals[ref.key] || []).filter(item => item.trim() !== '');
                        if (items.length === 0) return null;

                        return (
                          <div key={ref.key} style={{ fontSize: '12px' }}>
                            <strong style={{ color: '#333', display: 'block', marginBottom: '4px' }}>
                              {ref.icon} {ref.label}
                            </strong>
                            <ul style={{ margin: 0, paddingLeft: '16px', color: '#555' }}>
                              {items.map((item, idx) => (
                                <li key={idx} style={{ marginBottom: '2px' }}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
