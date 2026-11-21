import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { api } from './client';
import type { components } from './schema';

export type Me = components['schemas']['Me'];
export type ChallengeSummary = components['schemas']['ChallengeSummary'];
export type ChallengeDetail = components['schemas']['ChallengeDetail'];
export type Instance = components['schemas']['InstanceView'];
export type CheckRun = components['schemas']['CheckRunView'];
export type ApiEvent = components['schemas']['Event'];

/** Error thrown by the hooks, with the api's message. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function fail(response: Response, error: unknown): never {
  const message =
    error && typeof error === 'object' && 'error' in error && typeof error.error === 'string'
      ? error.error
      : `${response.status} ${response.statusText}`;
  throw new ApiError(response.status, message);
}

const keys = {
  version: ['version'],
  me: ['me'],
  challenges: ['challenges'],
  challenge: (name: string) => ['challenges', name],
  instances: ['instances'],
  check: (instance: string) => ['checks', instance],
};

/** Version of the running api. */
export function useVersion() {
  return useQuery({
    queryKey: keys.version,
    queryFn: async () => {
      const { data, response } = await api.GET('/api/v1/version');
      if (!data) {
        throw new Error(`GET /api/v1/version: ${response.status}`);
      }
      return data;
    },
  });
}

/** The signed-in user, or null when signed out. */
export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: async (): Promise<Me | null> => {
      const { data, error, response } = await api.GET('/api/v1/me');
      if (response.status === 401) {
        return null;
      }
      return data ?? fail(response, error);
    },
  });
}

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: { username: string; password: string }) => {
      const { data, error, response } = await api.POST('/api/v1/auth/login', { body });
      return data ?? fail(response, error);
    },
    onSuccess: (me) => {
      client.clear();
      client.setQueryData(keys.me, me);
    },
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.POST('/api/v1/auth/logout');
    },
    onSuccess: () => {
      client.clear();
      client.setQueryData(keys.me, null);
    },
  });
}

export function useChallenges() {
  return useQuery({
    queryKey: keys.challenges,
    queryFn: async () => {
      const { data, error, response } = await api.GET('/api/v1/challenges');
      return data ?? fail(response, error);
    },
  });
}

export function useChallenge(name: string) {
  return useQuery({
    queryKey: keys.challenge(name),
    queryFn: async () => {
      const { data, error, response } = await api.GET('/api/v1/challenges/{name}', {
        params: { path: { name } },
      });
      return data ?? fail(response, error);
    },
  });
}

/** Active instances of the user (at most one by default). */
export function useInstances() {
  return useQuery({
    queryKey: keys.instances,
    queryFn: async () => {
      const { data, error, response } = await api.GET('/api/v1/instances');
      return data ?? fail(response, error);
    },
  });
}

export function useStartInstance() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (challenge: string) => {
      const { data, error, response } = await api.POST('/api/v1/instances', {
        body: { challenge },
      });
      return data ?? fail(response, error);
    },
    onSuccess: (instance) => client.setQueryData<Instance[]>(keys.instances, [instance]),
  });
}

export function useStopInstance() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.DELETE('/api/v1/instances/{id}', {
        params: { path: { id } },
      });
      if (!response.ok) {
        fail(response, error);
      }
      return id;
    },
    onSuccess: (id) => {
      client.setQueryData<Instance[]>(keys.instances, (list) => list?.filter((i) => i.id !== id));
      client.removeQueries({ queryKey: keys.check(id) });
    },
  });
}

/** Asks the api for a terminal URL (a short-lived token, so one per connection). */
export async function openTerminal(instance: string, machine: string): Promise<string> {
  const { data, error, response } = await api.POST('/api/v1/instances/{id}/terminals', {
    params: { path: { id: instance } },
    body: { machine },
  });
  return (data ?? fail(response, error)).url;
}

export function useLatestCheck(instance: string | undefined) {
  return useQuery({
    queryKey: keys.check(instance ?? ''),
    enabled: !!instance,
    queryFn: async () => {
      const { data, error, response } = await api.GET('/api/v1/instances/{id}/checks', {
        params: { path: { id: instance! } },
      });
      return data === undefined ? fail(response, error) : data;
    },
  });
}

export function useStartCheck() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (instance: string) => {
      const { data, error, response } = await api.POST('/api/v1/instances/{id}/checks', {
        params: { path: { id: instance } },
      });
      return data ?? fail(response, error);
    },
    onSuccess: (check) => client.setQueryData(keys.check(check.instance), check),
  });
}

