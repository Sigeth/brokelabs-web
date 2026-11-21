import {
  ActionIcon,
  Button,
  Card,
  Code,
  CopyButton,
  Group,
  Stack,
  Switch,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconCheck, IconCopy, IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';

import { type ClassroomView, useRotateInvite, useUpdateClassroom } from '../api/queries';
import { ConfirmModal } from './ConfirmModal';

/** The invite link of a classroom (D55): copy it, turn it on or off, replace it. */
export function InviteCard({ classroom }: { classroom: ClassroomView }) {
  const update = useUpdateClassroom(classroom.id);
  const rotate = useRotateInvite(classroom.id);
  const [confirming, setConfirming] = useState(false);
  const link = `${globalThis.location?.origin ?? ''}/join/${classroom.inviteCode}`;

  return (
    <Card withBorder padding="lg">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600}>Invite link</Text>
          <Switch
            label={classroom.inviteEnabled ? 'On' : 'Off'}
            checked={classroom.inviteEnabled}
            disabled={update.isPending}
            onChange={(e) => update.mutate({ inviteEnabled: e.currentTarget.checked })}
          />
        </Group>
        <Text size="sm" c="dimmed">
          Share it with your students: opening it creates their account (or signs them in) and adds
          them to this classroom. They can also type the code {classroom.inviteCode}.
        </Text>
        <Group gap="xs" wrap="nowrap">
          <Code fz="sm" c={classroom.inviteEnabled ? undefined : 'dimmed'}>
            {link}
          </Code>
          <CopyButton value={link}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy the link'}>
                <ActionIcon variant="subtle" onClick={copy} aria-label="Copy the invite link">
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
        {!classroom.inviteEnabled && (
          <Text size="sm" c="orange">
            The link is off: nobody can join with it. Members stay in the classroom.
          </Text>
        )}
        <Group>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={() => setConfirming(true)}
          >
            Replace the link
          </Button>
        </Group>
      </Stack>
      <ConfirmModal
        opened={confirming}
        title="Replace the invite link"
        confirmLabel="Replace"
        loading={rotate.isPending}
        error={rotate.error?.message}
        onClose={() => setConfirming(false)}
        onConfirm={() => rotate.mutate(undefined, { onSuccess: () => setConfirming(false) })}
      >
        <Text size="sm">
          The current link stops working, for example after it was shared outside the class. Members
          stay in the classroom.
        </Text>
      </ConfirmModal>
    </Card>
  );
}
