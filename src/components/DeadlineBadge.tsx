import { Badge, Group } from '@mantine/core';
import { IconCalendarDue } from '@tabler/icons-react';

import type { StudentAssignment } from '../api/queries';
import { formatDateTime, isPast } from '../dates';

/** Where a student stands on an assignment: opening date, deadline, solved, late (D58). */
export function DeadlineBadge({ assignment }: { assignment: StudentAssignment }) {
  const { opensAt, dueAt, done, late } = assignment;
  return (
    <Group gap={4}>
      {done && <Badge color="teal">Solved</Badge>}
      {late && (
        <Badge color="orange" variant="light">
          Late
        </Badge>
      )}
      {opensAt && !isPast(opensAt) && (
        <Badge color="gray" variant="light">
          Opens {formatDateTime(opensAt)}
        </Badge>
      )}
      {dueAt && !done && (
        <Badge
          color={isPast(dueAt) ? 'red' : 'yellow'}
          variant="light"
          leftSection={<IconCalendarDue size={12} />}
        >
          {isPast(dueAt) ? 'Overdue' : 'Due'} {formatDateTime(dueAt)}
        </Badge>
      )}
    </Group>
  );
}
