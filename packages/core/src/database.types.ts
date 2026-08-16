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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      blog_categories: {
        Row: {
          description: string | null
          display_order: number
          name: string
          name_en: string
          slug: string
        }
        Insert: {
          description?: string | null
          display_order?: number
          name: string
          name_en: string
          slug: string
        }
        Update: {
          description?: string | null
          display_order?: number
          name?: string
          name_en?: string
          slug?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          admin_note: string | null
          ai_model: string | null
          author_name: string
          body_md: string
          category_slug: string | null
          cover_alt: string | null
          cover_url: string | null
          created_at: string
          excerpt: string | null
          faq: Json | null
          id: string
          internal_links: string[]
          published_at: string | null
          reading_minutes: number | null
          slug: string
          sources: Json | null
          status: string
          summary_en: string | null
          tags: string[]
          title: string
          title_en: string | null
          topic_seed: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          ai_model?: string | null
          author_name?: string
          body_md: string
          category_slug?: string | null
          cover_alt?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          faq?: Json | null
          id?: string
          internal_links?: string[]
          published_at?: string | null
          reading_minutes?: number | null
          slug: string
          sources?: Json | null
          status?: string
          summary_en?: string | null
          tags?: string[]
          title: string
          title_en?: string | null
          topic_seed?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          ai_model?: string | null
          author_name?: string
          body_md?: string
          category_slug?: string | null
          cover_alt?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          faq?: Json | null
          id?: string
          internal_links?: string[]
          published_at?: string | null
          reading_minutes?: number | null
          slug?: string
          sources?: Json | null
          status?: string
          summary_en?: string | null
          tags?: string[]
          title?: string
          title_en?: string | null
          topic_seed?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      blog_runs: {
        Row: {
          created: number
          errors: Json | null
          finished_at: string | null
          id: string
          notes: string | null
          requested: number
          started_at: string
        }
        Insert: {
          created?: number
          errors?: Json | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          requested: number
          started_at?: string
        }
        Update: {
          created?: number
          errors?: Json | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          requested?: number
          started_at?: string
        }
        Relationships: []
      }
      business_change_reviews: {
        Row: {
          ai_verdict: Json | null
          business_id: string
          changed_fields: string[]
          created_at: string
          critical_fields: string[]
          decision: string
          id: string
          previous_status: Database["public"]["Enums"]["business_status"] | null
          reason: string | null
          resulting_status:
            | Database["public"]["Enums"]["business_status"]
            | null
          user_id: string
        }
        Insert: {
          ai_verdict?: Json | null
          business_id: string
          changed_fields?: string[]
          created_at?: string
          critical_fields?: string[]
          decision: string
          id?: string
          previous_status?:
            | Database["public"]["Enums"]["business_status"]
            | null
          reason?: string | null
          resulting_status?:
            | Database["public"]["Enums"]["business_status"]
            | null
          user_id: string
        }
        Update: {
          ai_verdict?: Json | null
          business_id?: string
          changed_fields?: string[]
          created_at?: string
          critical_fields?: string[]
          decision?: string
          id?: string
          previous_status?:
            | Database["public"]["Enums"]["business_status"]
            | null
          reason?: string | null
          resulting_status?:
            | Database["public"]["Enums"]["business_status"]
            | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_change_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_change_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_claims: {
        Row: {
          business_id: string
          created_at: string
          id: string
          method: string | null
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["claim_status"]
          user_id: string
          verified_at: string | null
          verified_phone: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          user_id: string
          verified_at?: string | null
          verified_phone?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          user_id?: string
          verified_at?: string | null
          verified_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_claims_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_events: {
        Row: {
          business_id: string
          created_at: string
          event_type: string
          id: number
          referrer: string | null
          source: string
          visitor_hash: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          event_type: string
          id?: number
          referrer?: string | null
          source?: string
          visitor_hash?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          event_type?: string
          id?: number
          referrer?: string | null
          source?: string
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_memberships: {
        Row: {
          business_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_memberships_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_reports: {
        Row: {
          admin_note: string | null
          business_id: string
          contact: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          source: string
          status: string
        }
        Insert: {
          admin_note?: string | null
          business_id: string
          contact?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          status?: string
        }
        Update: {
          admin_note?: string | null
          business_id?: string
          contact?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          accepts_appointments: boolean | null
          address: string | null
          booking_url: string | null
          branches: Json | null
          brand_color: string | null
          business_number: string | null
          category: string
          city: string
          city_source: string | null
          contact_email: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          established_year: number | null
          gallery_urls: string[]
          gallery_video_url: string | null
          google_maps_url: string | null
          id: string
          instagram: string | null
          is_address_public: boolean | null
          is_iranian_owned: boolean | null
          languages: string[] | null
          license_info: string | null
          linkedin: string | null
          logo_url: string | null
          name: string
          name_en: string | null
          owner_user_id: string | null
          ownership_status: string | null
          phone: string | null
          plan: string
          plan_until: string | null
          postal_code: string | null
          preferred_contact: string | null
          province: string | null
          ref_no: number
          search_text: string | null
          service_area: string | null
          service_type: string | null
          services: Json | null
          short_description: string | null
          slug: string
          social_media: Json | null
          status: Database["public"]["Enums"]["business_status"]
          stripe_customer_id: string | null
          sub_category: string | null
          tagline: string | null
          telegram: string | null
          updated_at: string
          verification_documents: string[] | null
          verification_method: string | null
          verification_notes: string | null
          verification_reminder_sent_at: string | null
          verification_reminder_stage: number | null
          verified_at: string | null
          verified_email: string | null
          verified_phone: string | null
          verified_until: string | null
          view_count: number
          website: string | null
          whatsapp: string | null
          working_hours: Json | null
        }
        Insert: {
          accepts_appointments?: boolean | null
          address?: string | null
          booking_url?: string | null
          branches?: Json | null
          brand_color?: string | null
          business_number?: string | null
          category: string
          city: string
          city_source?: string | null
          contact_email?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          established_year?: number | null
          gallery_urls?: string[]
          gallery_video_url?: string | null
          google_maps_url?: string | null
          id?: string
          instagram?: string | null
          is_address_public?: boolean | null
          is_iranian_owned?: boolean | null
          languages?: string[] | null
          license_info?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name: string
          name_en?: string | null
          owner_user_id?: string | null
          ownership_status?: string | null
          phone?: string | null
          plan?: string
          plan_until?: string | null
          postal_code?: string | null
          preferred_contact?: string | null
          province?: string | null
          ref_no?: number
          search_text?: string | null
          service_area?: string | null
          service_type?: string | null
          services?: Json | null
          short_description?: string | null
          slug: string
          social_media?: Json | null
          status?: Database["public"]["Enums"]["business_status"]
          stripe_customer_id?: string | null
          sub_category?: string | null
          tagline?: string | null
          telegram?: string | null
          updated_at?: string
          verification_documents?: string[] | null
          verification_method?: string | null
          verification_notes?: string | null
          verification_reminder_sent_at?: string | null
          verification_reminder_stage?: number | null
          verified_at?: string | null
          verified_email?: string | null
          verified_phone?: string | null
          verified_until?: string | null
          view_count?: number
          website?: string | null
          whatsapp?: string | null
          working_hours?: Json | null
        }
        Update: {
          accepts_appointments?: boolean | null
          address?: string | null
          booking_url?: string | null
          branches?: Json | null
          brand_color?: string | null
          business_number?: string | null
          category?: string
          city?: string
          city_source?: string | null
          contact_email?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          established_year?: number | null
          gallery_urls?: string[]
          gallery_video_url?: string | null
          google_maps_url?: string | null
          id?: string
          instagram?: string | null
          is_address_public?: boolean | null
          is_iranian_owned?: boolean | null
          languages?: string[] | null
          license_info?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name?: string
          name_en?: string | null
          owner_user_id?: string | null
          ownership_status?: string | null
          phone?: string | null
          plan?: string
          plan_until?: string | null
          postal_code?: string | null
          preferred_contact?: string | null
          province?: string | null
          ref_no?: number
          search_text?: string | null
          service_area?: string | null
          service_type?: string | null
          services?: Json | null
          short_description?: string | null
          slug?: string
          social_media?: Json | null
          status?: Database["public"]["Enums"]["business_status"]
          stripe_customer_id?: string | null
          sub_category?: string | null
          tagline?: string | null
          telegram?: string | null
          updated_at?: string
          verification_documents?: string[] | null
          verification_method?: string | null
          verification_notes?: string | null
          verification_reminder_sent_at?: string | null
          verification_reminder_stage?: number | null
          verified_at?: string | null
          verified_email?: string | null
          verified_phone?: string | null
          verified_until?: string | null
          view_count?: number
          website?: string | null
          whatsapp?: string | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_aliases: {
        Row: {
          alias: string
          category_slug: string
        }
        Insert: {
          alias: string
          category_slug: string
        }
        Update: {
          alias?: string
          category_slug?: string
        }
        Relationships: []
      }
      city_aliases: {
        Row: {
          aliases: string
          city_en: string
        }
        Insert: {
          aliases: string
          city_en: string
        }
        Update: {
          aliases?: string
          city_en?: string
        }
        Relationships: []
      }
      city_metro: {
        Row: {
          city_en: string
          metro_en: string
        }
        Insert: {
          city_en: string
          metro_en: string
        }
        Update: {
          city_en?: string
          metro_en?: string
        }
        Relationships: []
      }
      cron_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: string
          job: string
          status: string
          summary: Json
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          job: string
          status: string
          summary?: Json
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          job?: string
          status?: string
          summary?: Json
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          business_id: string | null
          created_at: string
          currency: string
          hosted_invoice_url: string | null
          id: string
          invoice_pdf: string | null
          number: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_invoice_id: string
          tax: number | null
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          business_id?: string | null
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          number?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id: string
          tax?: number | null
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          business_id?: string | null
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          number?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string
          tax?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          email_verified_at: string | null
          full_name: string | null
          id: string
          mobile_number: string | null
          phone_verified_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          email_verified_at?: string | null
          full_name?: string | null
          id: string
          mobile_number?: string | null
          phone_verified_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          email_verified_at?: string | null
          full_name?: string | null
          id?: string
          mobile_number?: string | null
          phone_verified_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      public_reviews: {
        Row: {
          business_id: string
          created_at: string | null
          display_identity: Database["public"]["Enums"]["display_identity_type"]
          experience_date: string | null
          id: string
          moderation_reason: string | null
          owner_reply: string | null
          owner_reply_at: string | null
          public_body: string
          public_rating: number
          public_title: string | null
          published_at: string | null
          recommends: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_interaction_id: string | null
          status: Database["public"]["Enums"]["public_review_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          display_identity?: Database["public"]["Enums"]["display_identity_type"]
          experience_date?: string | null
          id?: string
          moderation_reason?: string | null
          owner_reply?: string | null
          owner_reply_at?: string | null
          public_body: string
          public_rating: number
          public_title?: string | null
          published_at?: string | null
          recommends?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_interaction_id?: string | null
          status?: Database["public"]["Enums"]["public_review_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          display_identity?: Database["public"]["Enums"]["display_identity_type"]
          experience_date?: string | null
          id?: string
          moderation_reason?: string | null
          owner_reply?: string | null
          owner_reply_at?: string | null
          public_body?: string
          public_rating?: number
          public_title?: string | null
          published_at?: string | null
          recommends?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_interaction_id?: string | null
          status?: Database["public"]["Enums"]["public_review_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_reviews_source_interaction_id_fkey"
            columns: ["source_interaction_id"]
            isOneToOne: false
            referencedRelation: "user_business_interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      search_queries: {
        Row: {
          category: string | null
          city: string | null
          created_at: string
          id: string
          q: string
          q_norm: string
          result_count: number
          source: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          city?: string | null
          created_at?: string
          id?: string
          q: string
          q_norm: string
          result_count: number
          source?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          city?: string | null
          created_at?: string
          id?: string
          q?: string
          q_norm?: string
          result_count?: number
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          id: string
          payload: Json | null
          processed_at: string
          type: string
        }
        Insert: {
          id: string
          payload?: Json | null
          processed_at?: string
          type: string
        }
        Update: {
          id?: string
          payload?: Json | null
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          business_id: string
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          id: string
          interval: string | null
          owner_user_id: string | null
          plan: string
          status: string
          stripe_customer_id: string
          stripe_price_id: string | null
          stripe_subscription_id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          interval?: string | null
          owner_user_id?: string | null
          plan: string
          status: string
          stripe_customer_id: string
          stripe_price_id?: string | null
          stripe_subscription_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          interval?: string | null
          owner_user_id?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          admin_note: string | null
          body: string | null
          contact: string | null
          created_at: string
          id: string
          page: string | null
          source: string
          status: string
          user_id: string | null
          voice_path: string | null
          voice_seconds: number | null
        }
        Insert: {
          admin_note?: string | null
          body?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          page?: string | null
          source?: string
          status?: string
          user_id?: string | null
          voice_path?: string | null
          voice_seconds?: number | null
        }
        Update: {
          admin_note?: string | null
          body?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          page?: string | null
          source?: string
          status?: string
          user_id?: string | null
          voice_path?: string | null
          voice_seconds?: number | null
        }
        Relationships: []
      }
      system_errors: {
        Row: {
          created_at: string
          detail: Json
          environment: string | null
          id: string
          kind: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          environment?: string | null
          id?: string
          kind: string
        }
        Update: {
          created_at?: string
          detail?: Json
          environment?: string | null
          id?: string
          kind?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action: Database["public"]["Enums"]["activity_action"]
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["activity_action"]
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["activity_action"]
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_business_interactions: {
        Row: {
          business_id: string
          communication_rating: number | null
          created_at: string | null
          cultural_fit_rating: number | null
          id: string
          personal_rating: number | null
          personal_status: Database["public"]["Enums"]["personal_interaction_status"]
          planned_visit_at: string | null
          private_media_types: string[] | null
          private_media_urls: string[] | null
          private_note: string | null
          private_tags: string[] | null
          private_title: string | null
          reminder_at: string | null
          service_quality_rating: number | null
          updated_at: string | null
          user_id: string
          value_rating: number | null
          visited_at: string | null
          would_return: Database["public"]["Enums"]["would_return_type"] | null
        }
        Insert: {
          business_id: string
          communication_rating?: number | null
          created_at?: string | null
          cultural_fit_rating?: number | null
          id?: string
          personal_rating?: number | null
          personal_status?: Database["public"]["Enums"]["personal_interaction_status"]
          planned_visit_at?: string | null
          private_media_types?: string[] | null
          private_media_urls?: string[] | null
          private_note?: string | null
          private_tags?: string[] | null
          private_title?: string | null
          reminder_at?: string | null
          service_quality_rating?: number | null
          updated_at?: string | null
          user_id: string
          value_rating?: number | null
          visited_at?: string | null
          would_return?: Database["public"]["Enums"]["would_return_type"] | null
        }
        Update: {
          business_id?: string
          communication_rating?: number | null
          created_at?: string | null
          cultural_fit_rating?: number | null
          id?: string
          personal_rating?: number | null
          personal_status?: Database["public"]["Enums"]["personal_interaction_status"]
          planned_visit_at?: string | null
          private_media_types?: string[] | null
          private_media_urls?: string[] | null
          private_note?: string | null
          private_tags?: string[] | null
          private_title?: string | null
          reminder_at?: string | null
          service_quality_rating?: number | null
          updated_at?: string | null
          user_id?: string
          value_rating?: number | null
          visited_at?: string | null
          would_return?: Database["public"]["Enums"]["would_return_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "user_business_interactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_codes: {
        Row: {
          attempts: number
          business_id: string | null
          code_hash: string | null
          consumed_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          attempts?: number
          business_id?: string | null
          code_hash?: string | null
          consumed_at?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          attempts?: number
          business_id?: string | null
          code_hash?: string | null
          consumed_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      business_current_status: {
        Args: { target_business_id: string }
        Returns: Database["public"]["Enums"]["business_status"]
      }
      business_event_summary: {
        Args: { p_business_id: string; p_days?: number }
        Returns: {
          day: string
          event_type: string
          n: number
        }[]
      }
      business_search_text: {
        Args: { b: Database["public"]["Tables"]["businesses"]["Row"] }
        Returns: string
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      fa_normalize: { Args: { t: string }; Returns: string }
      has_business_access: {
        Args: { target_business_id: string; target_user_id: string }
        Returns: boolean
      }
      increment_business_view: {
        Args: { target_id: string }
        Returns: undefined
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      keyboard_swap: { Args: { t: string }; Returns: string }
      review_current_status: {
        Args: { target_review_id: string }
        Returns: Database["public"]["Enums"]["public_review_status"]
      }
      search_businesses: {
        Args: {
          p_category?: string
          p_city?: string
          p_limit?: number
          p_offset?: number
          p_verified_only?: boolean
          q: string
        }
        Returns: {
          category: string
          city: string
          cover_url: string
          id: string
          logo_url: string
          name: string
          name_en: string
          phone: string
          plan: string
          plan_until: string
          province: string
          rank: number
          ref_no: number
          short_description: string
          slug: string
          sub_category: string
          tagline: string
          total_count: number
          verified_until: string
          view_count: number
          website: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      activity_action:
        | "SIGNUP"
        | "LOGIN"
        | "LOGOUT"
        | "ROLE_UPDATE"
        | "PROFILE_UPDATE"
        | "SECURITY_ALERT"
      app_role: "user" | "business_owner" | "moderator" | "admin"
      business_status:
        | "DRAFT"
        | "SUBMITTED"
        | "NEEDS_CHANGES"
        | "APPROVED"
        | "PUBLISHED"
        | "REJECTED"
      claim_status: "pending" | "approved" | "rejected"
      display_identity_type: "real_name" | "display_name" | "anonymous"
      membership_role: "owner" | "manager" | "editor"
      personal_interaction_status:
        | "none"
        | "saved"
        | "want_to_go"
        | "visited_liked"
        | "visited_neutral"
        | "visited_disliked"
        | "customer"
        | "recommended"
        | "follow_up_needed"
      public_review_status:
        | "draft"
        | "submitted"
        | "pending_moderation"
        | "approved"
        | "published"
        | "needs_changes"
        | "rejected"
        | "hidden"
        | "deleted_by_user"
      would_return_type: "yes" | "maybe" | "no"
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
      activity_action: [
        "SIGNUP",
        "LOGIN",
        "LOGOUT",
        "ROLE_UPDATE",
        "PROFILE_UPDATE",
        "SECURITY_ALERT",
      ],
      app_role: ["user", "business_owner", "moderator", "admin"],
      business_status: [
        "DRAFT",
        "SUBMITTED",
        "NEEDS_CHANGES",
        "APPROVED",
        "PUBLISHED",
        "REJECTED",
      ],
      claim_status: ["pending", "approved", "rejected"],
      display_identity_type: ["real_name", "display_name", "anonymous"],
      membership_role: ["owner", "manager", "editor"],
      personal_interaction_status: [
        "none",
        "saved",
        "want_to_go",
        "visited_liked",
        "visited_neutral",
        "visited_disliked",
        "customer",
        "recommended",
        "follow_up_needed",
      ],
      public_review_status: [
        "draft",
        "submitted",
        "pending_moderation",
        "approved",
        "published",
        "needs_changes",
        "rejected",
        "hidden",
        "deleted_by_user",
      ],
      would_return_type: ["yes", "maybe", "no"],
    },
  },
} as const
