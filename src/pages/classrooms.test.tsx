import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { me, mockApi, summary, version } from '../test/api';
import { renderApp } from '../test/render';
import { suggestUsername } from './JoinPage';

afterEach(() => vi.restoreAllMocks());

const organization = { mode: 'organization', sso: null };
const signedOut = {
  'GET /api/v1/version': [200, version] as [number, unknown],
  'GET /api/v1/me': [401, { error: 'sign in first' }] as [number, unknown],
  'GET /api/v1/settings': [200, organization] as [number, unknown],
};
const student = { ...me, id: 'u3', username: 'sam', displayName: 'Sam', role: 'student' };
const myClasses = [
  {
    id: 'c1',
    name: 'Class 1A',
    description: '',
    teacher: 'Tess',
    assignments: [
      {
        challenge: 'leaky-home',
        summary,
        opensAt: null,
        dueAt: '2020-01-01T00:00:00Z',
        done: false,
        late: true,
      },
    ],
  },
];
const classroom = {
  id: 'c1',
  name: 'Class 1A',
  description: '',
  ownerId: 'u1',
  ownerName: 'admin',
  inviteCode: 'ABCD-EFGH',
  inviteEnabled: true,
  members: 1,
  assignments: 1,
  createdAt: '2026-11-21T10:00:00Z',
};

describe('invite links', () => {
  it('suggests a username from the name', () => {
    expect(suggestUsername('Zoé Martin-Durand')).toBe('zoe.martin.durand');
    expect(suggestUsername('  ')).toBe('');
  });

  it('signs a visitor up and joins in one form', async () => {
    let signedUp = false;
    const requests = mockApi({
      ...signedOut,
      'GET /api/v1/me': () => (signedUp ? [200, student] : [401, { error: 'sign in first' }]),
      'GET /api/v1/invites/ABCD-EFGH': [200, { classroom: 'Class 1A', teacher: 'Tess' }],
      'POST /api/v1/invites/ABCD-EFGH/signup': () => {
        signedUp = true;
        return [201, student];
      },
      'GET /api/v1/classrooms': [200, myClasses],
    });
    renderApp('/join/ABCD-EFGH');
    expect(await screen.findByText('Join Class 1A')).toBeInTheDocument();
    expect(screen.getByText('Tess invites you to this classroom.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: 'Sam Smith' } });
    expect(screen.getByLabelText(/Username/)).toHaveValue('sam.smith');
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'long enough' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create my account and join' }));
    expect(await screen.findByText('My classes', { selector: 'h2' })).toBeInTheDocument();
    expect(await screen.findByText('Late')).toBeInTheDocument();
    const post = requests.find((r) => r.method === 'POST');
    expect(await post!.json()).toEqual({
      displayName: 'Sam Smith',
      username: 'sam.smith',
      password: 'long enough',
    });
  });

  it('joins at once when signed in', async () => {
    const requests = mockApi({
      ...signedOut,
      'GET /api/v1/me': [200, student],
      'GET /api/v1/invites/ABCD-EFGH': [200, { classroom: 'Class 1A', teacher: 'Tess' }],
      'POST /api/v1/invites/ABCD-EFGH/join': [200, { classroomId: 'c1', joined: true }],
      'GET /api/v1/classrooms': [200, myClasses],
    });
    renderApp('/join/ABCD-EFGH');
    expect(await screen.findByText('Class 1A', { selector: 'h4' })).toBeInTheDocument();
    expect(requests.some((r) => r.method === 'POST')).toBe(true);
  });

  it('explains a link that was turned off', async () => {
    mockApi({
      ...signedOut,
      'GET /api/v1/invites/OLD': [
        404,
        { error: 'this invite link is not valid or was turned off' },
      ],
    });
    renderApp('/join/OLD');
    expect(
      await screen.findByText('this invite link is not valid or was turned off'),
    ).toBeInTheDocument();
  });

  it('sends signed-out visitors to the login page, then back', async () => {
    mockApi(signedOut);
    renderApp('/classes');
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});

describe('teaching', () => {
  it('shows the invite link and turns it off', async () => {
    const requests = mockApi({
      ...signedOut,
      'GET /api/v1/me': [200, me],
      'GET /api/v1/teach/classrooms/c1': [
        200,
        {
          classroom,
          members: [
            {
              id: 'u3',
              username: 'sam',
              displayName: 'Sam',
              joinedAt: '2026-11-21T10:00:00Z',
              lastLoginAt: null,
            },
          ],
          assignments: [
            { challenge: 'leaky-home', title: 'Leaky home', opensAt: null, dueAt: null },
          ],
        },
      ],
      'PATCH /api/v1/teach/classrooms/c1': [200, { ...classroom, inviteEnabled: false }],
    });
    renderApp('/teach/c1');
    expect(await screen.findByText(/\/join\/ABCD-EFGH$/)).toBeInTheDocument();
    expect(screen.getByText('Leaky home')).toBeInTheDocument();
    expect(screen.getByText('Sam')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(requests.some((r) => r.method === 'PATCH')).toBe(true));
    const patch = requests.find((r) => r.method === 'PATCH');
    expect(await patch!.json()).toEqual({ inviteEnabled: false });
  });

  it('shows the classrooms in the navigation of teachers', async () => {
    mockApi({
      ...signedOut,
      'GET /api/v1/me': [200, { ...me, role: 'teacher' }],
      'GET /api/v1/challenges': [200, []],
      'GET /api/v1/classrooms': [200, []],
    });
    renderApp('/');
    expect(await screen.findByText('Classrooms')).toBeInTheDocument();
    expect(screen.getByText('My classes')).toBeInTheDocument();
    expect(screen.queryByText('Marketplace')).not.toBeInTheDocument();
  });
});
