import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Input from '@/components/Input';
import Button from '@/components/Button';
import AddressInput, { AddressData } from '@/components/AddressInput';
import {
  pickImageFromLibrary,
  takePhotoWithCamera,
  uploadAvatar,
  deleteOldAvatar,
  updateProfileAvatar,
} from '@/lib/avatar-upload';
import { Camera, ImageIcon, User } from 'lucide-react-native';

interface ProfileData {
  full_name: string;
  bio: string;
  location: string;
  phone: string;
  avatar_url: string | null;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    bio: '',
    location: '',
    phone: '',
    avatar_url: null,
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, bio, location, phone, avatar_url, street_address, city, state, zip_code, country, latitude, longitude')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          bio: data.bio || '',
          location: data.location || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url,
          street_address: data.street_address || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
          country: data.country || 'US',
          latitude: data.latitude,
          longitude: data.longitude,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  function showImagePicker() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleTakePhoto();
          } else if (buttonIndex === 2) {
            handlePickImage();
          }
        }
      );
    } else {
      Alert.alert('Change Photo', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handlePickImage },
      ]);
    }
  }

  async function handlePickImage() {
    try {
      const imageUri = await pickImageFromLibrary();
      if (imageUri) {
        await uploadNewAvatar(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  }

  async function handleTakePhoto() {
    try {
      const imageUri = await takePhotoWithCamera();
      if (imageUri) {
        await uploadNewAvatar(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  }

  async function uploadNewAvatar(imageUri: string) {
    if (!user) return;

    setUploadingImage(true);
    try {
      const oldAvatarUrl = profile.avatar_url;

      const result = await uploadAvatar(user.id, imageUri);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to upload image');
        return;
      }

      if (oldAvatarUrl) {
        await deleteOldAvatar(oldAvatarUrl);
      }

      setProfile({ ...profile, avatar_url: result.url || null });
    } catch (error) {
      Alert.alert('Error', 'Failed to upload avatar');
    } finally {
      setUploadingImage(false);
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!profile.full_name.trim()) {
      newErrors.full_name = 'Name is required';
    }

    if (profile.phone && !/^\+?[\d\s-()]+$/.test(profile.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!user || !validate()) return;

    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name.trim(),
          bio: profile.bio.trim(),
          location: profile.city && profile.state ? `${profile.city}, ${profile.state}` : profile.location.trim(),
          phone: profile.phone.trim(),
          street_address: profile.street_address.trim(),
          city: profile.city.trim(),
          state: profile.state.trim(),
          zip_code: profile.zip_code.trim(),
          country: profile.country,
          latitude: profile.latitude || null,
          longitude: profile.longitude || null,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      if (profile.avatar_url) {
        const avatarResult = await updateProfileAvatar(user.id, profile.avatar_url);
        if (!avatarResult.success) {
          throw new Error(avatarResult.error);
        }
      }

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={styles.saveButton}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FF9500" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={showImagePicker} disabled={uploadingImage}>
            <View style={styles.avatarContainer}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <User size={48} color="#999" />
                </View>
              )}
              {uploadingImage && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color="#FFF" />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <Camera size={20} color="#FFF" />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Change Profile Photo</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Name *</Text>
            <Input
              value={profile.full_name}
              onChangeText={(text) => setProfile({ ...profile, full_name: text })}
              placeholder="Enter your full name"
              error={errors.full_name}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>
            <Input
              value={profile.bio}
              onChangeText={(text) => setProfile({ ...profile, bio: text })}
              placeholder="Tell us about yourself"
              multiline
              numberOfLines={4}
              style={styles.bioInput}
            />
            <Text style={styles.hint}>
              {profile.bio.length}/500 characters
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Location</Text>
            <AddressInput
              value={{
                street_address: profile.street_address,
                city: profile.city,
                state: profile.state,
                zip_code: profile.zip_code,
                country: profile.country,
                latitude: profile.latitude || undefined,
                longitude: profile.longitude || undefined,
              }}
              onChange={(address: AddressData) => {
                setProfile({
                  ...profile,
                  street_address: address.street_address,
                  city: address.city,
                  state: address.state,
                  zip_code: address.zip_code,
                  country: address.country,
                  latitude: address.latitude,
                  longitude: address.longitude,
                });
              }}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            <Input
              value={profile.phone}
              onChangeText={(text) => setProfile({ ...profile, phone: text })}
              placeholder="+1 (555) 123-4567"
              keyboardType="phone-pad"
              error={errors.phone}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingTop: 72,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 16,
    color: '#FF9500',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#F9F9F9',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF9500',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  changePhotoText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FF9500',
    fontWeight: '500',
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
