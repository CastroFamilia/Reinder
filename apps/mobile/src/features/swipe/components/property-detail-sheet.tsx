/**
 * apps/mobile/src/features/swipe/components/property-detail-sheet.tsx
 *
 * Bottom sheet modal con el detalle completo de una propiedad.
 * Se abre al pulsar el botón ⓘ o al hacer tap en la tarjeta (Story 2.5).
 *
 * - Usa Modal nativo de RN con animationType="slide" (efecto bottom-up — AC1, AC5)
 * - Interior: ScrollView con GlassPanel medium como fondo (AC2)
 * - Botones: "Me interesa" (Primary), "No me interesa" (Destructive), "Volver" (Ghost) (AC3, AC4)
 * - Gesto swipe-down del sistema cierra el modal vía onRequestClose (AC5)
 * - Bloque agente: hardcoded para MVP (Story 3.4 completará la integración real) (AC1)
 *
 * Source: epics.md#Story-2.5 AC1-AC5
 * Source: UX-DR10 (bottom sheet), UX-DR11 (jerarquía botones), UX-DR7 (GlassPanel)
 */
import React from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Listing } from '@reinder/shared';
import { GlassPanel } from '../../../components/ui/glass-panel';
import { PropertyBadge } from '../../../components/ui/property-badge';
import { Colors, Radius, Spacing, SurfaceColors, Typography } from '../../../lib/tokens';
import { MOCK_IMAGES } from '../../../lib/mock-images';

interface PropertyDetailSheetProps {
  visible: boolean;
  listing: Listing | null;
  onClose: () => void;
  onMatch: () => void;
  onReject: () => void;
  testID?: string;
}

/**
 * Formatea el precio en formato EUR español: €485.000
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Genera la línea de metadatos para el detalle.
 * Incluye garaje si está definido.
 */
function formatDetailMeta(listing: Listing): string {
  const parts: string[] = [];
  parts.push(`${listing.rooms} hab`);
  parts.push(`${listing.squareMeters} m²`);
  if (listing.floor) {
    parts.push(`Planta ${listing.floor}`);
  }
  if (listing.garage === true) {
    parts.push('Garaje incluido');
  } else if (listing.garage === false) {
    parts.push('Sin garaje');
  }
  return parts.join(' · ');
}

