import { Alert, Button, Group, Modal, Stack } from '@mantine/core';
import type { ReactNode } from 'react';

interface ConfirmModalProps {
  opened: boolean;
  title: string;
  /** What happens, in plain words. */
  children: ReactNode;
  confirmLabel: string;
  /** Destructive actions are shown in red. */
  danger?: boolean;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/** Asks before an action that cannot be undone. */
export function ConfirmModal({
  opened,
  title,
  children,
  confirmLabel,
  danger = false,
  loading = false,
  error,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Stack>
        {children}
        {error && <Alert color="red">{error}</Alert>}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button color={danger ? 'red' : undefined} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
