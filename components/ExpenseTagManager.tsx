import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Plus, X, Tag, Edit2, Trash2 } from 'lucide-react-native';
import {
  getUserExpenseTags,
  createExpenseTag,
  updateExpenseTag,
  deleteExpenseTag,
  TAG_COLORS,
  type ExpenseTag,
} from '@/lib/expense-categorization';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface ExpenseTagManagerProps {
  userId: string;
  visible: boolean;
  onClose: () => void;
  onTagsUpdated?: () => void;
}

export default function ExpenseTagManager({
  userId,
  visible,
  onClose,
  onTagsUpdated,
}: ExpenseTagManagerProps) {
  const [tags, setTags] = useState<ExpenseTag[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTag, setEditingTag] = useState<ExpenseTag | null>(null);
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);

  useEffect(() => {
    if (visible) {
      loadTags();
    }
  }, [visible]);

  const loadTags = async () => {
    const userTags = await getUserExpenseTags(userId);
    setTags(userTags);
  };

  const handleCreateTag = async () => {
    if (!tagName.trim()) {
      Alert.alert('Error', 'Please enter a tag name');
      return;
    }

    const tag = await createExpenseTag(userId, tagName.trim(), selectedColor);
    if (tag) {
      await loadTags();
      setShowCreateModal(false);
      setTagName('');
      setSelectedColor(TAG_COLORS[0]);
      onTagsUpdated?.();
    } else {
      Alert.alert('Error', 'Failed to create tag');
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !tagName.trim()) return;

    const success = await updateExpenseTag(editingTag.id, {
      name: tagName.trim(),
      color: selectedColor,
    });

    if (success) {
      await loadTags();
      setEditingTag(null);
      setTagName('');
      setSelectedColor(TAG_COLORS[0]);
      onTagsUpdated?.();
    } else {
      Alert.alert('Error', 'Failed to update tag');
    }
  };

  const handleDeleteTag = (tag: ExpenseTag) => {
    Alert.alert('Delete Tag', `Are you sure you want to delete "${tag.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const success = await deleteExpenseTag(tag.id);
          if (success) {
            await loadTags();
            onTagsUpdated?.();
          } else {
            Alert.alert('Error', 'Failed to delete tag');
          }
        },
      },
    ]);
  };

  const openEditModal = (tag: ExpenseTag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setSelectedColor(tag.color);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditingTag(null);
    setTagName('');
    setSelectedColor(TAG_COLORS[0]);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Manage Tags</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Tags List */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {tags.length === 0 ? (
                <View style={styles.emptyState}>
                  <Tag size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No tags yet</Text>
                  <Text style={styles.emptySubtext}>Create tags to organize your expenses</Text>
                </View>
              ) : (
                tags.map((tag) => (
                  <View key={tag.id} style={styles.tagItem}>
                    <View style={styles.tagLeft}>
                      <View style={[styles.tagColor, { backgroundColor: tag.color }]} />
                      <Text style={styles.tagName}>{tag.name}</Text>
                    </View>
                    <View style={styles.tagActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => openEditModal(tag)}
                      >
                        <Edit2 size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteTag(tag)}
                      >
                        <Trash2 size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Create Button */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Plus size={20} color={colors.white} />
              <Text style={styles.createButtonText}>Create New Tag</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create/Edit Tag Modal */}
      <Modal visible={showCreateModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.createModalContent}>
            <Text style={styles.createModalTitle}>
              {editingTag ? 'Edit Tag' : 'Create Tag'}
            </Text>

            <Text style={styles.inputLabel}>Tag Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter tag name"
              value={tagName}
              onChangeText={setTagName}
              autoFocus
            />

            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.colorPicker}>
              {TAG_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && <X size={16} color={colors.white} />}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.createModalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeCreateModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={editingTag ? handleUpdateTag : handleCreateTag}
              >
                <Text style={styles.saveButtonText}>
                  {editingTag ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollView: {
    padding: spacing.lg,
    maxHeight: 400,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  tagItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  tagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  tagColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  tagName: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  tagActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  createButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  createModalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    margin: spacing.xl,
  },
  createModalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  createModalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