/**
 * Keeps the cache up to date with the api's server-sent events while the
 * user is signed in, and announces solved tasks.
 */
export function useEvents(enabled: boolean) {
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled || typeof EventSource === 'undefined') {
      return;
    }
    const source = new EventSource('/api/v1/events');
    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as ApiEvent;
      switch (event.type) {
        case 'instance':
          client.setQueryData<Instance[]>(keys.instances, (list) => {
            const others = (list ?? []).filter((i) => i.id !== event.instance.id);
            const ended = event.instance.phase === 'Expired' || event.instance.phase === 'Failed';
            if (ended) {
              notifications.show({
                color: 'red',
                title: `Instance ${event.instance.phase.toLowerCase()}`,
                message: event.instance.message ?? 'Everything in it is lost; your score is kept.',
              });
              return others;
            }
            return [...others, event.instance];
          });
          break;
        case 'instanceDeleted':
          client.setQueryData<Instance[]>(keys.instances, (list) =>
            list?.filter((i) => i.id !== event.id),
          );
          break;
        case 'check':
          client.setQueryData(keys.check(event.check.instance), event.check);
          if (event.check.phase === 'Error') {
            notifications.show({
              color: 'red',
              title: 'Check failed',
              message: event.check.message,
            });
          }
          if (event.check.newlySolved.length > 0) {
            notifications.show({
              color: 'teal',
              title: 'Task solved!',
              message: `${event.check.newlySolved.length} new task(s) solved.`,
            });
          }
          if (event.check.phase === 'Completed') {
            void client.invalidateQueries({ queryKey: keys.challenges });
            void client.invalidateQueries({ queryKey: keys.me });
          }
          break;
      }
    };
    return () => source.close();
  }, [enabled, client]);
}

// Marketplace (admins only). The operator installs, syncs and mirrors
// asynchronously, so these refresh while a page shows them.

export type CatalogSourceView = components['schemas']['CatalogView'];
export type NewCatalog = components['schemas']['NewCatalog'];
export type MarketplaceEntry = components['schemas']['MarketplaceEntry'];
export type Installed = components['schemas']['InstalledView'];
export type Permissions = components['schemas']['PermissionsView'];

const adminKeys = {
  catalogs: ['admin', 'catalogs'],
  marketplace: ['admin', 'marketplace'],
  installed: ['admin', 'installed'],
};

/** How often admin pages refresh what the operator reports. */
const ADMIN_REFRESH_MS = 5000;

export function useCatalogSources() {
  return useQuery({
    queryKey: adminKeys.catalogs,
    refetchInterval: ADMIN_REFRESH_MS,
    queryFn: async () => {
      const { data, error, response } = await api.GET('/api/v1/admin/catalogs');
      return data ?? fail(response, error);
    },
  });
}

export function useMarketplace() {
  return useQuery({
    queryKey: adminKeys.marketplace,
    refetchInterval: ADMIN_REFRESH_MS,
    queryFn: async () => {
      const { data, error, response } = await api.GET('/api/v1/admin/marketplace');
      return data ?? fail(response, error);
    },
  });
}

/** Installed challenges, whatever their source. */
export function useInstalled() {
  return useQuery({
    queryKey: adminKeys.installed,
    refetchInterval: ADMIN_REFRESH_MS,
    queryFn: async () => {
      const { data, error, response } = await api.GET('/api/v1/admin/challenges');
      return data ?? fail(response, error);
    },
  });
}

/** Refreshes everything a marketplace change affects, the student catalog included. */
function useInvalidateMarketplace() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: ['admin'] });
    void client.invalidateQueries({ queryKey: keys.challenges });
  };
}

export function useAddCatalogSource() {
  const invalidate = useInvalidateMarketplace();
  return useMutation({
    mutationFn: async (body: NewCatalog) => {
      const { data, error, response } = await api.POST('/api/v1/admin/catalogs', { body });
      return data ?? fail(response, error);
    },
    onSuccess: invalidate,
  });
}

export function useRemoveCatalogSource() {
  const invalidate = useInvalidateMarketplace();
  return useMutation({
    mutationFn: async (name: string) => {
      const { error, response } = await api.DELETE('/api/v1/admin/catalogs/{name}', {
        params: { path: { name } },
      });
      if (!response.ok) {
        fail(response, error);
      }
    },
    onSuccess: invalidate,
  });
}

