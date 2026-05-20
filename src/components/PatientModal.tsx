import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, User, HeartPulse, Coffee, Loader2 } from 'lucide-react';
import type { Database } from '../types/database';

type PacienteInsert = Database['public']['Tables']['pacientes']['Insert'];
type Paciente = Database['public']['Tables']['pacientes']['Row'];

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPatient?: Paciente) => void;
  patientToEdit?: Paciente | null;
}

const OBJETIVOS_OPCOES = ['Emagrecer', 'Ganhar massa', 'Controlar diabetes', 'Saúde geral', 'Performance esportiva', 'Reeducação alimentar'];
const PATOLOGIAS_OPCOES = ['Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome do ovário policístico', 'Doença celíaca', 'Colesterol alto'];
const RESTRICOES_OPCOES = ['Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar'];
const ALERGIAS_OPCOES = ['Amendoim', 'Leite', 'Ovo', 'Soja', 'Trigo', 'Frutos do mar'];

function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 2) {
    let h = parseInt(digits, 10);
    if (h > 23) h = 23;
    return `${h.toString().padStart(2, '0')}:00`;
  }
  let h = parseInt(digits.slice(0, 2), 10);
  let m = parseInt(digits.slice(2, 4), 10);
  if (h > 23) h = 23;
  if (m > 59) m = 59;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function calcularIdade(dataStr?: string | null) {
  if (!dataStr) return '';
  const nascimento = new Date(dataStr + 'T00:00:00');
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade;
}

