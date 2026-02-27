# turbo-elysia-react

Example repo for setting up turborepo, elysia, drizzle-orm, better-auth, react (vite), tanstack router, shadcnui and tailwindcss.

Review and update your auth cofig (`apps/api/src/lib/auth.ts`) if you plan on using this. Check out [better-auth documentation](https://www.better-auth.com/docs) for more info.

## Stack

**Monorepo**
- [Turborepo](https://turborepo.dev/)

**Backend** (`apps/api`)
- [Elysia](https://elysiajs.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Better Auth](https://www.better-auth.com/)

**Frontend** (`apps/web`)
- React + Vite
- [TanStack Router](https://tanstack.com/router)
- [TanStack Query](https://tanstack.com/query)
- Tailwind CSS
- [shadcn/ui](https://ui.shadcn.com/)
- [@elysiajs/eden](https://elysiajs.com/eden/overview): end-to-end type-safe API client from Elysia

**Tooling**
- [Biome](https://biomejs.dev/): formatting and linting in one tool (replaces eslint+prettier)
- Bun

Also includes a `.vscode/settings.json` file with recommended settings from tanstack router.

## Usage

Bootstrap a new project with degit (no git history included):

```bash
bunx degit veotaar/turbo-elysia-react my-new-project

cd my-new-project

git init
```

## Getting Started

**1. Install dependencies**

```bash
bun install
```

**2. Configure the API environment**

```bash
cp apps/api/.env.example apps/api/.env
```

Then edit `apps/api/.env`:

```env
PORT=3000
DATABASE_URL=postgres://postgres:password@localhost:5432/your_db
BETTER_AUTH_SECRET=    # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
```

**3. Push the database schema**

```bash
cd apps/api
```

```bash
bunx --bun drizzle-kit generate
bunx --bun drizzle-kit migrate
```
or
```bash
bunx --bun drizzle-kit push
```

**4. Start the development servers**

```bash
bun dev
```

| App | URL |
|-----|-----|
| API | http://localhost:3000 |
| API docs (OpenAPI) | http://localhost:3000/api/openapi |
| Web | http://localhost:5173 |

**5. You can use drizzle studio**

```bash
cd apps/api
```
```bash
bunx --bun drizzle-kit studio
```
go to https://local.drizzle.studio/ to use drizzle studio

## Project Structure

```
apps/
  api/        # Elysia backend
  web/        # React frontend
packages/
  typescript-config/   # Shared TS configs
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Run all apps in development mode |
| `bun build` | Build all apps |
| `bun check-types` | Type-check all packages |
| `bun format-and-lint` | Check formatting and linting |
| `bun format-and-lint:fix` | Auto-fix formatting and linting issues |