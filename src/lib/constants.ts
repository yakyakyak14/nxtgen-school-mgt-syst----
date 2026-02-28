export const CLASS_LEVELS = {
  nursery: [
    { value: 'nursery_1', label: 'Nursery 1' },
    { value: 'nursery_2', label: 'Nursery 2' },
    { value: 'nursery_3', label: 'Nursery 3' },
  ],
  primary: [
    { value: 'primary_1', label: 'Primary 1' },
    { value: 'primary_2', label: 'Primary 2' },
    { value: 'primary_3', label: 'Primary 3' },
    { value: 'primary_4', label: 'Primary 4' },
    { value: 'primary_5', label: 'Primary 5' },
    { value: 'primary_6', label: 'Primary 6' },
  ],
  secondary: [
    { value: 'jss_1', label: 'JSS 1' },
    { value: 'jss_2', label: 'JSS 2' },
    { value: 'jss_3', label: 'JSS 3' },
    { value: 'ss_1', label: 'SS 1' },
    { value: 'ss_2', label: 'SS 2' },
    { value: 'ss_3', label: 'SS 3' },
  ],
} as const;

export const ALL_CLASS_LEVELS = [
  ...CLASS_LEVELS.nursery,
  ...CLASS_LEVELS.primary,
  ...CLASS_LEVELS.secondary,
];

export const NIGERIAN_GRADING_SYSTEM = [
  { grade: 'A', min: 75, max: 100, remark: 'Excellent' },
  { grade: 'B', min: 65, max: 74, remark: 'Very Good' },
  { grade: 'C', min: 55, max: 64, remark: 'Good' },
  { grade: 'D', min: 45, max: 54, remark: 'Pass' },
  { grade: 'E', min: 40, max: 44, remark: 'Fair' },
  { grade: 'F', min: 0, max: 39, remark: 'Fail' },
] as const;

export const getGrade = (score: number): { grade: string; remark: string } => {
  if (score >= 75) return { grade: 'A', remark: 'Excellent' };
  if (score >= 65) return { grade: 'B', remark: 'Very Good' };
  if (score >= 55) return { grade: 'C', remark: 'Good' };
  if (score >= 45) return { grade: 'D', remark: 'Pass' };
  if (score >= 40) return { grade: 'E', remark: 'Fair' };
  return { grade: 'F', remark: 'Fail' };
};

export const TERMS = [
  { value: 'first', label: 'First Term' },
  { value: 'second', label: 'Second Term' },
  { value: 'third', label: 'Third Term' },
] as const;

export const STAFF_CATEGORIES = [
  { value: 'academic', label: 'Academic Staff' },
  { value: 'non_academic', label: 'Non-Academic Staff' },
] as const;

export const USER_ROLES = [
  { value: 'super_admin', label: 'Super Admin', level: 0, description: 'Platform-wide administrator' },
  { value: 'director', label: 'Director', level: 1, description: 'Full school administrative access' },
  { value: 'principal', label: 'Principal', level: 2, description: 'Secondary school head' },
  { value: 'headmaster', label: 'Headmaster', level: 2, description: 'Primary school head' },
  { value: 'teacher', label: 'Teacher', level: 3, description: 'Academic staff member' },
  { value: 'admin_staff', label: 'Admin Staff', level: 4, description: 'Administrative support' },
  { value: 'non_teaching_staff', label: 'Non-Teaching Staff', level: 5, description: 'Support staff' },
  { value: 'parent', label: 'Parent/Guardian', level: 6, description: 'Student guardian' },
  { value: 'student', label: 'Student', level: 7, description: 'Student access' },
  { value: 'alumni', label: 'Alumni', level: 8, description: 'Former student access' },
] as const;

export const SCHOOL_LEVEL_ROLES = USER_ROLES.filter(r => 
  !['super_admin'].includes(r.value)
);

export const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
] as const;

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card Payment' },
  { value: 'cheque', label: 'Cheque' },
] as const;

export const BLOOD_GROUPS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
] as const;
