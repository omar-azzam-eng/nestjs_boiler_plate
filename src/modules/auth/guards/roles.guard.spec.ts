import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRoleEnum } from '../../users/entities/user.entity';

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  const contextFor = (user?: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows routes with an empty role list', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    expect(guard.canActivate(contextFor())).toBe(true);
  });

  it('rejects a user without a role when a role is required', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRoleEnum.ADMIN]);

    expect(() => guard.canActivate(contextFor({ id: 'u1' }))).toThrow(
      ForbiddenException,
    );
  });

  it('allows routes with no role metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contextFor())).toBe(true);
  });

  it('allows a user with a required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRoleEnum.CUSTOMER]);

    expect(
      guard.canActivate(contextFor({ id: 'u1', role: UserRoleEnum.CUSTOMER })),
    ).toBe(true);
  });

  it('rejects a user with a different role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRoleEnum.ADMIN]);

    expect(() =>
      guard.canActivate(contextFor({ id: 'u1', role: UserRoleEnum.CUSTOMER })),
    ).toThrow(ForbiddenException);
  });

  it('rejects a missing user when a role is required', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRoleEnum.ADMIN]);

    expect(() => guard.canActivate(contextFor())).toThrow(ForbiddenException);
  });
});
