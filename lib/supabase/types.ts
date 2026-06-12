// Hand-written types mirroring supabase/migrations/0001-0004. Keep this in
// sync with the SQL schema; regenerate with `supabase gen types typescript`
// once a hosted project exists if these drift.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type HouseholdRole = 'owner' | 'admin' | 'member' | 'viewer';
export type InviteRole = 'admin' | 'member' | 'viewer';
export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type AssetTypeRow = 'vehicle' | 'property';
export type TaskTriggerTypeRow = 'time' | 'mileage' | 'time_or_mileage';
export type TaskPriorityRow = 'low' | 'medium' | 'high';
export type DocumentTypeRow = 'warranty' | 'manual' | 'insurance' | 'receipt' | 'other';
export type NotificationTypeRow = 'reminder' | 'due' | 'overdue';
export type NotificationStatusRow = 'pending' | 'sent' | 'snoozed' | 'cancelled' | 'completed';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          timezone: string;
          notification_lead_time_minutes: number;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          notification_lead_time_minutes?: number;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          notification_lead_time_minutes?: number;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      households: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          household_id: string;
          user_id: string;
          role: HouseholdRole;
          created_at: string;
        };
        Insert: {
          household_id: string;
          user_id: string;
          role: HouseholdRole;
          created_at?: string;
        };
        Update: {
          household_id?: string;
          user_id?: string;
          role?: HouseholdRole;
          created_at?: string;
        };
        Relationships: [];
      };
      household_invites: {
        Row: {
          id: string;
          household_id: string;
          email: string;
          role: InviteRole;
          invited_by: string;
          token: string;
          status: InviteStatus;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          email: string;
          role: InviteRole;
          invited_by: string;
          token?: string;
          status?: InviteStatus;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          email?: string;
          role?: InviteRole;
          invited_by?: string;
          token?: string;
          status?: InviteStatus;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      assets: {
        Row: {
          id: string;
          household_id: string;
          type: AssetTypeRow;
          name: string;
          details: Json;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          type: AssetTypeRow;
          name: string;
          details?: Json;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          type?: AssetTypeRow;
          name?: string;
          details?: Json;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      maintenance_tasks: {
        Row: {
          id: string;
          asset_id: string;
          title: string;
          category: string;
          trigger_type: TaskTriggerTypeRow;
          interval_months: number | null;
          interval_miles: number | null;
          last_completed_date: string;
          last_completed_mileage: number | null;
          due_soon_threshold_days: number;
          due_soon_threshold_miles: number;
          priority: TaskPriorityRow;
          assigned_member_id: string | null;
          notes: string | null;
          part_number: string | null;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          title: string;
          category?: string;
          trigger_type: TaskTriggerTypeRow;
          interval_months?: number | null;
          interval_miles?: number | null;
          last_completed_date: string;
          last_completed_mileage?: number | null;
          due_soon_threshold_days?: number;
          due_soon_threshold_miles?: number;
          priority?: TaskPriorityRow;
          assigned_member_id?: string | null;
          notes?: string | null;
          part_number?: string | null;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string;
          title?: string;
          category?: string;
          trigger_type?: TaskTriggerTypeRow;
          interval_months?: number | null;
          interval_miles?: number | null;
          last_completed_date?: string;
          last_completed_mileage?: number | null;
          due_soon_threshold_days?: number;
          due_soon_threshold_miles?: number;
          priority?: TaskPriorityRow;
          assigned_member_id?: string | null;
          notes?: string | null;
          part_number?: string | null;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_records: {
        Row: {
          id: string;
          task_id: string;
          asset_id: string;
          completed_date: string;
          completed_mileage: number | null;
          cost: number | null;
          vendor: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          asset_id: string;
          completed_date: string;
          completed_mileage?: number | null;
          cost?: number | null;
          vendor?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          asset_id?: string;
          completed_date?: string;
          completed_mileage?: number | null;
          cost?: number | null;
          vendor?: string | null;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          household_id: string;
          asset_id: string | null;
          service_record_id: string | null;
          type: DocumentTypeRow;
          title: string;
          storage_path: string;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          asset_id?: string | null;
          service_record_id?: string | null;
          type?: DocumentTypeRow;
          title: string;
          storage_path: string;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          asset_id?: string | null;
          service_record_id?: string | null;
          type?: DocumentTypeRow;
          title?: string;
          storage_path?: string;
          uploaded_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notification_schedules: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          type: NotificationTypeRow;
          scheduled_for: string;
          lead_time_minutes: number;
          status: NotificationStatusRow;
          snooze_until: string | null;
          expo_push_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          type: NotificationTypeRow;
          scheduled_for: string;
          lead_time_minutes?: number;
          status?: NotificationStatusRow;
          snooze_until?: string | null;
          expo_push_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          type?: NotificationTypeRow;
          scheduled_for?: string;
          lead_time_minutes?: number;
          status?: NotificationStatusRow;
          snooze_until?: string | null;
          expo_push_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_household_member: {
        Args: { target_household_id: string };
        Returns: boolean;
      };
      household_role: {
        Args: { target_household_id: string };
        Returns: string;
      };
      asset_household_id: {
        Args: { target_asset_id: string };
        Returns: string;
      };
    };
  };
}
