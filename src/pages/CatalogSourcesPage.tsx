import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Group,
  List,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';

import {
  type CatalogSourceView,
  type Installed,
  useCatalogSources,
  useInstalled,
  useRemoveCatalogSource,
} from '../api/queries';
import { AddCatalogModal } from '../components/AddCatalogModal';
import { AdminOnly } from '../components/AdminOnly';
import { ConfirmModal } from '../components/ConfirmModal';
import { PageHeader } from '../components/PageHeader';

function trustSummary(source: CatalogSourceView): string {
  const t = source.trust;
  const keys = t.keys ?? [];
  const parts = [
    ...(t.keyless ?? []).map((k) => `keyless: ${k.subjectRegExp}`),
    ...(keys.length > 0 ? [`${keys.length} public key${keys.length > 1 ? 's' : ''}`] : []),
    ...(t.allowUnsigned ? ['unsigned packages allowed'] : []),
  ];
  return parts.join(' · ');
}

function SourceCard({ source, onRemove }: { source: CatalogSourceView; onRemove: () => void }) {
  return (
    <Card withBorder padding="lg">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Title order={4}>{source.name}</Title>
          {source.ready ? (
            <Badge color="teal" variant="light">
              Synced
            </Badge>
          ) : (
            <Tooltip label={source.message ?? 'Waiting for the first sync'} multiline maw={360}>
              <Badge color={source.message ? 'red' : 'blue'} variant="light">
                {source.message ? 'Sync failed' : 'Syncing'}
              </Badge>
            </Tooltip>
          )}
        </Group>
        <Code>{source.ref}</Code>
        <Text size="sm">
          {source.packages} package{source.packages === 1 ? '' : 's'}
          {source.lastSync && ` · last sync ${new Date(source.lastSync).toLocaleString()}`}
        </Text>
        {source.signer && (
          <Text size="xs" c="dimmed">
            Signed by {source.signer}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          Trusts {trustSummary(source)}
        </Text>
        {!source.ready && source.message && (
          <Text size="xs" c="red">
            {source.message}
          </Text>
        )}
        <Group>
          <Button variant="subtle" color="red" size="xs" onClick={onRemove}>
            Remove
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

/** Confirms the removal of a source and of everything installed from it (D43). */
function RemoveSourceModal({
  source,
  installed,
  onClose,
}: {
  source: CatalogSourceView;
  installed: Installed[];
  onClose: () => void;
}) {
  const remove = useRemoveCatalogSource();
  const fromSource = installed.filter((i) => i.catalog === source.name);
  const running = fromSource.reduce((n, i) => n + i.activeInstances, 0);
  return (
    <ConfirmModal
      opened
      title={`Remove ${source.name}`}
      confirmLabel="Remove the source"
      danger
      loading={remove.isPending}
      error={remove.error?.message}
      onClose={onClose}
      onConfirm={() => remove.mutate(source.name, { onSuccess: onClose })}
    >
      {fromSource.length === 0 ? (
        <Text size="sm">No challenge is installed from this source.</Text>
      ) : (
        <>
          <Text size="sm">
            These challenges are removed with it. Scores already earned are kept.
          </Text>
          <List size="sm">
            {fromSource.map((i) => (
              <List.Item key={i.name}>{i.title ?? i.name}</List.Item>
            ))}
          </List>
        </>
      )}
      {running > 0 && (
        <Text size="sm" fw={600}>
          {running === 1 ? '1 running instance stops' : `${running} running instances stop`}, and
          their work is lost.
        </Text>
      )}
    </ConfirmModal>
  );
}

export function CatalogSourcesPage() {
  const sources = useCatalogSources();
  const installed = useInstalled();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<CatalogSourceView | null>(null);

  return (
    <AdminOnly>
      <Group justify="space-between" align="flex-start">
        <PageHeader
          title="Catalog sources"
          description="Registries publishing signed catalogs of challenges, and who is trusted to sign them."
        />
        <Button leftSection={<IconPlus size={16} />} onClick={() => setAdding(true)}>
          Add a source
        </Button>
      </Group>
      {sources.isError && <Alert color="red">{sources.error.message}</Alert>}
      {sources.isSuccess && sources.data.length === 0 && (
        <Alert color="gray" title="No catalog source">
          Add a source to install challenges from it.
        </Alert>
      )}
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {sources.isPending && [1, 2].map((i) => <Skeleton key={i} h={200} />)}
        {sources.data?.map((s) => (
          <SourceCard key={s.name} source={s} onRemove={() => setRemoving(s)} />
        ))}
      </SimpleGrid>
      {adding && <AddCatalogModal onClose={() => setAdding(false)} />}
      {removing && (
        <RemoveSourceModal
          source={removing}
          installed={installed.data ?? []}
          onClose={() => setRemoving(null)}
        />
      )}
    </AdminOnly>
  );
}
