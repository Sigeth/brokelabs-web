import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Skeleton,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconDots, IconDownload, IconPlayerStop, IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';

import {
  type ClassroomProgress,
  type ProgressCell,
  type RunningInstance,
  type StudentProgress,
  progressCsvUrl,
  useProgress,
  useResetInstance,
  useStopStudentInstance,
} from '../api/queries';
import { formatDateTime } from '../dates';
import { PhaseBadge } from './Badges';
import { ConfirmModal } from './ConfirmModal';

/** One student on one assignment: not started, in progress, done, late. */
function Cell({ cell, tasks, points }: { cell: ProgressCell; tasks: number; points: number }) {
  if (cell.solvedTasks === 0) {
    return (
      <Text size="sm" c="dimmed">
        –
      </Text>
    );
  }
  return (
    <Tooltip
      label={`${cell.solvedPoints}/${points} pts${
        cell.lastSolvedAt ? ` · last solve ${formatDateTime(cell.lastSolvedAt)}` : ''
      }`}
    >
      <Group gap={4} wrap="nowrap">
        {cell.done ? (
          <Badge color="teal">Done</Badge>
        ) : (
          <Badge color="yellow" variant="light">
            {cell.solvedTasks}/{tasks}
          </Badge>
        )}
        {cell.late && (
          <Badge color="orange" variant="light">
            Late
          </Badge>
        )}
      </Group>
    </Tooltip>
  );
}

type Action = { kind: 'reset' | 'stop'; student: StudentProgress; instance: RunningInstance };

function InstanceCell({
  student,
  titles,
  onAction,
}: {
  student: StudentProgress;
  titles: Map<string, string>;
  onAction: (a: Action) => void;
}) {
  if (student.instances.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        None
      </Text>
    );
  }
  return (
    <Stack gap={4}>
      {student.instances.map((i) => (
        <Group key={i.id} gap="xs" wrap="nowrap">
          <PhaseBadge phase={i.phase} />
          <Text size="sm" truncate>
            {titles.get(i.challenge) ?? i.challenge}
          </Text>
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" aria-label={`Instance of ${student.username}`}>
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconRefresh size={14} />}
                onClick={() => onAction({ kind: 'reset', student, instance: i })}
              >
                Reset
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconPlayerStop size={14} />}
                onClick={() => onAction({ kind: 'stop', student, instance: i })}
              >
                Stop
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      ))}
    </Stack>
  );
}

function ActionModal({
  classroomId,
  action,
  onClose,
}: {
  classroomId: string;
  action: Action;
  onClose: () => void;
}) {
  const reset = useResetInstance(classroomId);
  const stop = useStopStudentInstance(classroomId);
  const mutation = action.kind === 'reset' ? reset : stop;
  const target = { user: action.student.id, instance: action.instance.id };
  return (
    <ConfirmModal
      opened
      title={`${action.kind === 'reset' ? 'Reset' : 'Stop'} the instance of ${action.student.displayName}`}
      confirmLabel={action.kind === 'reset' ? 'Reset' : 'Stop'}
      danger
      loading={mutation.isPending}
      error={mutation.error?.message}
      onClose={onClose}
      onConfirm={() =>
        action.kind === 'reset'
          ? reset.mutate(target, { onSuccess: onClose })
          : stop.mutate(target, { onSuccess: onClose })
      }
    >
      <Text size="sm">
        {action.kind === 'reset'
          ? 'Everything in the instance is lost, and a fresh one of the same challenge starts for the student.'
          : 'Everything in the instance is lost.'}{' '}
        Their score is kept.
      </Text>
    </ConfirmModal>
  );
}

function Grid({ classroomId, progress }: { classroomId: string; progress: ClassroomProgress }) {
  const [action, setAction] = useState<Action | null>(null);
  const titles = new Map(progress.assignments.map((a) => [a.challenge, a.title ?? a.challenge]));
  const total = progress.assignments.reduce((n, a) => n + a.points, 0);

  if (progress.students.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Nobody joined yet: share the invite link.
      </Text>
    );
  }
  return (
    <>
      <Table.ScrollContainer minWidth={400 + 140 * progress.assignments.length}>
        <Table verticalSpacing="sm" highlightOnHover stickyHeader>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Student</Table.Th>
              {progress.assignments.map((a) => (
                <Table.Th key={a.challenge}>
                  <Text size="sm" fw={600}>
                    {a.title ?? a.challenge}
                  </Text>
                  {a.dueAt && (
                    <Text size="xs" c="dimmed">
                      Due {formatDateTime(a.dueAt)}
                    </Text>
                  )}
                </Table.Th>
              ))}
              <Table.Th>Points</Table.Th>
              <Table.Th>Running instance</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {progress.students.map((s) => (
              <Table.Tr key={s.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {s.displayName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {s.username}
                  </Text>
                </Table.Td>
                {progress.assignments.map((a, i) => (
                  <Table.Td key={a.challenge}>
                    <Cell cell={s.cells[i]} tasks={a.tasks} points={a.points} />
                  </Table.Td>
                ))}
                <Table.Td>
                  <Text size="sm">
                    {s.points}/{total}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <InstanceCell student={s} titles={titles} onAction={setAction} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {action && (
        <ActionModal classroomId={classroomId} action={action} onClose={() => setAction(null)} />
      )}
    </>
  );
}

/** Students × assignments of a classroom, with their running instances and a CSV export. */
export function ProgressGrid({ classroomId }: { classroomId: string }) {
  const progress = useProgress(classroomId);
  return (
    <Card withBorder padding="lg">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600}>Progress</Text>
          <Button
            component="a"
            href={progressCsvUrl(classroomId)}
            download
            size="xs"
            variant="default"
            leftSection={<IconDownload size={14} />}
          >
            Export CSV
          </Button>
        </Group>
        {progress.isError && <Alert color="red">{progress.error.message}</Alert>}
        {progress.isPending && <Skeleton h={120} />}
        {progress.data && <Grid classroomId={classroomId} progress={progress.data} />}
      </Stack>
    </Card>
  );
}
