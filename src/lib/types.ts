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
      categories: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: number
          job_id: number
          user_id: string
          amount: number
          status: string
          due_date: string // evt. Date hvis du bruker det
          created_at: string
        }
        Insert: {
          id?: number
          job_id: number
          user_id: string
          amount: number
          status: string
          due_date: string
          created_at?: string
        }
        Update: {
          id?: number
          job_id?: number
          user_id?: string
          amount?: number
          status?: string
          due_date?: string
          created_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          id: number
          user_id: string
          category_id: number
          title: string
          description: string
          status: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          category_id: number
          title: string
          description: string
          status: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          category_id?: number
          title?: string
          description?: string
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: number
          offer_id: number
          sender_id: string
          message: string
          sent_at: string
        }
        Insert: {
          id?: number
          offer_id: number
          sender_id: string
          message: string
          sent_at?: string
        }
        Update: {
          id?: number
          offer_id?: number
          sender_id?: string
          message?: string
          sent_at?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          id: number
          job_id: number
          business_id: string
          price: number
          status: string
          created_at: string
        }
        Insert: {
          id?: number
          job_id: number
          business_id: string
          price: number
          status: string
          created_at?: string
        }
        Update: {
          id?: number
          job_id?: number
          business_id?: string
          price?: number
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role: string
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: number
          job_id: number
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment: string
          created_at: string
        }
        Insert: {
          id?: number
          job_id: number
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment: string
          created_at?: string
        }
        Update: {
          id?: number
          job_id?: number
          reviewer_id?: string
          reviewee_id?: string
          rating?: number
          comment?: string
          created_at?: string
        }
        Relationships: []
      }
      todo_list: {
        Row: {
          id: number
          owner: string
          title: string
          description: string | null
          done: boolean
          done_at: string | null
          urgent: boolean
          created_at: string
        }
        Insert: {
          id?: number
          owner: string
          title: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          urgent?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          owner?: string
          title?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          urgent?: boolean
          created_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          created_at?: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