/** Installs a challenge from a catalog source, or moves it to another version. */
export function useInstallChallenge() {
  const invalidate = useInvalidateMarketplace();
  return useMutation({
    mutationFn: async ({
      name,
      source,
      version,
    }: {
      name: string;
      source: string;
      version: string;
    }) => {
      const { data, error, response } = await api.PUT('/api/v1/admin/challenges/{name}', {
        params: { path: { name } },
        body: { source, version },
      });
      return data ?? fail(response, error);
    },
    onSuccess: invalidate,
  });
}

/** Removes a challenge, stopping its running instances. */
export function useRemoveChallenge() {
  const invalidate = useInvalidateMarketplace();
  return useMutation({
    mutationFn: async (name: string) => {
      const { error, response } = await api.DELETE('/api/v1/admin/challenges/{name}', {
        params: { path: { name } },
      });
      if (!response.ok) {
        fail(response, error);
      }
    },
    onSuccess: invalidate,
  });
}

// Settings and accounts.

export type Settings = components['schemas']['Settings'];
export type UserView = components['schemas']['UserView'];
export type NewUser = components['schemas']['CreateUser'];
export type UserChange = components['schemas']['UpdateUser'];

const userKeys = {
  settings: ['settings'],
  users: ['admin', 'users'],
};

/** How the platform is set up (solo or organization). Readable signed out. */
export function useSettings() {
  return useQuery({
    queryKey: userKeys.settings,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error, response } = await api.GET('/api/v1/settings');
      return data ?? fail(response, error);
    },
  });
}

/** True when the install is used by several people (not solo mode). */
export function useIsOrganization(): boolean {
  return useSettings().data?.mode === 'organization';
}

export function useUsers() {
  return useQuery({
    queryKey: userKeys.users,
    queryFn: async () => {
      const { data, error, response } = await api.GET('/api/v1/admin/users');
      return data ?? fail(response, error);
    },
  });
}

/** Creates an account; the result holds its generated password, shown once. */
export function useCreateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: NewUser) => {
      const { data, error, response } = await api.POST('/api/v1/admin/users', { body });
      return data ?? fail(response, error);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: userKeys.users }),
  });
}

export function useUpdateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, change }: { id: string; change: UserChange }) => {
      const { data, error, response } = await api.PATCH('/api/v1/admin/users/{id}', {
        params: { path: { id } },
        body: change,
      });
      return data ?? fail(response, error);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: userKeys.users }),
  });
}

export function useDeleteUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.DELETE('/api/v1/admin/users/{id}', {
        params: { path: { id } },
      });
      if (!response.ok) {
        fail(response, error);
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: userKeys.users }),
  });
}

/** Gives a user a new generated password, returned once. */
export function useResetPassword() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error, response } = await api.POST('/api/v1/admin/users/{id}/password', {
        params: { path: { id } },
      });
      return (data ?? fail(response, error)).password;
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (body: { currentPassword: string; newPassword: string }) => {
      const { error, response } = await api.POST('/api/v1/me/password', { body });
      if (!response.ok) {
        fail(response, error);
      }
    },
  });
}

// Classrooms (organization mode).

export type StudentClassroom = components['schemas']['StudentClassroom'];
export type StudentAssignment = components['schemas']['StudentAssignment'];
export type ClassroomView = components['schemas']['ClassroomView'];
export type ClassroomDetail = components['schemas']['ClassroomDetail'];
export type ClassroomChange = components['schemas']['ClassroomChange'];
export type AssignmentView = components['schemas']['AssignmentView'];
export type MemberView = components['schemas']['MemberView'];

const classroomKeys = {
  mine: ['classrooms'],
  invite: (code: string) => ['invites', code],
  teaching: ['teach', 'classrooms'],
  classroom: (id: string) => ['teach', 'classrooms', id],
};

/** How often classroom pages refresh (members join, students solve tasks). */
const CLASSROOM_REFRESH_MS = 10_000;

/** Classrooms the user joined, with their assignments and progress. */
export function useMyClassrooms(enabled = true) {
  return useQuery({
    queryKey: classroomKeys.mine,
    enabled,
    refetchInterval: CLASSROOM_REFRESH_MS,
    queryFn: async () => {
      const { data, error, response } = await api.GET('/api/v1/classrooms');
      return data ?? fail(response, error);
    },
  });
}

