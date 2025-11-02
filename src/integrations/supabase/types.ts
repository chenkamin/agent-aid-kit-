export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      email_messages: {
        Row: {
          body: string
          company_id: string
          created_at: string | null
          direction: Database["public"]["Enums"]["email_direction"]
          from_email: string
          id: string
          metadata: Json | null
          offer_price: number | null
          property_id: string | null
          provider_message_id: string | null
          status: string | null
          subject: string
          template_id: string | null
          to_email: string
          updated_at: string | null
        }
        Insert: {
          body: string
          company_id: string
          created_at?: string | null
          direction: Database["public"]["Enums"]["email_direction"]
          from_email: string
          id?: string
          metadata?: Json | null
          offer_price?: number | null
          property_id?: string | null
          provider_message_id?: string | null
          status?: string | null
          subject: string
          template_id?: string | null
          to_email: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          company_id?: string
          created_at?: string | null
          direction?: Database["public"]["Enums"]["email_direction"]
          from_email?: string
          id?: string
          metadata?: Json | null
          offer_price?: number | null
          property_id?: string | null
          provider_message_id?: string | null
          status?: string | null
          subject?: string
          template_id?: string | null
          to_email?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          ai_analysis: string | null
          ai_score: number | null
          company_id: string
          created_at: string | null
          direction: Database["public"]["Enums"]["sms_direction"]
          from_number: string
          id: string
          message: string
          metadata: Json | null
          property_id: string | null
          provider_message_id: string | null
          status: string | null
          to_number: string
          updated_at: string | null
        }
        Insert: {
          ai_analysis?: string | null
          ai_score?: number | null
          company_id: string
          created_at?: string | null
          direction: Database["public"]["Enums"]["sms_direction"]
          from_number: string
          id?: string
          message: string
          metadata?: Json | null
          property_id?: string | null
          provider_message_id?: string | null
          status?: string | null
          to_number: string
          updated_at?: string | null
        }
        Update: {
          ai_analysis?: string | null
          ai_score?: number | null
          company_id?: string
          created_at?: string | null
          direction?: Database["public"]["Enums"]["sms_direction"]
          from_number?: string
          id?: string
          message?: string
          metadata?: Json | null
          property_id?: string | null
          provider_message_id?: string | null
          status?: string | null
          to_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      [table: string]: any
    }
    Enums: {
      email_direction: "outgoing" | "incoming"
      sms_direction: "outgoing" | "incoming"
      [enum: string]: any
    }
  }
}
