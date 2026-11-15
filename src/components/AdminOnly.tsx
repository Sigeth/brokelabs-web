import { Alert } from '@mantine/core';
import type { ReactNode } from 'react';

import { useMe } from '../api/queries';

/** The admin role, which manages the marketplace. */
export const ADMIN_ROLE = 'admin';

/** Shows its content to admins only. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const me = useMe();
  if (me.data?.role !== ADMIN_ROLE) {
    return <Alert color="gray">Only administrators can see this page.</Alert>;
  }
  return <>{children}</>;
}