/** What an invite link leads to (works signed out). */
export function useInvite(code: string) {
  return useQuery({
    queryKey: classroomKeys.invite(code),
    queryFn: async () => {
      const { data, error, response } = await api.GET('/api/v1/invites/{code}', {
        params: { path: { code } },
      });
      return data ?? fail(response, error);
    },
  });
}

export function useJoin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error, response } = await api.POST('/api/v1/invites/{code}/join', {
        params: { path: { code } },
      });
      return data ?? fail(response, error);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: classroomKeys.mine }),
  });
}

/** Creates a student account through an invite link and signs it in. */
export function useSignUp() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      code,
      ...body
    }: {
      code: string;
      displayName: string;
      username: string;
      password: string;
    }) => {
      const { data, error, response } = await api.POST('/api/v1/invites/{code}/signup', {
        params: { path: { code } },
        body,
      });
      return data ?? fail(response, error);
    },
    onSuccess: (me) => {
      client.clear();
      client.setQueryData(keys.me, me);
    },
  });
}

/** Classrooms the teacher manages (every classroom for admins). */
export function useTeaching() {
  return useQuery({
    queryKey: classroomKeys.teaching,
    queryFn: async () => {
      const { data, error, response } = await api.GET('/api/v1/teach/classrooms');
      return data ?? fail(response, error);
    },
  });
}

export function useClassroom(id: string) {
  return useQuery({
    queryKey: classroomKeys.classroom(id),
    refetchInterval: CLASSROOM_REFRESH_MS,
    queryFn: async () => {
      const { data, error, response } = await api.GET('/api/v1/teach/classrooms/{id}', {
        params: { path: { id } },
      });
      return data ?? fail(response, error);
    },
  });
}

/** Refreshes the teacher's classroom pages after a change. */
function useInvalidateTeaching() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ['teach'] });
}

export function useCreateClassroom() {
  const invalidate = useInvalidateTeaching();
  return useMutation({
    mutationFn: async (body: { name: string; description?: string | null }) => {
      const { data, error, response } = await api.POST('/api/v1/teach/classrooms', { body });
      return data ?? fail(response, error);
    },
    onSuccess: invalidate,
  });
}

export function useUpdateClassroom(id: string) {
  const invalidate = useInvalidateTeaching();
  return useMutation({
    mutationFn: async (change: ClassroomChange) => {
      const { data, error, response } = await api.PATCH('/api/v1/teach/classrooms/{id}', {
        params: { path: { id } },
        body: change,
      });
      return data ?? fail(response, error);
    },
    onSuccess: invalidate,
  });
}

export function useRotateInvite(id: string) {
  const invalidate = useInvalidateTeaching();
  return useMutation({
    mutationFn: async () => {
      const { data, error, response } = await api.POST('/api/v1/teach/classrooms/{id}/invite', {
        params: { path: { id } },
      });
      return data ?? fail(response, error);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteClassroom(id: string) {
  const invalidate = useInvalidateTeaching();
  return useMutation({
    mutationFn: async () => {
      const { error, response } = await api.DELETE('/api/v1/teach/classrooms/{id}', {
        params: { path: { id } },
      });
      if (!response.ok) {
        fail(response, error);
      }
    },
    onSuccess: invalidate,
  });
}

export function useRemoveMember(id: string) {
  const invalidate = useInvalidateTeaching();
  return useMutation({
    mutationFn: async (user: string) => {
      const { error, response } = await api.DELETE('/api/v1/teach/classrooms/{id}/members/{user}', {
        params: { path: { id, user } },
      });
      if (!response.ok) {
        fail(response, error);
      }
    },
    onSuccess: invalidate,
  });
}

export function usePutAssignment(id: string) {
  const invalidate = useInvalidateTeaching();
  return useMutation({
    mutationFn: async ({
      challenge,
      opensAt,
      dueAt,
    }: {
      challenge: string;
      opensAt: string | null;
      dueAt: string | null;
    }) => {
      const { data, error, response } = await api.PUT(
        '/api/v1/teach/classrooms/{id}/assignments/{challenge}',
        { params: { path: { id, challenge } }, body: { opensAt, dueAt } },
      );
      return data ?? fail(response, error);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteAssignment(id: string) {
  const invalidate = useInvalidateTeaching();
  return useMutation({
    mutationFn: async (challenge: string) => {
      const { error, response } = await api.DELETE(
        '/api/v1/teach/classrooms/{id}/assignments/{challenge}',
        { params: { path: { id, challenge } } },
      );
      if (!response.ok) {
        fail(response, error);
      }
    },
    onSuccess: invalidate,
  });
}
