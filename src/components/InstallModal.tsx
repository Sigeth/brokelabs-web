import { Alert, Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { useState } from 'react';

import { type MarketplaceEntry, useInstallChallenge } from '../api/queries';
import { PermissionsList } from './PermissionsList';

interface InstallModalProps {
  entry: MarketplaceEntry;
  onClose: () => void;
}

/**
 * Installs or updates a package: the admin picks a version and approves the
 * permissions it needs. The operator then verifies its signature and checks
 * the permissions against the platform policy.
 */
export function InstallModal({ entry, onClose }: InstallModalProps) {
  const install = useInstallChallenge();
  const installed = entry.installed;
  const fromHere = installed?.catalog === entry.source;
  const elsewhere = installed != null && !fromHere;
  const [version, setVersion] = useState(entry.versions[0]?.version ?? '');
  const selected = entry.versions.find((v) => v.version === version);
  const current = installed?.requestedVersion ?? installed?.version;
  const verb = fromHere ? 'Update' : 'Install';

  return (
    <Modal opened onClose={onClose} title={`${verb} ${entry.title}`} size="lg" centered>
      <Stack>
        <Text size="sm" c="dimmed">
          From the catalog source{' '}
          <Text span fw={600}>
            {entry.source}
          </Text>
          .{fromHere && current && ` Installed: ${current}.`}
        </Text>
        {elsewhere && (
          <Alert color="orange" title="Already installed">
            {entry.name} is installed from{' '}
            {installed.catalog
              ? `the catalog source ${installed.catalog}`
              : `an ${installed.sourceKind} source`}
            . Remove it first to install it from here.
          </Alert>
        )}
        <Select
          label="Version"
          data={entry.versions.map((v, i) => ({
            value: v.version,
            label: i === 0 ? `${v.version} (latest)` : v.version,
          }))}
          value={version}
          onChange={(v) => v && setVersion(v)}
          allowDeselect={false}
        />
        <Text fw={600} size="sm">
          What it needs from the cluster
        </Text>
        {selected?.permissions ? (
          <PermissionsList permissions={selected.permissions} />
        ) : (
          <Alert color="red">The catalog does not list the permissions of this version.</Alert>
        )}
        {fromHere && installed.activeInstances > 0 && (
          <Text size="sm" c="dimmed">
            Running instances keep their version; new instances use the new one.
          </Text>
        )}
        {install.error && <Alert color="red">{install.error.message}</Alert>}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={elsewhere || !selected?.permissions || (fromHere && version === current)}
            loading={install.isPending}
            onClick={() =>
              install.mutate(
                { name: entry.name, source: entry.source, version },
                { onSuccess: onClose },
              )
            }
          >
            {verb} {version}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