export function PatientModal({ isOpen, onClose, onSuccess, patientToEdit }: PatientModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pessoal' | 'clinico' | 'habitos'>('pessoal');
  
  const [formData, setFormData] = useState<Partial<PacienteInsert>>({
    nome: '', email: '', telefone: '', whatsapp: '', data_nascimento: '', sexo: 'Feminino',
    peso_inicial: undefined, altura: undefined, objetivos: [], objetivo_texto: '',
    nivel_atividade: 'Sedentário', patologias: [], restricoes_alimentares: [], alergias: [],
    medicamentos: '', suplementos: '', refeicoes_por_dia: 3, horario_acorda: '', horario_dorme: '',
    litros_agua: 2, atividade_fisica: false, atividade_fisica_descricao: '', observacoes: ''
  });

  const [imc, setImc] = useState<string>('');

  // Estados locais temporários para o campo "Outro" de múltipla escolha
  const [outroPatologia, setOutroPatologia] = useState('');
  const [outroRestricao, setOutroRestricao] = useState('');
  const [outroAlergia, setOutroAlergia] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (patientToEdit) {
        setFormData({
          nome: patientToEdit.nome || '', email: patientToEdit.email || '', telefone: patientToEdit.telefone || '', whatsapp: patientToEdit.whatsapp || '', data_nascimento: patientToEdit.data_nascimento || '', sexo: patientToEdit.sexo || 'Feminino',
          peso_inicial: patientToEdit.peso_inicial ?? undefined, altura: patientToEdit.altura ?? undefined,
          objetivos: patientToEdit.objetivos || [], objetivo_texto: patientToEdit.objetivo_texto || '',
          nivel_atividade: patientToEdit.nivel_atividade || 'Sedentário',
          patologias: patientToEdit.patologias || [], restricoes_alimentares: patientToEdit.restricoes_alimentares || [], alergias: patientToEdit.alergias || [],
          medicamentos: patientToEdit.medicamentos || '', suplementos: patientToEdit.suplementos || '',
          refeicoes_por_dia: patientToEdit.refeicoes_por_dia ?? 3, horario_acorda: patientToEdit.horario_acorda || '', horario_dorme: patientToEdit.horario_dorme || '',
          litros_agua: patientToEdit.litros_agua ?? 2, atividade_fisica: patientToEdit.atividade_fisica || false, atividade_fisica_descricao: patientToEdit.atividade_fisica_descricao || '', observacoes: patientToEdit.observacoes || ''
        });
      } else {
        setFormData({
          nome: '', email: '', telefone: '', whatsapp: '', data_nascimento: '', sexo: 'Feminino',
          peso_inicial: undefined, altura: undefined, objetivos: [], objetivo_texto: '',
          nivel_atividade: 'Sedentário', patologias: [], restricoes_alimentares: [], alergias: [],
          medicamentos: '', suplementos: '', refeicoes_por_dia: 3, horario_acorda: '', horario_dorme: '',
          litros_agua: 2, atividade_fisica: false, atividade_fisica_descricao: '', observacoes: ''
        });
      }
      setActiveTab('pessoal');
    }
  }, [isOpen, patientToEdit]);

  useEffect(() => {
    if (formData.peso_inicial && formData.altura) {
      const p = Number(formData.peso_inicial);
      const a = Number(formData.altura) / 100;
      if (p > 0 && a > 0) {
        setImc((p / (a * a)).toFixed(1));
      } else {
        setImc('');
      }
    } else {
      setImc('');
    }
  }, [formData.peso_inicial, formData.altura]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value
    }));
  };

  const handleArrayChange = (field: 'objetivos' | 'patologias' | 'restricoes_alimentares' | 'alergias', option: string, isChecked: boolean) => {
    setFormData(prev => {
      let currentArray = prev[field] || [];
      
      if (option === 'Nenhum') {
        return { ...prev, [field]: isChecked ? ['Nenhum'] : [] };
      }

      if (isChecked) {
        currentArray = currentArray.filter(v => v !== 'Nenhum'); // remove Nenhum
        if (!currentArray.includes(option)) currentArray = [...currentArray, option];
      } else {
        currentArray = currentArray.filter(v => v !== option);
      }
      return { ...prev, [field]: currentArray };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || formData.nome.trim() === '') {
      setActiveTab('pessoal');
      setTimeout(() => alert('Por favor, preencha o Nome Completo do paciente.'), 100);
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      // Incorporate "Outros" into arrays before saving
      let finalPatologias = [...(formData.patologias || [])];
      if (outroPatologia.trim() !== '') finalPatologias.push(outroPatologia.trim());
      
      let finalRestricoes = [...(formData.restricoes_alimentares || [])];
      if (outroRestricao.trim() !== '') finalRestricoes.push(outroRestricao.trim());

      let finalAlergias = [...(formData.alergias || [])];
      if (outroAlergia.trim() !== '') finalAlergias.push(outroAlergia.trim());

      const payload = {
        nutricionista_id: user.id,
        nome: formData.nome!,
        email: formData.email || null,
        telefone: formData.telefone || null,
        whatsapp: formData.whatsapp || null,
        data_nascimento: formData.data_nascimento || null,
        sexo: formData.sexo || null,
        peso_inicial: formData.peso_inicial ?? null,
        altura: formData.altura ?? null,
        objetivos: formData.objetivos || [],
        objetivo_texto: formData.objetivo_texto || null,
        nivel_atividade: formData.nivel_atividade || null,
        patologias: finalPatologias,
        restricoes_alimentares: finalRestricoes,
        alergias: finalAlergias,
        medicamentos: formData.medicamentos || null,
        suplementos: formData.suplementos || null,
        refeicoes_por_dia: formData.refeicoes_por_dia ?? null,
        horario_acorda: formData.horario_acorda || null,
        horario_dorme: formData.horario_dorme || null,
        litros_agua: formData.litros_agua ?? null,
        atividade_fisica: formData.atividade_fisica ?? false,
        atividade_fisica_descricao: formData.atividade_fisica_descricao || null,
        observacoes: formData.observacoes || null,
      };

      let savedPatient: Paciente | undefined;

      if (patientToEdit) {
        const { data, error } = await supabase.from('pacientes').update(payload).eq('id', patientToEdit.id).select().single();
        if (error) throw error;
        savedPatient = data;
      } else {
        const { data, error } = await supabase.from('pacientes').insert(payload).select().single();
        if (error) throw error;
        savedPatient = data;
      }

      alert('Paciente salvo com sucesso!');
      onSuccess(savedPatient);
      onClose();
    } catch (err: any) {
      alert('Erro ao salvar paciente: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content patient-modal" style={{ maxWidth: '800px', width: '90%' }}>
        <header className="modal-header">
          <h2>{patientToEdit ? 'Editar Cadastro de Paciente' : 'Novo Paciente'}</h2>
          <button type="button" onClick={onClose} className="btn-close"><X size={24} /></button>
        </header>

        <div className="tabs-header" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', padding: '0 24px' }}>
          <button 
            onClick={() => setActiveTab('pessoal')} 
            style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'pessoal' ? '3px solid var(--success-green)' : '3px solid transparent', color: activeTab === 'pessoal' ? 'var(--success-green)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} /> Pessoal
          </button>
          <button 
            onClick={() => setActiveTab('clinico')} 
            style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'clinico' ? '3px solid var(--success-green)' : '3px solid transparent', color: activeTab === 'clinico' ? 'var(--success-green)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HeartPulse size={18} /> Clínico
          </button>
          <button 
            onClick={() => setActiveTab('habitos')} 
            style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'habitos' ? '3px solid var(--success-green)' : '3px solid transparent', color: activeTab === 'habitos' ? 'var(--success-green)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coffee size={18} /> Hábitos
          </button>
        </div>

        <form onSubmit={handleSubmit} className="patient-form" style={{ padding: '0 24px' }}>
          <div className="form-sections" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
            
            {activeTab === 'pessoal' && (
              <section className="form-section fade-in">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Nome Completo *</label>
                    <input name="nome" value={formData.nome || ''} onChange={handleChange} placeholder="Ex: Maria Silva" required />
                  </div>
                  <div className="form-group">
                    <label>E-mail</label>
                    <input type="email" name="email" value={formData.email || ''} onChange={handleChange} placeholder="email@exemplo.com" />
                  </div>
                  <div className="form-group">
                    <label>Sexo</label>
                    <select name="sexo" value={formData.sexo || 'Feminino'} onChange={handleChange}>
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Data de Nascimento</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="date" name="data_nascimento" value={formData.data_nascimento || ''} onChange={handleChange} style={{ flex: 1 }} />
                      <span style={{ fontSize: '14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formData.data_nascimento ? `${calcularIdade(formData.data_nascimento)} anos` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Telefone</label>
                    <input name="telefone" value={formData.telefone || ''} onChange={handleChange} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="form-group">
                    <label>WhatsApp</label>
                    <input name="whatsapp" value={formData.whatsapp || ''} onChange={handleChange} placeholder="(00) 00000-0000" />
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'clinico' && (
              <section className="form-section fade-in">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Peso Atual (kg)</label>
                    <input type="number" step="0.1" name="peso_inicial" value={formData.peso_inicial ?? ''} onChange={handleChange} placeholder="Ex: 70.5" />
                  </div>
                  <div className="form-group">
                    <label>Altura (cm)</label>
                    <input type="number" name="altura" value={formData.altura ?? ''} onChange={handleChange} placeholder="Ex: 175" />
                  </div>
                  <div className="form-group">
                    <label>IMC Atual</label>
                    <input type="text" value={imc} disabled style={{ backgroundColor: '#f1f5f9', fontWeight: 600, color: 'var(--text-main)' }} placeholder="Automático" />
                  </div>
                  <div className="form-group">
                    <label>Nível de Atividade (Geral)</label>
                    <select name="nivel_atividade" value={formData.nivel_atividade || 'Sedentário'} onChange={handleChange}>
                      <option value="Sedentário">Sedentário</option>
                      <option value="Levemente ativo">Levemente ativo</option>
                      <option value="Moderadamente ativo">Moderadamente ativo</option>
                      <option value="Muito ativo">Muito ativo</option>
                      <option value="Extremamente ativo">Extremamente ativo</option>
                    </select>
                  </div>
                  
                  <div className="form-group full-width">
                    <label>Objetivo</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      {OBJETIVOS_OPCOES.map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', background: 'var(--bg-main)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          <input type="checkbox" checked={formData.objetivos?.includes(opt)} onChange={(e) => handleArrayChange('objetivos', opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>
                    <input type="text" name="objetivo_texto" value={formData.objetivo_texto || ''} onChange={handleChange} placeholder="Outros objetivos/detalhes..." />
                  </div>

                  <div className="form-group full-width">
                    <label>Patologias ou Condições de Saúde</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', background: 'var(--bg-main)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <input type="checkbox" checked={formData.patologias?.includes('Nenhum')} onChange={(e) => handleArrayChange('patologias', 'Nenhum', e.target.checked)} /> Nenhum
                      </label>
                      {PATOLOGIAS_OPCOES.map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', background: 'var(--bg-main)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          <input type="checkbox" disabled={formData.patologias?.includes('Nenhum')} checked={formData.patologias?.includes(opt)} onChange={(e) => handleArrayChange('patologias', opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>
                    <input type="text" value={outroPatologia} onChange={(e) => setOutroPatologia(e.target.value)} disabled={formData.patologias?.includes('Nenhum')} placeholder="Adicionar outra patologia..." />
                  </div>

                  <div className="form-group full-width">
                    <label>Restrições Alimentares</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', background: 'var(--bg-main)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <input type="checkbox" checked={formData.restricoes_alimentares?.includes('Nenhum')} onChange={(e) => handleArrayChange('restricoes_alimentares', 'Nenhum', e.target.checked)} /> Nenhum
                      </label>
                      {RESTRICOES_OPCOES.map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', background: 'var(--bg-main)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          <input type="checkbox" disabled={formData.restricoes_alimentares?.includes('Nenhum')} checked={formData.restricoes_alimentares?.includes(opt)} onChange={(e) => handleArrayChange('restricoes_alimentares', opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>
                    <input type="text" value={outroRestricao} onChange={(e) => setOutroRestricao(e.target.value)} disabled={formData.restricoes_alimentares?.includes('Nenhum')} placeholder="Adicionar outra restrição..." />
                  </div>

                  <div className="form-group full-width">
                    <label>Alergias Alimentares</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', background: 'var(--bg-main)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <input type="checkbox" checked={formData.alergias?.includes('Nenhum')} onChange={(e) => handleArrayChange('alergias', 'Nenhum', e.target.checked)} /> Nenhum
                      </label>
                      {ALERGIAS_OPCOES.map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', background: 'var(--bg-main)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          <input type="checkbox" disabled={formData.alergias?.includes('Nenhum')} checked={formData.alergias?.includes(opt)} onChange={(e) => handleArrayChange('alergias', opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>
                    <input type="text" value={outroAlergia} onChange={(e) => setOutroAlergia(e.target.value)} disabled={formData.alergias?.includes('Nenhum')} placeholder="Adicionar outra alergia..." />
                  </div>

                  <div className="form-group full-width">
                    <label>Medicamentos Contínuos</label>
                    <textarea name="medicamentos" value={formData.medicamentos || ''} onChange={handleChange} rows={2} placeholder="Ex: Losartana 50mg/dia..." />
                  </div>
                  
                  <div className="form-group full-width">
                    <label>Suplementos em Uso</label>
                    <textarea name="suplementos" value={formData.suplementos || ''} onChange={handleChange} rows={2} placeholder="Ex: Whey Protein, Creatina..." />
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'habitos' && (
              <section className="form-section fade-in">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Refeições por dia</label>
                    <input type="number" name="refeicoes_por_dia" value={formData.refeicoes_por_dia ?? ''} onChange={handleChange} placeholder="Ex: 4" />
                  </div>
                  <div className="form-group">
                    <label>Água (Litros/dia)</label>
                    <input type="number" step="0.1" name="litros_agua" value={formData.litros_agua ?? ''} onChange={handleChange} placeholder="Ex: 2.5" />
                  </div>
                  <div className="form-group">
                    <label>Horário que Acorda</label>
                    <input type="text" name="horario_acorda" value={formData.horario_acorda || ''} onChange={handleChange} onBlur={(e) => setFormData(prev => ({...prev, horario_acorda: formatTimeInput(e.target.value)}))} placeholder="Ex: 06:00" />
                  </div>
                  <div className="form-group">
                    <label>Horário que Dorme</label>
                    <input type="text" name="horario_dorme" value={formData.horario_dorme || ''} onChange={handleChange} onBlur={(e) => setFormData(prev => ({...prev, horario_dorme: formatTimeInput(e.target.value)}))} placeholder="Ex: 23:30" />
                  </div>
                  
                  <div className="form-group full-width">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" name="atividade_fisica" checked={formData.atividade_fisica || false} onChange={handleChange} />
                      Pratica Atividade Física Atualmente?
                    </label>
                  </div>
                  
                  {formData.atividade_fisica && (
                    <div className="form-group full-width fade-in">
                      <label>Qual atividade e frequência semanal?</label>
                      <input type="text" name="atividade_fisica_descricao" value={formData.atividade_fisica_descricao || ''} onChange={handleChange} placeholder="Ex: Musculação 4x na semana" />
                    </div>
                  )}

                  <div className="form-group full-width">
                    <label>Observações Gerais</label>
                    <textarea name="observacoes" value={formData.observacoes || ''} onChange={handleChange} rows={4} placeholder="Rotina, aversões alimentares, hábitos finais..." />
                  </div>
                </div>
              </section>
            )}

          </div>

          <footer className="modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Salvar Ficha Completa'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
