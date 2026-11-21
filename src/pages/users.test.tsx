import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { me, mockApi, version } from '../test/api';
import { renderApp } from '../test/render';

afterEach(() => vi.restoreAllMocks());

const alice = {
  id: 'u2',
  username: 'alice',
  displayName: 'Alice',
  role: 'student',
  disabled: false,
  createdAt: '2026-11-21T10:00:00Z',
  lastLoginAt: null,
  score: 30,
};
const self = { ...alice, id: me.id, username: 'admin', displayName: 'admin', role: 'admin' };

const base = {
  'GET /api/v1/version': [200, version] as [number, unknown],
  'GET /api/v1/me': [200, me] as [number, unknown],
};
const organization = {
  ...base,
  'GET /api/v1/settings': [200, { mode: 'organization' }] as [number, unknown],
};

describe('users', () => {
  it('is in the navigation of organizations only', async () => {
    mockApi({
      ...base,
      'GET /api/v1/settings': [200, { mode: 'solo' }],
      'GET /api/v1/challenges': [200, []],
    });
    renderApp('/');
    expect(await screen.findByText('Marketplace')).toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });

  it('creates an account and shows its password once', async () => {
    const requests = mockApi({
      ...organization,
      'GET /api/v1/admin/users': [200, [self, alice]],
      'POST /api/v1/admin/users': [
        201,
        { user: { ...alice, username: 'bob' }, password: 's3cret-pass' },
      ],
    });
    renderApp('/admin/users');
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getAllByText('Never')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    fireEvent.change(await screen.findByLabelText(/Username/), { target: { value: 'bob' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('s3cret-pass')).toBeInTheDocument();
    const post = requests.find((r) => r.method === 'POST');
    expect(await post!.json()).toEqual({ username: 'bob', displayName: null, role: 'student' });
  });

  it('resets a password after confirmation', async () => {
    mockApi({
      ...organization,
      'GET /api/v1/admin/users': [200, [self, alice]],
      'POST /api/v1/admin/users/u2/password': [200, { password: 'new-pass-123' }],
    });
    renderApp('/admin/users');
    fireEvent.click(await screen.findByRole('button', { name: 'Actions for alice' }));
    fireEvent.click(await screen.findByText('Reset the password'));
    fireEvent.click(await screen.findByRole('button', { name: 'Reset the password' }));
    expect(await screen.findByText('new-pass-123')).toBeInTheDocument();
  });
});

describe('account', () => {
  it('changes the password', async () => {
    const requests = mockApi({ ...base, 'POST /api/v1/me/password': [204, null] });
    renderApp('/account');
    fireEvent.change(await screen.findByLabelText(/Current password/), {
      target: { value: 'old' },
    });
    fireEvent.change(screen.getByLabelText(/^New password/), { target: { value: 'long enough' } });
    fireEvent.change(screen.getByLabelText(/Confirm/), { target: { value: 'long enough' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change the password' }));
    expect(await screen.findByText(/Password changed/)).toBeInTheDocument();
    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true));
  });
});
