import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import {
  type Installed,
  type MarketplaceEntry,
  useInstalled,
  useMarketplace,
} from '../api/queries';
import { AdminOnly } from '../components/AdminOnly';
import { CategoryBadge, DifficultyBadge } from '../components/Badges';
import { InstallModal } from '../components/InstallModal';
import { InstallStatus } from '../components/InstallStatus';
import { PageHeader } from '../components/PageHeader';
import { RemoveChallengeModal } from '../components/RemoveChallengeModal';

/** A package of a catalog source, with its installation state and actions. */
function PackageCard({
  entry,
  onInstall,
  onRemove,
}: {
  entry: MarketplaceEntry;
  onInstall: () => void;
  onRemove: (installed: Installed) => void;
}) {
  const installed = entry.installed;
  const fromHere = installed?.catalog === entry.source;
  return (
    <Card withBorder padding="lg">
      <Stack gap="sm" h="100%">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Title order={4}>{entry.title}</Title>
          <Badge variant="default">{entry.source}</Badge>
        </Group>
        <Group gap="xs">
          <CategoryBadge category={entry.category} />
          <DifficultyBadge difficulty={entry.difficulty} />
          <Badge variant="default">{entry.versions[0]?.version}</Badge>
        </Group>
        <Text size="sm" c="dimmed" flex={1}>
          {entry.summary}
        </Text>
        {installed && fromHere && <InstallStatus installed={installed} />}
        {installed && !fromHere && (
          <Text size="xs" c="dimmed">
            Installed from {installed.catalog ?? `an ${installed.sourceKind} source`}
          </Text>
        )}
        <Group gap="xs">
          {!installed && <Button onClick={onInstall}>Install</Button>}
          {fromHere && (
            <Button variant={entry.updateAvailable ? 'filled' : 'default'} onClick={onInstall}>
              {entry.updateAvailable ? 'Update' : 'Versions'}
            </Button>
          )}
          {installed && fromHere && (
            <Button variant="subtle" color="red" onClick={() => onRemove(installed)}>
              Remove
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

/** Challenges installed without a catalog (development, or a direct OCI reference). */
function OtherInstalls({
  list,
  onRemove,
}: {
  list: Installed[];
  onRemove: (i: Installed) => void;
}) {
  if (list.length === 0) {
    return null;
  }
  return (
    <Stack mt="xl" gap="sm">
      <Title order={3}>Installed outside catalogs</Title>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Challenge</Table.Th>
            <Table.Th>Source</Table.Th>
            <Table.Th>State</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {list.map((i) => (
            <Table.Tr key={i.name}>
              <Table.Td>{i.title ?? i.name}</Table.Td>
              <Table.Td>
                {i.sourceKind === 'inline' ? 'inline (development)' : i.sourceKind}
              </Table.Td>
              <Table.Td>
                <InstallStatus installed={i} />
              </Table.Td>
              <Table.Td>
                <Button variant="subtle" color="red" size="xs" onClick={() => onRemove(i)}>
                  Remove
                </Button>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

export function MarketplacePage() {
  const marketplace = useMarketplace();
  const installed = useInstalled();
  const [installing, setInstalling] = useState<MarketplaceEntry | null>(null);
  const [removing, setRemoving] = useState<Installed | null>(null);
  const others = (installed.data ?? []).filter((i) => i.sourceKind !== 'catalog');

  return (
    <AdminOnly>
      <PageHeader
        title="Marketplace"
        description="Challenges offered by your catalog sources. Each package is verified against the trust policy of its source before it is installed."
      />
      {marketplace.isError && <Alert color="red">{marketplace.error.message}</Alert>}
      {marketplace.isSuccess && marketplace.data.length === 0 && (
        <Alert color="gray" title="No package listed">
          Your catalog sources list no package yet.{' '}
          <Anchor component={Link} to="/admin/catalogs">
            Check the catalog sources
          </Anchor>
          .
        </Alert>
      )}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {marketplace.isPending && [1, 2, 3].map((i) => <Skeleton key={i} h={220} />)}
        {marketplace.data?.map((entry) => (
          <PackageCard
            key={`${entry.source}/${entry.name}`}
            entry={entry}
            onInstall={() => setInstalling(entry)}
            onRemove={setRemoving}
          />
        ))}
      </SimpleGrid>
      <OtherInstalls list={others} onRemove={setRemoving} />
      {installing && <InstallModal entry={installing} onClose={() => setInstalling(null)} />}
      {removing && <RemoveChallengeModal installed={removing} onClose={() => setRemoving(null)} />}
    </AdminOnly>
  );
}
