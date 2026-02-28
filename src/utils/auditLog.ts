import { supabase } from '@/integrations/supabase/client';

interface AuditLogData {
  schoolId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
}

export const logAuditEvent = async (data: AuditLogData) => {
  try {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        school_id: data.schoolId || null,
        user_id: userId || null,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId || null,
        old_values: data.oldValues || null,
        new_values: data.newValues || null,
        metadata: data.metadata || {},
      });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (err) {
    console.error('Audit logging error:', err);
  }
};

// Common audit actions
export const AuditActions = {
  // Auth
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  
  // Users
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  USER_INVITE: 'user_invite',
  USER_ROLE_CHANGE: 'user_role_change',
  
  // Students
  STUDENT_CREATE: 'student_create',
  STUDENT_UPDATE: 'student_update',
  STUDENT_DELETE: 'student_delete',
  STUDENT_ENROLL: 'student_enroll',
  STUDENT_PROMOTE: 'student_promote',
  
  // Staff
  STAFF_CREATE: 'staff_create',
  STAFF_UPDATE: 'staff_update',
  STAFF_DELETE: 'staff_delete',
  
  // Fees
  FEE_PAYMENT: 'fee_payment',
  FEE_TYPE_CREATE: 'fee_type_create',
  FEE_TYPE_UPDATE: 'fee_type_update',
  
  // Grades
  GRADE_ENTRY: 'grade_entry',
  GRADE_UPDATE: 'grade_update',
  
  // School
  SCHOOL_CREATE: 'school_create',
  SCHOOL_UPDATE: 'school_update',
  SCHOOL_STATUS_CHANGE: 'school_status_change',
  
  // Settings
  SETTINGS_UPDATE: 'settings_update',
  FEATURE_TOGGLE: 'feature_toggle',
  
  // Announcements
  ANNOUNCEMENT_CREATE: 'announcement_create',
  ANNOUNCEMENT_UPDATE: 'announcement_update',
  ANNOUNCEMENT_DELETE: 'announcement_delete',
};

export const EntityTypes = {
  USER: 'user',
  STUDENT: 'student',
  STAFF: 'staff',
  CLASS: 'class',
  FEE_PAYMENT: 'fee_payment',
  FEE_TYPE: 'fee_type',
  GRADE: 'grade',
  SCHOOL: 'school',
  ANNOUNCEMENT: 'announcement',
  INVITATION: 'invitation',
  SETTINGS: 'settings',
  FEATURE: 'feature',
};
