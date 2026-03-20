/**
 * apps/web/src/features/auth/lib/route-guard.lib.test.ts
 *
 * Tests para getSafeNextPath() — Story 1.6.
 * Verifica que el parámetro `next` se sanitiza correctamente para
 * prevenir open redirects y loops de autenticación.
 */
import { describe, it, expect } from "vitest";
import { getSafeNextPath } from "./route-guard.lib";

describe("getSafeNextPath", () => {
  // ── Casos válidos ────────────────────────────────────────────────────────

  it("devuelve el path cuando es válido y empieza por /", () => {
    expect(getSafeNextPath("/swipe")).toBe("/swipe");
  });

  it("devuelve paths anidados correctamente", () => {
    expect(getSafeNextPath("/agent/clientes")).toBe("/agent/clientes");
  });

  it("devuelve paths con query string correctamente", () => {
    expect(getSafeNextPath("/matches?filter=new")).toBe("/matches?filter=new");
  });

  // ── Casos nulos / vacíos ─────────────────────────────────────────────────

  it("devuelve null cuando next es undefined", () => {
    expect(getSafeNextPath(undefined)).toBeNull();
  });

  it("devuelve null cuando next es null", () => {
    expect(getSafeNextPath(null)).toBeNull();
  });

  it("devuelve null cuando next es string vacío", () => {
    expect(getSafeNextPath("")).toBeNull();
  });

  // ── Prevención de open redirect ──────────────────────────────────────────

  it("devuelve null si next no empieza por / (URL absoluta externa)", () => {
    expect(getSafeNextPath("http://evil.com")).toBeNull();
  });

  it("devuelve null si next es URL con protocolo https", () => {
    expect(getSafeNextPath("https://malicious.com/steal")).toBeNull();
  });

  it("devuelve null si next es path relativo sin /", () => {
    expect(getSafeNextPath("swipe")).toBeNull();
  });

  // ── Prevención de auth loops ─────────────────────────────────────────────

  it("devuelve null si next es /login (previene loop)", () => {
    expect(getSafeNextPath("/login")).toBeNull();
  });

  it("devuelve null si next empieza por /login/ con subruta", () => {
    expect(getSafeNextPath("/login?next=/swipe")).toBeNull();
  });

  it("devuelve null si next es /register", () => {
    expect(getSafeNextPath("/register")).toBeNull();
  });

  it("devuelve null si next empieza por /auth", () => {
    expect(getSafeNextPath("/auth/callback")).toBeNull();
  });

  // ── Garantía de resultado seguro ─────────────────────────────────────────

  it("los resultados no-null siempre empiezan por /", () => {
    const validPaths = ["/swipe", "/agent", "/matches", "/agency/listings"];
    validPaths.forEach((path) => {
      const result = getSafeNextPath(path);
      if (result !== null) {
        expect(result).toMatch(/^\//);
      }
    });
  });
});
