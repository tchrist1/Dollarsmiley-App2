import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { Sparkles, Type, Image as ImageIcon, Palette } from 'lucide-react-native';
import { PersonalizationSnapshot, PersonalizationSubmission } from '../types/database';
import { theme } from '../constants/theme';

interface Props {
  snapshot?: PersonalizationSnapshot;
  submissions?: PersonalizationSubmission[];
  compact?: boolean;
  showPriceImpact?: boolean;
}

export default function PersonalizationSummary({
  snapshot,
  submissions,
  compact = false,
  showPriceImpact = true,
}: Props) {
  const items = snapshot?.snapshot_data || submissions || [];

  if (items.length === 0) {
    return null;
  }

  const totalPriceImpact = snapshot?.total_price_impact ||
    items.reduce((sum, item) => sum + (item.calculated_price_impact || 0), 0);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Sparkles size={14} color={theme.colors.primary} />
        <Text style={styles.compactText}>
          {items.length} personalization{items.length !== 1 ? 's' : ''} applied
        </Text>
        {showPriceImpact && totalPriceImpact > 0 && (
          <Text style={styles.compactPrice}>+${totalPriceImpact.toFixed(2)}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Sparkles size={16} color={theme.colors.primary} />
        <Text style={styles.headerTitle}>Your Personalization</Text>
      </View>

      <View style={styles.itemsList}>
        {items.map((item, index) => (
          <View key={item.id || index} style={styles.item}>
            {item.submission_type === 'text' && item.text_value && (
              <View style={styles.itemRow}>
                <Type size={16} color={theme.colors.textSecondary} />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>Custom Text</Text>
                  <Text style={styles.itemValue} numberOfLines={2}>
                    "{item.text_value}"
                  </Text>
                </View>
              </View>
            )}

            {(item.submission_type === 'image_upload' || item.submission_type === 'image_selection') &&
              item.image_data?.uploaded_url && (
              <View style={styles.itemRow}>
                <ImageIcon size={16} color={theme.colors.textSecondary} />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>
                    {item.image_data.preset_id ? 'Selected Design' : 'Uploaded Image'}
                  </Text>
                  <Image
                    source={{ uri: item.image_data.uploaded_url }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                </View>
              </View>
            )}

            {item.submission_type === 'font_selection' && item.font_data && (
              <View style={styles.itemRow}>
                <Type size={16} color={theme.colors.textSecondary} />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>Font</Text>
                  <Text
                    style={[
                      styles.itemValue,
                      { fontFamily: item.font_data.font_family },
                    ]}
                  >
                    {item.font_data.font_family?.split(',')[0]} - {item.font_data.font_size}pt
                  </Text>
                </View>
              </View>
            )}

            {item.submission_type === 'color_selection' && item.color_data && (
              <View style={styles.itemRow}>
                <Palette size={16} color={theme.colors.textSecondary} />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>Color</Text>
                  <View style={styles.colorRow}>
                    <View
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: item.color_data.hex },
                      ]}
                    />
                    <Text style={styles.itemValue}>{item.color_data.hex}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        ))}
      </View>

      {snapshot?.preview_renders && snapshot.preview_renders.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>Preview</Text>
          <Image
            source={{ uri: snapshot.preview_renders[0].render_url }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        </View>
      )}

      {showPriceImpact && totalPriceImpact > 0 && (
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Personalization</Text>
          <Text style={styles.priceValue}>+${totalPriceImpact.toFixed(2)}</Text>
        </View>
      )}

      <Text style={styles.disclaimer}>
        This is your saved personalization. The final product will be created based on proof approval.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 6,
  },
  compactText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  compactPrice: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.primaryLight,
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  itemsList: {
    padding: 12,
  },
  item: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginTop: 4,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  previewSection: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  previewLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  priceLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  disclaimer: {
    fontSize: 11,
    color: theme.colors.textLight,
    textAlign: 'center',
    padding: 12,
    paddingTop: 0,
    fontStyle: 'italic',
  },
});