export function PropertyDetailSheet({
  visible,
  listing,
  onClose,
  onMatch,
  onReject,
  testID,
}: PropertyDetailSheetProps) {
  if (!listing) return null;

  const badge = listing.status === 'sold' ? 'VENDIDA' : listing.badge;
  const heroSource = MOCK_IMAGES[listing.id] ?? { uri: listing.imageUrl };
  const accessiblePrice = `Precio: ${formatPrice(listing.price)}`;

  /**
   * Llama onMatch() — el padre (SwipeScreen.handleDetailMatch) es responsable de
   * cerrar el sheet vía setIsDetailSheetVisible(false). NO llamar onClose() aquí:
   * evita el doble setState y el orden de operaciones incorrecto (CR Story 2.5 H1).
   */
  const handleMatch = () => {
    onMatch();
  };

  /**
   * Llama onReject() — mismo patrón que handleMatch.
   * El padre cierra el sheet, este componente no lo hace.
   */
  const handleReject = () => {
    onReject();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      testID={testID}
    >
      {/* Backdrop semitransparente — permite ver la tarjeta detrás */}
      <View style={styles.backdrop} testID={testID ? `${testID}-backdrop` : undefined}>
        {/* Sheet container anclado abajo */}
        <GlassPanel intensity="medium" style={styles.sheet}>
          {/* Handle visual superior (convención UI para bottom sheets) */}
          <View style={styles.handleWrapper} testID={testID ? `${testID}-handle` : undefined}>
            <View style={styles.handle} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Hero image */}
            <Image
              source={heroSource}
              style={styles.heroImage}
              resizeMode="cover"
              accessible
              accessibilityLabel={listing.imageAlt ?? `Foto de ${listing.title}`}
              testID={testID ? `${testID}-hero` : undefined}
            />

            <View style={styles.contentPadding}>
              {/* Badge de estado */}
              {badge && (
                <View style={styles.badgeWrapper}>
                  <PropertyBadge
                    type={badge}
                    testID={testID ? `${testID}-badge` : undefined}
                  />
                </View>
              )}

              {/* Precio */}
              <Text
                style={styles.price}
                accessibilityLabel={accessiblePrice}
                testID={testID ? `${testID}-price` : undefined}
              >
                {formatPrice(listing.price)}
              </Text>

              {/* Nombre de la propiedad */}
              <Text
                style={styles.title}
                testID={testID ? `${testID}-title` : undefined}
              >
                {listing.title}
              </Text>

              {/* Dirección / ubicación */}
              <Text
                style={styles.location}
                testID={testID ? `${testID}-location` : undefined}
              >
                📍 {listing.location}
              </Text>

              {/* Metadatos: hab, m², planta, garaje */}
              <Text
                style={styles.meta}
                testID={testID ? `${testID}-meta` : undefined}
              >
                {formatDetailMeta(listing)}
              </Text>

              {/* Separador */}
              <View style={styles.separator} />

              {/* Descripción */}
              <Text style={styles.sectionLabel}>Descripción</Text>
              <Text
                style={styles.description}
                testID={testID ? `${testID}-description` : undefined}
              >
                {listing.description ?? 'Sin descripción disponible'}
              </Text>

              {/* Separador */}
              <View style={styles.separator} />

              {/* Bloque agente — MVP hardcoded (Story 3.4 completará esto) */}
              <Text style={styles.sectionLabel}>Tu agente representante</Text>
              <View
                style={styles.agentBlock}
                accessible
                accessibilityLabel="Información del agente representante"
                testID={testID ? `${testID}-agent` : undefined}
              >
                <Text style={styles.agentPlaceholder}>
                  ¿Tienes un agente? Pídele tu link de Reinder
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Botones de acción — fijos en la parte inferior del sheet */}
          <View style={styles.actionsContainer}>
            {/* Botón "No me interesa" — Destructive (glass + borde accentReject) */}
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
              accessibilityLabel="No me interesa"
              accessibilityRole="button"
              accessibilityHint="Descarta esta propiedad"
              testID={testID ? `${testID}-reject-btn` : undefined}
            >
              <Text style={[styles.actionButtonText, styles.rejectButtonText]}>
                No me interesa
              </Text>
            </TouchableOpacity>

            {/* Botón "Me interesa" — Primary naranja (UX-DR11) */}
            <TouchableOpacity
              style={[styles.actionButton, styles.matchButton]}
              onPress={handleMatch}
              accessibilityLabel="Me interesa"
              accessibilityRole="button"
              accessibilityHint="Hace match con esta propiedad"
              testID={testID ? `${testID}-match-btn` : undefined}
            >
              <Text style={[styles.actionButtonText, styles.matchButtonText]}>
                Me interesa
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botón "Volver" — Ghost: solo texto naranja (UX-DR11) */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Volver"
            accessibilityRole="button"
            accessibilityHint="Cierra el detalle y regresa a la tarjeta"
            testID={testID ? `${testID}-close-btn` : undefined}
          >
            <Text style={styles.closeButtonText}>Volver</Text>
          </TouchableOpacity>
        </GlassPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Backdrop semitransparente
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },

  // Sheet — anclado en la parte inferior, máximo 88% de pantalla
  sheet: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '88%',
    overflow: 'hidden',
  },

  // Handle visual superior (estándar bottom sheet)
  handleWrapper: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  // ScrollView
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.sm,
  },

  // Hero image
  heroImage: {
    width: '100%',
    height: 220,
  },

  // Padding del contenido de texto
  contentPadding: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },

  badgeWrapper: {
    marginBottom: Spacing.sm,
  },

  // Precio — Clash Display / Typography.sizeDisplay (32), naranja
  price: {
    color: Colors.accentPrimary,
    fontSize: Typography.sizeDisplay,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },

  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizeH2,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },

  location: {
    color: Colors.textMuted,
    fontSize: Typography.sizeBody,
    marginBottom: Spacing.xs,
  },

  meta: {
    color: Colors.textMuted,
    fontSize: Typography.sizeSmall,
    marginBottom: Spacing.md,
  },

  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },

  sectionLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizeSmall,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },

  description: {
    color: Colors.textPrimary,
    fontSize: Typography.sizeBody,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },

  // Bloque agente MVP
  agentBlock: {
    backgroundColor: SurfaceColors.bgSurfaceOverlay,
    borderRadius: Radius.btn,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  agentPlaceholder: {
    color: Colors.textMuted,
    fontSize: Typography.sizeBody,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Contenedor de botones principales
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },

  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.btn,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },

  // "No me interesa" — Destructive (glass + borde accentReject — UX-DR11)
  rejectButton: {
    backgroundColor: SurfaceColors.bgSurfaceOverlay,
    borderColor: Colors.accentReject,
  },
  rejectButtonText: {
    color: Colors.accentReject,
  },

  // "Me interesa" — Primary naranja sólido (UX-DR11)
  matchButton: {
    backgroundColor: Colors.accentPrimary,
    borderColor: Colors.accentPrimary,
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  matchButtonText: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },

  actionButtonText: {
    fontSize: Typography.sizeBody,
    fontWeight: '600',
  },

  // "Volver" — Ghost: solo texto naranja (UX-DR11)
  closeButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  closeButtonText: {
    color: Colors.accentPrimary,
    fontSize: Typography.sizeBody,
    fontWeight: '500',
  },
});
