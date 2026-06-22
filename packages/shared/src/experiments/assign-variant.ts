/**
 * Motor de asignación determinístico — Story 9.1, AC4.
 *
 * Asigna una variante A/B de forma determinística usando SHA-256.
 * NO hace DB lookup — función pura para uso en hot path del swipe feed.
 *
 * Algoritmo: SHA-256(buyerId:experimentId) → primer byte → par='a', impar='b'
 *
 * Source: story 9-1-schema-experimentos-motor-asignacion-variantes.md (Task 5)
 */
import { createHash } from "node:crypto";

/**
 * Asigna una variante de forma determinística usando SHA-256.
 * NO hace DB lookup — función pura para uso en hot path del swipe feed.
 *
 * @param buyerId - UUID del comprador
 * @param experimentId - UUID del experimento
 * @returns 'a' | 'b'
 */
export function assignVariant(buyerId: string, experimentId: string): "a" | "b" {
  const hash = createHash("sha256")
    .update(`${buyerId}:${experimentId}`)
    .digest();

  // Primer byte: par → 'a', impar → 'b'
  return hash[0] % 2 === 0 ? "a" : "b";
}
