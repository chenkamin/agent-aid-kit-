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
          assigned_to: string | null
          body: string | null
          company_id: string
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
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          body?: string | null
          company_id: string
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
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          body?: string | null
          company_id?: string
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
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buy_boxes: {
        Row: {
          assigned_to: string | null
          cities: string[] | null
          company_id: string
          created_at: string
          days_on_zillow: number | null
          filter_by_ppsf: boolean
          filter_by_city_match: boolean
          for_rent: boolean | null
          for_sale_by_agent: boolean | null
          for_sale_by_owner: boolean | null
          home_types: string[] | null
          id: string
          max_bathrooms: number | null
          max_bedrooms: number | null
          max_price: number | null
          max_square_footage: number | null
          min_bathrooms: number | null
          min_bedrooms: number | null
          min_price: number | null
          min_square_footage: number | null
          name: string
          neighborhoods: string[] | null
          price_max: number | null
          updated_at: string
          user_id: string
          zip_codes: string[] | null
        }
        Insert: {
          assigned_to?: string | null
          cities?: string[] | null
          company_id: string
          created_at?: string
          days_on_zillow?: number | null
          filter_by_ppsf?: boolean
          filter_by_city_match?: boolean
          for_rent?: boolean | null
          for_sale_by_agent?: boolean | null
          for_sale_by_owner?: boolean | null
          home_types?: string[] | null
          id?: string
          max_bathrooms?: number | null
          max_bedrooms?: number | null
          max_price?: number | null
          max_square_footage?: number | null
          min_bathrooms?: number | null
          min_bedrooms?: number | null
          min_price?: number | null
          min_square_footage?: number | null
          name: string
          neighborhoods?: string[] | null
          price_max?: number | null
          updated_at?: string
          user_id: string
          zip_codes?: string[] | null
        }
        Update: {
          assigned_to?: string | null
          cities?: string[] | null
          company_id?: string
          created_at?: string
          days_on_zillow?: number | null
          filter_by_ppsf?: boolean
          filter_by_city_match?: boolean
          for_rent?: boolean | null
          for_sale_by_agent?: boolean | null
          for_sale_by_owner?: boolean | null
          home_types?: string[] | null
          id?: string
          max_bathrooms?: number | null
          max_bedrooms?: number | null
          max_price?: number | null
          max_square_footage?: number | null
          min_bathrooms?: number | null
          min_bedrooms?: number | null
          min_price?: number | null
          min_square_footage?: number | null
          name?: string
          neighborhoods?: string[] | null
          price_max?: number | null
          updated_at?: string
          user_id?: string
          zip_codes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "buy_boxes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buy_boxes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          email_signature: string | null
          id: string
          name: string
          owner_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_signature?: string | null
          id?: string
          name: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_signature?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          assigned_to: string | null
          company: string | null
          company_id: string
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
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          company_id: string
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
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          company_id?: string
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
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          above_ground_sqf: number | null
          address: string | null
          agent_notes: string | null
          arv_estimate: number | null
          assigned_to: string | null
          basement: boolean | null
          basement_sqf: number | null
          bath: number | null
          bathrooms: number | null
          bed: number | null
          bedrooms: number | null
          building_sqf: number | null
          buy_box_id: string | null
          city: string | null
          client_email: string | null
          company_id: string
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
          is_new_listing: boolean | null
          last_scraped_at: string | null
          last_sold_date: string | null
          last_sold_price: number | null
          linked_comp_1: string | null
          linked_comp_2: string | null
          linked_comp_3: string | null
          linked_comp_4: string | null
          linked_comp_5: string | null
          listing_discovered_at: string | null
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
          urgency: number | null
          url: string | null
          user_id: string | null
          workflow_state: Database["public"]["Enums"]["workflow_state"] | null
          year_built: number | null
          zip: string | null
        }
        Insert: {
          above_ground_sqf?: number | null
          address?: string | null
          agent_notes?: string | null
          arv_estimate?: number | null
          assigned_to?: string | null
          basement?: boolean | null
          basement_sqf?: number | null
          bath?: number | null
          bathrooms?: number | null
          bed?: number | null
          bedrooms?: number | null
          building_sqf?: number | null
          buy_box_id?: string | null
          city?: string | null
          client_email?: string | null
          company_id: string
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
          is_new_listing?: boolean | null
          last_scraped_at?: string | null
          last_sold_date?: string | null
          last_sold_price?: number | null
          linked_comp_1?: string | null
          linked_comp_2?: string | null
          linked_comp_3?: string | null
          linked_comp_4?: string | null
          linked_comp_5?: string | null
          listing_discovered_at?: string | null
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
          urgency?: number | null
          url?: string | null
          user_id?: string | null
          workflow_state?: Database["public"]["Enums"]["workflow_state"] | null
          year_built?: number | null
          zip?: string | null
        }
        Update: {
          above_ground_sqf?: number | null
          address?: string | null
          agent_notes?: string | null
          arv_estimate?: number | null
          assigned_to?: string | null
          basement?: boolean | null
          basement_sqf?: number | null
          bath?: number | null
          bathrooms?: number | null
          bed?: number | null
          bedrooms?: number | null
          building_sqf?: number | null
          buy_box_id?: string | null
          city?: string | null
          client_email?: string | null
          company_id?: string
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
          is_new_listing?: boolean | null
          last_scraped_at?: string | null
          last_sold_date?: string | null
          last_sold_price?: number | null
          linked_comp_1?: string | null
          linked_comp_2?: string | null
          linked_comp_3?: string | null
          linked_comp_4?: string | null
          linked_comp_5?: string | null
          listing_discovered_at?: string | null
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
          urgency?: number | null
          url?: string | null
          user_id?: string | null
          workflow_state?: Database["public"]["Enums"]["workflow_state"] | null
          year_built?: number | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_buy_box_id_fkey"
            columns: ["buy_box_id"]
            isOneToOne: false
            referencedRelation: "buy_boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
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
        | "Tracking"
        | "Not Relevant"
        | "Follow Up"
        | "Waiting for Response"
      workflow_state:
        | "Initial"
        | "Reviewing"
        | "Research"
        | "On Progress"
        | "Follow Up"
        | "Negotiating"
        | "Under Contract"
        | "Closing"
        | "Closed"
        | "Not Relevant"
        | "Archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[keyof Database]

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
