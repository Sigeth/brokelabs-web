import { Alert, Badge, Group, List, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import type { Permissions } from '../api/queries';

const runtimeLabels: Record<string, string> = {
  pod: 'Container (pod)',
  userns: 'Root container (user namespace)',
  vcluster: 'Virtual Kubernetes cluster',
  vm: 'Virtual machine',
};

/** Permissions worth a second look before installing. */
function warnings(p: Permissions): string[] {
  const list: string[] = [];
  const allowlist = p.egressAllowlist ?? [];
  const kinds = p.extraManifestKinds ?? [];
  if (p.egress === 'internet') {
    list.push('Instances can reach the internet.');
  }
  if (p.egress === 'allowlist') {
    list.push(`Instances can reach: ${allowlist.join(', ')}.`);
  }
  if (kinds.length > 0) {
    list.push(`It creates extra objects in each instance namespace: ${kinds.join(', ')}.`);
  }
  if (p.checkerImage) {
    list.push(`Its own checker image runs with access to the machines: ${p.checkerImage}.`);
  }
  return list;
}

/**
 * What a package needs from the cluster, derived from the package itself
 * (D41), as the admin approves it before installing.
 */
export function PermissionsList({ permissions }: { permissions: Permissions }) {
  const attention = warnings(permissions);
  return (
    <Stack gap="sm">
      <List size="sm" spacing={4}>
        <List.Item>
          <Group gap={6}>
            <Text size="sm">Runs as:</Text>
            {permissions.runtimes.map((r) => (
              <Badge key={r} variant="light">
                {runtimeLabels[r] ?? r}
              </Badge>
            ))}
          </Group>
        </List.Item>
        <List.Item>
          {permissions.cpu} CPU and {permissions.memory} of memory per instance
        </List.Item>
        <List.Item>
          Network: {permissions.egress === 'none' ? 'no outbound access' : permissions.egress}
        </List.Item>
      </List>
      {attention.length > 0 && (
        <Alert
          color="yellow"
          icon={<IconAlertTriangle size={18} />}
          title="Check before installing"
        >
          <List size="sm" spacing={4}>
            {attention.map((w) => (
              <List.Item key={w}>{w}</List.Item>
            ))}
          </List>
        </Alert>
      )}
    </Stack>
  );
}
