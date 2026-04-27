/**
 * apps/mobile/src/features/search/components/search-onboarding-modal.tsx
 *
 * Modal fullscreen de onboarding de búsqueda — primera vez del comprador.
 * Inspiración: Tinder onboarding — selección visual rápida.
 *
 * Story 2.9 — Task 8 (AC: 1, 5, 8)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { GlassPanel } from '../../../components/ui/glass-panel';
import { Colors, Typography, Spacing } from '../../../lib/tokens';
import type { SearchPreferences } from '@reinder/shared';

// ─── Zone Chip ────────────────────────────────────────────────────────────────

function ZoneChip({
  zone,
  onRemove,
}: {
  zone: string;
  onRemove: () => void;
}) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{zone}</Text>
      <Pressable onPress={onRemove} hitSlop={8} testID={`remove-zone-${zone}`}>
        <Text style={styles.chipRemove}>×</Text>
      </Pressable>
    </View>
  );
}

// ─── PillSelector ─────────────────────────────────────────────────────────────

function PillSelector<T extends string | number>({
  options,
  selected,
  onSelect,
  formatLabel,
  testIDPrefix,
}: {
  options: T[];
  selected: T | null;
  onSelect: (v: T) => void;
  formatLabel?: (v: T) => string;
  testIDPrefix: string;
}) {
  return (
    <View style={styles.pillRow}>
      {options.map((opt) => (
        <Pressable
          key={String(opt)}
          onPress={() => onSelect(opt)}
          style={[styles.pill, selected === opt && styles.pillActive]}
          testID={`${testIDPrefix}-${opt}`}
        >
          <Text style={[styles.pillText, selected === opt && styles.pillTextActive]}>
            {formatLabel ? formatLabel(opt) : String(opt)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface SearchOnboardingModalProps {
  visible: boolean;
  /** Llamado al guardar preferencias */
  onSave: (prefs: SearchPreferences) => void;
  /** Llamado al saltar el onboarding */
  onSkip: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const PRICE_OPTIONS = [200000, 300000, 400000, 600000, 800000, 1000000];
const ROOM_OPTIONS = [1, 2, 3, 4];
const SQM_OPTIONS = [40, 60, 80, 100];

export function SearchOnboardingModal({
  visible,
  onSave,
  onSkip,
}: SearchOnboardingModalProps) {
  const [zoneInput, setZoneInput] = useState('');
  const [zones, setZones] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minRooms, setMinRooms] = useState<number | null>(null);
  const [minSqm, setMinSqm] = useState<number | null>(null);

  const canSave = zones.length > 0;

  function addZone() {
    const z = zoneInput.trim();
    if (z && zones.length < 5 && !zones.includes(z)) {
      setZones([...zones, z]);
      setZoneInput('');
    }
  }

  function removeZone(z: string) {
    setZones(zones.filter((x) => x !== z));
  }

  function handleSave() {
    const prefs: SearchPreferences = {
      zones,
      ...(maxPrice != null && { maxPrice }),
      ...(minRooms != null && { minRooms }),
      ...(minSqm != null && { minSqm }),
    };
    onSave(prefs);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
    >
      <GlassPanel intensity="heavy" style={styles.background} testID="search-modal-glass">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Text style={styles.title}>¿Qué estás buscando?</Text>
          <Text style={styles.subtitle}>
            Personalizamos tu feed para que swipees solo lo que importa
          </Text>

          {/* Zona — requerida */}
          <Text style={styles.sectionLabel}>Zona *</Text>
          <View style={styles.zoneInputRow}>
            <TextInput
              style={styles.zoneInput}
              value={zoneInput}
              onChangeText={setZoneInput}
              onSubmitEditing={addZone}
              placeholder="Ej: Malasaña, Chamberí…"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
              testID="zone-input"
            />
            <Pressable
              onPress={addZone}
              style={styles.addBtn}
              testID="add-zone-btn"
            >
              <Text style={styles.addBtnText}>+</Text>
            </Pressable>
          </View>
          <View style={styles.chipContainer}>
            {zones.map((z) => (
              <ZoneChip key={z} zone={z} onRemove={() => removeZone(z)} />
            ))}
          </View>

          {/* Precio máximo */}
          <Text style={styles.sectionLabel}>Precio máximo</Text>
          <PillSelector
            options={PRICE_OPTIONS}
            selected={maxPrice}
            onSelect={setMaxPrice}
            formatLabel={(v) => `${(v / 1000).toFixed(0)}k€`}
            testIDPrefix="price"
          />

          {/* Habitaciones mínimas */}
          <Text style={styles.sectionLabel}>Habitaciones mínimas</Text>
          <PillSelector
            options={ROOM_OPTIONS}
            selected={minRooms}
            onSelect={setMinRooms}
            formatLabel={(v) => `${v}+`}
            testIDPrefix="rooms"
          />

          {/* m² mínimos */}
          <Text style={styles.sectionLabel}>Metros cuadrados mínimos</Text>
          <PillSelector
            options={SQM_OPTIONS}
            selected={minSqm}
            onSelect={setMinSqm}
            formatLabel={(v) => `${v}+`}
            testIDPrefix="sqm"
          />

          {/* CTAs */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.primaryBtn, !canSave && styles.primaryBtnDisabled]}
            testID="save-button"
          >
            <Text style={styles.primaryBtnText}>Empezar a swipear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSkip}
            style={styles.ghostBtn}
            testID="skip-button"
          >
            <Text style={styles.ghostBtnText}>Ver todo el catálogo</Text>
          </TouchableOpacity>
        </ScrollView>
      </GlassPanel>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 72,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizeH1,
    fontWeight: `${Typography.weightBold}`,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizeBody,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: Typography.sizeSmall,
    fontWeight: `${Typography.weightMedium}`,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  zoneInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  zoneInput: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    color: Colors.textPrimary,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: Typography.sizeBody,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 26,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentPrimary + '22',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
  },
  chipText: {
    fontSize: Typography.sizeSmall,
    color: Colors.accentPrimary,
    fontWeight: `${Typography.weightMedium}`,
  },
  chipRemove: {
    fontSize: 16,
    color: Colors.accentPrimary,
    lineHeight: 18,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgSurface,
  },
  pillActive: {
    backgroundColor: Colors.accentPrimary,
    borderColor: Colors.accentPrimary,
  },
  pillText: {
    fontSize: Typography.sizeBody,
    color: Colors.textMuted,
    fontWeight: `${Typography.weightMedium}`,
  },
  pillTextActive: {
    color: '#fff',
  },
  primaryBtn: {
    backgroundColor: Colors.accentPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: Typography.sizeBody,
    fontWeight: `${Typography.weightBold}`,
  },
  ghostBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: Spacing.sm,
  },
  ghostBtnText: {
    color: Colors.textMuted,
    fontSize: Typography.sizeBody,
  },
});
