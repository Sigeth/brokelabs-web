import { Alert, Button, Card, Group, Skeleton, Stack, Table, Text, Title } from '@mantine/core';
import { Link } from '@tanstack/react-router';

import { type StudentClassroom, useMyClassrooms } from '../api/queries';
import { DeadlineBadge } from '../components/DeadlineBadge';
import { PageHeader } from '../components/PageHeader';
import { isPast } from '../dates';

function ClassroomCard({ classroom }: { classroom: StudentClassroom }) {
  return (
    <Card withBorder padding="lg">
      <Stack gap="sm">
        <div>
          <Title order={4}>{classroom.name}</Title>
          <Text size="sm" c="dimmed">
            {classroom.teacher}
          </Text>
        </div>
        {classroom.description && <Text size="sm">{classroom.description}</Text>}
        {classroom.assignments.length === 0 ? (
          <Text size="sm" c="dimmed">
            Nothing assigned yet.
          </Text>
        ) : (
          <Table verticalSpacing="sm">
            <Table.Tbody>
              {classroom.assignments.map((a) => (
                <Table.Tr key={a.challenge}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {a.summary?.title ?? a.challenge}
                    </Text>
                    {a.summary && (
                      <Text size="xs" c="dimmed">
                        {a.summary.solvedTasks}/{a.summary.tasks} tasks · {a.summary.solvedPoints}/
                        {a.summary.points} pts
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <DeadlineBadge assignment={a} />
                  </Table.Td>
                  <Table.Td ta="right">
                    {a.summary ? (
                      <Button
                        size="xs"
                        variant={a.done ? 'default' : 'filled'}
                        disabled={!a.summary.runnable || (!!a.opensAt && !isPast(a.opensAt))}
                        renderRoot={(props) => (
                          <Link {...props} to="/challenges/$name" params={{ name: a.challenge }} />
                        )}
                      >
                        Open
                      </Button>
                    ) : (
                      <Text size="xs" c="dimmed">
                        No longer installed
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Card>
  );
}

/** The classrooms a student joined, with their assignments. */
export function ClassesPage() {
  const classrooms = useMyClassrooms();
  return (
    <>
      <PageHeader title="My classes" description="Challenges your teachers assigned to you." />
      {classrooms.isError && <Alert color="red">{classrooms.error.message}</Alert>}
      {classrooms.isPending && <Skeleton h={200} />}
      {classrooms.data?.length === 0 && (
        <Alert color="gray" title="No classroom yet">
          Open the invite link your teacher shared to join their classroom.
        </Alert>
      )}
      <Stack>
        {classrooms.data?.map((c) => (
          <ClassroomCard key={c.id} classroom={c} />
        ))}
      </Stack>
      <Group mt="lg">
        <Text size="sm" c="dimmed">
          Every installed challenge is also open to you in <Link to="/">the catalog</Link>.
        </Text>
      </Group>
    </>
  );
}
