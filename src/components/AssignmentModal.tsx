import { Alert, Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import dayjs from 'dayjs';
import { type FormEvent, useState } from 'react';

import { type AssignmentView, useChallenges, usePutAssignment } from '../api/queries';

/** The picker's local "YYYY-MM-DD HH:mm:ss" value of an ISO date, and back. */
const toPicker = (iso: string | null | undefined) =>
  iso ? dayjs(iso).format('YYYY-MM-DD HH:mm:ss') : null;
const toIso = (value: string | null) => (value ? dayjs(value).toISOString() : null);

/** Assigns a challenge to a classroom (no `assignment`), or changes its dates. */
export function AssignmentModal({
  classroomId,
  assignment,
  assigned,
  onClose,
}: {
  classroomId: string;
  assignment?: AssignmentView;
  /** Challenges already assigned, left out of the choices. */
  assigned: string[];
  onClose: () => void;
}) {
  const challenges = useChallenges();
  const put = usePutAssignment(classroomId);
  const [challenge, setChallenge] = useState<string | null>(assignment?.challenge ?? null);
  const [opensAt, setOpensAt] = useState<string | null>(toPicker(assignment?.opensAt));
  const [dueAt, setDueAt] = useState<string | null>(toPicker(assignment?.dueAt));

  const choices = (challenges.data ?? [])
    .filter((c) => c.name === assignment?.challenge || !assigned.includes(c.name))
    .map((c) => ({ value: c.name, label: c.title }));
  const backwards = !!opensAt && !!dueAt && !dayjs(opensAt).isBefore(dayjs(dueAt));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!challenge) {
      return;
    }
    put.mutate({ challenge, opensAt: toIso(opensAt), dueAt: toIso(dueAt) }, { onSuccess: onClose });
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={
        assignment ? `Dates of ${assignment.title ?? assignment.challenge}` : 'Assign a challenge'
      }
      centered
    >
      <form onSubmit={submit}>
        <Stack>
          {!assignment && (
            <Select
              label="Challenge"
              placeholder="Pick an installed challenge"
              data={choices}
              value={challenge}
              onChange={setChallenge}
              searchable
              required
              nothingFoundMessage="No other installed challenge"
            />
          )}
          <DateTimePicker
            label="Opens"
            description="Optional: shown to students as upcoming until then"
            placeholder="Now"
            clearable
            value={opensAt}
            onChange={setOpensAt}
          />
          <DateTimePicker
            label="Deadline"
            description="Optional: work after it still counts, and is marked late"
            placeholder="No deadline"
            clearable
            value={dueAt}
            onChange={setDueAt}
            error={backwards ? 'The deadline must come after the opening date' : undefined}
          />
          <Text size="xs" c="dimmed">
            Times are in your time zone.
          </Text>
          {put.isError && <Alert color="red">{put.error.message}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={put.isPending} disabled={!challenge || backwards}>
              {assignment ? 'Save' : 'Assign'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
