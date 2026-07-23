import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Alert } from 'react-native';
import { Colors, Typography, Spacing } from '../../../lib/tokens';
import { supabase } from '../../../lib/supabase';
import { useAuthSession } from '../../../hooks/useAuthSession';

export function PersonalizationToggle() {
  const { session } = useAuthSession();
  const [isEnabled, setIsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('user_profiles')
      .select('personalization_enabled')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setIsEnabled(data.personalization_enabled);
        }
        setIsLoading(false);
      });
  }, [session?.user?.id]);

  const toggleSwitch = async () => {
    if (!session?.user?.id) return;
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    setIsLoading(true);
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ personalization_enabled: newValue, updated_at: new Date().toISOString() })
      .eq('id', session.user.id);

    if (error) {
      setIsEnabled(!newValue);
      Alert.alert("Error", "No se pudo actualizar la preferencia");
    } else {
      // Toast glass feedback (patrón UX-DR12). Fallback a alert para simplicidad si no hay toast
      Alert.alert("Éxito", newValue ? "Personalización activada. Verás contenido adaptado a tus preferencias." : "Personalización desactivada. Verás las propiedades tal como las publica la agencia.");
    }
    setIsLoading(false);
  };

  return (
    <View testID="personalization-toggle">
      <View style={styles.row}>
        <Text style={styles.title}>Personalización de contenido</Text>
        <Switch
          trackColor={{ false: Colors.textMuted, true: Colors.accentPrimary }}
          thumbColor={'#f4f3f4'}
          ios_backgroundColor={Colors.textMuted}
          onValueChange={toggleSwitch}
          value={isEnabled}
          disabled={isLoading}
        />
      </View>
      <Text style={styles.description}>
        Cuando está activa, Reinder adapta las fotos y descripción de cada propiedad a tus preferencias. Tus datos nunca se comparten con terceros.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.sizeBody,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  description: {
    fontSize: Typography.sizeSmall,
    color: Colors.textMuted,
    lineHeight: 20,
  }
});
