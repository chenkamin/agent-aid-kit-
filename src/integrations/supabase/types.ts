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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          body: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          due_at: string | null
          id: string
          property_id: string | null
          status: Database["public"]["Enums"]["activity_status"] | null
          title: string | null
          type: Database["public"]["Enums"]["activity_type"] | null
          updated_at: string | null
        }
        Insert: {
          body?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string
          property_id?: string | null
          status?: Database["public"]["Enums"]["activity_status"] | null
          title?: string | null
          type?: Database["public"]["Enums"]["activity_type"] | null
          updated_at?: string | null
        }
        Update: {
          body?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string
          property_id?: string | null
          status?: Database["public"]["Enums"]["activity_status"] | null
          title?: string | null
          type?: Database["public"]["Enums"]["activity_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          notes: string | null
          phone: string | null
          related_properties: string[] | null
          tags: string[] | null
          type: Database["public"]["Enums"]["contact_type"] | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          related_properties?: string[] | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["contact_type"] | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          related_properties?: string[] | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["contact_type"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          above_ground_sqf: number | null
          address: string | null
          agent_notes: string | null
          arv_estimate: number | null
          basement: boolean | null
          basement_sqf: number | null
          bath: number | null
          bathrooms: number | null
          bed: number | null
          bedrooms: number | null
          building_sqf: number | null
          city: string | null
          client_email: string | null
          created_at: string | null
          date_listed: string | null
          days_on_market: number | null
          deal: Json | null
          description: string | null
          finished_basement: boolean | null
          full_bath: number | null
          home_sub_type: string | null
          home_type: Database["public"]["Enums"]["home_type"] | null
          id: string
          initial_status: string | null
          last_sold_date: string | null
          last_sold_price: number | null
          linked_comp_1: string | null
          linked_comp_2: string | null
          linked_comp_3: string | null
          linked_comp_4: string | null
          linked_comp_5: string | null
          listing_url: string | null
          living_sqf: number | null
          lot_size: string | null
          lot_sqf: number | null
          mls_number: string | null
          neighborhood: string | null
          notes: string | null
          offer: Json | null
          owner: string | null
          owner_properties: string | null
          ppsf: number | null
          previous_sold_date: string | null
          previous_sold_price: number | null
          price: number | null
          price_per_sqft: number | null
          property_type: string | null
          rentometer_monthly_rent: number | null
          seller_agent_email: string | null
          seller_agent_name: string | null
          seller_agent_phone: string | null
          source: string | null
          source_contact_details: string | null
          square_footage: number | null
          state: string | null
          status: Database["public"]["Enums"]["property_status"] | null
          sub_source: string | null
          sub_status: string | null
          tags: string[] | null
          updated_at: string | null
          url: string | null
          year_built: number | null
          zip: string | null
        }
        Insert: {
          above_ground_sqf?: number | null
          address?: string | null
          agent_notes?: string | null
          arv_estimate?: number | null
          basement?: boolean | null
          basement_sqf?: number | null
          bath?: number | null
          bathrooms?: number | null
          bed?: number | null
          bedrooms?: number | null
          building_sqf?: number | null
          city?: string | null
          client_email?: string | null
          created_at?: string | null
          date_listed?: string | null
          days_on_market?: number | null
          deal?: Json | null
          description?: string | null
          finished_basement?: boolean | null
          full_bath?: number | null
          home_sub_type?: string | null
          home_type?: Database["public"]["Enums"]["home_type"] | null
          id?: string
          initial_status?: string | null
          last_sold_date?: string | null
          last_sold_price?: number | null
          linked_comp_1?: string | null
          linked_comp_2?: string | null
          linked_comp_3?: string | null
          linked_comp_4?: string | null
          linked_comp_5?: string | null
          listing_url?: string | null
          living_sqf?: number | null
          lot_size?: string | null
          lot_sqf?: number | null
          mls_number?: string | null
          neighborhood?: string | null
          notes?: string | null
          offer?: Json | null
          owner?: string | null
          owner_properties?: string | null
          ppsf?: number | null
          previous_sold_date?: string | null
          previous_sold_price?: number | null
          price?: number | null
          price_per_sqft?: number | null
          property_type?: string | null
          rentometer_monthly_rent?: number | null
          seller_agent_email?: string | null
          seller_agent_name?: string | null
          seller_agent_phone?: string | null
          source?: string | null
          source_contact_details?: string | null
          square_footage?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"] | null
          sub_source?: string | null
          sub_status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          url?: string | null
          year_built?: number | null
          zip?: string | null
        }
        Update: {
          above_ground_sqf?: number | null
          address?: string | null
          agent_notes?: string | null
          arv_estimate?: number | null
          basement?: boolean | null
          basement_sqf?: number | null
          bath?: number | null
          bathrooms?: number | null
          bed?: number | null
          bedrooms?: number | null
          building_sqf?: number | null
          city?: string | null
          client_email?: string | null
          created_at?: string | null
          date_listed?: string | null
          days_on_market?: number | null
          deal?: Json | null
          description?: string | null
          finished_basement?: boolean | null
          full_bath?: number | null
          home_sub_type?: string | null
          home_type?: Database["public"]["Enums"]["home_type"] | null
          id?: string
          initial_status?: string | null
          last_sold_date?: string | null
          last_sold_price?: number | null
          linked_comp_1?: string | null
          linked_comp_2?: string | null
          linked_comp_3?: string | null
          linked_comp_4?: string | null
          linked_comp_5?: string | null
          listing_url?: string | null
          living_sqf?: number | null
          lot_size?: string | null
          lot_sqf?: number | null
          mls_number?: string | null
          neighborhood?: string | null
          notes?: string | null
          offer?: Json | null
          owner?: string | null
          owner_properties?: string | null
          ppsf?: number | null
          previous_sold_date?: string | null
          previous_sold_price?: number | null
          price?: number | null
          price_per_sqft?: number | null
          property_type?: string | null
          rentometer_monthly_rent?: number | null
          seller_agent_email?: string | null
          seller_agent_name?: string | null
          seller_agent_phone?: string | null
          source?: string | null
          source_contact_details?: string | null
          square_footage?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"] | null
          sub_source?: string | null
          sub_status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          url?: string | null
          year_built?: number | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_linked_comp_1_fkey"
            columns: ["linked_comp_1"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_linked_comp_2_fkey"
            columns: ["linked_comp_2"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_linked_comp_3_fkey"
            columns: ["linked_comp_3"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_linked_comp_4_fkey"
            columns: ["linked_comp_4"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_linked_comp_5_fkey"
            columns: ["linked_comp_5"]
            isOneToOne: false
            referencedRelation: "properties"
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
      activity_status: "open" | "done" | "snoozed"
      activity_type:
        | "call"
        | "sms"
        | "whatsapp"
        | "email"
        | "site-visit"
        | "offer-sent"
        | "comp-analysis"
        | "inspection"
        | "price-reduction-ask"
        | "closing"
        | "other"
      contact_type:
        | "Agent"
        | "Seller"
        | "Buyer"
        | "Contractor"
        | "Wholesaler"
        | "Lender"
        | "Inspector"
        | "Title"
        | "Other"
      home_type:
        | "Single Family"
        | "Multi Family"
        | "Condo"
        | "Townhouse"
        | "Land"
        | "Commercial"
        | "Other"
      property_status:
        | "For Sale"
        | "Under Contract"
        | "Sold"
        | "Off Market"
        | "Pending"
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
    Enums: {
      activity_status: ["open", "done", "snoozed"],
      activity_type: [
        "call",
        "sms",
        "whatsapp",
        "email",
        "site-visit",
        "offer-sent",
        "comp-analysis",
        "inspection",
        "price-reduction-ask",
        "closing",
        "other",
      ],
      contact_type: [
        "Agent",
        "Seller",
        "Buyer",
        "Contractor",
        "Wholesaler",
        "Lender",
        "Inspector",
        "Title",
        "Other",
      ],
      home_type: [
        "Single Family",
        "Multi Family",
        "Condo",
        "Townhouse",
        "Land",
        "Commercial",
        "Other",
      ],
      property_status: [
        "For Sale",
        "Under Contract",
        "Sold",
        "Off Market",
        "Pending",
      ],
    },
  },
} as const
