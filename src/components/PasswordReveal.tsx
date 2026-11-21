import { ActionIcon, Alert, Code, CopyButton, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';

/** A generated password, shown once, with a copy button. */
export function PasswordReveal({ username, password }: { username: string; password: string }) {
  return (
    <Stack gap="xs">
      <Text size="sm">
        Give these credentials to <b>{username}</b>. The password is shown only now: they can change
        it from their account page.
      </Text>
      <Group gap="xs" wrap="nowrap">
        <Code fz="md">{password}</Code>
        <CopyButton value={password}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Copied' : 'Copy'}>
              <ActionIcon variant="subtle" onClick={copy} aria-label="Copy the password">
                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Group>
      <Alert color="yellow">Copy it before closing this window.</Alert>
    </Stack>
  );
}
