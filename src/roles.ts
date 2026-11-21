/** Roles of the api (D55): admins can also do everything teachers do. */
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  teacher: 'Teacher',
  student: 'Student',
};

/** Choices for a role select, most common first. */
export const ROLE_OPTIONS = [
  { value: 'student', label: ROLE_LABELS.student },
  { value: 'teacher', label: ROLE_LABELS.teacher },
  { value: 'admin', label: ROLE_LABELS.admin },
];
