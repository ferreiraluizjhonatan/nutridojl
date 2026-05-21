import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Database } from './types/database'
import { 
  Users, 
  Calendar, 
  Utensils, 
  LayoutDashboard, 
  Loader2, 
  LogOut, 
  Plus,
  ArrowLeft,
  Clock,
  Activity,
  User,
  Printer,
  Send,
  Menu,
  X
} from 'lucide-react'
import { Auth } from './components/Auth'
import { PatientModal } from './components/PatientModal'
import { ConsultationModal } from './components/ConsultationModal'
import './App.css'

type Paciente = Database['public']['Tables']['pacientes']['Row']
type Consulta = Database['public']['Tables']['consultas']['Row']
type PlanoAlimentar = Database['public']['Tables']['planos_alimentares']['Row']
type PacienteComConsultas = Paciente & {
  consultas?: Consulta[]
  planos_alimentares?: PlanoAlimentar[]
}

function App() {
  const [session, setSession] = useState<any>(null)
  const [pacientes, setPacientes] = useState<PacienteComConsultas[]>([])
  const [loading, setLoading] = useState(true)
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'connecting'>('connecting')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false)
  const [activeView, setActiveView] = useState<'dashboard' | 'pacientes'>('dashboard')
  const [selectedPatient, setSelectedPatient] = useState<PacienteComConsultas | null>(null)
  const [profileTab, setProfileTab] = useState<'consultas' | 'planos'>('consultas')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Estados para edição
  const [patientToEdit, setPatientToEdit] = useState<PacienteComConsultas | null>(null)
  const [isEditingPlan, setIsEditingPlan] = useState(false)
  const [planText, setPlanText] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [consultaToEdit, setConsultaToEdit] = useState<Consulta | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState(false)


  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchPacientes()
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true)
      }
      if (session) fetchPacientes()
      else {
        setPacientes([])
        setSelectedPatient(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchPacientes() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('pacientes')
        .select('*, consultas(*), planos_alimentares(*)')
        .eq('nutricionista_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const pacientesData = data || []
      setPacientes(pacientesData)
      
      // Se um paciente estiver selecionado, atualiza seus dados localmente
      if (selectedPatient) {
        const updated = pacientesData.find(p => p.id === selectedPatient.id)
        if (updated) setSelectedPatient(updated)
      }

      setDbStatus('connected')
      return pacientesData
    } catch (err) {
      console.error('Fetch error:', err)
      setDbStatus('error')
      return []
    } finally {
      setLoading(false)
    }
  }

  const getConsultasSemana = () => {
    const today = new Date()
    const currentDay = today.getDay()
    
    // Início da semana (Domingo 00:00:00)
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - currentDay)
    startOfWeek.setHours(0, 0, 0, 0)

    // Fim da semana (Sábado 23:59:59)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const formatDate = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const startStr = formatDate(startOfWeek)
    const endStr = formatDate(endOfWeek)

    let total = 0
    pacientes.forEach(p => {
      if (p.consultas) {
        p.consultas.forEach(c => {
          if (c.data_consulta >= startStr && c.data_consulta <= endStr) {
            total++
          }
        })
      }
    })
    return total
  }

  const getPacientesSemRetorno = () => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD
    
    return pacientes.filter(p => {
      const pastConsultas = (p.consultas || []).filter(c => c.data_consulta <= todayStr)
      if (pastConsultas.length === 0) return false

      // Ordenar consultas passadas por data decrescente
      const sorted = [...pastConsultas].sort((a, b) => b.data_consulta.localeCompare(a.data_consulta))
      const ultimaConsulta = sorted[0]

      // Diferença em dias
      const ultimaData = new Date(ultimaConsulta.data_consulta + 'T00:00:00')
      const diffTime = today.getTime() - ultimaData.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const maisDe30Dias = diffDays > 30

      // Verifica se existe agendamento futuro
      const temRetornoFuturo = (p.consultas || []).some(c => c.proximo_retorno && c.proximo_retorno >= todayStr)

      return maisDe30Dias && !temRetornoFuturo
    }).map(p => {
      const pastConsultas = (p.consultas || []).filter(c => c.data_consulta <= todayStr)
      const sorted = [...pastConsultas].sort((a, b) => b.data_consulta.localeCompare(a.data_consulta))
      const ultimaConsulta = sorted[0]
      const ultimaData = new Date(ultimaConsulta.data_consulta + 'T00:00:00')
      const diffTime = today.getTime() - ultimaData.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      return {
        ...p,
        diasSemRetorno: diffDays
      }
    })
  }

  const getFilteredAndSortedPacientes = (sortByAlphabetical = false) => {
    let list = [...pacientes]
    
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      list = list.filter(p => 
        (p.nome && p.nome.toLowerCase().includes(term)) ||
        (p.email && p.email.toLowerCase().includes(term))
      )
    }

    if (sortByAlphabetical) {
      list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    }

    return list
  }

  const handleSavePlan = async () => {
    if (!selectedPatient) return;
    setLoading(true);

    try {
      const plan = selectedPatient.planos_alimentares?.[0];
      if (plan) {
        // Atualizar plano existente
        const { error } = await supabase
          .from('planos_alimentares')
          .update({ conteudo: { texto: planText } })
          .eq('id', plan.id);

        if (error) throw error;
      } else {
        // Inserir novo plano
        const { error } = await supabase
          .from('planos_alimentares')
          .insert({
            paciente_id: selectedPatient.id,
            conteudo: { texto: planText }
          });

        if (error) throw error;
      }

      setIsEditingPlan(false);
      await fetchPacientes();
    } catch (err: any) {
      alert('Erro ao salvar o plano alimentar: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteConsulta = async (consultaId: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta consulta? Esta ação não pode ser desfeita.')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('consultas')
        .delete()
        .eq('id', consultaId)

      if (error) throw error

      await fetchPacientes()
      alert('Consulta excluída com sucesso.')
    } catch (err: any) {
      alert('Erro ao excluir consulta: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const calcularIdade = (dataNascimento: string | null) => {
    if (!dataNascimento) return 'N/A'
    const hoje = new Date()
    const nasc = new Date(dataNascimento)
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
      idade--
    }
    return `${idade} anos`
  }

  const renderEvolucaoChart = (consultasList: Consulta[]) => {
    const validConsultas = consultasList
      .filter(c => c.peso !== null || c.percentual_gordura !== null)
      .sort((a, b) => a.data_consulta.localeCompare(b.data_consulta))

    if (validConsultas.length < 2) {
      return null
    }

    const width = 600
    const height = 220
    const paddingLeft = 50
    const paddingRight = 30
    const paddingTop = 25
    const paddingBottom = 35

    const chartWidth = width - paddingLeft - paddingRight
    const chartHeight = height - paddingTop - paddingBottom

    const pesos = validConsultas.map(c => c.peso).filter((p): p is number => p !== null)
    const minPeso = pesos.length > 0 ? Math.min(...pesos) * 0.95 : 0
    const maxPeso = pesos.length > 0 ? Math.max(...pesos) * 1.05 : 100
    const diffPeso = maxPeso - minPeso || 1

    const gorduras = validConsultas.map(c => c.percentual_gordura).filter((g): g is number => g !== null)
    const minGordura = gorduras.length > 0 ? Math.min(...gorduras) * 0.95 : 0
    const maxGordura = gorduras.length > 0 ? Math.max(...gorduras) * 1.05 : 100
    const diffGordura = maxGordura - minGordura || 1

    const pointsPeso: { x: number; y: number; val: number; date: string }[] = []
    const pointsGordura: { x: number; y: number; val: number; date: string }[] = []

    validConsultas.forEach((c, idx) => {
      const x = paddingLeft + (idx * chartWidth) / (validConsultas.length - 1)
      const dateStr = new Date(c.data_consulta + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })

      if (c.peso !== null) {
        const y = height - paddingBottom - ((c.peso - minPeso) * chartHeight) / diffPeso
        pointsPeso.push({ x, y, val: c.peso, date: dateStr })
      }
      if (c.percentual_gordura !== null) {
        const y = height - paddingBottom - ((c.percentual_gordura - minGordura) * chartHeight) / diffGordura
        pointsGordura.push({ x, y, val: c.percentual_gordura, date: dateStr })
      }
    })

    const getPathD = (pts: typeof pointsPeso) => {
      if (pts.length === 0) return ''
      return pts.reduce((acc, p, idx) => {
        return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
      }, '')
    }

    const pathPeso = getPathD(pointsPeso)
    const pathGordura = getPathD(pointsGordura)

    return (
      <div className="chart-container" style={{ margin: '0 0 24px 0', padding: '20px', backgroundColor: 'var(--bg-sidebar)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, color: 'var(--success-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} /> Evolução Física do Paciente
        </h4>
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '12px', fontWeight: 600 }}>
          {pointsPeso.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '4px', backgroundColor: '#15803d', borderRadius: '2px' }}></span>
              <span>Peso (kg)</span>
            </div>
          )}
          {pointsGordura.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '4px', backgroundColor: '#0284c7', borderRadius: '2px' }}></span>
              <span>Gordura (%)</span>
            </div>
          )}
        </div>

        <div style={{ position: 'relative', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ minWidth: '450px', display: 'block' }}>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = paddingTop + ratio * chartHeight
              return (
                <line key={i} x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--border-color)" strokeWidth={1} strokeDasharray="4 4" />
              )
            })}

            {pathPeso && (
              <>
                <path d={pathPeso} fill="none" stroke="#15803d" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                {pointsPeso.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r={5} fill="#ffffff" stroke="#15803d" strokeWidth={2.5} />
                    <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#15803d">
                      {p.val} kg
                    </text>
                  </g>
                ))}
              </>
            )}

            {pathGordura && (
              <>
                <path d={pathGordura} fill="none" stroke="#0284c7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2" />
                {pointsGordura.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r={5} fill="#ffffff" stroke="#0284c7" strokeWidth={2.5} />
                    <text x={p.x} y={p.y + 16} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0284c7">
                      {p.val}%
                    </text>
                  </g>
                ))}
              </>
            )}

            {validConsultas.map((c, idx) => {
              const x = paddingLeft + (idx * chartWidth) / (validConsultas.length - 1)
              const dateStr = new Date(c.data_consulta + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
              return (
                <text key={idx} x={x} y={height - 10} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text-muted)">
                  {dateStr}
                </text>
              )
            })}
          </svg>
        </div>
      </div>
    )
  }

  const formatWhatsAppNumber = (phoneStr: string | null) => {
    if (!phoneStr) return ''
    const cleaned = phoneStr.replace(/\D/g, '')
    if (cleaned.length === 0) return ''
    if (cleaned.length === 10 || cleaned.length === 11) {
      return '55' + cleaned
    }
    return cleaned
  }

  const handleSendWhatsApp = (paciente: PacienteComConsultas, planoTexto: string) => {
    const telefone = formatWhatsAppNumber(paciente.whatsapp || paciente.telefone)
    if (!telefone) {
      alert('Paciente não possui WhatsApp ou telefone cadastrado.')
      return
    }
    const saudacao = `Olá, ${paciente.nome}! Segue o seu plano alimentar atualizado da nutrido JL:\n\n`
    const link = `https://wa.me/${telefone}?text=${encodeURIComponent(saudacao + planoTexto)}`
    window.open(link, '_blank')
  }

  const handlePatientClick = (p: PacienteComConsultas) => {
    setSelectedPatient(p)
  }

  const handleLogout = () => supabase.auth.signOut()

  if (loading && pacientes.length === 0) {
    return (
      <div className="splash-screen">
        <div className="logo-icon animate-pulse">JL</div>
        <div className="loader-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    )
  }

  if (!session || isResettingPassword) {
    return <Auth isResettingPassword={isResettingPassword} onPasswordResetComplete={() => setIsResettingPassword(false)} />
  }

  const renderPatientProfile = () => {
    if (!selectedPatient) return null;
    const p = selectedPatient;

    return (
      <div className="profile-container">
        <header className="profile-header">
          <div className="profile-title-wrapper">
            <button className="btn-back" style={{ width: 'fit-content', marginBottom: '12px' }} onClick={() => setSelectedPatient(null)}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <h1>{p.nome}</h1>
            <p>Paciente desde {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : 'N/A'}</p>
          </div>

          <button 
            className="btn-primary flex items-center gap-2" 
            onClick={() => {
              setConsultaToEdit(null);
              setIsConsultationModalOpen(true);
            }}
          >
            <Plus size={20} />
            <span>Nova Consulta</span>
          </button>
        </header>

        <div className="profile-layout">
          {/* Sidebar de Informações do Paciente */}
          <div className="profile-sidebar">
            <div className="profile-card">
              <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={16} /> Dados Cadastrais</span>
                <button 
                  className="btn-ghost" 
                  style={{ padding: '2px 8px', fontSize: '12px', color: 'var(--success-green)', fontWeight: 600 }}
                  onClick={() => {
                    setPatientToEdit(p);
                    setIsModalOpen(true);
                  }}
                >
                  Editar
                </button>
              </h3>
              <div className="profile-info-list">
                <div className="profile-info-item">
                  <span className="profile-info-label">E-mail</span>
                  <span className="profile-info-value">{p.email || '-'}</span>
                </div>
                <div className="profile-info-item">
                  <span className="profile-info-label">WhatsApp / Tel</span>
                  <span className="profile-info-value">{p.whatsapp || p.telefone || '-'}</span>
                </div>
                <div className="profile-info-item">
                  <span className="profile-info-label">Data de Nascimento</span>
                  <span className="profile-info-value">
                    {p.data_nascimento ? new Date(p.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                  </span>
                </div>
                <div className="profile-info-item">
                  <span className="profile-info-label">Idade</span>
                  <span className="profile-info-value">{calcularIdade(p.data_nascimento)}</span>
                </div>
                <div className="profile-info-item">
                  <span className="profile-info-label">Sexo</span>
                  <span className="profile-info-value">{p.sexo || '-'}</span>
                </div>
              </div>
            </div>

            <div className="profile-card">
              <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={16} /> Estilo de Vida</span>
                <button 
                  className="btn-ghost" 
                  style={{ padding: '2px 8px', fontSize: '12px', color: 'var(--success-green)', fontWeight: 600 }}
                  onClick={() => {
                    setPatientToEdit(p);
                    setIsModalOpen(true);
                  }}
                >
                  Editar
                </button>
              </h3>
              <div className="profile-info-list">
                <div className="profile-info-item">
                  <span className="profile-info-label">Nível de Atividade</span>
                  <span className="profile-info-value">{p.nivel_atividade || 'Sedentário'}</span>
                </div>
                <div className="profile-info-item">
                  <span className="profile-info-label">Água Diária</span>
                  <span className="profile-info-value">{p.litros_agua ? `${p.litros_agua} Litros` : '-'}</span>
                </div>
                <div className="profile-info-item">
                  <span className="profile-info-label">Refeições por Dia</span>
                  <span className="profile-info-value">{p.refeicoes_por_dia || '-'}</span>
                </div>
                <div className="profile-info-item">
                  <span className="profile-info-label">Pratica Exercício?</span>
                  <span className="profile-info-value">{p.atividade_fisica ? 'Sim' : 'Não'}</span>
                </div>
                {p.atividade_fisica_descricao && (
                  <div className="profile-info-item">
                    <span className="profile-info-label">Exercício Detalhes</span>
                    <span className="profile-info-value">{p.atividade_fisica_descricao}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Área Principal - Histórico e Planos */}
          <div className="profile-main-content">
            <div className="profile-tabs">
              <button 
                className={`profile-tab ${profileTab === 'consultas' ? 'active' : ''}`}
                onClick={() => setProfileTab('consultas')}
              >
                Histórico de Consultas
              </button>
              <button 
                className={`profile-tab ${profileTab === 'planos' ? 'active' : ''}`}
                onClick={() => setProfileTab('planos')}
              >
                Planos Alimentares
              </button>
            </div>

            {profileTab === 'consultas' && (
              <div className="consultations-timeline">
                {p.consultas && p.consultas.length > 0 && renderEvolucaoChart(p.consultas)}
                {p.consultas && p.consultas.length > 0 ? (
                  [...p.consultas]
                    .sort((a, b) => b.data_consulta.localeCompare(a.data_consulta))
                    .map(c => {
                      const bmi = p.altura && c.peso 
                        ? (c.peso / Math.pow(p.altura / 100, 2)).toFixed(1)
                        : null;
                      return (
                        <div key={c.id} className="timeline-item">
                          <div className="timeline-card">
                            <div className="timeline-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <span className="timeline-date">
                                  Consulta em {new Date(c.data_consulta + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </span>
                                {c.proximo_retorno && (
                                  <span className="status-badge" style={{ color: 'var(--success-green)', borderColor: 'var(--success-green)', backgroundColor: 'rgba(21, 128, 61, 0.05)', fontSize: '11px', padding: '2px 8px' }}>
                                    Retorno: {new Date(c.proximo_retorno + 'T00:00:00').toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }} className="no-print">
                                <button 
                                  className="btn-ghost" 
                                  style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--text-muted)' }}
                                  onClick={() => {
                                    setConsultaToEdit(c);
                                    setIsConsultationModalOpen(true);
                                  }}
                                >
                                  Editar
                                </button>
                                <button 
                                  className="btn-ghost" 
                                  style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444' }}
                                  onClick={() => handleDeleteConsulta(c.id)}
                                >
                                  Excluir
                                </button>
                              </div>
                            </div>
                            <div className="timeline-metrics">
                              {c.peso && (
                                <div className="metric-item">
                                  <span className="metric-label">Peso</span>
                                  <span className="metric-value">{c.peso} kg</span>
                                </div>
                              )}
                              {bmi && (
                                <div className="metric-item">
                                  <span className="metric-label">IMC</span>
                                  <span className="metric-value">{bmi}</span>
                                </div>
                              )}
                              {c.cintura && (
                                <div className="metric-item">
                                  <span className="metric-label">Cintura</span>
                                  <span className="metric-value">{c.cintura} cm</span>
                                </div>
                              )}
                              {c.quadril && (
                                <div className="metric-item">
                                  <span className="metric-label">Quadril</span>
                                  <span className="metric-value">{c.quadril} cm</span>
                                </div>
                              )}
                              {c.percentual_gordura && (
                                <div className="metric-item">
                                  <span className="metric-label">% Gordura</span>
                                  <span className="metric-value">{c.percentual_gordura}%</span>
                                </div>
                              )}
                            </div>
                            {c.observacoes && (
                              <div className="timeline-notes">
                                <strong>Observações:</strong> {c.observacoes}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                ) : (
                  <div className="empty-state" style={{ padding: '40px 0' }}>
                    <Calendar size={48} />
                    <h3>Nenhuma consulta registrada</h3>
                    <p>Você ainda não registrou nenhuma consulta para este paciente.</p>
                    <button className="btn-secondary" style={{ marginTop: '16px' }} onClick={() => setIsConsultationModalOpen(true)}>
                      Registrar Primeira Consulta
                    </button>
                  </div>
                )}
              </div>
            )}

            {profileTab === 'planos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {isEditingPlan ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px' }}>Editar Plano Alimentar</h3>
                      <button 
                        className="btn-primary flex items-center gap-2" 
                        style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}
                        onClick={async () => {
                          if (planText && !window.confirm('Isso irá substituir o texto atual do plano. Deseja continuar?')) return;
                          try {
                            const { generateMealPlan } = await import('./lib/ai');
                            const btn = document.getElementById('btn-ai-generate');
                            if (btn) btn.innerHTML = '<span class="animate-spin">⏳</span> Gerando...';
                            const aiPlan = await generateMealPlan(p);
                            setPlanText(aiPlan);
                            if (btn) btn.innerHTML = '✨ Gerar com I.A.';
                          } catch (err: any) {
                            alert(err.message);
                            const btn = document.getElementById('btn-ai-generate');
                            if (btn) btn.innerHTML = '✨ Gerar com I.A.';
                          }
                        }}
                        id="btn-ai-generate"
                      >
                        ✨ Gerar com I.A.
                      </button>
                    </div>
                    <textarea
                      className="plan-editor-textarea"
                      value={planText}
                      onChange={(e) => setPlanText(e.target.value)}
                      placeholder="Digite aqui as refeições, horários e orientações nutricionais do paciente..."
                    />
                    <div className="plan-actions">
                      <button 
                        className="btn-ghost" 
                        onClick={() => setIsEditingPlan(false)}
                      >
                        Cancelar
                      </button>
                      <button 
                        className="btn-primary" 
                        onClick={handleSavePlan}
                      >
                        Salvar Plano
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {p.planos_alimentares && p.planos_alimentares.length > 0 ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '16px' }}>Plano Alimentar Ativo</h3>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn-ghost flex items-center gap-1"
                              style={{ padding: '8px 12px', fontSize: '13px', borderColor: 'var(--border-color)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                              onClick={() => {
                                const textoPlano = (p.planos_alimentares?.[0]?.conteudo as { texto?: string })?.texto || '';
                                handleSendWhatsApp(p, textoPlano);
                              }}
                              title="Enviar por WhatsApp"
                            >
                              <Send size={16} style={{ color: '#25D366' }} />
                              <span>WhatsApp</span>
                            </button>
                            <button 
                              className="btn-ghost flex items-center gap-1"
                              style={{ padding: '8px 12px', fontSize: '13px', borderColor: 'var(--border-color)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                              onClick={() => window.print()}
                              title="Imprimir ou Salvar PDF"
                            >
                              <Printer size={16} />
                              <span>PDF</span>
                            </button>
                            <button 
                              className="btn-primary" 
                              style={{ padding: '8px 16px', fontSize: '14px' }}
                              onClick={() => {
                                const plan = p.planos_alimentares?.[0];
                                const content = plan?.conteudo as { texto?: string };
                                setPlanText(content?.texto || '');
                                setIsEditingPlan(true);
                              }}
                            >
                              Editar Plano
                            </button>
                          </div>
                        </div>
                        <div id="print-section" className="plan-view-container-print">
                          <div className="print-only-header">
                            <h1>nutrido jl</h1>
                            <p>Plano Alimentar de {p.nome}</p>
                          </div>
                          <div className="plan-view-content" style={{ whiteSpace: 'pre-wrap' }}>
                            {(p.planos_alimentares[0].conteudo as { texto?: string })?.texto || 'Sem conteúdo.'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state" style={{ padding: '60px 0' }}>
                        <Utensils size={48} />
                        <h3>Nenhum plano alimentar cadastrado</h3>
                        <p>Cadastre o primeiro plano alimentar estruturado para este paciente.</p>
                        <button 
                          className="btn-secondary" 
                          style={{ marginTop: '16px' }}
                          onClick={() => {
                            setPlanText('');
                            setIsEditingPlan(true);
                          }}
                        >
                          Criar Plano Alimentar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header Mobile para telas menores */}
      <header className="mobile-header no-print">
        <button 
          className="menu-toggle" 
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
        <div className="mobile-logo">
          <div className="logo-icon small">JL</div>
          <span className="logo-text small">nutrido JL</span>
        </div>
        <div style={{ width: 40 }}></div>
      </header>

      {/* Overlay desfocado ao abrir a sidebar no mobile */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay no-print" 
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar Fixo / Deslizante no Mobile */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="logo-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="logo-icon">JL</div>
            <span className="logo-text">nutrido JL</span>
          </div>
          <button 
            className="sidebar-close-btn" 
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeView === 'dashboard' && !selectedPatient ? 'active' : ''}`}
            onClick={() => {
              setActiveView('dashboard')
              setSelectedPatient(null)
              setIsSidebarOpen(false)
            }}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'pacientes' && !selectedPatient ? 'active' : ''}`}
            onClick={() => {
              setActiveView('pacientes')
              setSelectedPatient(null)
              setIsSidebarOpen(false)
            }}
          >
            <Users size={20} />
            <span>Pacientes</span>
          </button>
          <div className="nav-spacer"></div>
          <button 
            className="nav-item" 
            onClick={() => {
              handleLogout()
              setIsSidebarOpen(false)
            }}
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </nav>
      </aside>

      {/* Conteúdo Principal */}
      <main className="main-content">
        <div className="dashboard-wrapper">
          {selectedPatient ? (
            renderPatientProfile()
          ) : activeView === 'dashboard' ? (
            <>
              <header className="top-header">
                <div className="header-title">
                  <h1>Dashboard</h1>
                  <p>Bem-vindo, {session.user.user_metadata?.full_name || session.user.email}.</p>
                </div>
                
                <div className="header-actions">
                  <div className="status-badge">
                    <div className={`status-dot ${dbStatus === 'connected' ? 'bg-success' : dbStatus === 'error' ? 'bg-error' : 'bg-warning'}`}></div>
                    {dbStatus === 'connecting' && <Loader2 size={16} className="animate-spin text-gray-400" />}
                    <span>
                      {dbStatus === 'connected' ? 'Conectado' : dbStatus === 'error' ? 'Erro' : 'Conectando...'}
                    </span>
                  </div>
                  <button className="btn-primary flex items-center gap-2" onClick={() => {
                    setPatientToEdit(null);
                    setIsModalOpen(true);
                  }}>
                    <Plus size={20} />
                    <span>Novo Paciente</span>
                  </button>
                  <button className="btn-ghost flex items-center gap-2" onClick={handleLogout} title="Sair">
                    <LogOut size={20} />
                  </button>
                </div>
              </header>

              <section className="dashboard-grid">
                <div className="stat-card">
                  <Users size={24} className="card-icon" style={{ color: 'var(--primary)' }} />
                  <div className="card-info">
                    <h3>Total Pacientes</h3>
                    <p className="card-value">{pacientes.length}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <Calendar size={24} className="card-icon" style={{ color: 'var(--primary)' }} />
                  <div className="card-info">
                    <h3>Consultas da Semana</h3>
                    <p className="card-value">{getConsultasSemana()}</p>
                  </div>
                </div>

                <div className="stat-card list-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={20} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Pacientes sem Retorno</h3>
                  </div>
                  
                  <div className="patient-list-container">
                    {getPacientesSemRetorno().length > 0 ? (
                      getPacientesSemRetorno().map(p => (
                        <div 
                          key={p.id} 
                          className="patient-list-item" 
                          onClick={() => handlePatientClick(p)}
                        >
                          <span className="patient-list-name">{p.nome}</span>
                          <span className="patient-list-days">Há {p.diasSemRetorno} dias</span>
                        </div>
                      ))
                    ) : (
                      <div className="no-patients-message">
                        Nenhum paciente sem retorno no momento
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="content-section">
                <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <h2>Pacientes Recentes</h2>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-sidebar)',
                        color: 'var(--text-main)',
                        fontSize: '13px',
                        width: '200px'
                      }}
                    />
                    <button className="btn-ghost" onClick={() => { setSearchTerm(''); setActiveView('pacientes'); }}>Ver todos</button>
                  </div>
                </div>
                
                <div className="table-container">
                  {getFilteredAndSortedPacientes(false).length > 0 ? (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>E-mail</th>
                          <th>Sexo</th>
                          <th>Peso Inicial</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredAndSortedPacientes(false).slice(0, 5).map((p) => (
                          <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => handlePatientClick(p)}>
                            <td><strong>{p.nome}</strong></td>
                            <td>{p.email || '-'}</td>
                            <td>{p.sexo}</td>
                            <td>{p.peso_inicial ? `${p.peso_inicial} kg` : '-'}</td>
                            <td>
                              <button 
                                className="btn-ghost" 
                                style={{ padding: '4px 8px', color: 'var(--success-green)', fontWeight: 600 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePatientClick(p);
                                }}
                              >
                                Ver Perfil
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state">
                      <Users size={48} />
                      <h3>Nenhum paciente encontrado</h3>
                      <p>Comece adicionando seu primeiro paciente para gerenciar as consultas.</p>
                      <button className="btn-secondary" onClick={() => {
                        setPatientToEdit(null);
                        setIsModalOpen(true);
                      }}>Adicionar Paciente</button>
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : activeView === 'pacientes' ? (
            <>
              <header className="top-header">
                <div className="header-title">
                  <h1>Gestão de Pacientes</h1>
                  <p>Visualize e gerencie sua base de pacientes.</p>
                </div>
                <div className="header-actions">
                  <button className="btn-primary flex items-center gap-2" onClick={() => {
                    setPatientToEdit(null);
                    setIsModalOpen(true);
                  }}>
                    <Plus size={20} />
                    <span>Novo Paciente</span>
                  </button>
                  <button className="btn-ghost flex items-center gap-2" onClick={handleLogout} title="Sair">
                    <LogOut size={20} />
                  </button>
                </div>
              </header>

              <section className="content-section">
                <div className="search-bar-container" style={{ marginBottom: '20px', display: 'flex', width: '100%', maxWidth: '400px' }}>
                  <input
                    type="text"
                    placeholder="Buscar paciente por nome ou e-mail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-sidebar)',
                      color: 'var(--text-main)',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div className="table-container">
                  {getFilteredAndSortedPacientes(true).length > 0 ? (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Objetivo</th>
                          <th>Última Consulta</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredAndSortedPacientes(true).map((p) => {
                          const pastConsultas = (p.consultas || []).filter(c => c.data_consulta <= new Date().toISOString().split('T')[0]);
                          const sorted = [...pastConsultas].sort((a, b) => b.data_consulta.localeCompare(a.data_consulta));
                          const ultimaData = sorted.length > 0 ? new Date(sorted[0].data_consulta + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
                          
                          const objs = p.objetivos || [];
                          let txtObj = objs.join(', ');
                          if (p.objetivo_texto) txtObj += txtObj ? ` - ${p.objetivo_texto}` : p.objetivo_texto;

                          return (
                            <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => handlePatientClick(p)}>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <strong style={{ color: 'var(--success-green)' }}>{p.nome}</strong>
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.email || p.whatsapp || p.telefone}</span>
                                </div>
                              </td>
                              <td style={{ fontSize: '13px' }}>{txtObj || '-'}</td>
                              <td style={{ fontSize: '13px' }}>{ultimaData}</td>
                              <td>
                                <button 
                                  className="btn-ghost" 
                                  style={{ padding: '4px 8px', color: 'var(--primary)', fontWeight: 600 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePatientClick(p);
                                  }}
                                >
                                  Ver Perfil
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state">
                      <Users size={48} />
                      <h3>Nenhum paciente cadastrado ainda</h3>
                      <button className="btn-secondary" onClick={() => {
                        setPatientToEdit(null);
                        setIsModalOpen(true);
                      }}>Adicionar Primeiro Paciente</button>
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>

      <PatientModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setPatientToEdit(null);
        }} 
        onSuccess={async (newPatient) => {
          const freshData = await fetchPacientes();
          if (newPatient) {
            const found = freshData.find(p => p.id === newPatient.id);
            if (found) {
              setSelectedPatient(found);
            }
          }
        }} 
        patientToEdit={patientToEdit}
      />

      {selectedPatient && (
        <ConsultationModal
          isOpen={isConsultationModalOpen}
          onClose={() => {
            setIsConsultationModalOpen(false);
            setConsultaToEdit(null);
          }}
          onSuccess={fetchPacientes}
          pacienteId={selectedPatient.id}
          pacienteNome={selectedPatient.nome}
          consultaToEdit={consultaToEdit}
        />
      )}
    </div>
  );
}

export default App
