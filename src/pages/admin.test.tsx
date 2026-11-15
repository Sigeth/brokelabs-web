import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { me, mockApi, version } from '../test/api';
import { renderApp } from '../test/render';

afterEach(() => vi.restoreAllMocks());

const permissions = {
  runtimes: ['vm'],
  cpu: '1',
  memory: '1Gi',
  egress: 'internet',
  egressAllowlist: [],
  extraManifestKinds: [],
  checkerImage: null,
};

const entry = {
  source: 'official',
  name: 'ssh-hardening',
  title: 'SSH hardening',
  summary: 'Lock down sshd.',
  category: 'linux-hardening',
  difficulty: 'easy',
  tags: [],
  versions: [
    { version: '1.1.0', permissions },
    { version: '1.0.0', permissions: { ...permissions, egress: 'none' } },
  ],
  installed: null,
  updateAvailable: false,
};

const installed = {
  name: 'ssh-hardening',
  title: 'SSH hardening',
  version: '1.0.0',
  sourceKind: 'catalog',
  catalog: 'official',
  requestedVersion: '1.0.0',
  ready: true,
  message: null,
  runnable: true,
  unrunnableReason: null,
  mirrored: true,
  signer: 'ci',
  permissions,
  activeInstances: 2,
};

const source = {
  name: 'official',
  ref: 'ghcr.io/sigeth/opslab-catalog:latest',
  trust: {
    keys: [],
    keyless: [{ issuer: 'https://token.actions.githubusercontent.com', subjectRegExp: '^ci$' }],
    allowUnsigned: false,
  },
  ready: true,
  message: '1 packages listed',
  signer: 'ci (https://token.actions.githubusercontent.com)',
  lastSync: '2026-11-15T10:00:00Z',
  packages: 1,
};

const base = {
  'GET /api/v1/version': [200, version] as [number, unknown],
  'GET /api/v1/me': [200, me] as [number, unknown],
};

describe('marketplace', () => {
  it('shows the permissions of the chosen version before installing it', async () => {
    const requests = mockApi({
      ...base,
      'GET /api/v1/admin/marketplace': [200, [entry]],
      'GET /api/v1/admin/challenges': [200, []],
      'PUT /api/v1/admin/challenges/ssh-hardening': [200, installed],
    });
    renderApp('/admin/marketplace');
    fireEvent.click(await screen.findByRole('button', { name: 'Install' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Instances can reach the internet.')).toBeInTheDocument();
    expect(within(dialog).getByText('1 CPU and 1Gi of memory per instance')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Install 1.1.0' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const put = requests.find((r) => r.method === 'PUT')!;
    expect(await put.json()).toEqual({ source: 'official', version: '1.1.0' });
  });

  it('warns that removing a challenge stops its running instances', async () => {
    const requests = mockApi({
      ...base,
      'GET /api/v1/admin/marketplace': [200, [{ ...entry, installed, updateAvailable: true }]],
      'GET /api/v1/admin/challenges': [200, [installed]],
      'DELETE /api/v1/admin/challenges/ssh-hardening': [204, null],
    });
    renderApp('/admin/marketplace');
    expect(await screen.findByRole('button', { name: 'Update' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/2 running instances stop/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(requests.some((r) => r.method === 'DELETE')).toBe(true));
  });
});

describe('catalog sources', () => {
  it('lists sources and adds one trusting a key', async () => {
    const requests = mockApi({
      ...base,
      'GET /api/v1/admin/catalogs': [200, [source]],
      'GET /api/v1/admin/challenges': [200, [installed]],
      'POST /api/v1/admin/catalogs': [201, { ...source, name: 'school' }],
    });
    renderApp('/admin/catalogs');
    expect(await screen.findByText(source.ref)).toBeInTheDocument();
    expect(screen.getByText(/Signed by ci/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add a source' }));
    const dialog = await screen.findByRole('dialog');
    const add = within(dialog).getByRole('button', { name: 'Add' });
    expect(add).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'school' } });
    fireEvent.change(within(dialog).getByLabelText(/^Catalog index/), {
      target: { value: 'registry.school/catalog:latest' },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Public key \(PEM\)/), {
      target: { value: '-----BEGIN PUBLIC KEY-----' },
    });
    fireEvent.click(add);
    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true));
    const post = requests.find((r) => r.method === 'POST')!;
    expect(await post.json()).toEqual({
      name: 'school',
      ref: 'registry.school/catalog:latest',
      trust: { keys: ['-----BEGIN PUBLIC KEY-----'], keyless: [], allowUnsigned: false },
    });
  });

  it('lists what removing a source takes with it', async () => {
    mockApi({
      ...base,
      'GET /api/v1/admin/catalogs': [200, [source]],
      'GET /api/v1/admin/challenges': [200, [installed]],
    });
    renderApp('/admin/catalogs');
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('SSH hardening')).toBeInTheDocument();
    expect(within(dialog).getByText(/2 running instances stop/)).toBeInTheDocument();
  });
});

describe('students', () => {
  it('see no administration', async () => {
    mockApi({
      ...base,
      'GET /api/v1/me': [200, { ...me, role: 'student' }],
      'GET /api/v1/challenges': [200, []],
    });
    renderApp('/admin/marketplace');
    expect(await screen.findByText('Only administrators can see this page.')).toBeInTheDocument();
    expect(screen.queryByText('Catalog sources')).not.toBeInTheDocument();
  });
});
