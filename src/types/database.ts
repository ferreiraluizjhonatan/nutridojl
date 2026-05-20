export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      consultas: {
        Row: {
          cintura: number | null
          created_at: string | null
          data_consulta: string
          id: string
          observacoes: string | null
          paciente_id: string | null
          percentual_gordura: number | null
          peso: number | null
          proximo_retorno: string | null
          quadril: number | null
        }
        Insert: {
          cintura?: number | null
          created_at?: string | null
          data_consulta: string
          id?: string
          observacoes?: string | null
          paciente_id?: string | null
          percentual_gordura?: number | null
          peso?: number | null
          proximo_retorno?: string | null
          quadril?: number | null
        }
        Update: {
          cintura?: number | null
          created_at?: string | null
          data_consulta?: string
          id?: string
          observacoes?: string | null
          paciente_id?: string | null
          percentual_gordura?: number | null
          peso?: number | null
          proximo_retorno?: string | null
          quadril?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consultas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      nutricionistas: {
        Row: {
          created_at: string | null
          email: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      pacientes: {
        Row: {
          alergias: string[] | null
          altura: number | null
          atividade_fisica: boolean | null
          atividade_fisica_descricao: string | null
          created_at: string | null
          data_nascimento: string | null
          email: string | null
          horario_acorda: string | null
          horario_dorme: string | null
          id: string
          litros_agua: number | null
          medicamentos: string | null
          nivel_atividade: string | null
          nome: string
          nutricionista_id: string | null
          objetivo_texto: string | null
          objetivos: string[] | null
          observacoes: string | null
          patologias: string[] | null
          peso_inicial: number | null
          refeicoes_por_dia: number | null
          restricoes_alimentares: string[] | null
          sexo: string | null
          suplementos: string | null
          telefone: string | null
          whatsapp: string | null
        }
        Insert: {
          alergias?: string[] | null
          altura?: number | null
          atividade_fisica?: boolean | null
          atividade_fisica_descricao?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          horario_acorda?: string | null
          horario_dorme?: string | null
          id?: string
          litros_agua?: number | null
          medicamentos?: string | null
          nivel_atividade?: string | null
          nome: string
          nutricionista_id?: string | null
          objetivo_texto?: string | null
          objetivos?: string[] | null
          observacoes?: string | null
          patologias?: string[] | null
          peso_inicial?: number | null
          refeicoes_por_dia?: number | null
          restricoes_alimentares?: string[] | null
          sexo?: string | null
          suplementos?: string | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Update: {
          alergias?: string[] | null
          altura?: number | null
          atividade_fisica?: boolean | null
          atividade_fisica_descricao?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          horario_acorda?: string | null
          horario_dorme?: string | null
          id?: string
          litros_agua?: number | null
          medicamentos?: string | null
          nivel_atividade?: string | null
          nome?: string
          nutricionista_id?: string | null
          objetivo_texto?: string | null
          objetivos?: string[] | null
          observacoes?: string | null
          patologias?: string[] | null
          peso_inicial?: number | null
          refeicoes_por_dia?: number | null
          restricoes_alimentares?: string[] | null
          sexo?: string | null
          suplementos?: string | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_nutricionista_id_fkey"
            columns: ["nutricionista_id"]
            isOneToOne: false
            referencedRelation: "nutricionistas"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_alimentares: {
        Row: {
          conteudo: Json
          created_at: string | null
          id: string
          paciente_id: string | null
        }
        Insert: {
          conteudo: Json
          created_at?: string | null
          id?: string
          paciente_id?: string | null
        }
        Update: {
          conteudo?: Json
          created_at?: string | null
          id?: string
          paciente_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planos_alimentares_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
