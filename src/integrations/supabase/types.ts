export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          assigned_to: string | null
          body: string | null
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
          company_id: string | null
          created_at: string
          days_on_zillow: number | null
          filter_by_ppsf: boolean
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
          company_id?: string | null
          created_at?: string
          days_on_zillow?: number | null
          filter_by_ppsf?: boolean
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
          company_id?: string | null
          created_at?: string
          days_on_zillow?: number | null
          filter_by_ppsf?: boolean
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
      communication_settings: {
        Row: {
          created_at: string | null
          email_host: string | null
          email_password: string | null
          email_port: string | null
          email_username: string | null
          id: string
          sms_api_key: string | null
          sms_api_secret: string | null
          sms_from_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_host?: string | null
          email_password?: string | null
          email_port?: string | null
          email_username?: string | null
          id?: string
          sms_api_key?: string | null
          sms_api_secret?: string | null
          sms_from_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_host?: string | null
          email_password?: string | null
          email_port?: string | null
          email_username?: string | null
          id?: string
          sms_api_key?: string | null
          sms_api_secret?: string | null
          sms_from_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
      cron_execution_log: {
        Row: {
          details: Json | null
          executed_at: string | null
          id: string
          job_name: string
          status: string | null
        }
        Insert: {
          details?: Json | null
          executed_at?: string | null
          id?: string
          job_name: string
          status?: string | null
        }
        Update: {
          details?: Json | null
          executed_at?: string | null
          id?: string
          job_name?: string
          status?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          company_id: string | null
          created_at: string | null
          id: string
          name: string
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_user_id_fkey"
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
          {
            foreignKeyName: "properties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_changes: {
        Row: {
          changed_at: string | null
          created_at: string | null
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          property_id: string
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          created_at?: string | null
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          property_id: string
          user_id: string
        }
        Update: {
          changed_at?: string | null
          created_at?: string | null
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_changes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_workflow_history: {
        Row: {
          changed_at: string | null
          created_at: string | null
          from_state: string | null
          id: string
          notes: string | null
          property_id: string
          to_state: string
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          created_at?: string | null
          from_state?: string | null
          id?: string
          notes?: string | null
          property_id: string
          to_state: string
          user_id: string
        }
        Update: {
          changed_at?: string | null
          created_at?: string | null
          from_state?: string | null
          id?: string
          notes?: string | null
          property_id?: string
          to_state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_workflow_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_cron_jobs: {
        Row: {
          active: boolean | null
          database: string | null
          execution_count: number | null
          jobid: number | null
          jobname: string | null
          last_execution: string | null
          last_status: string | null
          schedule: string | null
          schedule_description: string | null
        }
        Insert: {
          active?: boolean | null
          database?: string | null
          execution_count?: never
          jobid?: number | null
          jobname?: string | null
          last_execution?: never
          last_status?: never
          schedule?: string | null
          schedule_description?: never
        }
        Update: {
          active?: boolean | null
          database?: string | null
          execution_count?: never
          jobid?: number | null
          jobname?: string | null
          last_execution?: never
          last_status?: never
          schedule?: string | null
          schedule_description?: never
        }
        Relationships: []
      }
      team_members_with_emails: {
        Row: {
          accepted_at: string | null
          company_id: string | null
          company_name: string | null
          created_at: string | null
          id: string | null
          invited_at: string | null
          invited_by: string | null
          role: string | null
          user_email: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_company_with_owner: {
        Args: { company_name: string; owner_uuid: string }
        Returns: string
      }
      get_cron_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          is_active: boolean
          job_name: string
          last_execution: string
          last_status: string
          next_run_estimate: string
          schedule: string
          total_executions: number
        }[]
      }
      get_user_company_id: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_company_ids: {
        Args: { check_user_id: string }
        Returns: {
          company_id: string
        }[]
      }
      trigger_daily_property_update: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_is_in_company: {
        Args: { check_company_id: string; check_user_id: string }
        Returns: boolean
      }
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
        | "offer"
        | "follow_up"
        | "viewing"
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
        "offer",
        "follow_up",
        "viewing",
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
        "Tracking",
        "Not Relevant",
        "Follow Up",
        "Waiting for Response",
      ],
      workflow_state: [
        "Initial",
        "Reviewing",
        "Research",
        "On Progress",
        "Follow Up",
        "Negotiating",
        "Under Contract",
        "Closing",
        "Closed",
        "Not Relevant",
        "Archived",
      ],
    },
  },
} as const
