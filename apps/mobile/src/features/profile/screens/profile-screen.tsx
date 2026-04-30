/**
 * apps/mobile/src/features/profile/screens/profile-screen.tsx
 *
 * Pantalla de Perfil del comprador.
 * Muestra las preferencias de búsqueda activas y permite editarlas
 * abriendo el SearchFiltersModal existente.
 *
 * Story 2.8 — Task 1 (AC: 1)
 * Post-testing fix: parámetros de búsqueda visibles y editables desde el perfil.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { ScreenBackground } from '../../../components/layout/screen-background';
import { GlassPanel } from '../../../components/ui/glass-panel';
import { Colors, Typography, Spacing, Radius } from '../../../lib/tokens';
import { useSearchStore } from '../../../stores/use-search-store';
import { useAuthSession } from '../../../hooks/useAuthSession';
import { SearchFiltersModal } from '../../search/components/search-filters-modal';
import type { SearchPreferences } from '@reinder/shared';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
}

// ─── PreferenceRow ───────────────────────────────────────────────────────────

function PreferenceRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.prefRow}>
      <Text style={styles.prefLabel}>{label}</Text>
      <Text style={styles.prefValue}>{value}</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const { session } = useAuthSession();
  const { preferences, setPreferences } = useSearchStore();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const handleSavePreferences = useCallback(
    async (prefs: SearchPreferences) => {
      const token = session?.access_token ?? '';
      await setPreferences(prefs, token);
      setIsFiltersOpen(false);
    },
    [setPreferences, session?.access_token],
  );

  const hasPrefs = preferences != null;

  return (
    <ScreenBackground testID="profile-screen">
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} testID="profile-title">
              Mi Perfil
            </Text>
            <Text style={styles.subtitle}>Comprador</Text>
          </View>

          {/* Sección: Mi Búsqueda */}
          <GlassPanel intensity="light" style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Mi búsqueda</Text>
                <Text style={styles.sectionSubtitle}>
                  {hasPrefs ? 'Preferencias activas' : 'Sin filtros — viendo todo el catálogo'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setIsFiltersOpen(true)}
                testID="edit-search-btn"
                accessibilityLabel="Editar preferencias de búsqueda"
                accessibilityRole="button"
              >
                <Text style={styles.editBtnText}>Editar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.separator} />

            {hasPrefs ? (
              <View style={styles.prefList}>
                {preferences.zones.length > 0 && (
                  <PreferenceRow
                    label="Zonas"
                    value={preferences.zones.join(', ')}
                  />
                )}
                {preferences.maxPrice != null && (
                  <PreferenceRow
                    label="Precio máximo"
                    value={formatPrice(preferences.maxPrice)}
                  />
                )}
                {preferences.minRooms != null && (
                  <PreferenceRow
                    label="Habitaciones mínimas"
                    value={`${preferences.minRooms}+`}
                  />
                )}
                {preferences.minSqm != null && (
                  <PreferenceRow
                    label="Metros mínimos"
                    value={`${preferences.minSqm} m²`}
                  />
                )}
              </View>
            ) : (
              <View style={styles.noPrefsContainer}>
                <Text style={styles.noPrefsEmoji}>🔍</Text>
                <Text style={styles.noPrefsText}>
                  Establece tus preferencias para recibir un feed personalizado
                </Text>
                <TouchableOpacity
                  style={styles.setupBtn}
                  onPress={() => setIsFiltersOpen(true)}
                  testID="setup-search-btn"
                >
                  <Text style={styles.setupBtnText}>Configurar búsqueda</Text>
                </TouchableOpacity>
              </View>
            )}
          </GlassPanel>

          {/* Sección: Información de sesión */}
          <GlassPanel intensity="light" style={[styles.section, styles.sessionSection]}>
            <Text style={styles.sectionTitle}>Sesión</Text>
            <View style={styles.separator} />
            <PreferenceRow
              label="Estado"
              value={session ? 'Conectado' : 'Sin sesión'}
            />
            {session?.user?.email && (
              <PreferenceRow label="Email" value={session.user.email} />
            )}
          </GlassPanel>
        </ScrollView>
      </SafeAreaView>

      {/* Modal de edición de filtros */}
      <SearchFiltersModal
        visible={isFiltersOpen}
        currentPreferences={preferences}
        onSave={handleSavePreferences}
        onClose={() => setIsFiltersOpen(false)}
      />
    </ScreenBackground>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizeH1,
    fontWeight: `${Typography.weightBold}`,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: Typography.sizeBody,
    color: Colors.accentPrimary,
    fontWeight: `${Typography.weightMedium}`,
  },
  section: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  sessionSection: {
    marginTop: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: Typography.sizeBody,
    fontWeight: `${Typography.weightBold}`,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: Typography.sizeSmall,
    color: Colors.textMuted,
  },
  editBtn: {
    backgroundColor: Colors.accentPrimary,
    borderRadius: Radius.btn,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
  },
  editBtnText: {
    fontSize: Typography.sizeSmall,
    fontWeight: `${Typography.weightBold}`,
    color: '#fff',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: Spacing.sm,
  },
  prefList: {
    gap: Spacing.xs,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  prefLabel: {
    fontSize: Typography.sizeSmall,
    color: Colors.textMuted,
    flex: 1,
  },
  prefValue: {
    fontSize: Typography.sizeSmall,
    fontWeight: `${Typography.weightMedium}`,
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
  },
  noPrefsContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  noPrefsEmoji: {
    fontSize: 36,
  },
  noPrefsText: {
    fontSize: Typography.sizeSmall,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  setupBtn: {
    borderWidth: 1,
    borderColor: Colors.accentPrimary,
    borderRadius: Radius.btn,
    paddingVertical: 8,
    paddingHorizontal: Spacing.lg,
  },
  setupBtnText: {
    fontSize: Typography.sizeSmall,
    color: Colors.accentPrimary,
    fontWeight: `${Typography.weightMedium}`,
  },
});
