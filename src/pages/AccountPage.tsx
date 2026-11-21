import { Alert, Button, Card, PasswordInput, Stack, Text } from '@mantine/core';
import { type FormEvent, useState } from 'react';

import { useChangePassword, useMe } from '../api/queries';
import { PageHeader } from '../components/PageHeader';
import { ROLE_LABELS } from '../roles';

/** Shortest password the api accepts. */
const MIN_PASSWORD_LENGTH = 8;

function ChangePasswordForm() {
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm !== '' && next !== confirm;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setCurrent('');
          setNext('');
          setConfirm('');
        },
      },
    );
  };

  return (
    <form onSubmit={submit}>
      <Stack>
        <PasswordInput
          label="Current password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.currentTarget.value)}
        />
        <PasswordInput
          label="New password"
          description={`At least ${MIN_PASSWORD_LENGTH} characters`}
          autoComplete="new-password"
          required
          value={next}
          onChange={(e) => setNext(e.currentTarget.value)}
        />
        <PasswordInput
          label="Confirm the new password"
          autoComplete="new-password"
          required
          value={confirm}
          error={mismatch ? 'The passwords differ' : undefined}
          onChange={(e) => setConfirm(e.currentTarget.value)}
        />
        {change.isError && <Alert color="red">{change.error.message}</Alert>}
        {change.isSuccess && (
          <Alert color="teal">Password changed. Your other sessions were signed out.</Alert>
        )}
        <Button
          type="submit"
          loading={change.isPending}
          disabled={next.length < MIN_PASSWORD_LENGTH || next !== confirm}
        >
          Change the password
        </Button>
      </Stack>
    </form>
  );
}

export function AccountPage() {
  const me = useMe();
  return (
    <Stack maw={480}>
      <PageHeader
        title="Account"
        description={
          me.data && `${me.data.username} · ${ROLE_LABELS[me.data.role] ?? me.data.role}`
        }
      />
      <Card withBorder padding="lg">
        <Text fw={600} mb="md">
          Password
        </Text>
        {me.data?.sso ? (
          <Text size="sm">
            You sign in with single sign-on: change your password with your organization&apos;s
            provider.
          </Text>
        ) : (
          <ChangePasswordForm />
        )}
      </Card>
    </Stack>
  );
}
