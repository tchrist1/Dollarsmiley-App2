import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import {
  Camera,
  FlipHorizontal,
  X,
  Check,
  RotateCcw,
  Lightbulb,
  AlertCircle,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface IDCameraCaptureProps {
  onCapture: (photoUri: string, side: 'front' | 'back' | 'selfie') => void;
  onCancel: () => void;
  captureType: 'front' | 'back' | 'selfie';
  title?: string;
  instructions?: string;
}

export function IDCameraCapture({
  onCapture,
  onCancel,
  captureType,
  title,
  instructions,
}: IDCameraCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    // Use front camera for selfies
    if (captureType === 'selfie') {
      setFacing('front');
    }
  }, [captureType]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionCard}>
          <Camera size={64} color={colors.primary} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera to capture your ID document for verification.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getDefaultTitle = () => {
    switch (captureType) {
      case 'front':
        return 'Capture ID Front';
      case 'back':
        return 'Capture ID Back';
      case 'selfie':
        return 'Take Selfie';
      default:
        return 'Capture Document';
    }
  };

  const getDefaultInstructions = () => {
    switch (captureType) {
      case 'front':
        return 'Position the front of your ID within the frame. Ensure all text is visible and in focus.';
      case 'back':
        return 'Position the back of your ID within the frame. Ensure all text is visible and in focus.';
      case 'selfie':
        return 'Center your face in the frame. Remove sunglasses, hats, or masks.';
      default:
        return 'Position your document within the frame.';
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: false,
      });

      if (photo && photo.uri) {
        setCapturedImage(photo.uri);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage, captureType);
    }
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  // Preview captured image
  if (capturedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Review Photo</Text>
        </View>

        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} resizeMode="contain" />
        </View>

        <View style={styles.previewInstructions}>
          <AlertCircle size={20} color={colors.warning} />
          <Text style={styles.previewInstructionsText}>
            Make sure all text is clearly readable and the image is in focus.
          </Text>
        </View>

        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <RotateCcw size={20} color={colors.white} />
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Check size={20} color={colors.white} />
            <Text style={styles.confirmButtonText}>Use Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Camera view
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        {/* Header */}
        <View style={styles.cameraHeader}>
          <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
            <X size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.cameraTitle}>{title || getDefaultTitle()}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsText}>
              {instructions || getDefaultInstructions()}
            </Text>
          </View>
        </View>

        {/* Overlay frame for ID capture */}
        {captureType !== 'selfie' && (
          <View style={styles.overlay}>
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.frameContainer}>
                <View style={[styles.frameCorner, styles.frameCornerTL]} />
                <View style={[styles.frameCorner, styles.frameCornerTR]} />
                <View style={[styles.frameCorner, styles.frameCornerBL]} />
                <View style={[styles.frameCorner, styles.frameCornerBR]} />
              </View>
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom} />
          </View>
        )}

        {/* Face overlay for selfie */}
        {captureType === 'selfie' && (
          <View style={styles.faceOverlay}>
            <View style={styles.faceCircle} />
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <View style={styles.tip}>
            <Lightbulb size={16} color={colors.warning} />
            <Text style={styles.tipText}>Use good lighting</Text>
          </View>
          <View style={styles.tip}>
            <AlertCircle size={16} color={colors.warning} />
            <Text style={styles.tipText}>Avoid glare and shadows</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Flash toggle (back camera only) */}
          {facing === 'back' && (
            <TouchableOpacity
              style={[styles.controlButton, flashEnabled && styles.controlButtonActive]}
              onPress={toggleFlash}
            >
              <Lightbulb
                size={24}
                color={flashEnabled ? colors.primary : colors.white}
                fill={flashEnabled ? colors.primary : 'transparent'}
              />
            </TouchableOpacity>
          )}

          {/* Capture button */}
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleCapture}
            disabled={isCapturing}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          {/* Flip camera (for selfie) */}
          {captureType === 'selfie' && (
            <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
              <FlipHorizontal size={24} color={colors.white} />
            </TouchableOpacity>
          )}

          {/* Spacer for alignment */}
          {captureType !== 'selfie' && facing === 'front' && <View style={styles.controlSpacer} />}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  camera: {
    flex: 1,
  },
  message: {
    textAlign: 'center',
    paddingBottom: spacing.md,
    color: colors.white,
  },
  permissionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  permissionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  permissionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  permissionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xl + 20,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  cameraTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  instructionsContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  instructionsBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  instructionsText: {
    fontSize: fontSize.sm,
    color: colors.white,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  frameContainer: {
    width: SCREEN_WIDTH * 0.8,
    height: (SCREEN_WIDTH * 0.8) * 0.63, // ID card aspect ratio
    position: 'relative',
  },
  frameCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary,
  },
  frameCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  frameCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  frameCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  frameCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  faceOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceCircle: {
    width: 250,
    height: 300,
    borderRadius: 150,
    borderWidth: 4,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  tipsContainer: {
    position: 'absolute',
    bottom: 180,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.sm,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.white,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  controlSpacer: {
    width: 56,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.white,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  previewInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  previewInstructionsText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.textSecondary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  retakeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  confirmButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl + 20,
    backgroundColor: colors.black,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
  },
});
