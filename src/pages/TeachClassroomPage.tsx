import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  Menu,
  Skeleton,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { IconDots, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';

import {
  type AssignmentView,
  type ClassroomDetail,
  type MemberView,
  useClassroom,
  useDeleteAssignment,
  useDeleteClassroom,
  useRemoveMember,
} from '../api/queries';
import { AssignmentModal } from '../components/AssignmentModal';
import { ClassroomModal } from '../components/ClassroomModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { InviteCard } from '../components/InviteCard';
import { PageHeader } from '../components/PageHeader';
import { ProgressGrid } from '../components/ProgressGrid';
import { TeacherOnly } from '../components/TeacherOnly';
import { formatDateTime, isPast } from '../dates';

function Assignments({ detail }: { detail: ClassroomDetail }) {
  const id = detail.classroom.id;
  const remove = useDeleteAssignment(id);
  const [editing, setEditing] = useState<AssignmentView | 'new' | null>(null);
  const [removing, setRemoving] = useState<AssignmentView | null>(null);
  const assigned = detail.assignments.map((a) => a.challenge);

  return (
    <Card withBorder padding="lg">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600}>Assignments</Text>
          <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setEditing('new')}>
            Assign a challenge
          </Button>
        </Group>
        {detail.assignments.length === 0 ? (
          <Text size="sm" c="dimmed">
            Nothing assigned yet. Students still see every installed challenge in the catalog.
          </Text>
        ) : (
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Challenge</Table.Th>
                <Table.Th>Opens</Table.Th>
                <Table.Th>Deadline</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {detail.assignments.map((a) => (
                <Table.Tr key={a.challenge}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {a.title ?? a.challenge}
                    </Text>
                    {!a.title && (
                      <Text size="xs" c="red">
                        No longer installed
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{a.opensAt ? formatDateTime(a.opensAt) : 'Now'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={isPast(a.dueAt) ? 'dimmed' : undefined}>
                      {a.dueAt ? formatDateTime(a.dueAt) : 'None'}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Menu position="bottom-end">
                      <Menu.Target>
                        <ActionIcon variant="subtle" aria-label={`Actions for ${a.challenge}`}>
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconPencil size={14} />}
                          onClick={() => setEditing(a)}
                        >
                          Change the dates
                        </Menu.Item>
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={14} />}
                          onClick={() => setRemoving(a)}
                        >
                          Remove
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
      {editing && (
        <AssignmentModal
          classroomId={id}
          assignment={editing === 'new' ? undefined : editing}
          assigned={assigned}
          onClose={() => setEditing(null)}
        />
      )}
      {removing && (
        <ConfirmModal
          opened
          title={`Remove ${removing.title ?? removing.challenge}`}
          confirmLabel="Remove the assignment"
          danger
          loading={remove.isPending}
          error={remove.error?.message}
          onClose={() => setRemoving(null)}
          onConfirm={() =>
            remove.mutate(removing.challenge, { onSuccess: () => setRemoving(null) })
          }
        >
          <Text size="sm">Students no longer see it in this classroom. Their scores are kept.</Text>
        </ConfirmModal>
      )}
    </Card>
  );
}

function Members({ detail }: { detail: ClassroomDetail }) {
  const remove = useRemoveMember(detail.classroom.id);
  const [removing, setRemoving] = useState<MemberView | null>(null);
  return (
    <Card withBorder padding="lg">
      <Stack gap="sm">
        <Text fw={600}>Members</Text>
        {detail.members.length === 0 ? (
          <Text size="sm" c="dimmed">
            Nobody yet: share the invite link.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={500}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Student</Table.Th>
                  <Table.Th>Joined</Table.Th>
                  <Table.Th>Last sign-in</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {detail.members.map((m) => (
                  <Table.Tr key={m.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {m.displayName}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {m.username}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatDateTime(m.joinedAt)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {m.lastLoginAt ? formatDateTime(m.lastLoginAt) : 'Never'}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label={`Remove ${m.username}`}
                        onClick={() => setRemoving(m)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>
      {removing && (
        <ConfirmModal
          opened
          title={`Remove ${removing.displayName}`}
          confirmLabel="Remove from the classroom"
          danger
          loading={remove.isPending}
          error={remove.error?.message}
          onClose={() => setRemoving(null)}
          onConfirm={() => remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
        >
          <Text size="sm">
            Their account and scores are kept. They can join again with the invite link while it is
            on.
          </Text>
        </ConfirmModal>
      )}
    </Card>
  );
}

/** One classroom, for its teacher: invite link, assignments and members. */
export function TeachClassroomPage() {
  const { id } = useParams({ from: '/teach/$id' });
  const detail = useClassroom(id);
  const remove = useDeleteClassroom(id);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <TeacherOnly>
      {detail.isError && <Alert color="red">{detail.error.message}</Alert>}
      {detail.isPending && <Skeleton h={300} />}
      {detail.data && (
        <Stack>
          <Group justify="space-between" align="flex-start">
            <PageHeader
              title={detail.data.classroom.name}
              description={detail.data.classroom.description || detail.data.classroom.ownerName}
            />
            <Group>
              <Button variant="default" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button variant="subtle" color="red" onClick={() => setDeleting(true)}>
                Delete
              </Button>
            </Group>
          </Group>
          <InviteCard classroom={detail.data.classroom} />
          <Tabs defaultValue="progress" keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="progress">Progress</Tabs.Tab>
              <Tabs.Tab value="assignments">
                Assignments ({detail.data.assignments.length})
              </Tabs.Tab>
              <Tabs.Tab value="members">Members ({detail.data.members.length})</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="progress">
              <ProgressGrid classroomId={id} />
            </Tabs.Panel>
            <Tabs.Panel value="assignments">
              <Assignments detail={detail.data} />
            </Tabs.Panel>
            <Tabs.Panel value="members">
              <Members detail={detail.data} />
            </Tabs.Panel>
          </Tabs>
          {editing && (
            <ClassroomModal classroom={detail.data.classroom} onClose={() => setEditing(false)} />
          )}
          <ConfirmModal
            opened={deleting}
            title={`Delete ${detail.data.classroom.name}`}
            confirmLabel="Delete the classroom"
            danger
            loading={remove.isPending}
            error={remove.error?.message}
            onClose={() => setDeleting(false)}
            onConfirm={() =>
              remove.mutate(undefined, { onSuccess: () => void navigate({ to: '/teach' }) })
            }
          >
            <Title order={6}>Members and assignments are removed.</Title>
            <Text size="sm">Student accounts and scores are kept.</Text>
          </ConfirmModal>
        </Stack>
      )}
    </TeacherOnly>
  );
}
