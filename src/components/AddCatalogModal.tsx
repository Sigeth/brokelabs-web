import {
  Alert,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useState } from 'react';

import { type NewCatalog, useAddCatalogSource } from '../api/queries';
import { PROJECT_NAME } from '../project';

type TrustMode = 'key' | 'keyless' | 'unsigned';

/** OIDC issuer of GitHub Actions, the usual signer of catalogs built in CI. */
const GITHUB_ACTIONS_ISSUER = 'https://token.actions.githubusercontent.com';

/** Adds a catalog source: where its index is, and who is trusted to sign it (D40). */
export function AddCatalogModal({ onClose }: { onClose: () => void }) {
  const add = useAddCatalogSource();
  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [mode, setMode] = useState<TrustMode>('key');
  const [key, setKey] = useState('');
  const [issuer, setIssuer] = useState(GITHUB_ACTIONS_ISSUER);
  const [subject, setSubject] = useState('');

  const trust: NewCatalog['trust'] = {
    keys: mode === 'key' ? [key.trim()] : [],
    keyless: mode === 'keyless' ? [{ issuer: issuer.trim(), subjectRegExp: subject.trim() }] : [],
    allowUnsigned: mode === 'unsigned',
  };
  const complete =
    name.trim() !== '' &&
    reference.trim() !== '' &&
    (mode === 'unsigned' ||
      (mode === 'key' ? key.trim() !== '' : issuer.trim() !== '' && subject.trim() !== ''));

  return (
    <Modal opened onClose={onClose} title="Add a catalog source" size="lg" centered>
      <Stack>
        <TextInput
          label="Name"
          description="Lowercase letters, digits and dashes, e.g. school"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
        />
        <TextInput
          label="Catalog index"
          description="OCI reference of the index, e.g. ghcr.io/school/catalog:latest"
          value={reference}
          onChange={(e) => setReference(e.currentTarget.value)}
          required
        />
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            Trusted signer
          </Text>
          <SegmentedControl
            value={mode}
            onChange={(v) => setMode(v as TrustMode)}
            data={[
              { value: 'key', label: 'Public key' },
              { value: 'keyless', label: 'Keyless (CI identity)' },
              { value: 'unsigned', label: 'Unsigned' },
            ]}
          />
        </Stack>
        {mode === 'key' && (
          <Textarea
            label="Public key (PEM)"
            description={`The key that signs the index and its packages (${PROJECT_NAME} challenge sign --key).`}
            rows={6}
            value={key}
            onChange={(e) => setKey(e.currentTarget.value)}
          />
        )}
        {mode === 'keyless' && (
          <>
            <TextInput
              label="OIDC issuer"
              value={issuer}
              onChange={(e) => setIssuer(e.currentTarget.value)}
            />
            <TextInput
              label="Identity (regular expression)"
              description="e.g. ^https://github\.com/school/catalog/\.github/workflows/release\.yaml@.*$"
              value={subject}
              onChange={(e) => setSubject(e.currentTarget.value)}
            />
          </>
        )}
        {mode === 'unsigned' && (
          <Alert color="red" title="For development only">
            Anyone who can push to this registry could make your instances run their code.
          </Alert>
        )}
        {add.error && <Alert color="red">{add.error.message}</Alert>}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!complete}
            loading={add.isPending}
            onClick={() =>
              add.mutate(
                { name: name.trim(), ref: reference.trim(), trust },
                { onSuccess: onClose },
              )
            }
          >
            Add
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
