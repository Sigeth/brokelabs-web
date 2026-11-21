import { Alert, SimpleGrid, Skeleton } from '@mantine/core';

import {
  type StudentClassroom,
  useChallenges,
  useIsOrganization,
  useMyClassrooms,
} from '../api/queries';
import { type Assigned, ChallengeCard } from '../components/ChallengeCard';
import { PageHeader } from '../components/PageHeader';

/** The assignment of each challenge with the soonest deadline. */
function assignedChallenges(classrooms: StudentClassroom[] | undefined): Map<string, Assigned> {
  const assigned = new Map<string, Assigned>();
  for (const c of classrooms ?? []) {
    for (const a of c.assignments) {
      const current = assigned.get(a.challenge);
      const sooner = !current || (a.dueAt && (!current.dueAt || a.dueAt < current.dueAt));
      if (sooner) {
        assigned.set(a.challenge, { classroom: c.name, dueAt: a.dueAt ?? null });
      }
    }
  }
  return assigned;
}

export function CatalogPage() {
  const challenges = useChallenges();
  const organization = useIsOrganization();
  const classrooms = useMyClassrooms(organization);
  const assigned = assignedChallenges(classrooms.data);

  return (
    <>
      <PageHeader
        title="Challenges"
        description="Hands-on DevOps security challenges: Linux hardening, containers and Kubernetes."
      />
      {challenges.isError && <Alert color="red">{challenges.error.message}</Alert>}
      {challenges.isSuccess && challenges.data.length === 0 && (
        <Alert color="gray" title="No challenge installed">
          Ask your administrator to install challenges.
        </Alert>
      )}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {challenges.isPending && [1, 2, 3].map((i) => <Skeleton key={i} h={240} />)}
        {challenges.data?.map((c) => (
          <ChallengeCard key={c.name} challenge={c} assigned={assigned.get(c.name)} />
        ))}
      </SimpleGrid>
    </>
  );
}
