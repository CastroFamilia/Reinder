/**
 * apps/mobile/src/features/search/components/search-filters-modal.tsx
 *
 * Bottom sheet compacto para editar filtros de búsqueda en cualquier momento.
 * Accesible desde el botón ⚙️ en SwipeScreen (Story 2.9 AC4).
 *
 * Story 2.9 — Task 9 (AC: 4)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  TextInput,
} from 'react-native';
import { GlassPanel } from '../../../components/ui/glass-panel';
import { Colors, Typography, Spacing } from '../../../lib/tokens';
import type { SearchPreferences } from '@reinder/shared';

interface SearchFiltersModalProps {
  visible: boolean;
  /** Preferencias actuales para pre-rellenar */
  currentPreferences?: SearchPreferences | null;
  /** Llamado al guardar cambios */
  onSave: (prefs: SearchPreferences) => void;
  /** Llamado al cerrar sin guardar */
  onClose: () => void;
}

const ROOM_OPTIONS = [1, 2, 3, 4];
const SQM_OPTIONS = [40, 60, 80, 100];

export function SearchFiltersModal({
  visible,
  currentPreferences,
  onSave,
  onClose,
}: SearchFiltersModalProps) {
  const [zones, setZones] = useState<string[]>(currentPreferences?.zones ?? []);
  const [zoneInput, setZoneInput] = useState('');
  const [maxPrice, setMaxPrice] = useState<number | null>(currentPreferences?.maxPrice ?? null);
  const [minRooms, setMinRooms] = useState<number | null>(currentPreferences?.minRooms ?? null);
  const [minSqm, setMinSqm] = useState<number | null>(currentPreferences?.minSqm ?? null);

  // Sincronizar con preferencias actuales cuando se abre el modal
  useEffect(() => {
    if (visible && currentPreferences) {
      setZones(currentPreferences.zones ?? []);
      setMaxPrice(currentPreferences.maxPrice ?? null);
      setMinRooms(currentPreferences.minRooms ?? null);
      setMinSqm(currentPreferences.minSqm ?? null);
    }
  }, [visible, currentPreferences]);

  function addZone() {
    const z = zoneInput.trim();
    if (z && !zones.includes(z) && zones.length < 5) {
      setZones([...zones, z]);
      setZoneInput('');
    }
  }

  function handleSave() {
    const prefs: SearchPreferences = {
      zones: zones.length > 0 ? zones : [],
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
      transparent
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose} testID="overlay" />
      <GlassPanel intensity="medium" style={styles.sheet} testID="filters-modal-glass">
        <View style={styles.handle} />

        <Text style={styles.title}>Editar búsqueda</Text>

        {/* Zona */}
        <Text style={styles.label}>Zona</Text>
        <View style={styles.zoneInputRow}>
          <TextInput
            style={styles.input}
            value={zoneInput}
            onChangeText={setZoneInput}
            onSubmitEditing={addZone}
            placeholder="Añadir zona…"
            placeholderTextColor={Colors.textMuted}
            testID="zone-input-filter"
          />
          <Pressable onPress={addZone} style={styles.addBtn} testID="add-zone-filter-btn">
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>
        <View style={styles.chips}>
          {zones.map((z) => (
            <Pressable
              key={z}
              onPress={() => setZones(zones.filter((x) => x !== z))}
              style={styles.chip}
              testID={`filter-zone-chip-${z}`}
            >
              <Text style={styles.chipText}>{z} ×</Text>
            </Pressable>
          ))}
        </View>

        {/* Habitaciones */}
        <Text style={styles.label}>Habitaciones mínimas</Text>
        <View style={styles.pillRow}>
          {ROOM_OPTIONS.map((r) => (
            <Pressable
              key={r}
              onPress={() => setMinRooms(minRooms === r ? null : r)}
              style={[styles.pill, minRooms === r && styles.pillActive]}
              testID={`filter-rooms-${r}`}
            >
              <Text style={[styles.pillText, minRooms === r && styles.pillTextActive]}>
                {r}+
              </Text>
            </Pressable>
          ))}
        </View>

        {/* m² */}
        <Text style={styles.label}>Metros cuadrados</Text>
        <View style={styles.pillRow}>
          {SQM_OPTIONS.map((s) => (
            <Pressable
              key={s}
              onPress={() => setMinSqm(minSqm === s ? null : s)}
              style={[styles.pill, minSqm === s && styles.pillActive]}
              testID={`filter-sqm-${s}`}
            >
              <Text style={[styles.pillText, minSqm === s && styles.pillTextActive]}>
                {s}+
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Botones */}
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} testID="filter-save-btn">
          <Text style={styles.saveBtnText}>Aplicar filtros</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={styles.cancelBtn} testID="filter-cancel-btn">
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </GlassPanel>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizeH2,
    fontWeight: `${Typography.weightBold}`,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizeSmall,
    color: Colors.textMuted,
    fontWeight: `${Typography.weightMedium}`,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  zoneInputRow: { flexDirection: 'row', gap: Spacing.sm },
  input: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    color: Colors.textPrimary,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: Typography.sizeBody,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { fontSize: 22, color: '#fff', fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: Colors.accentPrimary + '22',
  },
  chipText: { fontSize: Typography.sizeSmall, color: Colors.accentPrimary },
  pillRow: { flexDirection: 'row', gap: Spacing.sm },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgSurface,
  },
  pillActive: { backgroundColor: Colors.accentPrimary, borderColor: Colors.accentPrimary },
  pillText: { fontSize: Typography.sizeBody, color: Colors.textMuted },
  pillTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: Colors.accentPrimary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  saveBtnText: { color: '#fff', fontSize: Typography.sizeBody, fontWeight: `${Typography.weightBold}` },
  cancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: Spacing.xs },
  cancelBtnText: { color: Colors.textMuted, fontSize: Typography.sizeBody },
});
