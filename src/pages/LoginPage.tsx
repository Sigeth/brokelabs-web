import {
  Alert,
  Button,
  Card,
  Center,
  Divider,
  PasswordInput,
  Stack,
  TextInput,
} from '@mantine/core';
import { IconKey } from '@tabler/icons-react';
import { Navigate, useNavigate, useRouterState } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';

import { useLogin, useMe, useSettings } from '../api/queries';
import { PageHeader } from '../components/PageHeader';
import { safeNext, ssoLoginUrl } from '../next';
import { PROJECT_TITLE } from '../project';

export function LoginPage() {
  const me = useMe();
  const login = useLogin();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const settings = useSettings();
  const search = useRouterState({
    select: (s) => s.location.search as { error?: string; next?: string },
  });
  const next = safeNext(search.next);
  const sso = settings.data?.sso;

  if (me.data) {
    return <Navigate to={next} />;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate(
      { username: username.trim(), password },
      { onSuccess: () => void navigate({ to: next }) },
    );
  };

  return (
    <Center>
      <Card withBorder w={380} padding="xl">
        <PageHeader title={`Sign in to ${PROJECT_TITLE}`} />
        {search.error && (
          <Alert color="red" mb="md">
            {search.error}
          </Alert>
        )}
        {sso && (
          <>
            <Button
              component="a"
              href={ssoLoginUrl(next)}
              fullWidth
              leftSection={<IconKey size={16} />}
            >
              Sign in with {sso.label}
            </Button>
            <Divider label="or with a local account" my="md" />
          </>
        )}
        <form onSubmit={submit}>
          <Stack>
            <TextInput
              label="Username"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
            />
            <PasswordInput
              label="Password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            {login.isError && (
              <Alert color="red">
                {login.error.message === 'sign in first'
                  ? 'Wrong username or password.'
                  : login.error.message}
              </Alert>
            )}
            <Button type="submit" variant={sso ? 'default' : 'filled'} loading={login.isPending}>
              Sign in
            </Button>
          </Stack>
        </form>
      </Card>
    </Center>
  );
}
