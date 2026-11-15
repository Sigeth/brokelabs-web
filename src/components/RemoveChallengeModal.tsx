import { Text } from '@mantine/core';

import { type Installed, useRemoveChallenge } from '../api/queries';
import { ConfirmModal } from './ConfirmModal';

/** Confirms the removal of a challenge, which stops its running instances (D43). */
export function RemoveChallengeModal({
  installed,
  onClose,
}: {
  installed: Installed;
  onClose: () => void;
}) {
  const remove = useRemoveChallenge();
  const running = installed.activeInstances;
  return (
    <ConfirmModal
      opened
      title={`Remove ${installed.title ?? installed.name}`}
      confirmLabel="Remove"
      danger
      loading={remove.isPending}
      error={remove.error?.message}
      onClose={onClose}
      onConfirm={() => remove.mutate(installed.name, { onSuccess: onClose })}
    >
      <Text size="sm">
        Students will no longer see this challenge. Scores already earned are kept.
      </Text>
      {running > 0 && (
        <Text size="sm" fw={600}>
          {running === 1 ? '1 running instance stops' : `${running} running instances stop`}, and
          their work is lost.
        </Text>
      )}
    </ConfirmModal>
  );
}
