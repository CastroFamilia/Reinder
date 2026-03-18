/**
 * apps/web/src/features/auth/lib/login.lib.test.ts
 *
 * Tests para getRedirectPathForRole() — Story 1.5.
 * Verifica que cada rol RBAC recibe la ruta de panel correcta.
 */
import { describe, it, expect } from "vitest";
import { getRedirectPathForRole } from "./login.lib";

describe("getRedirectPathForRole", () => {
  it("redirige buyer a /swipe", () => {
    expect(getRedirectPathForRole("buyer")).toBe("/swipe");
  });

  it("redirige agent a /agent", () => {
    expect(getRedirectPathForRole("agent")).toBe("/agent");
  });

  it("redirige agency_admin a /agency/listings", () => {
    expect(getRedirectPathForRole("agency_admin")).toBe("/agency/listings");
  });

  it("redirige platform_admin a /admin", () => {
    expect(getRedirectPathForRole("platform_admin")).toBe("/admin");
  });

  it("usa /swipe como fallback cuando role es undefined (sin perfil en DB)", () => {
    expect(getRedirectPathForRole(undefined)).toBe("/swipe");
  });

  it("el resultado siempre empieza con '/' (path interno seguro)", () => {
    const roles = ["buyer", "agent", "agency_admin", "platform_admin", undefined] as const;
    roles.forEach((role) => {
      expect(getRedirectPathForRole(role)).toMatch(/^\//);
    });
  });
});
