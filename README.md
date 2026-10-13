# NestJS Boilerplate

A modular NestJS REST API starter built with TypeScript, PostgreSQL, TypeORM, JWT authentication, role-based authorization, request validation, Swagger dependencies, and Jest.

> **Status:** starter template, not yet production-ready. Review the security and testing notes below before deploying it.

## Features

- NestJS 11 and TypeScript
- PostgreSQL persistence through TypeORM
- Environment-based configuration with required-value and JWT-secret checks
- Signup and signin endpoints
- JWT access and refresh tokens
- Public-route and refresh-route decorators
- Role-based authorization guard
- User profile read/update endpoints
- DTO validation through a global `ValidationPipe`
- Helmet security headers and configurable CORS origins
- TypeORM migrations
- Jest unit-test and Supertest end-to-end test tooling

## Requirements

- Node.js compatible with your installed NestJS 11 toolchain
- npm
- PostgreSQL
- A configured `.env` file

## Getting started

```bash
git clone https://github.com/omar-azzam-eng/nestjs_boiler_plate.git
cd nestjs_boiler_plate
npm ci
cp .env.example .env
```

Edit `.env` and set a local PostgreSQL database and two **different** high-entropy JWT secrets. Generate secrets, for example:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Use a different generated value for each secret. Do not commit `.env`.

```dotenv
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=replace-me
POSTGRES_DB=boilerplate
CORS_ORIGINS=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret
```

Run migrations before starting the API:

```bash
npm run migration:run
```

Development and production commands:

```bash
npm run start:dev
npm run build
npm run start:prod
```

The app listens on `0.0.0.0` and uses `PORT` if set, otherwise `3000`.

## API overview

| Method | Route | Purpose | Authentication |
|---|---|---|---|
| `GET` | `/auth/health` | Basic health response | Public |
| `POST` | `/auth/signup` | Create a customer account | Public |
| `POST` | `/auth/signin` | Sign in and issue tokens | Public |
| `GET` | `/auth/refresh` | Issue a new token pair | Refresh token |
| `GET` | `/users` | Get the current user's profile | Access token |
| `PUT` | `/users` | Update the current user's profile | Access token |

Authentication uses `Authorization: Bearer <token>`. The token response currently contains `token` and `refreshToken`.

Example signup request:

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"person@example.com","password":"ReplaceWithAStrongPassword123!"}'
```

DTO validation rules apply; use a strong password and a valid email address. Phone validation currently defaults to Syria (`SY`).

## Project structure

```text
src/
├── app.module.ts
├── main.ts
├── config/
│   ├── config.module.ts
│   ├── config.service.ts
│   └── dtos/
├── migrations/
├── modules/
│   ├── auth/
│   │   ├── decorators/
│   │   ├── dtos/
│   │   ├── guards/
│   │   ├── auth.controller.ts
│   │   ├── auth.model.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   └── users/
│       ├── dtos/
│       ├── entities/
│       ├── users.controller.ts
│       ├── users.module.ts
│       └── users.service.ts
├── types/
└── utils/
test/
└── app.e2e-spec.ts
```

## Tests

Run the existing test commands:

```bash
npm test
npm run test:watch
npm run test:cov
npm run test:e2e
```

The test additions in this review pack are provided as a patch-style folder overlay. Copy the included `src/**/*.spec.ts` files into the matching paths in your repository and copy `test/app.e2e-spec.ts` to replace the starter smoke test. Run unit tests separately from e2e tests. The included e2e tests build a lightweight testing module with mocked services and do not require a live PostgreSQL database.

The repository's Jest unit configuration uses `rootDir: "src"` and `testRegex: ".*\\.spec\\.ts$"`. E2E tests use `test/jest-e2e.json`. Keep those configurations aligned with the test file locations.

## Important limitations to address

- Refresh tokens are stateless and are not stored, rotated against a persisted session, or revocable. A stolen refresh token remains usable until expiration.
- Consider changing refresh from `GET /auth/refresh` to `POST /auth/refresh`.
- There is no visible rate limiting for signup/signin/refresh. Add throttling at the application, reverse-proxy, or API-gateway layer.
- Review role changes and account deactivation: current JWT role claims may remain valid until token expiration.
- Add pagination to any future list endpoint and avoid returning sensitive entity fields from service/controller responses.
- Keep `synchronize: false` in production and use reviewed migrations.
- Configure a restrictive production CORS allow-list; never assume CORS is an authentication control.
- Add CI that runs lint, build, unit tests, and e2e tests on pull requests.
- Check dependency advisories and update dependencies deliberately.

## License

The upstream package currently declares `UNLICENSED`. Choose and add an explicit license before distributing or inviting external contributions.
