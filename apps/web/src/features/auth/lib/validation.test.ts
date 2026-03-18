/**
 * apps/web/src/features/auth/lib/validation.test.ts
 *
 * Tests para validateRegisterInput.
 * Cubre los flujos de registro con email/contraseña de Story 1.3
 * y los casos de validación utilizados también en Story 1.4.
 */
import { describe, it, expect } from "vitest";
import { validateRegisterInput } from "./validation";

describe("validateRegisterInput", () => {
  it("retorna null cuando el input es válido", () => {
    const result = validateRegisterInput({
      email: "test@example.com",
      password: "password123",
      acceptedTc: true,
    });
    expect(result).toBeNull();
  });

  it("retorna error de email cuando el email está vacío", () => {
    const result = validateRegisterInput({
      email: "",
      password: "password123",
      acceptedTc: true,
    });
    expect(result).not.toBeNull();
    expect(result?.field).toBe("email");
  });

  it("retorna error de email cuando el formato es inválido", () => {
    const result = validateRegisterInput({
      email: "no-es-un-email",
      password: "password123",
      acceptedTc: true,
    });
    expect(result).not.toBeNull();
    expect(result?.field).toBe("email");
  });

  it("retorna error de contraseña cuando tiene menos de 8 caracteres", () => {
    const result = validateRegisterInput({
      email: "test@example.com",
      password: "corta",
      acceptedTc: true,
    });
    expect(result).not.toBeNull();
    expect(result?.field).toBe("password");
  });

  it("retorna error de contraseña cuando está vacía", () => {
    const result = validateRegisterInput({
      email: "test@example.com",
      password: "",
      acceptedTc: true,
    });
    expect(result).not.toBeNull();
    expect(result?.field).toBe("password");
  });

  it("retorna error de T&C cuando no están aceptados", () => {
    const result = validateRegisterInput({
      email: "test@example.com",
      password: "password123",
      acceptedTc: false,
    });
    expect(result).not.toBeNull();
    expect(result?.field).toBe("tc");
  });

  it("acepta contraseñas de exactamente 8 caracteres", () => {
    const result = validateRegisterInput({
      email: "test@example.com",
      password: "12345678",
      acceptedTc: true,
    });
    expect(result).toBeNull();
  });

  it("valida el email primero (precedencia de errores)", () => {
    const result = validateRegisterInput({
      email: "invalido",
      password: "corta",
      acceptedTc: false,
    });
    expect(result?.field).toBe("email");
  });
});
