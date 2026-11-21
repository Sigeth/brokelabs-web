import {
  Anchor,
  AppShell,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  NavLink,
  Text,
  Title,
} from '@mantine/core';
import {
  IconBuildingStore,
  IconChalkboard,
  IconLogout,
  IconPackages,
  IconSchool,
  IconTargetArrow,
  IconUsers,
} from '@tabler/icons-react';
import { Link, Navigate, Outlet, useRouterState } from '@tanstack/react-router';

import { useEvents, useIsOrganization, useLogout, useMe, useVersion } from '../api/queries';
import { PROJECT_TITLE } from '../project';
import { ADMIN_ROLE } from './AdminOnly';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { canTeach } from './TeacherOnly';

const navigation = [{ to: '/', label: 'Challenges', icon: IconTargetArrow }] as const;

/** Classrooms (hidden in solo mode): everyone sees theirs, teachers manage theirs. */
const classNavigation = [{ to: '/classes', label: 'My classes', icon: IconSchool }] as const;
const teachNavigation = [{ to: '/teach', label: 'Classrooms', icon: IconChalkboard }] as const;

/** Administration, shown to admins only. */
const adminNavigation = [
  { to: '/admin/marketplace', label: 'Marketplace', icon: IconBuildingStore },
  { to: '/admin/catalogs', label: 'Catalog sources', icon: IconPackages },
] as const;

/** Administration of an organization (hidden in solo mode). */
const organizationNavigation = [{ to: '/admin/users', label: 'Users', icon: IconUsers }] as const;

/** The frame of every page: header, navigation and content. Signed-out users only see the login page. */
export function AppLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const me = useMe();
  const logout = useLogout();
  const version = useVersion();
  const organization = useIsOrganization();
  const signedIn = !!me.data;
  useEvents(signedIn);

  const onLogin = pathname === '/login';
  // Invite links work signed out: they sign the visitor up (D55).
  const open = onLogin || pathname.startsWith('/join/');
  let content = <Outlet />;
  if (me.isPending) {
    content = (
      <Center h={200}>
        <Loader />
      </Center>
    );
  } else if (!signedIn && !open) {
    content = <Navigate to="/login" search={pathname === '/' ? {} : { next: pathname }} />;
  }

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: 220,
        breakpoint: 'sm',
        collapsed: { mobile: !signedIn, desktop: !signedIn },
      }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={3}>{PROJECT_TITLE}</Title>
          <Group gap="sm">
            {me.data && (
              <>
                <Badge size="lg" variant="light">
                  {me.data.score} pts
                </Badge>
                <Anchor component={Link} to="/account" size="sm">
                  {me.data.displayName}
                </Anchor>
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconLogout size={14} />}
                  onClick={() => logout.mutate()}
                >
                  Sign out
                </Button>
              </>
            )}
            <ColorSchemeToggle />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <AppShell.Section grow>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              component={Link}
              to={to}
              label={label}
              leftSection={<Icon size={18} stroke={1.5} />}
              active={pathname === to || pathname.startsWith('/challenges/')}
            />
          ))}
          {organization &&
            [...classNavigation, ...(canTeach(me.data?.role) ? teachNavigation : [])].map(
              ({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  component={Link}
                  to={to}
                  label={label}
                  leftSection={<Icon size={18} stroke={1.5} />}
                  active={pathname === to || pathname.startsWith(`${to}/`)}
                />
              ),
            )}
          {me.data?.role === ADMIN_ROLE && (
            <>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} mt="md" mb={4} px="sm">
                Administration
              </Text>
              {[...adminNavigation, ...(organization ? organizationNavigation : [])].map(
                ({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    component={Link}
                    to={to}
                    label={label}
                    leftSection={<Icon size={18} stroke={1.5} />}
                    active={pathname === to}
                  />
                ),
              )}
            </>
          )}
        </AppShell.Section>
        <AppShell.Section>
          <Text size="xs" c="dimmed">
            {version.data ? `${version.data.name} ${version.data.version}` : ''}
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>{content}</AppShell.Main>
    </AppShell>
  );
}
