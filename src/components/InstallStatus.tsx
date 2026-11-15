import { Badge, Group, Text, Tooltip } from '@mantine/core';

import type { Installed } from '../api/queries';

/** Installation state of a challenge, as the operator reports it. */
export function InstallStatus({ installed }: { installed: Installed }) {
  const pending =
    installed.requestedVersion != null && installed.requestedVersion !== installed.version;
  let badge = (
    <Badge color="teal" variant="light">
      Installed {installed.version}
    </Badge>
  );
  if (!installed.ready) {
    badge = (
      <Tooltip label={installed.message ?? 'Waiting for the operator'} multiline maw={360}>
        <Badge color={installed.message ? 'red' : 'blue'} variant="light">
          {installed.message ? 'Install failed' : 'Installing'}
        </Badge>
      </Tooltip>
    );
  } else if (pending) {
    badge = (
      <Badge color="blue" variant="light">
        Moving to {installed.requestedVersion}
      </Badge>
    );
  }
  return (
    <Group gap={6}>
      {badge}
      {installed.ready && !installed.runnable && (
        <Tooltip label={installed.unrunnableReason ?? ''} multiline maw={360}>
          <Badge color="orange" variant="light">
            Not runnable
          </Badge>
        </Tooltip>
      )}
      {installed.ready && (
        <Badge color={installed.mirrored ? 'teal' : 'gray'} variant="outline">
          {installed.mirrored ? 'Mirrored' : 'Not mirrored yet'}
        </Badge>
      )}
      {installed.activeInstances > 0 && (
        <Text size="xs" c="dimmed">
          {installed.activeInstances} running
        </Text>
      )}
    </Group>
  );
}
