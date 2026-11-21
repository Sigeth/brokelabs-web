import {
  Alert,
  Anchor,
  Button,
  Card,
  Center,
  Divider,
  Loader,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconKey } from '@tabler/icons-react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { type FormEvent, useEffect, useRef, useState } from 'react';

import { useInvite, useJoin, useMe, useSettings, useSignUp } from '../api/queries';
import { PageHeader } from '../components/PageHeader';
import { ssoLoginUrl } from '../next';

/** Shortest password the api accepts. */
const MIN_PASSWORD_LENGTH = 8;

/** A username suggested from a name: "Zoé Martin" gives "zoe.martin". */
export function suggestUsername(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 64);
}

/** Signed in: joins at once, then opens the classroom list. */
function AutoJoin({ code, classroom }: { code: string; classroom: string }) {
  const join = useJoin();
  const navigate = useNavigate();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    join.mutate(code, {
      onSuccess: (r) => {
        notifications.show({
          color: 'teal',
          title: r.joined ? `You joined ${classroom}` : `You are in ${classroom}`,
          message: 'Its assignments are in My classes.',
        });
        void navigate({ to: '/classes' });
      },
    });
  }, [code, classroom, join, navigate]);
  if (join.isError) {
    return <Alert color="red">{join.error.message}</Alert>;
  }
  return (
    <Center h={120}>
      <Loader />
    </Center>
  );
}

/** Signed out: a student account in one form, or single sign-on. */
function SignUpForm({ code }: { code: string }) {
  const signUp = useSignUp();
  const join = useJoin();
  const navigate = useNavigate();
  const sso = useSettings().data?.sso;
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [edited, setEdited] = useState(false);
  const [password, setPassword] = useState('');
  const next = `/join/${code}`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    signUp.mutate(
      { code, displayName: name.trim(), username: username.trim(), password },
      {
        onSuccess: () => {
          void join.reset();
          void navigate({ to: '/classes' });
        },
      },
    );
  };

  return (
    <Stack>
      {sso && (
        <>
          <Button component="a" href={ssoLoginUrl(next)} leftSection={<IconKey size={16} />}>
            Join with {sso.label}
          </Button>
          <Divider label="or create an account" />
        </>
      )}
      <form onSubmit={submit}>
        <Stack>
          <TextInput
            label="Your name"
            description="As your teacher knows you"
            required
            value={name}
            onChange={(e) => {
              setName(e.currentTarget.value);
              if (!edited) {
                setUsername(suggestUsername(e.currentTarget.value));
              }
            }}
          />
          <TextInput
            label="Username"
            description="To sign in later"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => {
              setEdited(true);
              setUsername(e.currentTarget.value);
            }}
          />
          <PasswordInput
            label="Password"
            description={`At least ${MIN_PASSWORD_LENGTH} characters`}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          {signUp.isError && <Alert color="red">{signUp.error.message}</Alert>}
          <Button
            type="submit"
            variant={sso ? 'default' : 'filled'}
            loading={signUp.isPending}
            disabled={!name.trim() || !username.trim() || password.length < MIN_PASSWORD_LENGTH}
          >
            Create my account and join
          </Button>
        </Stack>
      </form>
      <Text size="sm" ta="center">
        Already have an account?{' '}
        <Anchor renderRoot={(props) => <Link {...props} to="/login" search={{ next }} />}>
          Sign in
        </Anchor>
      </Text>
    </Stack>
  );
}

/** The page of an invite link (D55): join in one step, signed in or not. */
export function JoinPage() {
  const { code } = useParams({ from: '/join/$code' });
  const me = useMe();
  const invite = useInvite(code);

  return (
    <Center>
      <Card withBorder w={420} padding="xl">
        {invite.isPending || me.isPending ? (
          <Center h={120}>
            <Loader />
          </Center>
        ) : invite.isError ? (
          <Stack>
            <PageHeader title="Invite link" />
            <Alert color="red">{invite.error.message}</Alert>
            <Text size="sm">Ask your teacher for a new link.</Text>
          </Stack>
        ) : (
          <>
            <PageHeader
              title={`Join ${invite.data.classroom}`}
              description={`${invite.data.teacher} invites you to this classroom.`}
            />
            {me.data ? (
              <AutoJoin code={code} classroom={invite.data.classroom} />
            ) : (
              <SignUpForm code={code} />
            )}
          </>
        )}
      </Card>
    </Center>
  );
}
