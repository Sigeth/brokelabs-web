import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { type ClassroomView, useMe, useTeaching } from '../api/queries';
import { ADMIN_ROLE } from '../components/AdminOnly';
import { ClassroomModal } from '../components/ClassroomModal';
import { PageHeader } from '../components/PageHeader';
import { TeacherOnly } from '../components/TeacherOnly';

function ClassroomCard({ classroom, showOwner }: { classroom: ClassroomView; showOwner: boolean }) {
  return (
    <Card withBorder padding="lg">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Title order={4}>{classroom.name}</Title>
          {!classroom.inviteEnabled && (
            <Badge color="gray" variant="light">
              Link off
            </Badge>
          )}
        </Group>
        {showOwner && (
          <Text size="sm" c="dimmed">
            {classroom.ownerName}
          </Text>
        )}
        <Text size="sm">
          {classroom.members} member{classroom.members === 1 ? '' : 's'} · {classroom.assignments}{' '}
          assignment{classroom.assignments === 1 ? '' : 's'}
        </Text>
        <Group>
          <Button
            size="xs"
            renderRoot={(props) => (
              <Link {...props} to="/teach/$id" params={{ id: classroom.id }} />
            )}
          >
            Open
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

/** The classrooms of a teacher (every classroom for admins). */
export function TeachPage() {
  const classrooms = useTeaching();
  const me = useMe();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const admin = me.data?.role === ADMIN_ROLE;

  return (
    <TeacherOnly>
      <Group justify="space-between" align="flex-start">
        <PageHeader
          title="Classrooms"
          description={
            admin
              ? 'Every classroom of this platform.'
              : 'Your classrooms: invite students and assign challenges.'
          }
        />
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
          Create a classroom
        </Button>
      </Group>
      {classrooms.isError && <Alert color="red">{classrooms.error.message}</Alert>}
      {classrooms.data?.length === 0 && (
        <Alert color="gray" title="No classroom yet">
          Create one, then share its invite link with your students.
        </Alert>
      )}
      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }}>
        {classrooms.isPending && [1, 2].map((i) => <Skeleton key={i} h={160} />)}
        {classrooms.data?.map((c) => (
          <ClassroomCard key={c.id} classroom={c} showOwner={admin} />
        ))}
      </SimpleGrid>
      {creating && (
        <ClassroomModal
          onClose={() => setCreating(false)}
          onCreated={(c) => void navigate({ to: '/teach/$id', params: { id: c.id } })}
        />
      )}
    </TeacherOnly>
  );
}
