import { Alert, Button, Group, Modal, Select, Stack, Switch, TextInput } from '@mantine/core';
import { type FormEvent, useState } from 'react';

import { type UserView, useUpdateUser } from '../api/queries';
import { ROLE_OPTIONS } from '../roles';

/** Changes a user's display name, role and state. */
export function EditUserModal({
  user,
  self,
  onClose,
}: {
  user: UserView;
  /** The signed-in admin: they cannot change their own role or disable themselves. */
  self: boolean;
  onClose: () => void;
}) {
  const update = useUpdateUser();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [role, setRole] = useState(user.role);
  const [disabled, setDisabled] = useState(user.disabled);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.mutate(
      { id: user.id, change: { displayName: displayName.trim(), role, disabled } },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal opened onClose={onClose} title={`Edit ${user.username}`} centered>
      <form onSubmit={submit}>
        <Stack>
          <TextInput
            label="Display name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.currentTarget.value)}
          />
          <Select
            label="Role"
            data={ROLE_OPTIONS}
            value={role}
            onChange={(v) => setRole(v ?? user.role)}
            allowDeselect={false}
            disabled={self}
          />
          <Switch
            label="Disabled"
            description="A disabled user cannot sign in, and their running instance stops."
            checked={disabled}
            onChange={(e) => setDisabled(e.currentTarget.checked)}
            disabled={self}
          />
          {update.isError && <Alert color="red">{update.error.message}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={update.isPending}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
