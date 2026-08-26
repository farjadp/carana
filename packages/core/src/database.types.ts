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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          business_id: string | null
          created_at: string
          feature: string
          id: number
          tokens: number | null
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          feature: string
          id?: number
          tokens?: number | null
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          feature?: string
          id?: number
          tokens?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_daily: {
        Row: {
          day: string
          dimension: string
          event_type: string
          n: number
          subject_id: string
          subject_kind: string
          uniques: number
          updated_at: string
          value: string
        }
        Insert: {
          day: string
          dimension?: string
          event_type: string
          n: number
          subject_id: string
          subject_kind: string
          uniques: number
          updated_at?: string
          value?: string
        }
        Update: {
          day?: string
          dimension?: string
          event_type?: string
          n?: number
          subject_id?: string
          subject_kind?: string
          uniques?: number
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_event_type_fkey"
            columns: ["event_type"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["key"]
          },
        ]
      }
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
          key_takeaway: string | null
          published_at: string | null
          reading_minutes: number | null
          slug: string
          source_article_id: string | null
          sources: Json | null
          status: string
          summary_en: string | null
          tags: string[]
          title: string
          title_en: string | null
          topic_seed: string | null
          updated_at: string
          view_count: number
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
          key_takeaway?: string | null
          published_at?: string | null
          reading_minutes?: number | null
          slug: string
          source_article_id?: string | null
          sources?: Json | null
          status?: string
          summary_en?: string | null
          tags?: string[]
          title: string
          title_en?: string | null
          topic_seed?: string | null
          updated_at?: string
          view_count?: number
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
          key_takeaway?: string | null
          published_at?: string | null
          reading_minutes?: number | null
          slug?: string
          source_article_id?: string | null
          sources?: Json | null
          status?: string
          summary_en?: string | null
          tags?: string[]
          title?: string
          title_en?: string | null
          topic_seed?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "blog_posts_source_article_id_fkey"
            columns: ["source_article_id"]
            isOneToOne: false
            referencedRelation: "blog_source_articles"
            referencedColumns: ["id"]
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
      blog_snippets: {
        Row: {
          ai_model: string | null
          body: string
          channel: string
          created_at: string
          error: string | null
          external_id: string | null
          hook: string
          id: string
          kind: string
          sent_at: string | null
          source_post_id: string
          status: string
          tags: string[]
          url: string | null
        }
        Insert: {
          ai_model?: string | null
          body: string
          channel?: string
          created_at?: string
          error?: string | null
          external_id?: string | null
          hook: string
          id?: string
          kind: string
          sent_at?: string | null
          source_post_id: string
          status?: string
          tags?: string[]
          url?: string | null
        }
        Update: {
          ai_model?: string | null
          body?: string
          channel?: string
          created_at?: string
          error?: string | null
          external_id?: string | null
          hook?: string
          id?: string
          kind?: string
          sent_at?: string | null
          source_post_id?: string
          status?: string
          tags?: string[]
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_snippets_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_source_articles: {
        Row: {
          excerpt: string | null
          external_id: string
          first_seen_at: string
          id: string
          post_id: string | null
          published_at: string | null
          reason: string | null
          source_slug: string
          status: string
          title: string | null
          url: string
        }
        Insert: {
          excerpt?: string | null
          external_id: string
          first_seen_at?: string
          id?: string
          post_id?: string | null
          published_at?: string | null
          reason?: string | null
          source_slug: string
          status?: string
          title?: string | null
          url: string
        }
        Update: {
          excerpt?: string | null
          external_id?: string
          first_seen_at?: string
          id?: string
          post_id?: string | null
          published_at?: string | null
          reason?: string | null
          source_slug?: string
          status?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_source_articles_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_source_articles_source_slug_fkey"
            columns: ["source_slug"]
            isOneToOne: false
            referencedRelation: "blog_sources"
            referencedColumns: ["slug"]
          },
        ]
      }
      blog_sources: {
        Row: {
          api_base: string | null
          created_at: string
          enabled: boolean
          exclude_categories: number[]
          fresh_days: number
          home_url: string
          include_categories: number[]
          kind: string
          name: string
          notes: string | null
          slug: string
          weight: number
        }
        Insert: {
          api_base?: string | null
          created_at?: string
          enabled?: boolean
          exclude_categories?: number[]
          fresh_days?: number
          home_url: string
          include_categories?: number[]
          kind?: string
          name: string
          notes?: string | null
          slug: string
          weight?: number
        }
        Update: {
          api_base?: string | null
          created_at?: string
          enabled?: boolean
          exclude_categories?: number[]
          fresh_days?: number
          home_url?: string
          include_categories?: number[]
          kind?: string
          name?: string
          notes?: string | null
          slug?: string
          weight?: number
        }
        Relationships: []
      }
      blog_syndications: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          external_id: string | null
          id: string
          post_id: string
          sent_at: string | null
          status: string
          url: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          external_id?: string | null
          id?: string
          post_id: string
          sent_at?: string | null
          status?: string
          url?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          external_id?: string | null
          id?: string
          post_id?: string
          sent_at?: string | null
          status?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_syndications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_announcements: {
        Row: {
          body: string | null
          business_id: string
          created_at: string
          expires_at: string | null
          id: string
          title: string
        }
        Insert: {
          body?: string | null
          business_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          title: string
        }
        Update: {
          body?: string | null
          business_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_announcements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
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
          business_id: string | null
          channel_id: string | null
          contact: string | null
          created_at: string
          details: string | null
          id: string
          link_page_id: string | null
          reason: string
          reporter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          source: string
          status: string
        }
        Insert: {
          admin_note?: string | null
          business_id?: string | null
          channel_id?: string | null
          contact?: string | null
          created_at?: string
          details?: string | null
          id?: string
          link_page_id?: string | null
          reason: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          status?: string
        }
        Update: {
          admin_note?: string | null
          business_id?: string | null
          channel_id?: string | null
          contact?: string | null
          created_at?: string
          details?: string | null
          id?: string
          link_page_id?: string | null
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
          {
            foreignKeyName: "business_reports_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_reports_link_page_id_fkey"
            columns: ["link_page_id"]
            isOneToOne: false
            referencedRelation: "link_pages"
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
          busy_status: string | null
          busy_status_until: string | null
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
          hide_owner: boolean
          id: string
          instagram: string | null
          is_address_public: boolean | null
          is_iranian_owned: boolean | null
          languages: string[] | null
          license_info: string | null
          link_pro_until: string | null
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
          saved_count: number
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
          busy_status?: string | null
          busy_status_until?: string | null
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
          hide_owner?: boolean
          id?: string
          instagram?: string | null
          is_address_public?: boolean | null
          is_iranian_owned?: boolean | null
          languages?: string[] | null
          license_info?: string | null
          link_pro_until?: string | null
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
          saved_count?: number
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
          busy_status?: string | null
          busy_status_until?: string | null
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
          hide_owner?: boolean
          id?: string
          instagram?: string | null
          is_address_public?: boolean | null
          is_iranian_owned?: boolean | null
          languages?: string[] | null
          license_info?: string | null
          link_pro_until?: string | null
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
          saved_count?: number
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
      channel_categories: {
        Row: {
          created_at: string
          description: string | null
          name_fa: string
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          name_fa: string
          position?: number
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          name_fa?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      channel_events: {
        Row: {
          bot: boolean
          channel_id: string
          created_at: string
          device: string | null
          event_type: string
          id: number
          referrer_host: string | null
          source: string
          visitor_hash: string | null
        }
        Insert: {
          bot?: boolean
          channel_id: string
          created_at?: string
          device?: string | null
          event_type: string
          id?: number
          referrer_host?: string | null
          source?: string
          visitor_hash?: string | null
        }
        Update: {
          bot?: boolean
          channel_id?: string
          created_at?: string
          device?: string | null
          event_type?: string
          id?: number
          referrer_host?: string | null
          source?: string
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_events_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_events_event_type_fkey"
            columns: ["event_type"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["key"]
          },
        ]
      }
      channel_member_snapshots: {
        Row: {
          channel_id: string
          day: string
          member_count: number
        }
        Insert: {
          channel_id: string
          day: string
          member_count: number
        }
        Update: {
          channel_id?: string
          day?: string
          member_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "channel_member_snapshots_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          category_slug: string
          check_failures: number
          city: string | null
          confirm_by: string | null
          created_at: string
          description: string
          id: string
          join_url: string
          kind: string
          language: string
          last_post_at: string | null
          member_count: number | null
          metrics_checked_at: string | null
          metrics_source: string
          moderation_reason: string | null
          platform: string
          posts_last_30d: number | null
          province: string | null
          published_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: string
          submitted_by: string | null
          tg_username: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_slug: string
          check_failures?: number
          city?: string | null
          confirm_by?: string | null
          created_at?: string
          description: string
          id?: string
          join_url: string
          kind: string
          language?: string
          last_post_at?: string | null
          member_count?: number | null
          metrics_checked_at?: string | null
          metrics_source?: string
          moderation_reason?: string | null
          platform: string
          posts_last_30d?: number | null
          province?: string | null
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          status?: string
          submitted_by?: string | null
          tg_username?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_slug?: string
          check_failures?: number
          city?: string | null
          confirm_by?: string | null
          created_at?: string
          description?: string
          id?: string
          join_url?: string
          kind?: string
          language?: string
          last_post_at?: string | null
          member_count?: number | null
          metrics_checked_at?: string | null
          metrics_source?: string
          moderation_reason?: string | null
          platform?: string
          posts_last_30d?: number | null
          province?: string | null
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          status?: string
          submitted_by?: string | null
          tg_username?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "channel_categories"
            referencedColumns: ["slug"]
          },
        ]
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
      event_types: {
        Row: {
          created_at: string
          is_active: boolean
          key: string
          label_en: string
          label_fa: string
          min_feature: string | null
          subject_kind: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          key: string
          label_en: string
          label_fa: string
          min_feature?: string | null
          subject_kind: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          key?: string
          label_en?: string
          label_fa?: string
          min_feature?: string | null
          subject_kind?: string
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
      job_posts: {
        Row: {
          apply_method: string
          apply_value: string
          business_id: string
          city: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          description: string
          employment_type: string
          expires_at: string
          expiry_reminder_sent_at: string | null
          id: string
          moderation_reason: string | null
          province: string | null
          published_at: string | null
          requires_english: boolean
          requires_persian: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          salary_is_public: boolean
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          view_count: number
          workplace_type: string
        }
        Insert: {
          apply_method: string
          apply_value: string
          business_id: string
          city?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          employment_type?: string
          expires_at: string
          expiry_reminder_sent_at?: string | null
          id?: string
          moderation_reason?: string | null
          province?: string | null
          published_at?: string | null
          requires_english?: boolean
          requires_persian?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          salary_is_public?: boolean
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          view_count?: number
          workplace_type?: string
        }
        Update: {
          apply_method?: string
          apply_value?: string
          business_id?: string
          city?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          employment_type?: string
          expires_at?: string
          expiry_reminder_sent_at?: string | null
          id?: string
          moderation_reason?: string | null
          province?: string | null
          published_at?: string | null
          requires_english?: boolean
          requires_persian?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          salary_is_public?: boolean
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          view_count?: number
          workplace_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      link_events: {
        Row: {
          bot: boolean
          city: string | null
          created_at: string
          device: string | null
          event_type: string
          id: number
          item_id: string | null
          page_id: string
          props: Json
          referrer_host: string | null
          source: string
          utm: Json | null
          visitor_hash: string | null
        }
        Insert: {
          bot?: boolean
          city?: string | null
          created_at?: string
          device?: string | null
          event_type: string
          id?: number
          item_id?: string | null
          page_id: string
          props?: Json
          referrer_host?: string | null
          source?: string
          utm?: Json | null
          visitor_hash?: string | null
        }
        Update: {
          bot?: boolean
          city?: string | null
          created_at?: string
          device?: string | null
          event_type?: string
          id?: number
          item_id?: string | null
          page_id?: string
          props?: Json
          referrer_host?: string | null
          source?: string
          utm?: Json | null
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_events_event_type_fkey"
            columns: ["event_type"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "link_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "link_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_events_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "link_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      link_handle_history: {
        Row: {
          handle: string
          previous_page_id: string | null
          released_at: string
        }
        Insert: {
          handle: string
          previous_page_id?: string | null
          released_at?: string
        }
        Update: {
          handle?: string
          previous_page_id?: string | null
          released_at?: string
        }
        Relationships: []
      }
      link_items: {
        Row: {
          created_at: string
          enabled: boolean
          ends_at: string | null
          icon: string | null
          id: string
          kind: string
          label_en: string | null
          label_fa: string | null
          page_id: string
          position: number
          starts_at: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          ends_at?: string | null
          icon?: string | null
          id?: string
          kind: string
          label_en?: string | null
          label_fa?: string | null
          page_id: string
          position?: number
          starts_at?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          ends_at?: string | null
          icon?: string | null
          id?: string
          kind?: string
          label_en?: string | null
          label_fa?: string | null
          page_id?: string
          position?: number
          starts_at?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_items_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "link_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      link_leads: {
        Row: {
          consent_at: string
          consent_text: string
          created_at: string
          email: string | null
          id: string
          name: string | null
          page_id: string
          phone: string | null
          source_item_id: string | null
        }
        Insert: {
          consent_at?: string
          consent_text: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          page_id: string
          phone?: string | null
          source_item_id?: string | null
        }
        Update: {
          consent_at?: string
          consent_text?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          page_id?: string
          phone?: string | null
          source_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_leads_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "link_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_leads_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "link_items"
            referencedColumns: ["id"]
          },
        ]
      }
      link_pages: {
        Row: {
          avatar_url: string | null
          business_id: string | null
          cover_url: string | null
          created_at: string
          footer_hidden: boolean
          handle: string
          id: string
          locale_mode: string
          owner_user_id: string
          pixel_ga: string | null
          pixel_meta: string | null
          published_at: string | null
          status: string
          suspended_reason: string | null
          tagline: string | null
          theme: Json
          title: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          business_id?: string | null
          cover_url?: string | null
          created_at?: string
          footer_hidden?: boolean
          handle: string
          id?: string
          locale_mode?: string
          owner_user_id: string
          pixel_ga?: string | null
          pixel_meta?: string | null
          published_at?: string | null
          status?: string
          suspended_reason?: string | null
          tagline?: string | null
          theme?: Json
          title: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          business_id?: string | null
          cover_url?: string | null
          created_at?: string
          footer_hidden?: boolean
          handle?: string
          id?: string
          locale_mode?: string
          owner_user_id?: string
          pixel_ga?: string | null
          pixel_meta?: string | null
          published_at?: string | null
          status?: string
          suspended_reason?: string | null
          tagline?: string | null
          theme?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_pages_business_id_fkey"
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
          link_pro_until: string | null
          mobile_number: string | null
          phone_verified_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          stripe_customer_id: string | null
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
          link_pro_until?: string | null
          mobile_number?: string | null
          phone_verified_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          stripe_customer_id?: string | null
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
          link_pro_until?: string | null
          mobile_number?: string | null
          phone_verified_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          stripe_customer_id?: string | null
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
      reserved_handles: {
        Row: {
          handle: string
          reason: string
        }
        Insert: {
          handle: string
          reason: string
        }
        Update: {
          handle?: string
          reason?: string
        }
        Relationships: []
      }
      search_ai_expansions: {
        Row: {
          categories: string[]
          created_at: string
          hit_count: number
          model: string | null
          q_norm: string
          reason: string | null
          status: string
          terms: string[]
          updated_at: string
        }
        Insert: {
          categories?: string[]
          created_at?: string
          hit_count?: number
          model?: string | null
          q_norm: string
          reason?: string | null
          status?: string
          terms?: string[]
          updated_at?: string
        }
        Update: {
          categories?: string[]
          created_at?: string
          hit_count?: number
          model?: string | null
          q_norm?: string
          reason?: string | null
          status?: string
          terms?: string[]
          updated_at?: string
        }
        Relationships: []
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
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      standing_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          meta: Json
          points: number
          reason: string | null
          rule_version: number | null
          settled_at: string | null
          settled_by: string | null
          state: string
          subject_id: string | null
          subject_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          meta?: Json
          points?: number
          reason?: string | null
          rule_version?: number | null
          settled_at?: string | null
          settled_by?: string | null
          state?: string
          subject_id?: string | null
          subject_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          points?: number
          reason?: string | null
          rule_version?: number | null
          settled_at?: string | null
          settled_by?: string | null
          state?: string
          subject_id?: string | null
          subject_type?: string
          user_id?: string
        }
        Relationships: []
      }
      standing_rules: {
        Row: {
          daily_cap: number
          enabled: boolean
          kind: string
          label_fa: string
          points: number
          subject_type: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          daily_cap?: number
          enabled?: boolean
          kind: string
          label_fa: string
          points?: number
          subject_type: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          daily_cap?: number
          enabled?: boolean
          kind?: string
          label_fa?: string
          points?: number
          subject_type?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
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
          business_id: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          id: string
          interval: string | null
          owner_user_id: string | null
          plan: string
          product: string
          status: string
          stripe_customer_id: string
          stripe_price_id: string | null
          stripe_subscription_id: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          interval?: string | null
          owner_user_id?: string | null
          plan: string
          product?: string
          status: string
          stripe_customer_id: string
          stripe_price_id?: string | null
          stripe_subscription_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          interval?: string | null
          owner_user_id?: string | null
          plan?: string
          product?: string
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
          notify_announcements: boolean
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
          notify_announcements?: boolean
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
          notify_announcements?: boolean
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
      user_standing: {
        Row: {
          accuracy: number | null
          admin_note: string | null
          confirmed_count: number
          distinct_kinds: number
          frozen: boolean
          last_confirmed_at: string | null
          level_grant: number | null
          peak_level: number
          peak_level_at: string | null
          recomputed_at: string | null
          reversed_count: number
          user_id: string
          xp: number
        }
        Insert: {
          accuracy?: number | null
          admin_note?: string | null
          confirmed_count?: number
          distinct_kinds?: number
          frozen?: boolean
          last_confirmed_at?: string | null
          level_grant?: number | null
          peak_level?: number
          peak_level_at?: string | null
          recomputed_at?: string | null
          reversed_count?: number
          user_id: string
          xp?: number
        }
        Update: {
          accuracy?: number | null
          admin_note?: string | null
          confirmed_count?: number
          distinct_kinds?: number
          frozen?: boolean
          last_confirmed_at?: string | null
          level_grant?: number | null
          peak_level?: number
          peak_level_at?: string | null
          recomputed_at?: string | null
          reversed_count?: number
          user_id?: string
          xp?: number
        }
        Relationships: []
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
      owner_events: {
        Row: {
          bot: boolean | null
          city: string | null
          created_at: string | null
          device: string | null
          event_type: string | null
          item_id: string | null
          referrer_host: string | null
          source: string | null
          subject_id: string | null
          subject_kind: string | null
          visitor_hash: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ai_usage_recent_count: {
        Args: { p_feature: string; p_hours?: number; p_user_id: string }
        Returns: number
      }
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
      channel_view_count: { Args: { p_channel_id: string }; Returns: number }
      channels_recent_count: { Args: { p_user_id: string }; Returns: number }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      fa_normalize: { Args: { t: string }; Returns: string }
      handle_available: { Args: { p_handle: string }; Returns: boolean }
      has_business_access: {
        Args: { target_business_id: string; target_user_id: string }
        Returns: boolean
      }
      increment_blog_post_view: {
        Args: { target_id: string }
        Returns: undefined
      }
      increment_business_view: {
        Args: { target_id: string }
        Returns: undefined
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      job_posts_recent_count: {
        Args: { p_business_id: string }
        Returns: number
      }
      keyboard_swap: { Args: { t: string }; Returns: string }
      link_days_needing_rollup: {
        Args: { p_lookback?: number }
        Returns: string[]
      }
      link_page_summary: {
        Args: { p_days?: number; p_dimension?: string; p_page_id: string }
        Returns: {
          day: string
          event_type: string
          n: number
          uniques: number
          value: string
        }[]
      }
      live_job_count: { Args: { p_business_id: string }; Returns: number }
      prune_link_events: { Args: { p_keep_days?: number }; Returns: number }
      recompute_standing: { Args: { p_user: string }; Returns: undefined }
      restore_link_page: { Args: { p_page_id: string }; Returns: undefined }
      review_current_status: {
        Args: { target_review_id: string }
        Returns: Database["public"]["Enums"]["public_review_status"]
      }
      roll_up_channel_day: { Args: { p_day: string }; Returns: number }
      roll_up_link_day: { Args: { p_day: string }; Returns: number }
      search_announcements: {
        Args: { p_limit?: number; q: string }
        Returns: {
          announcement_body: string
          announcement_created_at: string
          announcement_expires_at: string
          announcement_id: string
          announcement_title: string
          business_id: string
          category: string
          city: string
          logo_url: string
          name: string
          plan: string
          plan_until: string
          province: string
          slug: string
          verified_until: string
        }[]
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
          busy_status: string
          busy_status_until: string
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
      suspend_link_page: {
        Args: { p_page_id: string; p_reason: string }
        Returns: undefined
      }
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
        | "STANDING_ADMIN"
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
        "STANDING_ADMIN",
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
