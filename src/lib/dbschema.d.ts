export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      families: {
        Row: {
          arbitrarylength: boolean
          code: string
          displayname: string
          familygroup: string
          hasmodel: boolean
          isled: boolean
          ledfamily: string | null
          needscolorconfig: boolean
          needscurveconfig: boolean
          needsledconfig: boolean
          needslengthconfig: boolean
          needstemperatureconfig: boolean
          system: string
          tenant: string
          visible: boolean
        }
        Insert: {
          arbitrarylength: boolean
          code: string
          displayname: string
          familygroup: string
          hasmodel: boolean
          isled: boolean
          ledfamily?: string | null
          needscolorconfig: boolean
          needscurveconfig: boolean
          needsledconfig: boolean
          needslengthconfig: boolean
          needstemperatureconfig: boolean
          system: string
          tenant: string
          visible: boolean
        }
        Update: {
          arbitrarylength?: boolean
          code?: string
          displayname?: string
          familygroup?: string
          hasmodel?: boolean
          isled?: boolean
          ledfamily?: string | null
          needscolorconfig?: boolean
          needscurveconfig?: boolean
          needsledconfig?: boolean
          needslengthconfig?: boolean
          needstemperatureconfig?: boolean
          system?: string
          tenant?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "families_tenant_code_fkey"
            columns: ["tenant", "code"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["tenant", "code"]
          },
          {
            foreignKeyName: "families_tenant_system_fkey"
            columns: ["tenant", "system"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["tenant", "code"]
          },
        ]
      }
      family_objects: {
        Row: {
          angle: number | null
          color: string | null
          desc1: string
          desc2: string
          familycode: string
          len: number | null
          objectcode: string
          radius: number | null
          temperature: number | null
          tenant: string
        }
        Insert: {
          angle?: number | null
          color?: string | null
          desc1: string
          desc2: string
          familycode: string
          len?: number | null
          objectcode: string
          radius?: number | null
          temperature?: number | null
          tenant: string
        }
        Update: {
          angle?: number | null
          color?: string | null
          desc1?: string
          desc2?: string
          familycode?: string
          len?: number | null
          objectcode?: string
          radius?: number | null
          temperature?: number | null
          tenant?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_objects_familycode_tenant_fkey"
            columns: ["familycode", "tenant"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "family_objects_familycode_tenant_fkey1"
            columns: ["familycode", "tenant"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "family_objects_objectcode_tenant_fkey"
            columns: ["objectcode", "tenant"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "family_objects_objectcode_tenant_fkey"
            columns: ["objectcode", "tenant"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "family_objects_objectcode_tenant_fkey"
            columns: ["objectcode", "tenant"]
            isOneToOne: false
            referencedRelation: "view_junctions"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "family_objects_objectcode_tenant_fkey1"
            columns: ["objectcode", "tenant"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "family_objects_objectcode_tenant_fkey1"
            columns: ["objectcode", "tenant"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "family_objects_objectcode_tenant_fkey1"
            columns: ["objectcode", "tenant"]
            isOneToOne: false
            referencedRelation: "view_junctions"
            referencedColumns: ["code", "tenant"]
          },
        ]
      }
      joiners: {
        Row: {
          group_code: string
          object_code: string
          tenant: string
        }
        Insert: {
          group_code: string
          object_code: string
          tenant: string
        }
        Update: {
          group_code?: string
          object_code?: string
          tenant?: string
        }
        Relationships: []
      }
      junctions: {
        Row: {
          angle: number
          id: number
          x: number
          y: number
          z: number
        }
        Insert: {
          angle: number
          id?: number
          x: number
          y: number
          z: number
        }
        Update: {
          angle?: number
          id?: number
          x?: number
          y?: number
          z?: number
        }
        Relationships: []
      }
      object_curve_junctions: {
        Row: {
          groups: string
          junction_control_id: number
          junction1_id: number
          junction2_id: number
          object_code: string
          tenant: string
        }
        Insert: {
          groups: string
          junction_control_id: number
          junction1_id: number
          junction2_id: number
          object_code: string
          tenant: string
        }
        Update: {
          groups?: string
          junction_control_id?: number
          junction1_id?: number
          junction2_id?: number
          object_code?: string
          tenant?: string
        }
        Relationships: [
          {
            foreignKeyName: "object_curve_junctions_junction_control_id_fkey"
            columns: ["junction_control_id"]
            isOneToOne: false
            referencedRelation: "junctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_curve_junctions_junction_control_id_fkey"
            columns: ["junction_control_id"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["j1id"]
          },
          {
            foreignKeyName: "object_curve_junctions_junction_control_id_fkey"
            columns: ["junction_control_id"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["j2id"]
          },
          {
            foreignKeyName: "object_curve_junctions_junction_control_id_fkey"
            columns: ["junction_control_id"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["jcid"]
          },
          {
            foreignKeyName: "object_curve_junctions_junction1_id_fkey"
            columns: ["junction1_id"]
            isOneToOne: false
            referencedRelation: "junctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_curve_junctions_junction1_id_fkey"
            columns: ["junction1_id"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["j1id"]
          },
          {
            foreignKeyName: "object_curve_junctions_junction1_id_fkey"
            columns: ["junction1_id"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["j2id"]
          },
          {
            foreignKeyName: "object_curve_junctions_junction1_id_fkey"
            columns: ["junction1_id"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["jcid"]
          },
          {
            foreignKeyName: "object_curve_junctions_junction2_id_fkey"
            columns: ["junction2_id"]
            isOneToOne: false
            referencedRelation: "junctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_curve_junctions_junction2_id_fkey"
            columns: ["junction2_id"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["j1id"]
          },
          {
            foreignKeyName: "object_curve_junctions_junction2_id_fkey"
            columns: ["junction2_id"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["j2id"]
          },
          {
            foreignKeyName: "object_curve_junctions_junction2_id_fkey"
            columns: ["junction2_id"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["jcid"]
          },
          {
            foreignKeyName: "object_curve_junctions_object_code_tenant_fkey"
            columns: ["object_code", "tenant"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "object_curve_junctions_object_code_tenant_fkey"
            columns: ["object_code", "tenant"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "object_curve_junctions_object_code_tenant_fkey"
            columns: ["object_code", "tenant"]
            isOneToOne: false
            referencedRelation: "view_junctions"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "object_curve_junctions_object_code_tenant_fkey1"
            columns: ["object_code", "tenant"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "object_curve_junctions_object_code_tenant_fkey1"
            columns: ["object_code", "tenant"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "object_curve_junctions_object_code_tenant_fkey1"
            columns: ["object_code", "tenant"]
            isOneToOne: false
            referencedRelation: "view_junctions"
            referencedColumns: ["code", "tenant"]
          },
        ]
      }
      object_junctions: {
        Row: {
          groups: string
          junction_id: number
          object_code: string
          tenant: string
        }
        Insert: {
          groups: string
          junction_id: number
          object_code: string
          tenant: string
        }
        Update: {
          groups?: string
          junction_id?: number
          object_code?: string
          tenant?: string
        }
        Relationships: [
          {
            foreignKeyName: "object_junctions_junction_id_fkey"
            columns: ["junction_id"]
            isOneToOne: false
            referencedRelation: "junctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_junctions_junction_id_fkey"
            columns: ["junction_id"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["j1id"]
          },
          {
            foreignKeyName: "object_junctions_junction_id_fkey"
            columns: ["junction_id"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["j2id"]
          },
          {
            foreignKeyName: "object_junctions_junction_id_fkey"
            columns: ["junction_id"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["jcid"]
          },
          {
            foreignKeyName: "object_junctions_object_code_tenant_fkey"
            columns: ["object_code", "tenant"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "object_junctions_object_code_tenant_fkey"
            columns: ["object_code", "tenant"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "object_junctions_object_code_tenant_fkey"
            columns: ["object_code", "tenant"]
            isOneToOne: false
            referencedRelation: "view_junctions"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "object_junctions_object_code_tenant_fkey1"
            columns: ["object_code", "tenant"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "object_junctions_object_code_tenant_fkey1"
            columns: ["object_code", "tenant"]
            isOneToOne: false
            referencedRelation: "view_curves"
            referencedColumns: ["code", "tenant"]
          },
          {
            foreignKeyName: "object_junctions_object_code_tenant_fkey1"
            columns: ["object_code", "tenant"]
            isOneToOne: false
            referencedRelation: "view_junctions"
            referencedColumns: ["code", "tenant"]
          },
        ]
      }
      objects: {
        Row: {
          code: string
          power: number
          price_cents: number
          system: string
          tenant: string
        }
        Insert: {
          code: string
          power: number
          price_cents: number
          system: string
          tenant: string
        }
        Update: {
          code?: string
          power?: number
          price_cents?: number
          system?: string
          tenant?: string
        }
        Relationships: [
          {
            foreignKeyName: "objects_tenant_system_fkey"
            columns: ["tenant", "system"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["tenant", "code"]
          },
        ]
      }
      systems: {
        Row: {
          code: string
          tenant: string
        }
        Insert: {
          code: string
          tenant: string
        }
        Update: {
          code?: string
          tenant?: string
        }
        Relationships: []
      }
    }
    Views: {
      view_curves: {
        Row: {
          code: string | null
          groups: string | null
          j1id: number | null
          j1x: number | null
          j1y: number | null
          j1z: number | null
          j2id: number | null
          j2x: number | null
          j2y: number | null
          j2z: number | null
          jcid: number | null
          jcx: number | null
          jcy: number | null
          jcz: number | null
          tenant: string | null
        }
        Relationships: []
      }
      view_junctions: {
        Row: {
          angle: number | null
          code: string | null
          groups: string | null
          tenant: string | null
          x: number | null
          y: number | null
          z: number | null
        }
        Relationships: []
      }
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

