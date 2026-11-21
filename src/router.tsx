import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { AppLayout } from './components/AppLayout';
import { AccountPage } from './pages/AccountPage';
import { CatalogPage } from './pages/CatalogPage';
import { CatalogSourcesPage } from './pages/CatalogSourcesPage';
import { ChallengePage } from './pages/ChallengePage';
import { LoginPage } from './pages/LoginPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { UsersPage } from './pages/UsersPage';

// Every page is a child of the root route, so it renders inside AppLayout.
const rootRoute = createRootRoute({ component: AppLayout, notFoundComponent: NotFoundPage });

const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: CatalogPage,
});
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});
const challengeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/challenges/$name',
  component: ChallengePage,
});

const marketplaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/marketplace',
  component: MarketplacePage,
});
const catalogSourcesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/catalogs',
  component: CatalogSourcesPage,
});

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/account',
  component: AccountPage,
});
const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/users',
  component: UsersPage,
});

export const routeTree = rootRoute.addChildren([
  catalogRoute,
  loginRoute,
  challengeRoute,
  marketplaceRoute,
  catalogSourcesRoute,
  accountRoute,
  usersRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
