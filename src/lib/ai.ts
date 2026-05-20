import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateMealPlan(patientData: any, customPrompt: string = ''): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'COLE_SUA_CHAVE_AQUI') {
    throw new Error('Chave da API do Google Gemini não configurada. Por favor, adicione VITE_GEMINI_API_KEY no arquivo .env na raiz do projeto.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
Você é uma Nutricionista Clínica e Esportiva altamente capacitada, moderna e experiente.
Seu objetivo é gerar um esboço de Plano Alimentar hiper-personalizado e detalhado com base nas informações do paciente fornecidas abaixo.
O plano alimentar deve ser organizado, realista, fácil de entender, com opções de substituição, e dividido por refeições (adaptando-se estritamente à quantidade de refeições que o paciente faz por dia e seus horários, se fornecidos).

Apresente APENAS o plano alimentar e orientações nutricionais diretas e empáticas. Use formatação em Markdown limpa (títulos com ##, listas com -, negrito para destacar alimentos). NÃO faça introduções genéricas como "Aqui está o plano" ou "Sou uma IA". Comece diretamente com o plano.

DADOS DO PACIENTE:
- Nome: ${patientData.nome || 'Não informado'}
- Idade: ${patientData.idade || 'Não informada'}
- Sexo: ${patientData.sexo || 'Não informado'}
- Peso atual: ${patientData.peso ? patientData.peso + ' kg' : 'Não informado'}
- Altura: ${patientData.altura ? patientData.altura + ' cm' : 'Não informada'}
- IMC: ${patientData.imc || 'Não calculado'}
- Objetivo principal: ${patientData.objetivo || 'Não informado'}

ESTILO DE VIDA E HÁBITOS:
- Refeições por dia: ${patientData.refeicoes || 'Não informado'}
- Horário que acorda: ${patientData.horario_acorda || 'Não informado'}
- Horário que dorme: ${patientData.horario_dorme || 'Não informado'}
- Meta de Água: ${patientData.agua ? patientData.agua + ' Litros/dia' : 'Não informado'}
- Nível de Atividade: ${patientData.atividade || 'Não informado'}
- Pratica Atividade Física: ${patientData.atividade_fisica ? 'Sim (' + (patientData.atividade_descricao || '') + ')' : 'Não'}

CONDIÇÕES CLÍNICAS (MUITO IMPORTANTE RESPEITAR):
- Patologias: ${patientData.patologias || 'Nenhuma'}
- Alergias Alimentares: ${patientData.alergias || 'Nenhuma'}
- Restrições Alimentares: ${patientData.restricoes || 'Nenhuma'}
- Medicamentos Contínuos: ${patientData.medicamentos || 'Nenhum'}
- Suplementos Atuais: ${patientData.suplementos || 'Nenhum'}

OBSERVAÇÕES EXTRAS DO PACIENTE:
${patientData.observacoes || 'Nenhuma'}

${customPrompt ? 'INSTRUÇÕES ADICIONAIS DA NUTRICIONISTA:\n' + customPrompt : ''}

Com base estrita nesses dados, redija o Plano Alimentar e Orientações agora:
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Erro no Gemini API:", error);
    throw new Error('Falha ao comunicar com a inteligência artificial: ' + error.message);
  }
}
