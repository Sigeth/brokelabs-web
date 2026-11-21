import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { IconDots, IconKey, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';

import { type UserView, useDeleteUser, useMe, useResetPassword, useUsers } from '../api/queries';
import { AdminOnly } from '../components/AdminOnly';
import { ConfirmModal } from '../components/ConfirmModal';
import { CreateUserModal } from '../components/CreateUserModal';
import { EditUserModal } from '../components/EditUserModal';
import { PageHeader } from '../components/PageHeader';
import { PasswordReveal } from '../components/PasswordReveal';
import { ROLE_LABELS } from '../roles';

type Action = { kind: 'edit' | 'reset' | 'delete'; user: UserView };

function ResetPasswordModal({ user, onClose }: { user: UserView; onClose: () => void }) {
  const reset = useResetPassword();
  if (reset.data) {
    return (
      <Modal opened onClose={onClose} title={`New password for ${user.username}`} centered>
        <Stack>
          <PasswordReveal username={user.username} password={reset.data} />
          <Group justify="flex-end">
            <Button onClick={onClose}>Done</Button>
          </Group>
        </Stack>
      </Modal>
    );
  }
  return (
    <ConfirmModal
      opened
      title={`Reset the password of ${user.username}`}
      confirmLabel="Reset the password"
      loading={reset.isPending}
      error={reset.error?.message}
      onClose={onClose}
      onConfirm={() => reset.mutate(user.id)}
    >
      <Text size="sm">
        A new password is generated and their current sessions end. The old password stops working.
      </Text>
    </ConfirmModal>
  );
}

function DeleteUserModal({ user, onClose }: { user: UserView; onClose: () => void }) {
  const remove = useDeleteUser();
  return (
    <ConfirmModal
      opened
      title={`Delete ${user.username}`}
      confirmLabel="Delete the account"
      danger
      loading={remove.isPending}
      error={remove.error?.message}
      onClose={onClose}
      onConfirm={() => remove.mutate(user.id, { onSuccess: onClose })}
    >
      <Text size="sm">
        Their progress and score ({user.score} pts) are deleted, and their running instance stops.
        To keep their history, disable the account instead.
      </Text>
    </ConfirmModal>
  );
}

function UserRow({
  user,
  self,
  onAction,
}: {
  user: UserView;
  self: boolean;
  onAction: (kind: Action['kind']) => void;
}) {
  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" fw={500}>
          {user.displayName}
        </Text>
        <Text size="xs" c="dimmed">
          {user.username}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap={4}>
          <Badge variant="light" color={user.role === 'student' ? 'gray' : undefined}>
            {ROLE_LABELS[user.role] ?? user.role}
          </Badge>
          {user.disabled && (
            <Badge variant="light" color="red">
              Disabled
            </Badge>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{user.score} pts</Text>
      </Table.Td>
      <Table.Td>
        <Menu position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle" aria-label={`Actions for ${user.username}`}>
              <IconDots size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => onAction('edit')}>
              Edit
            </Menu.Item>
            <Menu.Item leftSection={<IconKey size={14} />} onClick={() => onAction('reset')}>
              Reset the password
            </Menu.Item>
            {!self && (
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={() => onAction('delete')}
              >
                Delete
              </Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      </Table.Td>
    </Table.Tr>
  );
}

export function UsersPage() {
  const users = useUsers();
  const me = useMe();
  const [creating, setCreating] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const close = () => setAction(null);

  return (
    <AdminOnly>
      <Group justify="space-between" align="flex-start">
        <PageHeader title="Users" description="Accounts of this platform and their roles." />
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
          Create an account
        </Button>
      </Group>
      {users.isError && <Alert color="red">{users.error.message}</Alert>}
      {users.isPending && <Skeleton h={200} />}
      {users.data && (
        <Table.ScrollContainer minWidth={600}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Last sign-in</Table.Th>
                <Table.Th>Score</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.data.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  self={u.id === me.data?.id}
                  onAction={(kind) => setAction({ kind, user: u })}
                />
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      {creating && <CreateUserModal onClose={() => setCreating(false)} />}
      {action?.kind === 'edit' && (
        <EditUserModal user={action.user} self={action.user.id === me.data?.id} onClose={close} />
      )}
      {action?.kind === 'reset' && <ResetPasswordModal user={action.user} onClose={close} />}
      {action?.kind === 'delete' && <DeleteUserModal user={action.user} onClose={close} />}
    </AdminOnly>
  );
}
