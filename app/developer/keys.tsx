import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import { Key, Plus, Eye, EyeOff, Copy, Trash2, MoreVertical } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { getApiKeys, createApiKey, revokeApiKey, deleteApiKey, formatApiKey, getApiKeyEnvironmentColor, getApiKeyStatusColor, ApiKey, ApiKeyEnvironment } from '@/lib/developer-portal';

export default function ApiKeysScreen() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [newKey, setNewKey] = useState<ApiKey | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    const keys = await getApiKeys();
    setApiKeys(keys);
    setLoading(false);
  };

  const handleCreateKey = async (name: string, environment: ApiKeyEnvironment) => {
    const key = await createApiKey({ name, environment });
    if (key) {
      setNewKey(key);
      await loadApiKeys();
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    Alert.alert(
      'Revoke API Key',
      'Are you sure you want to revoke this API key? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            const success = await revokeApiKey(keyId);
            if (success) {
              await loadApiKeys();
            }
          }
        }
      ]
    );
  };

  const handleDeleteKey = async (keyId: string) => {
    Alert.alert(
      'Delete API Key',
      'Are you sure you want to delete this API key? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteApiKey(keyId);
            if (success) {
              await loadApiKeys();
            }
          }
        }
      ]
    );
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string) => {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(text);
      Alert.alert('Copied', 'API key copied to clipboard');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>API Keys</Text>
          <Text style={styles.subtitle}>Manage your API authentication keys</Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={20} color={colors.white} />
          <Text style={styles.createButtonText}>Create Key</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {apiKeys.length === 0 ? (
          <View style={styles.emptyState}>
            <Key size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No API keys yet</Text>
            <Text style={styles.emptyText}>
              Create your first API key to start integrating
            </Text>
            <Button
              title="Create API Key"
              onPress={() => setShowCreateModal(true)}
              style={styles.emptyButton}
            />
          </View>
        ) : (
          <View style={styles.keysList}>
            {apiKeys.map((key) => (
              <View key={key.id} style={styles.keyCard}>
                <View style={styles.keyHeader}>
                  <View style={styles.keyInfo}>
                    <Text style={styles.keyName}>{key.name}</Text>
                    <View style={styles.keyBadges}>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: getApiKeyEnvironmentColor(key.environment) }
                        ]}
                      >
                        <Text style={styles.badgeText}>{key.environment}</Text>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: getApiKeyStatusColor(key.status) }
                        ]}
                      >
                        <Text style={styles.badgeText}>{key.status}</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.menuButton}>
                    <MoreVertical size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.keyValue}>
                  <Text style={styles.keyText} selectable>
                    {visibleKeys.has(key.id) ? key.key : formatApiKey(key.key)}
                  </Text>
                </View>

                <View style={styles.keyActions}>
                  <TouchableOpacity
                    style={styles.keyAction}
                    onPress={() => toggleKeyVisibility(key.id)}
                  >
                    {visibleKeys.has(key.id) ? (
                      <EyeOff size={18} color={colors.textSecondary} />
                    ) : (
                      <Eye size={18} color={colors.textSecondary} />
                    )}
                    <Text style={styles.keyActionText}>
                      {visibleKeys.has(key.id) ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.keyAction}
                    onPress={() => copyToClipboard(key.key)}
                  >
                    <Copy size={18} color={colors.textSecondary} />
                    <Text style={styles.keyActionText}>Copy</Text>
                  </TouchableOpacity>
                  {key.status === 'active' && (
                    <TouchableOpacity
                      style={styles.keyAction}
                      onPress={() => handleRevokeKey(key.id)}
                    >
                      <Trash2 size={18} color={colors.error} />
                      <Text style={[styles.keyActionText, { color: colors.error }]}>
                        Revoke
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.keyMeta}>
                  <Text style={styles.keyMetaText}>
                    Created: {new Date(key.created_at).toLocaleDateString()}
                  </Text>
                  {key.last_used_at && (
                    <Text style={styles.keyMetaText}>
                      Last used: {new Date(key.last_used_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <CreateApiKeyModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateKey}
        newKey={newKey}
        onDismissNewKey={() => setNewKey(null)}
      />
    </View>
  );
}

function CreateApiKeyModal({
  visible,
  onClose,
  onCreate,
  newKey,
  onDismissNewKey
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, environment: ApiKeyEnvironment) => void;
  newKey: ApiKey | null;
  onDismissNewKey: () => void;
}) {
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<ApiKeyEnvironment>('development');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a key name');
      return;
    }

    setLoading(true);
    await onCreate(name, environment);
    setLoading(false);
    setName('');
    onClose();
  };

  const copyKey = async () => {
    if (newKey && Platform.OS === 'web') {
      await navigator.clipboard.writeText(newKey.key);
      Alert.alert('Copied', 'API key copied to clipboard');
    }
  };

  if (newKey) {
    return (
      <Modal visible={true} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>API Key Created!</Text>
            <Text style={styles.modalText}>
              Make sure to copy your API key now. You won't be able to see it again!
            </Text>
            <View style={styles.newKeyContainer}>
              <Text style={styles.newKeyLabel}>Your API Key</Text>
              <View style={styles.newKeyValue}>
                <Text style={styles.newKeyText} selectable>
                  {newKey.key}
                </Text>
              </View>
              <TouchableOpacity style={styles.copyButton} onPress={copyKey}>
                <Copy size={20} color={colors.white} />
                <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
              </TouchableOpacity>
            </View>
            <Button
              title="Done"
              onPress={onDismissNewKey}
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create API Key</Text>
          <Input
            label="Key Name"
            placeholder="My API Key"
            value={name}
            onChangeText={setName}
          />
          <View style={styles.environmentSelector}>
            <Text style={styles.environmentLabel}>Environment</Text>
            <View style={styles.environmentButtons}>
              <TouchableOpacity
                style={[
                  styles.environmentButton,
                  environment === 'development' && styles.environmentButtonActive
                ]}
                onPress={() => setEnvironment('development')}
              >
                <Text
                  style={[
                    styles.environmentButtonText,
                    environment === 'development' && styles.environmentButtonTextActive
                  ]}
                >
                  Development
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.environmentButton,
                  environment === 'production' && styles.environmentButtonActive
                ]}
                onPress={() => setEnvironment('production')}
              >
                <Text
                  style={[
                    styles.environmentButtonText,
                    environment === 'production' && styles.environmentButtonTextActive
                  ]}
                >
                  Production
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={onClose}
              variant="outline"
              style={styles.modalActionButton}
            />
            <Button
              title="Create"
              onPress={handleCreate}
              loading={loading}
              style={styles.modalActionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  createButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    marginTop: spacing.md,
  },
  keysList: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  keyCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  keyInfo: {
    flex: 1,
  },
  keyName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  keyBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.white,
    textTransform: 'capitalize',
  },
  menuButton: {
    padding: spacing.xs,
  },
  keyValue: {
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  keyText: {
    fontSize: fontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.text,
  },
  keyActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  keyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  keyActionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  keyMeta: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  keyMetaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  environmentSelector: {
    marginVertical: spacing.md,
  },
  environmentLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  environmentButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  environmentButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  environmentButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  environmentButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  environmentButtonTextActive: {
    color: colors.white,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalActionButton: {
    flex: 1,
  },
  newKeyContainer: {
    marginBottom: spacing.lg,
  },
  newKeyLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  newKeyValue: {
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  newKeyText: {
    fontSize: fontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.text,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  copyButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  modalButton: {
    marginTop: spacing.md,
  },
});
