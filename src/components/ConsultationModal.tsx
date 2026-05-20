import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Calendar, Weight, Clipboard, Loader2 } from 'lucide-react';
import type { Database } from '../types/database';

type Consulta = Database['public']['Tables']['consultas']['Row'];
type ConsultaInsert = Database['public']['Tables']['consultas']['Insert'];

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pacienteId: string;
  pacienteNome: string;
  consultaToEdit?: Consulta | null;
}

export function ConsultationModal({ isOpen, onClose, onSuccess, pacienteId, pacienteNome, consultaToEdit }: ConsultationModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<ConsultaInsert>>({
    data_consulta: new Date().toLocaleDateString('sv-SE'),
    peso: undefined,
    cintura: undefined,
    quadril: undefined,
    percentual_gordura: undefined,
    observacoes: '',
    proximo_retorno: '',
  });

  React.useEffect(() => {
    if (isOpen) {
      if (consultaToEdit) {
        setFormData({
          data_consulta: consultaToEdit.data_consulta,
          peso: consultaToEdit.peso ?? undefined,
          cintura: consultaToEdit.cintura ?? undefined,
          quadril: consultaToEdit.quadril ?? undefined,
          percentual_gordura: consultaToEdit.percentual_gordura ?? undefined,
          observacoes: consultaToEdit.observacoes ?? '',
          proximo_retorno: consultaToEdit.proximo_retorno ?? '',
        });
      } else {
        setFormData({
          data_consulta: new Date().toLocaleDateString('sv-SE'),
          peso: undefined,
          cintura: undefined,
          quadril: undefined,
          percentual_gordura: undefined,
          observacoes: '',
          proximo_retorno: '',
        });
      }
    }
  }, [consultaToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.data_consulta) {
      alert('Por favor, preencha a Data da Consulta.');
      const dataInput = document.getElementsByName('data_consulta')[0];
      if (dataInput) {
        dataInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (dataInput as HTMLInputElement).focus();
      }
      return;
    }

    setLoading(true);

    try {
      const dataToSave = {
        paciente_id: pacienteId,
        data_consulta: formData.data_consulta!,
        peso: formData.peso !== undefined && formData.peso !== null && !isNaN(formData.peso) ? formData.peso : null,
        cintura: formData.cintura !== undefined && formData.cintura !== null && !isNaN(formData.cintura) ? formData.cintura : null,
        quadril: formData.quadril !== undefined && formData.quadril !== null && !isNaN(formData.quadril) ? formData.quadril : null,
        percentual_gordura: formData.percentual_gordura !== undefined && formData.percentual_gordura !== null && !isNaN(formData.percentual_gordura) ? formData.percentual_gordura : null,
        observacoes: formData.observacoes || null,
        proximo_retorno: formData.proximo_retorno || null,
      };

      if (consultaToEdit) {
        const { error } = await supabase
          .from('consultas')
          .update(dataToSave)
          .eq('id', consultaToEdit.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('consultas').insert(dataToSave);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Erro ao salvar consulta: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '550px' }}>
        <header className="modal-header">
          <h2>{consultaToEdit ? 'Editar Consulta' : 'Nova Consulta'}</h2>
          <button onClick={onClose} className="btn-close"><X size={24} /></button>
        </header>

        <form onSubmit={handleSubmit} className="patient-form">
          <div className="form-sections">
            <section className="form-section" style={{ margin: 0 }}>
              <h3 style={{ marginBottom: '16px' }}>
                <Calendar size={18} /> {consultaToEdit ? `Editar consulta de ${pacienteNome}` : `Registrar Consulta para ${pacienteNome}`}
              </h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Data da Consulta</label>
                  <input type="date" name="data_consulta" value={formData.data_consulta} onChange={handleChange} required />
                </div>

                <div className="form-group">
                  <label><Weight size={14} style={{ marginRight: '4px' }} /> Peso (kg)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    name="peso" 
                    value={formData.peso === undefined || formData.peso === null || isNaN(formData.peso) ? '' : formData.peso} 
                    onChange={handleChange} 
                    placeholder="Ex: 72.5" 
                  />
                </div>

                <div className="form-group">
                  <label>Cintura (cm)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    name="cintura" 
                    value={formData.cintura === undefined || formData.cintura === null || isNaN(formData.cintura) ? '' : formData.cintura} 
                    onChange={handleChange} 
                    placeholder="Ex: 84" 
                  />
                </div>

                <div className="form-group">
                  <label>Quadril (cm)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    name="quadril" 
                    value={formData.quadril === undefined || formData.quadril === null || isNaN(formData.quadril) ? '' : formData.quadril} 
                    onChange={handleChange} 
                    placeholder="Ex: 98" 
                  />
                </div>

                <div className="form-group">
                  <label>% Gordura Corporal</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    name="percentual_gordura" 
                    value={formData.percentual_gordura === undefined || formData.percentual_gordura === null || isNaN(formData.percentual_gordura) ? '' : formData.percentual_gordura} 
                    onChange={handleChange} 
                    placeholder="Ex: 18.5" 
                  />
                </div>

                <div className="form-group">
                  <label>Próximo Retorno</label>
                  <input type="date" name="proximo_retorno" value={formData.proximo_retorno || ''} onChange={handleChange} />
                </div>

                <div className="form-group full-width">
                  <label><Clipboard size={14} style={{ marginRight: '4px' }} /> Observações / Recomendações</label>
                  <textarea name="observacoes" value={formData.observacoes || ''} onChange={handleChange} rows={4} placeholder="Evolução, queixas ou planos para a próxima consulta..." />
                </div>
              </div>
            </section>
          </div>

          <footer className="modal-footer">
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : (consultaToEdit ? 'Salvar Alterações' : 'Registrar')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
