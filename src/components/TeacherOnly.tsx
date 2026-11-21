import { Alert } from '@mantine/core';
import type { ReactNode } from 'react';

import { useMe } from '../api/queries';
import { ADMIN_ROLE } from './AdminOnly';

/** The teacher role, which runs classrooms (admins can too, D55). */
export const TEACHER_ROLE = 'teacher';

/** True for roles that run classrooms. */
export function canTeach(role: string | undefined): boolean {
  return role === TEACHER_ROLE || role === ADMIN_ROLE;
}

/** Shows its content to teachers and admins only. */
export function TeacherOnly({ children }: { children: ReactNode }) {
  const me = useMe();
  if (!canTeach(me.data?.role)) {
    return <Alert color="gray">Only teachers can see this page.</Alert>;
  }
  return <>{children}</>;
}
