import { Alert, Button, Group, Modal, Select, Stack, TextInput } from '@mantine/core';
import { type FormEvent, useState } from 'react';

import { type UserView, useCreateUser } from '../api/queries';
import { ROLE_OPTIONS } from '../roles';
import { PasswordReveal } from './PasswordReveal';

/** Creates an account, then shows its generated password once. */
export function CreateUserModal({ onClose }: { onClose: () => void }) {
  const create = useCreateUser();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('student');
  const [created, setCreated] = useState<{ user: UserView; password: string } | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(
      { username: username.trim(), displayName: displayName.trim() || null, role },
      { onSuccess: setCreated },
    );
  };

  return (
    <Modal opened onClose={onClose} title="Create an account" centered>
      {created ? (
        <Stack>
          <PasswordReveal username={created.user.username} password={created.password} />
          <Group justify="flex-end">
            <Button onClick={onClose}>Done</Button>
          </Group>
        </Stack>
      ) : (
        <form onSubmit={submit}>
          <Stack>
            <TextInput
              label="Username"
              description="Lowercase letters, digits, '.', '_' or '-'"
              required
              data-autofocus
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
            />
            <TextInput
              label="Display name"
              description="Optional: the username otherwise"
              value={displayName}
              onChange={(e) => setDisplayName(e.currentTarget.value)}
            />
            <Select
              label="Role"
              data={ROLE_OPTIONS}
              value={role}
              onChange={(v) => setRole(v ?? 'student')}
              allowDeselect={false}
            />
            {create.isError && <Alert color="red">{create.error.message}</Alert>}
            <Group justify="flex-end">
              <Button variant="default" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={create.isPending} disabled={username.trim() === ''}>
                Create
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  );
}
