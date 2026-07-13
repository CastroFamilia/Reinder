/**
 * apps/mobile/src/types/optional-modules.d.ts
 *
 * Declaraciones de tipo para módulos opcionales que pueden no estar instalados.
 * Estos módulos se cargan dinámicamente (import('expo-av').catch(() => null))
 * para que el app no crashee si no están disponibles.
 *
 * expo-av: SFX de match en MatchPayoff (Story 2.3).
 * Si se instala expo-av correctamente, estas declaraciones son ignoradas
 * porque el propio módulo provee sus tipos.
 */

// Declaración mínima para que TypeScript compile sin expo-av instalado.
// Solo incluye los métodos que usa match-payoff.tsx.
declare module 'expo-av' {
  export namespace Audio {
    export namespace Sound {
      export function createAsync(
        source: unknown,
      ): Promise<{
        sound: {
          playAsync(): Promise<void>;
          unloadAsync(): Promise<void>;
          setOnPlaybackStatusUpdate(
            cb: (status: { isLoaded: boolean; didJustFinish?: boolean }) => void,
          ): void;
        };
      }>;
    }
  }
}
