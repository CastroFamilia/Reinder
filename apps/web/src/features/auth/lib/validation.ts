/**
 * apps/web/src/features/auth/lib/validation.ts
 *
 * Funciones de validación para los formularios de autenticación.
 */

export interface RegisterInput {
  email: string;
  password: string;
  acceptedTc: boolean;
}

export interface ValidationError {
  field: "email" | "password" | "tc";
  message: string;
}

/**
 * Valida los datos del formulario de registro.
 * @returns null si todo es válido, o el primer error encontrado.
 */
export function validateRegisterInput(
  input: RegisterInput
): ValidationError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.email || !emailRegex.test(input.email)) {
    return { field: "email", message: "Introduce un email válido." };
  }

  if (!input.password || input.password.length < 8) {
    return {
      field: "password",
      message: "La contraseña debe tener al menos 8 caracteres.",
    };
  }

  if (!input.acceptedTc) {
    return {
      field: "tc",
      message: "Debes aceptar los Términos y Condiciones para continuar.",
    };
  }

  return null;
}
