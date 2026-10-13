# Test plan and coverage map

## Included tests

| Area | File | Main behaviors |
|---|---|---|
| Auth service | `src/modules/auth/auth.service.spec.ts` | Signup token issuance, successful login, invalid credentials, refresh token issuance |
| Users service | `src/modules/users/users.service.spec.ts` | User lookup, missing records, list filtering, empty updates, profile update, password hashing call |
| Auth guard | `src/modules/auth/guards/auth.guard.spec.ts` | Public route bypass, missing/malformed bearer token, invalid token, token-type checks, request identity |
| Roles guard | `src/modules/auth/guards/roles.guard.spec.ts` | No metadata, allowed role, forbidden role, missing identity |
| Configuration | `src/config/config.service.spec.ts` | Required environment variables, port validation, secret length and separation |
| HTTP smoke tests | `test/app.e2e-spec.ts` | Health, signup/signin routing, invalid DTO rejection |

## Run

```bash
npm test -- --runInBand
npm run test:cov
npm run test:e2e -- --runInBand
```

## Before relying on the suite

1. Run the tests in the repository's actual Node/npm environment. This pack has not been executed against your local checkout.
2. Ensure the Jest/ts-jest versions are compatible; the repository currently declares Jest 30 and ts-jest 29.
3. Add tests for unique-email conflicts, soft deletion, role metadata precedence, refresh-token secret selection, and DTO edge cases.
4. Add integration tests against a disposable PostgreSQL database for migrations, unique constraints, soft-delete behavior, and persistence.
5. Add CI to run formatting/linting, `npm run build`, unit tests, and e2e tests.
