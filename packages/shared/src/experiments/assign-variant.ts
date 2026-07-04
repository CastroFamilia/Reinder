/**
 * Motor de asignación determinístico — Story 9.1, AC4.
 *
 * Asigna una variante A/B de forma determinística usando FNV-1a hash.
 * NO hace DB lookup — función pura para uso en hot path del swipe feed.
 *
 * Algoritmo: FNV-1a(buyerId:experimentId) → bit menos significativo → par='a', impar='b'
 *
 * Nota: Se usa FNV-1a en lugar de SHA-256 (node:crypto) para compatibilidad
 * cross-platform (Node.js, React Native/Expo Go, browser). FNV-1a ofrece
 * distribución uniforme y determinismo suficiente para asignación A/B.
 *
 * Source: story 9-1-schema-experimentos-motor-asignacion-variantes.md (Task 5)
 */

/**
 * FNV-1a hash (32-bit) — hash no criptográfico con excelente distribución.
 * Referencia: http://www.isthe.com/chongo/tech/comp/fnv/
 */
function fnv1a32(input: string): number {
  let hash = 0x811c9dc5; // FNV offset basis (32-bit)
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // FNV prime (32-bit): 0x01000193 = 16777619
    // Usar Math.imul para multiplicación 32-bit correcta
    hash = Math.imul(hash, 0x01000193);
  }
  // Convertir a unsigned 32-bit
  return hash >>> 0;
}

/**
 * Asigna una variante de forma determinística usando FNV-1a hash.
 * NO hace DB lookup — función pura para uso en hot path del swipe feed.
 *
 * @param buyerId - UUID del comprador
 * @param experimentId - UUID del experimento
 * @returns 'a' | 'b'
 */
export function assignVariant(buyerId: string, experimentId: string): "a" | "b" {
  const hash = fnv1a32(`${buyerId}:${experimentId}`);

  // Bit menos significativo: par → 'a', impar → 'b'
  return hash % 2 === 0 ? "a" : "b";
}
