import { Alert, Button, Group, Modal, Select, Stack, TextInput, Textarea } from '@mantine/core';
import { type FormEvent, useState } from 'react';

import {
  type ClassroomView,
  useCreateClassroom,
  useMe,
  useUpdateClassroom,
  useUsers,
} from '../api/queries';
import { ADMIN_ROLE } from './AdminOnly';

/** Admins can give a classroom to another teacher. */
function OwnerSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const users = useUsers();
  const teachers = (users.data ?? [])
    .filter((u) => u.role !== 'student' && !u.disabled)
    .map((u) => ({ value: u.id, label: `${u.displayName} (${u.username})` }));
  return (
    <Select
      label="Teacher"
      data={teachers}
      value={value}
      onChange={(v) => v && onChange(v)}
      allowDeselect={false}
      searchable
    />
  );
}

function CreateForm({ onDone }: { onDone: (c: ClassroomView) => void }) {
  const create = useCreateClassroom();
  const [name, setName] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate({ name: name.trim() }, { onSuccess: onDone });
  };
  return (
    <form onSubmit={submit}>
      <Stack>
        <TextInput
          label="Name"
          description="For example: Class 1A, DevOps 2026"
          required
          data-autofocus
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        {create.isError && <Alert color="red">{create.error.message}</Alert>}
        <Group justify="flex-end">
          <Button type="submit" loading={create.isPending} disabled={name.trim() === ''}>
            Create
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function EditForm({ classroom, onDone }: { classroom: ClassroomView; onDone: () => void }) {
  const update = useUpdateClassroom(classroom.id);
  const me = useMe();
  const [name, setName] = useState(classroom.name);
  const [description, setDescription] = useState(classroom.description);
  const [owner, setOwner] = useState(classroom.ownerId);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.mutate(
      { name: name.trim(), description: description.trim(), ownerId: owner },
      { onSuccess: onDone },
    );
  };
  return (
    <form onSubmit={submit}>
      <Stack>
        <TextInput
          label="Name"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <Textarea
          label="Description"
          description="Shown to the members"
          autosize
          minRows={2}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
        />
        {me.data?.role === ADMIN_ROLE && <OwnerSelect value={owner} onChange={setOwner} />}
        {update.isError && <Alert color="red">{update.error.message}</Alert>}
        <Group justify="flex-end">
          <Button type="submit" loading={update.isPending}>
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Creates a classroom (no `classroom`), or edits one. */
export function ClassroomModal({
  classroom,
  onClose,
  onCreated,
}: {
  classroom?: ClassroomView;
  onClose: () => void;
  onCreated?: (c: ClassroomView) => void;
}) {
  return (
    <Modal
      opened
      onClose={onClose}
      title={classroom ? `Edit ${classroom.name}` : 'Create a classroom'}
      centered
    >
      {classroom ? (
        <EditForm classroom={classroom} onDone={onClose} />
      ) : (
        <CreateForm onDone={(c) => (onCreated ? onCreated(c) : onClose())} />
      )}
    </Modal>
  );
}
