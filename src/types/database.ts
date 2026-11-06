export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          theme: 'light' | 'dark' | 'system';
          timezone: string;
          date_format: string;
          time_format: '12h' | '24h';
          pomodoro_work_duration: number;
          pomodoro_short_break: number;
          pomodoro_long_break: number;
          pomodoro_long_break_interval: number;
          notify_task_deadlines: boolean;
          notify_calendar_reminders: boolean;
          notify_academic_classes: boolean;
          sound_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: 'light' | 'dark' | 'system';
          timezone?: string;
          date_format?: string;
          time_format?: '12h' | '24h';
          pomodoro_work_duration?: number;
          pomodoro_short_break?: number;
          pomodoro_long_break?: number;
          pomodoro_long_break_interval?: number;
          notify_task_deadlines?: boolean;
          notify_calendar_reminders?: boolean;
          notify_academic_classes?: boolean;
          sound_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme?: 'light' | 'dark' | 'system';
          timezone?: string;
          date_format?: string;
          time_format?: '12h' | '24h';
          pomodoro_work_duration?: number;
          pomodoro_short_break?: number;
          pomodoro_long_break?: number;
          pomodoro_long_break_interval?: number;
          notify_task_deadlines?: boolean;
          notify_calendar_reminders?: boolean;
          notify_academic_classes?: boolean;
          sound_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          icon: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string | null;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string | null;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          category_id: string | null;
          start_date: string | null;
          due_date: string | null;
          is_recurring: boolean;
          recurrence_rule: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          category_id?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          is_recurring?: boolean;
          recurrence_rule?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          category_id?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          is_recurring?: boolean;
          recurrence_rule?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'task_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      task_subtasks: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          title: string;
          is_completed: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          title: string;
          is_completed?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          title?: string;
          is_completed?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_subtasks_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      task_tags: {
        Row: {
          task_id: string;
          tag_id: string;
          user_id: string;
        };
        Insert: {
          task_id: string;
          tag_id: string;
          user_id: string;
        };
        Update: {
          task_id?: string;
          tag_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_tags_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
        ];
      };
      pomodoro_sessions: {
        Row: {
          id: string;
          user_id: string;
          task_id: string | null;
          duration_minutes: number;
          actual_seconds: number;
          type: 'focus' | 'short_break' | 'long_break';
          status: 'completed' | 'cancelled' | 'in_progress';
          notes: string | null;
          started_at: string;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id?: string | null;
          duration_minutes: number;
          actual_seconds?: number;
          type?: 'focus' | 'short_break' | 'long_break';
          status?: 'completed' | 'cancelled' | 'in_progress';
          notes?: string | null;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string | null;
          duration_minutes?: number;
          actual_seconds?: number;
          type?: 'focus' | 'short_break' | 'long_break';
          status?: 'completed' | 'cancelled' | 'in_progress';
          notes?: string | null;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pomodoro_sessions_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          event_type: 'academic' | 'exam' | 'personal' | 'travel' | 'holiday' | 'other';
          start_time: string;
          end_time: string;
          is_all_day: boolean;
          location: string | null;
          color: string | null;
          recurrence_rule: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          event_type?: 'academic' | 'exam' | 'personal' | 'travel' | 'holiday' | 'other';
          start_time: string;
          end_time: string;
          is_all_day?: boolean;
          location?: string | null;
          color?: string | null;
          recurrence_rule?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          event_type?: 'academic' | 'exam' | 'personal' | 'travel' | 'holiday' | 'other';
          start_time?: string;
          end_time?: string;
          is_all_day?: boolean;
          location?: string | null;
          color?: string | null;
          recurrence_rule?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          event_id: string | null;
          task_id: string | null;
          title: string;
          remind_at: string;
          is_dismissed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id?: string | null;
          task_id?: string | null;
          title: string;
          remind_at: string;
          is_dismissed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string | null;
          task_id?: string | null;
          title?: string;
          remind_at?: string;
          is_dismissed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reminders_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'calendar_events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reminders_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: 'system' | 'task' | 'reminder' | 'academic' | 'pomodoro';
          link: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: 'system' | 'task' | 'reminder' | 'academic' | 'pomodoro';
          link?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: 'system' | 'task' | 'reminder' | 'academic' | 'pomodoro';
          link?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      academic_years: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_current: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_current?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          is_current?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      semesters: {
        Row: {
          id: string;
          user_id: string;
          academic_year_id: string | null;
          name: string;
          start_date: string;
          end_date: string;
          is_current: boolean;
          target_attendance_percentage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          academic_year_id?: string | null;
          name: string;
          start_date: string;
          end_date: string;
          is_current?: boolean;
          target_attendance_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          academic_year_id?: string | null;
          name?: string;
          start_date?: string;
          end_date?: string;
          is_current?: boolean;
          target_attendance_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'semesters_academic_year_id_fkey';
            columns: ['academic_year_id'];
            isOneToOne: false;
            referencedRelation: 'academic_years';
            referencedColumns: ['id'];
          },
        ];
      };
      subjects: {
        Row: {
          id: string;
          user_id: string;
          semester_id: string | null;
          name: string;
          code: string | null;
          instructor: string | null;
          credits: number;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          semester_id?: string | null;
          name: string;
          code?: string | null;
          instructor?: string | null;
          credits?: number;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          semester_id?: string | null;
          name?: string;
          code?: string | null;
          instructor?: string | null;
          credits?: number;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subjects_semester_id_fkey';
            columns: ['semester_id'];
            isOneToOne: false;
            referencedRelation: 'semesters';
            referencedColumns: ['id'];
          },
        ];
      };
      timetable_entries: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          classroom: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          classroom?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          classroom?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'timetable_entries_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      class_sessions: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          timetable_entry_id: string | null;
          session_date: string;
          start_time: string | null;
          end_time: string | null;
          status: 'present' | 'absent' | 'cancelled' | 'no_class';
          topic_covered: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          timetable_entry_id?: string | null;
          session_date: string;
          start_time?: string | null;
          end_time?: string | null;
          status?: 'present' | 'absent' | 'cancelled' | 'no_class';
          topic_covered?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string;
          timetable_entry_id?: string | null;
          session_date?: string;
          start_time?: string | null;
          end_time?: string | null;
          status?: 'present' | 'absent' | 'cancelled' | 'no_class';
          topic_covered?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_sessions_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_sessions_timetable_entry_id_fkey';
            columns: ['timetable_entry_id'];
            isOneToOne: false;
            referencedRelation: 'timetable_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      assignments: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string | null;
          title: string;
          description: string | null;
          due_date: string;
          status: 'pending' | 'submitted' | 'graded' | 'late';
          max_marks: number | null;
          obtained_marks: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id?: string | null;
          title: string;
          description?: string | null;
          due_date: string;
          status?: 'pending' | 'submitted' | 'graded' | 'late';
          max_marks?: number | null;
          obtained_marks?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string | null;
          title?: string;
          description?: string | null;
          due_date?: string;
          status?: 'pending' | 'submitted' | 'graded' | 'late';
          max_marks?: number | null;
          obtained_marks?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assignments_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      examinations: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string | null;
          title: string;
          exam_date: string;
          classroom: string | null;
          max_marks: number | null;
          obtained_marks: number | null;
          weightage_percentage: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id?: string | null;
          title: string;
          exam_date: string;
          classroom?: string | null;
          max_marks?: number | null;
          obtained_marks?: number | null;
          weightage_percentage?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string | null;
          title?: string;
          exam_date?: string;
          classroom?: string | null;
          max_marks?: number | null;
          obtained_marks?: number | null;
          weightage_percentage?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'examinations_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      syllabus_topics: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          unit_number: number;
          title: string;
          is_completed: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          unit_number?: number;
          title: string;
          is_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string;
          unit_number?: number;
          title?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'syllabus_topics_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          frequency: 'daily' | 'weekly' | 'custom';
          target_days_per_week: number;
          color: string | null;
          icon: string | null;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          frequency?: 'daily' | 'weekly' | 'custom';
          target_days_per_week?: number;
          color?: string | null;
          icon?: string | null;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          frequency?: 'daily' | 'weekly' | 'custom';
          target_days_per_week?: number;
          color?: string | null;
          icon?: string | null;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      habit_logs: {
        Row: {
          id: string;
          user_id: string;
          habit_id: string;
          completed_date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          habit_id: string;
          completed_date: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          habit_id?: string;
          completed_date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'habit_logs_habit_id_fkey';
            columns: ['habit_id'];
            isOneToOne: false;
            referencedRelation: 'habits';
            referencedColumns: ['id'];
          },
        ];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: 'academic' | 'career' | 'health' | 'financial' | 'personal';
          target_date: string | null;
          status: 'in_progress' | 'completed' | 'paused' | 'abandoned';
          progress_percentage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          category?: 'academic' | 'career' | 'health' | 'financial' | 'personal';
          target_date?: string | null;
          status?: 'in_progress' | 'completed' | 'paused' | 'abandoned';
          progress_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          category?: 'academic' | 'career' | 'health' | 'financial' | 'personal';
          target_date?: string | null;
          status?: 'in_progress' | 'completed' | 'paused' | 'abandoned';
          progress_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      journeys: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          transport_type: 'train' | 'flight' | 'bus' | 'car' | 'other';
          origin: string;
          destination: string;
          departure_time: string;
          arrival_time: string | null;
          booking_reference: string | null;
          carrier_name: string | null;
          seat_number: string | null;
          status: 'booked' | 'confirmed' | 'completed' | 'cancelled';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          transport_type?: 'train' | 'flight' | 'bus' | 'car' | 'other';
          origin: string;
          destination: string;
          departure_time: string;
          arrival_time?: string | null;
          booking_reference?: string | null;
          carrier_name?: string | null;
          seat_number?: string | null;
          status?: 'booked' | 'confirmed' | 'completed' | 'cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          transport_type?: 'train' | 'flight' | 'bus' | 'car' | 'other';
          origin?: string;
          destination?: string;
          departure_time?: string;
          arrival_time?: string | null;
          booking_reference?: string | null;
          carrier_name?: string | null;
          seat_number?: string | null;
          status?: 'booked' | 'confirmed' | 'completed' | 'cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      books: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          author: string;
          isbn: string | null;
          status: 'want_to_read' | 'reading' | 'completed' | 'abandoned';
          total_pages: number;
          current_page: number;
          rating: number | null;
          cover_url: string | null;
          review: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          author: string;
          isbn?: string | null;
          status?: 'want_to_read' | 'reading' | 'completed' | 'abandoned';
          total_pages?: number;
          current_page?: number;
          rating?: number | null;
          cover_url?: string | null;
          review?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          author?: string;
          isbn?: string | null;
          status?: 'want_to_read' | 'reading' | 'completed' | 'abandoned';
          total_pages?: number;
          current_page?: number;
          rating?: number | null;
          cover_url?: string | null;
          review?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      media_items: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          type: 'movie' | 'series' | 'anime' | 'documentary';
          status: 'plan_to_watch' | 'watching' | 'completed' | 'dropped';
          total_episodes: number;
          watched_episodes: number;
          rating: number | null;
          release_year: number | null;
          review: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          type?: 'movie' | 'series' | 'anime' | 'documentary';
          status?: 'plan_to_watch' | 'watching' | 'completed' | 'dropped';
          total_episodes?: number;
          watched_episodes?: number;
          rating?: number | null;
          release_year?: number | null;
          review?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          type?: 'movie' | 'series' | 'anime' | 'documentary';
          status?: 'plan_to_watch' | 'watching' | 'completed' | 'dropped';
          total_episodes?: number;
          watched_episodes?: number;
          rating?: number | null;
          release_year?: number | null;
          review?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          category: string;
          is_pinned: boolean;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content?: string;
          category?: string;
          is_pinned?: boolean;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          category?: string;
          is_pinned?: boolean;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          file_path: string;
          file_size_bytes: number;
          mime_type: string;
          category: 'academic' | 'identity' | 'travel' | 'financial' | 'medical' | 'general';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          file_path: string;
          file_size_bytes?: number;
          mime_type?: string;
          category?: 'academic' | 'identity' | 'travel' | 'financial' | 'medical' | 'general';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          file_path?: string;
          file_size_bytes?: number;
          mime_type?: string;
          category?: 'academic' | 'identity' | 'travel' | 'financial' | 'medical' | 'general';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      integration_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: 'expense_manager' | 'calendar_sync' | 'custom';
          api_endpoint: string | null;
          status: 'connected' | 'disconnected' | 'error' | 'syncing';
          last_sync_at: string | null;
          last_error: string | null;
          cached_monthly_spend: number;
          cached_currency: string;
          cached_category_breakdown: Record<string, number>;
          cached_recent_transactions: Array<{
            id: string;
            date: string;
            description: string;
            category: string;
            amount: number;
            type: 'expense' | 'income';
          }>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider?: 'expense_manager' | 'calendar_sync' | 'custom';
          api_endpoint?: string | null;
          status?: 'connected' | 'disconnected' | 'error' | 'syncing';
          last_sync_at?: string | null;
          last_error?: string | null;
          cached_monthly_spend?: number;
          cached_currency?: string;
          cached_category_breakdown?: Record<string, number>;
          cached_recent_transactions?: Array<{
            id: string;
            date: string;
            description: string;
            category: string;
            amount: number;
            type: 'expense' | 'income';
          }>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: 'expense_manager' | 'calendar_sync' | 'custom';
          api_endpoint?: string | null;
          status?: 'connected' | 'disconnected' | 'error' | 'syncing';
          last_sync_at?: string | null;
          last_error?: string | null;
          cached_monthly_spend?: number;
          cached_currency?: string;
          cached_category_breakdown?: Record<string, number>;
          cached_recent_transactions?: Array<{
            id: string;
            date: string;
            description: string;
            category: string;
            amount: number;
            type: 'expense' | 'income';
          }>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];      };
      finance_accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          institution: string;
          kind: 'bank' | 'wallet' | 'credit_card' | 'pay_later';
          masked_suffix: string;
          balance: number;
          credit_limit: number | null;
          billing_day: number | null;
          due_day: number | null;
          accent: string;
          active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          institution: string;
          kind: 'bank' | 'wallet' | 'credit_card' | 'pay_later';
          masked_suffix?: string;
          balance?: number;
          credit_limit?: number | null;
          billing_day?: number | null;
          due_day?: number | null;
          accent?: string;
          active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          institution?: string;
          kind?: 'bank' | 'wallet' | 'credit_card' | 'pay_later';
          masked_suffix?: string;
          balance?: number;
          credit_limit?: number | null;
          billing_day?: number | null;
          due_day?: number | null;
          accent?: string;
          active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      finance_transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          to_account_id: string | null;
          amount: number;
          currency: string;
          kind: 'expense' | 'income' | 'transfer' | 'bill_payment' | 'refund';
          category: string;
          description: string;
          merchant: string | null;
          occurred_on: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          to_account_id?: string | null;
          amount: number;
          currency?: string;
          kind: 'expense' | 'income' | 'transfer' | 'bill_payment' | 'refund';
          category?: string;
          description: string;
          merchant?: string | null;
          occurred_on?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string | null;
          to_account_id?: string | null;
          amount?: number;
          currency?: string;
          kind?: 'expense' | 'income' | 'transfer' | 'bill_payment' | 'refund';
          category?: string;
          description?: string;
          merchant?: string | null;
          occurred_on?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      finance_bills: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          name: string;
          amount: number;
          due_date: string;
          frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
          status: 'pending' | 'paid' | 'overdue';
          category: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          name: string;
          amount: number;
          due_date: string;
          frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
          status?: 'pending' | 'paid' | 'overdue';
          category?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string | null;
          name?: string;
          amount?: number;
          due_date?: string;
          frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
          status?: 'pending' | 'paid' | 'overdue';
          category?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      finance_fixed_deposits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          institution: string;
          principal: number;
          interest_rate: number;
          opening_date: string;
          maturity_date: string;
          maturity_amount: number;
          payout_method: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          institution: string;
          principal: number;
          interest_rate: number;
          opening_date?: string;
          maturity_date: string;
          maturity_amount: number;
          payout_method?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          institution?: string;
          principal?: number;
          interest_rate?: number;
          opening_date?: string;
          maturity_date?: string;
          maturity_amount?: number;
          payout_method?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      finance_loans: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          lender: string;
          principal: number;
          outstanding: number;
          interest_rate: number | null;
          monthly_emi: number;
          total_emis: number;
          remaining_emis: number;
          due_day: number;
          disbursed_on: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          lender: string;
          principal: number;
          outstanding: number;
          interest_rate?: number | null;
          monthly_emi: number;
          total_emis: number;
          remaining_emis: number;
          due_day?: number;
          disbursed_on?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          lender?: string;
          principal?: number;
          outstanding?: number;
          interest_rate?: number | null;
          monthly_emi?: number;
          total_emis?: number;
          remaining_emis?: number;
          due_day?: number;
          disbursed_on?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
