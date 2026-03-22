/**
 * apps/mobile/src/lib/mock-images.ts
 *
 * Mapa de imágenes locales para los listings de ejemplo.
 * Generadas por AI — fachadas de casas en Madrid, formato vertical.
 *
 * Uso: PropertyCard comprueba si hay una imagen local para el listingId
 * antes de cargar la imageUrl remota.
 *
 * Nota: los archivos PNG están en apps/mobile/assets/images/
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const MOCK_IMAGES: Record<string, ReturnType<typeof require>> = {
  'listing-1': require('../../assets/images/listing-1.png'),
  'listing-2': require('../../assets/images/listing-2.png'),
  'listing-3': require('../../assets/images/listing-3.png'),
  'listing-4': require('../../assets/images/listing-4.png'),
  'listing-5': require('../../assets/images/listing-5.png'),
};
