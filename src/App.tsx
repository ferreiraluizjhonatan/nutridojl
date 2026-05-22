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
  Menu,
  X
} from 'lucide-react'
import { Auth } from './components/Auth'
import { PatientModal } from './components/PatientModal'
import { ConsultationModal } from './components/ConsultationModal'
import { MealPlanManager } from './components/MealPlanManager'
import './App.css'
const OBJETIVOS_OPCOES = ['Emagrecer', 'Ganhar massa', 'Controlar diabetes', 'Saúde geral', 'Performance esportiva', 'Reeducação alimentar'];
const PATOLOGIAS_OPCOES = ['Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome do ovário policístico', 'Doença celíaca', 'Colesterol alto'];
const RESTRICOES_OPCOES = ['Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar'];
const ALERGIAS_OPCOES = ['Amendoim', 'Leite', 'Ovo', 'Soja', 'Trigo', 'Frutos do mar'];

type Paciente = Database['public']['Tables']['pacientes']['Row']
type Consulta = Database['public']['Tables']['consultas']['Row']
type PlanoAlimentar = Database['public']['Tables']['planos_alimentares']['Row']
type PacienteComConsultas = Paciente & {
  consultas?: Consulta[]
  planos_alimentares?: PlanoAlimentar[]
}

const formatTimeInput = (value: string): string => {
  if (!value) return ''
  const clean = value.replace(/[^\d]/g, '')
  if (clean.length === 0) return ''
  if (clean.length <= 2) {
    const hours = Math.min(23, parseInt(clean, 10)).toString().padStart(2, '0')
    return `${hours}:00`
  }
  const hours = Math.min(23, parseInt(clean.slice(0, 2), 10)).toString().padStart(2, '0')
  const minutes = Math.min(59, parseInt(clean.slice(2, 4), 10)).toString().padStart(2, '0')
  return `${hours}:${minutes}`
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
  const [profileTab, setProfileTab] = useState<'dados' | 'consultas' | 'planos'>('dados')
  const [dataSubTab, setDataSubTab] = useState<'pessoal' | 'clinico' | 'habitos'>('pessoal')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Estados para edição
  const [patientToEdit, setPatientToEdit] = useState<PacienteComConsultas | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [consultaToEdit, setConsultaToEdit] = useState<Consulta | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState(() => {
    return window.location.hash.includes('type=recovery') || 
           window.location.search.includes('type=recovery') ||
           window.location.hash.includes('recovery') ||
           window.location.search.includes('recovery');
  })

  // Estados para edição direta no perfil do paciente
  const [profileFormData, setProfileFormData] = useState<Partial<PacienteComConsultas>>({})
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isSavingPatient, setIsSavingPatient] = useState(false)
  const [outroPatologiaText, setOutroPatologiaText] = useState('')
  const [outroRestricaoText, setOutroRestricaoText] = useState('')
  const [outroAlergiaText, setOutroAlergiaText] = useState('')


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

  useEffect(() => {
    if (selectedPatient) {
      setProfileFormData({
        nome: selectedPatient.nome || '',
        email: selectedPatient.email || '',
        telefone: selectedPatient.telefone || '',
        whatsapp: selectedPatient.whatsapp || '',
        data_nascimento: selectedPatient.data_nascimento || '',
        sexo: selectedPatient.sexo || 'Feminino',
        peso_inicial: selectedPatient.peso_inicial ?? undefined,
        altura: selectedPatient.altura ?? undefined,
        objetivos: selectedPatient.objetivos || [],
        objetivo_texto: selectedPatient.objetivo_texto || '',
        nivel_atividade: selectedPatient.nivel_atividade || 'Sedentário',
        patologias: selectedPatient.patologias || [],
        restricoes_alimentares: selectedPatient.restricoes_alimentares || [],
        alergias: selectedPatient.alergias || [],
        medicamentos: selectedPatient.medicamentos || '',
        suplementos: selectedPatient.suplementos || '',
        refeicoes_por_dia: selectedPatient.refeicoes_por_dia ?? 3,
        horario_acorda: selectedPatient.horario_acorda || '',
        horario_dorme: selectedPatient.horario_dorme || '',
        litros_agua: selectedPatient.litros_agua ?? 2,
        atividade_fisica: selectedPatient.atividade_fisica || false,
        atividade_fisica_descricao: selectedPatient.atividade_fisica_descricao || '',
        observacoes: selectedPatient.observacoes || ''
      })
      setSaveSuccess(false)
      setOutroPatologiaText('')
      setOutroRestricaoText('')
      setOutroAlergiaText('')
    } else {
      setProfileFormData({})
      setSaveSuccess(false)
    }
  }, [selectedPatient])

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

  const handleProfileArrayChange = (field: 'objetivos' | 'patologias' | 'restricoes_alimentares' | 'alergias', option: string, isChecked: boolean) => {
    setProfileFormData(prev => {
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

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setProfileFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value
    }));
  };

  const handleSavePatientProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!profileFormData.nome || profileFormData.nome.trim() === '') {
      alert('Por favor, preencha o Nome Completo do paciente.');
      return;
    }

    setIsSavingPatient(true);
    setSaveSuccess(false);

    try {
      // Concatena os campos de texto "Outro" aos arrays antes de salvar
      let finalPatologias = [...(profileFormData.patologias || [])];
      if (outroPatologiaText.trim() !== '') {
        finalPatologias = finalPatologias.filter(p => p !== 'Nenhum');
        if (!finalPatologias.includes(outroPatologiaText.trim())) {
          finalPatologias.push(outroPatologiaText.trim());
        }
      }

      let finalRestricoes = [...(profileFormData.restricoes_alimentares || [])];
      if (outroRestricaoText.trim() !== '') {
        finalRestricoes = finalRestricoes.filter(r => r !== 'Nenhum');
        if (!finalRestricoes.includes(outroRestricaoText.trim())) {
          finalRestricoes.push(outroRestricaoText.trim());
        }
      }

      let finalAlergias = [...(profileFormData.alergias || [])];
      if (outroAlergiaText.trim() !== '') {
        finalAlergias = finalAlergias.filter(a => a !== 'Nenhum');
        if (!finalAlergias.includes(outroAlergiaText.trim())) {
          finalAlergias.push(outroAlergiaText.trim());
        }
      }

      const payload = {
        nome: profileFormData.nome.trim(),
        email: profileFormData.email ? profileFormData.email.trim() : null,
        telefone: profileFormData.telefone ? profileFormData.telefone.trim() : null,
        whatsapp: profileFormData.whatsapp ? profileFormData.whatsapp.trim() : null,
        data_nascimento: profileFormData.data_nascimento || null,
        sexo: profileFormData.sexo || null,
        peso_inicial: profileFormData.peso_inicial ?? null,
        altura: profileFormData.altura ?? null,
        objetivos: profileFormData.objetivos || [],
        objetivo_texto: profileFormData.objetivo_texto || null,
        nivel_atividade: profileFormData.nivel_atividade || null,
        patologias: finalPatologias,
        restricoes_alimentares: finalRestricoes,
        alergias: finalAlergias,
        medicamentos: profileFormData.medicamentos || null,
        suplementos: profileFormData.suplementos || null,
        refeicoes_por_dia: profileFormData.refeicoes_por_dia ?? null,
        horario_acorda: profileFormData.horario_acorda || null,
        horario_dorme: profileFormData.horario_dorme || null,
        litros_agua: profileFormData.litros_agua ?? null,
        atividade_fisica: profileFormData.atividade_fisica ?? false,
        atividade_fisica_descricao: profileFormData.atividade_fisica_descricao || null,
        observacoes: profileFormData.observacoes || null,
      };

      const { error } = await supabase
        .from('pacientes')
        .update(payload)
        .eq('id', selectedPatient.id)
        .select()
        .single();

      if (error) throw error;

      setSaveSuccess(true);
      setOutroPatologiaText('');
      setOutroRestricaoText('');
      setOutroAlergiaText('');

      const freshData = await fetchPacientes();
      if (freshData) {
        const found = freshData.find(p => p.id === selectedPatient.id);
        if (found) {
          setSelectedPatient(found);
        }
      }

      // Ocultar mensagem de sucesso após 4 segundos
      setTimeout(() => {
        setSaveSuccess(false);
      }, 4000);
    } catch (err: any) {
      alert('Erro ao salvar as alterações do paciente: ' + err.message);
    } finally {
      setIsSavingPatient(false);
    }
  };

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

    if (validConsultas.length === 0) {
      return (
        <div className="chart-empty-container" style={{ margin: '0 0 24px 0' }}>
          <h4>Evolução Física do Paciente</h4>
          <p>Nenhuma consulta registrada ainda</p>
        </div>
      )
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
    const minPeso = pesos.length > 0 ? (pesos.length === 1 ? pesos[0] * 0.9 : Math.min(...pesos) * 0.95) : 0
    const maxPeso = pesos.length > 0 ? (pesos.length === 1 ? pesos[0] * 1.1 : Math.max(...pesos) * 1.05) : 100
    const diffPeso = maxPeso - minPeso || 1

    const gorduras = validConsultas.map(c => c.percentual_gordura).filter((g): g is number => g !== null)
    const minGordura = gorduras.length > 0 ? (gorduras.length === 1 ? gorduras[0] * 0.9 : Math.min(...gorduras) * 0.95) : 0
    const maxGordura = gorduras.length > 0 ? (gorduras.length === 1 ? gorduras[0] * 1.1 : Math.max(...gorduras) * 1.05) : 100
    const diffGordura = maxGordura - minGordura || 1

    const pointsPeso: { x: number; y: number; val: number; date: string }[] = []
    const pointsGordura: { x: number; y: number; val: number; date: string }[] = []

    validConsultas.forEach((c, idx) => {
      const x = validConsultas.length === 1 
        ? paddingLeft + chartWidth / 2 
        : paddingLeft + (idx * chartWidth) / (validConsultas.length - 1)
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
      if (pts.length < 2) return ''
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
              const x = validConsultas.length === 1
                ? paddingLeft + chartWidth / 2
                : paddingLeft + (idx * chartWidth) / (validConsultas.length - 1)
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
            <button className="btn-back" style={{ width: 'fit-content', marginBottom: '12px' }} onClick={() => { setSelectedPatient(null); setProfileTab('dados'); setDataSubTab('pessoal'); }}>
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

        {/* 3 Abas principais: Dados / Consultas / Planos */}
        <div className="profile-tabs">
          <button 
            className={`profile-tab ${profileTab === 'dados' ? 'active' : ''}`}
            onClick={() => setProfileTab('dados')}
          >
            <User size={16} /> Dados do Paciente
          </button>
          <button 
            className={`profile-tab ${profileTab === 'consultas' ? 'active' : ''}`}
            onClick={() => setProfileTab('consultas')}
          >
            <Calendar size={16} /> Consultas
          </button>
          <button 
            className={`profile-tab ${profileTab === 'planos' ? 'active' : ''}`}
            onClick={() => setProfileTab('planos')}
          >
            <Utensils size={16} /> Planos Alimentares
          </button>
        </div>

        {/* ===== SEÇÃO 1 — DADOS DO PACIENTE ===== */}
        {profileTab === 'dados' && (
          <div className="profile-data-section">
            {saveSuccess && (
              <div className="success-banner">
                <span style={{ fontSize: '20px' }}>✓</span>
                <div>
                  <strong>Alterações salvas com sucesso!</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'inherit' }}>Os dados do paciente foram atualizados no banco de dados.</p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div className="data-sub-tabs">
                <button className={`data-sub-tab ${dataSubTab === 'pessoal' ? 'active' : ''}`} onClick={() => setDataSubTab('pessoal')}>
                  <User size={14} /> Pessoal
                </button>
                <button className={`data-sub-tab ${dataSubTab === 'clinico' ? 'active' : ''}`} onClick={() => setDataSubTab('clinico')}>
                  <Activity size={14} /> Clínico
                </button>
                <button className={`data-sub-tab ${dataSubTab === 'habitos' ? 'active' : ''}`} onClick={() => setDataSubTab('habitos')}>
                  <Clock size={14} /> Hábitos
                </button>
              </div>
            </div>

            <form onSubmit={handleSavePatientProfile} className="profile-form-container patient-form" style={{ padding: 0 }}>
              {dataSubTab === 'pessoal' && (
                <div className="profile-card fade-in" style={{ padding: '24px' }}>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Nome Completo *</label>
                      <input name="nome" value={profileFormData.nome || ''} onChange={handleProfileChange} placeholder="Ex: Maria Silva" required />
                    </div>
                    <div className="form-group">
                      <label>E-mail</label>
                      <input type="email" name="email" value={profileFormData.email || ''} onChange={handleProfileChange} placeholder="email@exemplo.com" />
                    </div>
                    <div className="form-group">
                      <label>Sexo</label>
                      <select name="sexo" value={profileFormData.sexo || 'Feminino'} onChange={handleProfileChange}>
                        <option value="Feminino">Feminino</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Data de Nascimento</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="date" name="data_nascimento" value={profileFormData.data_nascimento || ''} onChange={handleProfileChange} style={{ flex: 1 }} />
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {profileFormData.data_nascimento ? `${calcularIdade(profileFormData.data_nascimento)} anos` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Telefone</label>
                      <input name="telefone" value={profileFormData.telefone || ''} onChange={handleProfileChange} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="form-group">
                      <label>WhatsApp</label>
                      <input name="whatsapp" value={profileFormData.whatsapp || ''} onChange={handleProfileChange} placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                </div>
              )}

              {dataSubTab === 'clinico' && (
                <div className="profile-card fade-in" style={{ padding: '24px' }}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Peso Inicial (kg)</label>
                      <input type="number" step="0.1" name="peso_inicial" value={profileFormData.peso_inicial ?? ''} onChange={handleProfileChange} placeholder="Ex: 70.5" />
                    </div>
                    <div className="form-group">
                      <label>Altura (cm)</label>
                      <input type="number" name="altura" value={profileFormData.altura ?? ''} onChange={handleProfileChange} placeholder="Ex: 175" />
                    </div>
                    <div className="form-group">
                      <label>IMC Inicial</label>
                      <input type="text" value={profileFormData.peso_inicial && profileFormData.altura ? (profileFormData.peso_inicial / Math.pow(profileFormData.altura / 100, 2)).toFixed(1) : ''} disabled style={{ backgroundColor: 'var(--border-color)', fontWeight: 600, color: 'var(--text-main)' }} placeholder="Automático" />
                    </div>
                    <div className="form-group">
                      <label>Nível de Atividade (Geral)</label>
                      <select name="nivel_atividade" value={profileFormData.nivel_atividade || 'Sedentário'} onChange={handleProfileChange}>
                        <option value="Sedentário">Sedentário</option>
                        <option value="Levemente ativo">Levemente ativo</option>
                        <option value="Moderadamente ativo">Moderadamente ativo</option>
                        <option value="Muito ativo">Muito ativo</option>
                        <option value="Extremamente ativo">Extremamente ativo</option>
                      </select>
                    </div>
                    
                    <div className="form-group full-width">
                      <label>Objetivo</label>
                      <div className="checkbox-pill-group">
                        {OBJETIVOS_OPCOES.map(opt => (
                          <label key={opt} className={`checkbox-pill${profileFormData.objetivos?.includes(opt) ? ' checked' : ''}`}>
                            <input type="checkbox" checked={profileFormData.objetivos?.includes(opt)} onChange={(e) => handleProfileArrayChange('objetivos', opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <input type="text" name="objetivo_texto" value={profileFormData.objetivo_texto || ''} onChange={handleProfileChange} placeholder="Outros objetivos/detalhes..." />
                    </div>

                    <div className="form-group full-width">
                      <label>Patologias ou Condições de Saúde</label>
                      <div className="checkbox-pill-group">
                        <label className={`checkbox-pill${profileFormData.patologias?.includes('Nenhum') ? ' checked' : ''}`}>
                          <input type="checkbox" checked={profileFormData.patologias?.includes('Nenhum')} onChange={(e) => handleProfileArrayChange('patologias', 'Nenhum', e.target.checked)} /> Nenhum
                        </label>
                        {PATOLOGIAS_OPCOES.map(opt => (
                          <label key={opt} className={`checkbox-pill${profileFormData.patologias?.includes(opt) ? ' checked' : ''}${profileFormData.patologias?.includes('Nenhum') ? ' disabled' : ''}`}>
                            <input type="checkbox" disabled={profileFormData.patologias?.includes('Nenhum')} checked={profileFormData.patologias?.includes(opt)} onChange={(e) => handleProfileArrayChange('patologias', opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <input type="text" value={outroPatologiaText} onChange={(e) => setOutroPatologiaText(e.target.value)} disabled={profileFormData.patologias?.includes('Nenhum')} placeholder="Adicionar outra patologia..." />
                    </div>

                    <div className="form-group full-width">
                      <label>Restrições Alimentares</label>
                      <div className="checkbox-pill-group">
                        <label className={`checkbox-pill${profileFormData.restricoes_alimentares?.includes('Nenhum') ? ' checked' : ''}`}>
                          <input type="checkbox" checked={profileFormData.restricoes_alimentares?.includes('Nenhum')} onChange={(e) => handleProfileArrayChange('restricoes_alimentares', 'Nenhum', e.target.checked)} /> Nenhum
                        </label>
                        {RESTRICOES_OPCOES.map(opt => (
                          <label key={opt} className={`checkbox-pill${profileFormData.restricoes_alimentares?.includes(opt) ? ' checked' : ''}${profileFormData.restricoes_alimentares?.includes('Nenhum') ? ' disabled' : ''}`}>
                            <input type="checkbox" disabled={profileFormData.restricoes_alimentares?.includes('Nenhum')} checked={profileFormData.restricoes_alimentares?.includes(opt)} onChange={(e) => handleProfileArrayChange('restricoes_alimentares', opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <input type="text" value={outroRestricaoText} onChange={(e) => setOutroRestricaoText(e.target.value)} disabled={profileFormData.restricoes_alimentares?.includes('Nenhum')} placeholder="Adicionar outra restrição..." />
                    </div>

                    <div className="form-group full-width">
                      <label>Alergias Alimentares</label>
                      <div className="checkbox-pill-group">
                        <label className={`checkbox-pill${profileFormData.alergias?.includes('Nenhum') ? ' checked' : ''}`}>
                          <input type="checkbox" checked={profileFormData.alergias?.includes('Nenhum')} onChange={(e) => handleProfileArrayChange('alergias', 'Nenhum', e.target.checked)} /> Nenhum
                        </label>
                        {ALERGIAS_OPCOES.map(opt => (
                          <label key={opt} className={`checkbox-pill${profileFormData.alergias?.includes(opt) ? ' checked' : ''}${profileFormData.alergias?.includes('Nenhum') ? ' disabled' : ''}`}>
                            <input type="checkbox" disabled={profileFormData.alergias?.includes('Nenhum')} checked={profileFormData.alergias?.includes(opt)} onChange={(e) => handleProfileArrayChange('alergias', opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <input type="text" value={outroAlergiaText} onChange={(e) => setOutroAlergiaText(e.target.value)} disabled={profileFormData.alergias?.includes('Nenhum')} placeholder="Adicionar outra alergia..." />
                    </div>

                    <div className="form-group full-width">
                      <label>Medicamentos Contínuos</label>
                      <textarea name="medicamentos" value={profileFormData.medicamentos || ''} onChange={handleProfileChange} rows={2} placeholder="Ex: Losartana 50mg/dia..." />
                    </div>
                    
                    <div className="form-group full-width">
                      <label>Suplementos em Uso</label>
                      <textarea name="suplementos" value={profileFormData.suplementos || ''} onChange={handleProfileChange} rows={2} placeholder="Ex: Whey Protein, Creatina..." />
                    </div>
                  </div>
                </div>
              )}

              {dataSubTab === 'habitos' && (
                <div className="profile-card fade-in" style={{ padding: '24px' }}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Refeições por dia</label>
                      <input type="number" name="refeicoes_por_dia" value={profileFormData.refeicoes_por_dia ?? ''} onChange={handleProfileChange} placeholder="Ex: 4" />
                    </div>
                    <div className="form-group">
                      <label>Água (Litros/dia)</label>
                      <input type="number" step="0.1" name="litros_agua" value={profileFormData.litros_agua ?? ''} onChange={handleProfileChange} placeholder="Ex: 2.5" />
                    </div>
                    <div className="form-group">
                      <label>Horário que Acorda</label>
                      <input type="text" name="horario_acorda" value={profileFormData.horario_acorda || ''} onChange={handleProfileChange} onBlur={(e) => setProfileFormData(prev => ({...prev, horario_acorda: formatTimeInput(e.target.value)}))} placeholder="Ex: 06:00" />
                    </div>
                    <div className="form-group">
                      <label>Horário que Dorme</label>
                      <input type="text" name="horario_dorme" value={profileFormData.horario_dorme || ''} onChange={handleProfileChange} onBlur={(e) => setProfileFormData(prev => ({...prev, horario_dorme: formatTimeInput(e.target.value)}))} placeholder="Ex: 23:30" />
                    </div>
                    
                    <div className="form-group full-width">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" name="atividade_fisica" checked={profileFormData.atividade_fisica || false} onChange={handleProfileChange} />
                        Pratica Atividade Física Atualmente?
                      </label>
                    </div>
                    
                    {profileFormData.atividade_fisica && (
                      <div className="form-group full-width fade-in">
                        <label>Qual atividade e frequência semanal?</label>
                        <input type="text" name="atividade_fisica_descricao" value={profileFormData.atividade_fisica_descricao || ''} onChange={handleProfileChange} placeholder="Ex: Musculação 4x na semana" />
                      </div>
                    )}

                    <div className="form-group full-width">
                      <label>Observações Gerais</label>
                      <textarea name="observacoes" value={profileFormData.observacoes || ''} onChange={handleProfileChange} rows={4} placeholder="Rotina, aversões alimentares, hábitos finais..." />
                    </div>
                  </div>
                </div>
              )}

              <div className="profile-form-footer">
                <button type="submit" className="btn-primary" disabled={isSavingPatient}>
                  {isSavingPatient ? <Loader2 size={16} className="animate-spin" /> : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===== SEÇÃO 2 — CONSULTAS ===== */}
        {profileTab === 'consultas' && (
          <div className="consultations-timeline">
            {/* Gráfico SEMPRE visível */}
            {renderEvolucaoChart(p.consultas || [])}

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

        {/* ===== SEÇÃO 3 — PLANOS ALIMENTARES ===== */}
        {profileTab === 'planos' && (
          <MealPlanManager patient={p} onRefresh={fetchPacientes} />
        )}
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
