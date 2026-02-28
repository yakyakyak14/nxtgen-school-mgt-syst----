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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academic_calendar: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          is_school_closed: boolean | null
          session: string
          start_date: string
          term: Database["public"]["Enums"]["term"] | null
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          is_school_closed?: boolean | null
          session: string
          start_date: string
          term?: Database["public"]["Enums"]["term"] | null
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          is_school_closed?: boolean | null
          session?: string
          start_date?: string
          term?: Database["public"]["Enums"]["term"] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      alumni: {
        Row: {
          bio: string | null
          created_at: string | null
          current_employer: string | null
          current_occupation: string | null
          graduation_class: string | null
          graduation_year: number
          id: string
          is_verified: boolean | null
          linkedin_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          current_employer?: string | null
          current_occupation?: string | null
          graduation_class?: string | null
          graduation_year: number
          id?: string
          is_verified?: boolean | null
          linkedin_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          current_employer?: string | null
          current_occupation?: string | null
          graduation_class?: string | null
          graduation_year?: number
          id?: string
          is_verified?: boolean | null
          linkedin_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      alumni_chat_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumni_chat_groups_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_chat_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumni_chat_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "alumni_chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_chat_messages: {
        Row: {
          created_at: string
          group_id: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumni_chat_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "alumni_chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_donations: {
        Row: {
          alumni_id: string | null
          amount: number
          created_at: string | null
          currency: string | null
          donated_at: string | null
          donor_email: string | null
          donor_name: string
          id: string
          is_anonymous: boolean | null
          message: string | null
          payment_reference: string | null
          payment_status: string | null
          project_id: string | null
        }
        Insert: {
          alumni_id?: string | null
          amount: number
          created_at?: string | null
          currency?: string | null
          donated_at?: string | null
          donor_email?: string | null
          donor_name: string
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          project_id?: string | null
        }
        Update: {
          alumni_id?: string | null
          amount?: number
          created_at?: string | null
          currency?: string | null
          donated_at?: string | null
          donor_email?: string | null
          donor_name?: string
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumni_donations_alumni_id_fkey"
            columns: ["alumni_id"]
            isOneToOne: false
            referencedRelation: "alumni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_donations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "alumni_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_projects: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          current_amount: number | null
          description: string
          end_date: string | null
          id: string
          image_url: string | null
          start_date: string | null
          status: string | null
          target_amount: number
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          current_amount?: number | null
          description: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          start_date?: string | null
          status?: string | null
          target_amount: number
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          current_amount?: number | null
          description?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          start_date?: string | null
          status?: string | null
          target_amount?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      announcement_dismissals: {
        Row: {
          announcement_id: string
          dismissed_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "platform_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          created_at: string | null
          date: string
          id: string
          is_present: boolean | null
          recorded_by: string | null
          remarks: string | null
          student_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          is_present?: boolean | null
          recorded_by?: string | null
          remarks?: string | null
          student_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          is_present?: boolean | null
          recorded_by?: string | null
          remarks?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          school_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          school_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          school_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string
          metadata: Json | null
          paid_at: string | null
          paystack_reference: string | null
          paystack_transaction_id: string | null
          school_id: string
          status: string
          subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          metadata?: Json | null
          paid_at?: string | null
          paystack_reference?: string | null
          paystack_transaction_id?: string | null
          school_id: string
          status?: string
          subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          metadata?: Json | null
          paid_at?: string | null
          paystack_reference?: string | null
          paystack_transaction_id?: string | null
          school_id?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "school_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      book_loans: {
        Row: {
          book_id: string
          borrowed_date: string | null
          borrower_id: string
          created_at: string | null
          due_date: string | null
          id: string
          returned_date: string | null
        }
        Insert: {
          book_id: string
          borrowed_date?: string | null
          borrower_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          returned_date?: string | null
        }
        Update: {
          book_id?: string
          borrowed_date?: string | null
          borrower_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          returned_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_loans_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      class_subjects: {
        Row: {
          class_id: string
          id: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          id?: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          id?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          capacity: number | null
          class_teacher_id: string | null
          created_at: string | null
          id: string
          level: Database["public"]["Enums"]["class_level"]
          name: string
          school_id: string | null
          section: string | null
        }
        Insert: {
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string | null
          id?: string
          level: Database["public"]["Enums"]["class_level"]
          name: string
          school_id?: string | null
          section?: string | null
        }
        Update: {
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string | null
          id?: string
          level?: Database["public"]["Enums"]["class_level"]
          name?: string
          school_id?: string | null
          section?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      club_memberships: {
        Row: {
          club_id: string
          id: string
          joined_at: string | null
          role: string | null
          student_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          student_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_memberships_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_memberships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          patron_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          patron_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          patron_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_patron_id_fkey"
            columns: ["patron_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          access_level: Database["public"]["Enums"]["app_role"][]
          created_at: string | null
          description: string | null
          file_type: string | null
          file_url: string
          id: string
          title: string
          uploaded_by: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["app_role"][]
          created_at?: string | null
          description?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          title: string
          uploaded_by: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["app_role"][]
          created_at?: string | null
          description?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          title?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      exam_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          exam_name: string
          id: string
          session: string
          start_date: string
          status: string
          term: Database["public"]["Enums"]["term"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          exam_name: string
          id?: string
          session: string
          start_date: string
          status?: string
          term: Database["public"]["Enums"]["term"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          exam_name?: string
          id?: string
          session?: string
          start_date?: string
          status?: string
          term?: Database["public"]["Enums"]["term"]
          updated_at?: string
        }
        Relationships: []
      }
      exam_timetable: {
        Row: {
          class_id: string
          created_at: string
          end_time: string
          exam_date: string
          exam_schedule_id: string
          id: string
          invigilator_id: string | null
          start_time: string
          subject_id: string
          venue: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          end_time: string
          exam_date: string
          exam_schedule_id: string
          id?: string
          invigilator_id?: string | null
          start_time: string
          subject_id: string
          venue?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          end_time?: string
          exam_date?: string
          exam_schedule_id?: string
          id?: string
          invigilator_id?: string | null
          start_time?: string
          subject_id?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_timetable_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_timetable_exam_schedule_id_fkey"
            columns: ["exam_schedule_id"]
            isOneToOne: false
            referencedRelation: "exam_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_timetable_invigilator_id_fkey"
            columns: ["invigilator_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_timetable_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount_paid: number
          created_at: string | null
          fee_type_id: string
          id: string
          installment_number: number | null
          obligation_id: string | null
          payment_date: string | null
          payment_method: string | null
          paystack_reference: string | null
          platform_fee: number | null
          receipt_number: string | null
          recorded_by: string | null
          school_amount: number | null
          session: string
          student_id: string
          term: Database["public"]["Enums"]["term"]
          transaction_reference: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          fee_type_id: string
          id?: string
          installment_number?: number | null
          obligation_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          paystack_reference?: string | null
          platform_fee?: number | null
          receipt_number?: string | null
          recorded_by?: string | null
          school_amount?: number | null
          session: string
          student_id: string
          term: Database["public"]["Enums"]["term"]
          transaction_reference?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          fee_type_id?: string
          id?: string
          installment_number?: number | null
          obligation_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          paystack_reference?: string | null
          platform_fee?: number | null
          receipt_number?: string | null
          recorded_by?: string | null
          school_amount?: number | null
          session?: string
          student_id?: string
          term?: Database["public"]["Enums"]["term"]
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "student_fee_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_types: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          is_recurring: boolean | null
          name: string
          school_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          name: string
          school_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          name?: string
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          ca_score: number | null
          created_at: string | null
          exam_score: number | null
          grade_letter: string | null
          id: string
          recorded_by: string | null
          remarks: string | null
          session: string
          student_id: string
          subject_id: string
          term: Database["public"]["Enums"]["term"]
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          ca_score?: number | null
          created_at?: string | null
          exam_score?: number | null
          grade_letter?: string | null
          id?: string
          recorded_by?: string | null
          remarks?: string | null
          session: string
          student_id: string
          subject_id: string
          term: Database["public"]["Enums"]["term"]
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          ca_score?: number | null
          created_at?: string | null
          exam_score?: number | null
          grade_letter?: string | null
          id?: string
          recorded_by?: string | null
          remarks?: string | null
          session?: string
          student_id?: string
          subject_id?: string
          term?: Database["public"]["Enums"]["term"]
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          created_at: string | null
          id: string
          occupation: string | null
          relationship: string | null
          user_id: string | null
          workplace: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          occupation?: string | null
          relationship?: string | null
          user_id?: string | null
          workplace?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          occupation?: string | null
          relationship?: string | null
          user_id?: string | null
          workplace?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          item_name: string
          last_restocked: string | null
          location: string | null
          quantity: number | null
          reorder_level: number | null
          unit: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          item_name: string
          last_restocked?: string | null
          location?: string | null
          quantity?: number | null
          reorder_level?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          item_name?: string
          last_restocked?: string | null
          location?: string | null
          quantity?: number | null
          reorder_level?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      job_titles: {
        Row: {
          category: Database["public"]["Enums"]["staff_category"]
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          title: string
        }
        Insert: {
          category: Database["public"]["Enums"]["staff_category"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["staff_category"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      library_books: {
        Row: {
          author: string | null
          available: number | null
          category: string | null
          created_at: string | null
          id: string
          isbn: string | null
          location: string | null
          quantity: number | null
          title: string
        }
        Insert: {
          author?: string | null
          available?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          isbn?: string | null
          location?: string | null
          quantity?: number | null
          title: string
        }
        Update: {
          author?: string | null
          available?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          isbn?: string | null
          location?: string | null
          quantity?: number | null
          title?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          approved_by: string | null
          content: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          priority: string | null
          published_at: string | null
          school_id: string | null
          status: Database["public"]["Enums"]["notice_status"] | null
          target_audience: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          content: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          priority?: string | null
          published_at?: string | null
          school_id?: string | null
          status?: Database["public"]["Enums"]["notice_status"] | null
          target_audience?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          content?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          priority?: string | null
          published_at?: string | null
          school_id?: string | null
          status?: Database["public"]["Enums"]["notice_status"] | null
          target_audience?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_settings: {
        Row: {
          created_at: string | null
          gateway_name: string
          id: string
          is_active: boolean | null
          platform_percentage: number | null
          school_account_name: string | null
          school_account_number: string | null
          school_bank_name: string | null
          school_percentage: number | null
          school_subaccount_code: string | null
          split_code: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          gateway_name?: string
          id?: string
          is_active?: boolean | null
          platform_percentage?: number | null
          school_account_name?: string | null
          school_account_number?: string | null
          school_bank_name?: string | null
          school_percentage?: number | null
          school_subaccount_code?: string | null
          split_code?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          gateway_name?: string
          id?: string
          is_active?: boolean | null
          platform_percentage?: number | null
          school_account_name?: string | null
          school_account_number?: string | null
          school_bank_name?: string | null
          school_percentage?: number | null
          school_subaccount_code?: string | null
          split_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payroll_deduction_types: {
        Row: {
          created_at: string | null
          default_value: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_percentage: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          default_value?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          default_value?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          name?: string
        }
        Relationships: []
      }
      payroll_deductions: {
        Row: {
          amount: number
          created_at: string | null
          deduction_type_id: string | null
          id: string
          is_percentage: boolean | null
          name: string
          payroll_record_id: string
          percentage_value: number | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          deduction_type_id?: string | null
          id?: string
          is_percentage?: boolean | null
          name: string
          payroll_record_id: string
          percentage_value?: number | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          deduction_type_id?: string | null
          id?: string
          is_percentage?: boolean | null
          name?: string
          payroll_record_id?: string
          percentage_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_deductions_deduction_type_id_fkey"
            columns: ["deduction_type_id"]
            isOneToOne: false
            referencedRelation: "payroll_deduction_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_deductions_payroll_record_id_fkey"
            columns: ["payroll_record_id"]
            isOneToOne: false
            referencedRelation: "payroll_records"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          created_at: string | null
          id: string
          month: number
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: number
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: number
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      payroll_records: {
        Row: {
          basic_salary: number
          created_at: string | null
          gross_salary: number
          id: string
          net_salary: number
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          payroll_period_id: string
          staff_id: string
          total_deductions: number | null
          updated_at: string | null
        }
        Insert: {
          basic_salary: number
          created_at?: string | null
          gross_salary: number
          id?: string
          net_salary: number
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          payroll_period_id: string
          staff_id: string
          total_deductions?: number | null
          updated_at?: string | null
        }
        Update: {
          basic_salary?: number
          created_at?: string | null
          gross_salary?: number
          id?: string
          net_salary?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          payroll_period_id?: string
          staff_id?: string
          total_deductions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_announcements: {
        Row: {
          announcement_type: string | null
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          priority: string | null
          starts_at: string | null
          target_schools: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          announcement_type?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          starts_at?: string | null
          target_schools?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          announcement_type?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          starts_at?: string | null
          target_schools?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_benchmarks: {
        Row: {
          active_schools: number | null
          avg_attendance_rate: number | null
          avg_fee_collection_rate: number | null
          avg_grade_average: number | null
          avg_staff_count: number | null
          avg_student_count: number | null
          created_at: string
          id: string
          metric_date: string
          top_attendance_school: string | null
          top_fee_collection_school: string | null
          total_fee_collected: number | null
          total_schools: number | null
          total_staff: number | null
          total_students: number | null
        }
        Insert: {
          active_schools?: number | null
          avg_attendance_rate?: number | null
          avg_fee_collection_rate?: number | null
          avg_grade_average?: number | null
          avg_staff_count?: number | null
          avg_student_count?: number | null
          created_at?: string
          id?: string
          metric_date?: string
          top_attendance_school?: string | null
          top_fee_collection_school?: string | null
          total_fee_collected?: number | null
          total_schools?: number | null
          total_staff?: number | null
          total_students?: number | null
        }
        Update: {
          active_schools?: number | null
          avg_attendance_rate?: number | null
          avg_fee_collection_rate?: number | null
          avg_grade_average?: number | null
          avg_staff_count?: number | null
          avg_student_count?: number | null
          created_at?: string
          id?: string
          metric_date?: string
          top_attendance_school?: string | null
          top_fee_collection_school?: string | null
          total_fee_collected?: number | null
          total_schools?: number | null
          total_staff?: number | null
          total_students?: number | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string | null
          default_accent_color: string | null
          default_primary_color: string | null
          default_secondary_color: string | null
          id: string
          max_schools_allowed: number | null
          platform_logo_url: string | null
          platform_name: string
          support_email: string | null
          support_phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_accent_color?: string | null
          default_primary_color?: string | null
          default_secondary_color?: string | null
          id?: string
          max_schools_allowed?: number | null
          platform_logo_url?: string | null
          platform_name?: string
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_accent_color?: string | null
          default_primary_color?: string | null
          default_secondary_color?: string | null
          id?: string
          max_schools_allowed?: number | null
          platform_logo_url?: string | null
          platform_name?: string
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          first_name: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          last_name: string | null
          phone: string | null
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id: string
          last_name?: string | null
          phone?: string | null
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          last_name?: string | null
          phone?: string | null
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_features: {
        Row: {
          config: Json | null
          created_at: string
          feature_key: string
          id: string
          is_enabled: boolean | null
          school_id: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          feature_key: string
          id?: string
          is_enabled?: boolean | null
          school_id: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          feature_key?: string
          id?: string
          is_enabled?: boolean | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_features_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_health_metrics: {
        Row: {
          active_users_count: number | null
          api_calls_count: number | null
          attendance_rate: number | null
          created_at: string
          error_count: number | null
          fee_amount_collected: number | null
          fee_payments_count: number | null
          id: string
          metric_date: string
          school_id: string
          staff_count: number | null
          storage_used_mb: number | null
          student_count: number | null
          total_logins: number | null
        }
        Insert: {
          active_users_count?: number | null
          api_calls_count?: number | null
          attendance_rate?: number | null
          created_at?: string
          error_count?: number | null
          fee_amount_collected?: number | null
          fee_payments_count?: number | null
          id?: string
          metric_date?: string
          school_id: string
          staff_count?: number | null
          storage_used_mb?: number | null
          student_count?: number | null
          total_logins?: number | null
        }
        Update: {
          active_users_count?: number | null
          api_calls_count?: number | null
          attendance_rate?: number | null
          created_at?: string
          error_count?: number | null
          fee_amount_collected?: number | null
          fee_payments_count?: number | null
          id?: string
          metric_date?: string
          school_id?: string
          staff_count?: number | null
          storage_used_mb?: number | null
          student_count?: number | null
          total_logins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "school_health_metrics_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_quotas: {
        Row: {
          api_calls_reset_at: string | null
          api_calls_today: number | null
          created_at: string
          current_staff: number | null
          current_storage_mb: number | null
          current_students: number | null
          id: string
          max_api_calls_daily: number | null
          max_staff: number | null
          max_storage_mb: number | null
          max_students: number | null
          school_id: string
          updated_at: string
        }
        Insert: {
          api_calls_reset_at?: string | null
          api_calls_today?: number | null
          created_at?: string
          current_staff?: number | null
          current_storage_mb?: number | null
          current_students?: number | null
          id?: string
          max_api_calls_daily?: number | null
          max_staff?: number | null
          max_storage_mb?: number | null
          max_students?: number | null
          school_id: string
          updated_at?: string
        }
        Update: {
          api_calls_reset_at?: string | null
          api_calls_today?: number | null
          created_at?: string
          current_staff?: number | null
          current_storage_mb?: number | null
          current_students?: number | null
          id?: string
          max_api_calls_daily?: number | null
          max_staff?: number | null
          max_storage_mb?: number | null
          max_students?: number | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_quotas_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_settings: {
        Row: {
          accent_color: string | null
          created_at: string | null
          current_session: string | null
          current_term: Database["public"]["Enums"]["term"] | null
          google_maps_embed_url: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          school_address: string | null
          school_email: string | null
          school_latitude: number | null
          school_longitude: number | null
          school_motto: string | null
          school_name: string
          school_phone: string | null
          secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          created_at?: string | null
          current_session?: string | null
          current_term?: Database["public"]["Enums"]["term"] | null
          google_maps_embed_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          school_address?: string | null
          school_email?: string | null
          school_latitude?: number | null
          school_longitude?: number | null
          school_motto?: string | null
          school_name?: string
          school_phone?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          created_at?: string | null
          current_session?: string | null
          current_term?: Database["public"]["Enums"]["term"] | null
          google_maps_embed_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          school_address?: string | null
          school_email?: string | null
          school_latitude?: number | null
          school_longitude?: number | null
          school_motto?: string | null
          school_name?: string
          school_phone?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      school_subscriptions: {
        Row: {
          billing_cycle: string
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          paystack_customer_code: string | null
          paystack_email_token: string | null
          paystack_subscription_code: string | null
          plan_id: string
          school_id: string
          status: string
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          billing_cycle?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start?: string
          id?: string
          paystack_customer_code?: string | null
          paystack_email_token?: string | null
          paystack_subscription_code?: string | null
          plan_id: string
          school_id: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          paystack_customer_code?: string | null
          paystack_email_token?: string | null
          paystack_subscription_code?: string | null
          plan_id?: string
          school_id?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          accent_color: string | null
          address: string | null
          created_at: string | null
          current_session: string | null
          current_term: Database["public"]["Enums"]["term"] | null
          domain: string | null
          email: string | null
          google_maps_embed_url: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          motto: string | null
          name: string
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string
          subdomain: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          created_at?: string | null
          current_session?: string | null
          current_term?: Database["public"]["Enums"]["term"] | null
          domain?: string | null
          email?: string | null
          google_maps_embed_url?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          motto?: string | null
          name: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          subdomain?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          created_at?: string | null
          current_session?: string | null
          current_term?: Database["public"]["Enums"]["term"] | null
          domain?: string | null
          email?: string | null
          google_maps_embed_url?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          motto?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          subdomain?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          category: Database["public"]["Enums"]["staff_category"]
          created_at: string | null
          date_employed: string | null
          id: string
          is_active: boolean | null
          job_title_id: string | null
          salary: number | null
          school_id: string | null
          staff_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          category?: Database["public"]["Enums"]["staff_category"]
          created_at?: string | null
          date_employed?: string | null
          id?: string
          is_active?: boolean | null
          job_title_id?: string | null
          salary?: number | null
          school_id?: string | null
          staff_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          category?: Database["public"]["Enums"]["staff_category"]
          created_at?: string | null
          date_employed?: string | null
          id?: string
          is_active?: boolean | null
          job_title_id?: string | null
          salary?: number | null
          school_id?: string | null
          staff_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_job_title_id_fkey"
            columns: ["job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          id: string
          is_present: boolean | null
          remarks: string | null
          staff_id: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          id?: string
          is_present?: boolean | null
          remarks?: string | null
          staff_id: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          id?: string
          is_present?: boolean | null
          remarks?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fee_obligations: {
        Row: {
          allow_installments: boolean
          amount_paid: number
          balance: number | null
          created_at: string | null
          fee_type_id: string
          id: string
          installments_count: number
          session: string
          status: string
          student_id: string
          term: Database["public"]["Enums"]["term"]
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          allow_installments?: boolean
          amount_paid?: number
          balance?: number | null
          created_at?: string | null
          fee_type_id: string
          id?: string
          installments_count?: number
          session: string
          status?: string
          student_id: string
          term: Database["public"]["Enums"]["term"]
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          allow_installments?: boolean
          amount_paid?: number
          balance?: number | null
          created_at?: string | null
          fee_type_id?: string
          id?: string
          installments_count?: number
          session?: string
          status?: string
          student_id?: string
          term?: Database["public"]["Enums"]["term"]
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_fee_obligations_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_obligations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_guardians: {
        Row: {
          guardian_id: string
          id: string
          is_primary: boolean | null
          student_id: string
        }
        Insert: {
          guardian_id: string
          id?: string
          is_primary?: boolean | null
          student_id: string
        }
        Update: {
          guardian_id?: string
          id?: string
          is_primary?: boolean | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_number: string
          blood_group: string | null
          class_id: string | null
          created_at: string | null
          date_of_admission: string | null
          date_of_birth: string | null
          first_name: string | null
          gender: string | null
          guardian_address: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_occupation: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          guardian_workplace: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          medical_conditions: string | null
          previous_school: string | null
          school_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          admission_number: string
          blood_group?: string | null
          class_id?: string | null
          created_at?: string | null
          date_of_admission?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          gender?: string | null
          guardian_address?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_occupation?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          guardian_workplace?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          medical_conditions?: string | null
          previous_school?: string | null
          school_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          admission_number?: string
          blood_group?: string | null
          class_id?: string | null
          created_at?: string | null
          date_of_admission?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          gender?: string | null
          guardian_address?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_occupation?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          guardian_workplace?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          medical_conditions?: string | null
          previous_school?: string | null
          school_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          school_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          school_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          currency: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          max_staff: number | null
          max_storage_mb: number | null
          max_students: number | null
          name: string
          price_monthly: number
          price_yearly: number
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          max_staff?: number | null
          max_storage_mb?: number | null
          max_students?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          max_staff?: number | null
          max_storage_mb?: number | null
          max_students?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          priority: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          school_id: string
          status: string | null
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          priority?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          school_id: string
          status?: string | null
          subject: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          priority?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          school_id?: string
          status?: string | null
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_internal: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_internal?: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_internal?: boolean | null
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable: {
        Row: {
          class_id: string
          created_at: string | null
          day_of_week: number | null
          end_time: string
          id: string
          start_time: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          day_of_week?: number | null
          end_time: string
          id?: string
          start_time: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string
          id?: string
          start_time?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_analytics: {
        Row: {
          api_calls: number | null
          attendance_records: number | null
          created_at: string
          date: string
          fee_amount_collected: number | null
          fee_payments_count: number | null
          grades_entered: number | null
          id: string
          messages_sent: number | null
          notices_created: number | null
          school_id: string
          staff_added: number | null
          storage_added_mb: number | null
          students_added: number | null
          students_updated: number | null
          total_page_views: number | null
          unique_logins: number | null
        }
        Insert: {
          api_calls?: number | null
          attendance_records?: number | null
          created_at?: string
          date?: string
          fee_amount_collected?: number | null
          fee_payments_count?: number | null
          grades_entered?: number | null
          id?: string
          messages_sent?: number | null
          notices_created?: number | null
          school_id: string
          staff_added?: number | null
          storage_added_mb?: number | null
          students_added?: number | null
          students_updated?: number | null
          total_page_views?: number | null
          unique_logins?: number | null
        }
        Update: {
          api_calls?: number | null
          attendance_records?: number | null
          created_at?: string
          date?: string
          fee_amount_collected?: number | null
          fee_payments_count?: number | null
          grades_entered?: number | null
          id?: string
          messages_sent?: number | null
          notices_created?: number | null
          school_id?: string
          staff_added?: number | null
          storage_added_mb?: number | null
          students_added?: number | null
          students_updated?: number | null
          total_page_views?: number | null
          unique_logins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_analytics_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reports: {
        Row: {
          academic_rating: string | null
          attendance_summary: string | null
          behavior_rating: string | null
          class_id: string | null
          created_at: string | null
          director_summary: string | null
          id: string
          report_content: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string | null
          session: string
          status: string
          student_id: string | null
          submitted_at: string | null
          summary_sent_at: string | null
          teacher_comments: string | null
          teacher_id: string | null
          term: Database["public"]["Enums"]["term"]
          updated_at: string | null
          week_number: number
        }
        Insert: {
          academic_rating?: string | null
          attendance_summary?: string | null
          behavior_rating?: string | null
          class_id?: string | null
          created_at?: string | null
          director_summary?: string | null
          id?: string
          report_content: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          session: string
          status?: string
          student_id?: string | null
          submitted_at?: string | null
          summary_sent_at?: string | null
          teacher_comments?: string | null
          teacher_id?: string | null
          term: Database["public"]["Enums"]["term"]
          updated_at?: string | null
          week_number: number
        }
        Update: {
          academic_rating?: string | null
          attendance_summary?: string | null
          behavior_rating?: string | null
          class_id?: string | null
          created_at?: string | null
          director_summary?: string | null
          id?: string
          report_content?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          session?: string
          status?: string
          student_id?: string | null
          submitted_at?: string | null
          summary_sent_at?: string | null
          teacher_comments?: string | null
          teacher_id?: string | null
          term?: Database["public"]["Enums"]["term"]
          updated_at?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_reports_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_school_reg_number: {
        Args: { _school_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_school_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      setup_alumni_profile: {
        Args: {
          _graduation_class?: string
          _graduation_year: number
          _user_id: string
        }
        Returns: undefined
      }
      setup_parent_profile: {
        Args: { _student_identifiers: string[]; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "director"
        | "principal"
        | "headmaster"
        | "teacher"
        | "admin_staff"
        | "non_teaching_staff"
        | "parent"
        | "student"
        | "alumni"
        | "super_admin"
      class_level:
        | "nursery_1"
        | "nursery_2"
        | "nursery_3"
        | "primary_1"
        | "primary_2"
        | "primary_3"
        | "primary_4"
        | "primary_5"
        | "primary_6"
        | "jss_1"
        | "jss_2"
        | "jss_3"
        | "ss_1"
        | "ss_2"
        | "ss_3"
      gender: "male" | "female"
      notice_status: "draft" | "pending_approval" | "approved" | "published"
      staff_category: "academic" | "non_academic"
      term: "first" | "second" | "third"
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
      app_role: [
        "director",
        "principal",
        "headmaster",
        "teacher",
        "admin_staff",
        "non_teaching_staff",
        "parent",
        "student",
        "alumni",
        "super_admin",
      ],
      class_level: [
        "nursery_1",
        "nursery_2",
        "nursery_3",
        "primary_1",
        "primary_2",
        "primary_3",
        "primary_4",
        "primary_5",
        "primary_6",
        "jss_1",
        "jss_2",
        "jss_3",
        "ss_1",
        "ss_2",
        "ss_3",
      ],
      gender: ["male", "female"],
      notice_status: ["draft", "pending_approval", "approved", "published"],
      staff_category: ["academic", "non_academic"],
      term: ["first", "second", "third"],
    },
  },
} as const
