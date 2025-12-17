import { Platform } from 'react-native';

let AgoraModule: any = null;
let createAgoraRtcEngine: any = null;
let ChannelProfileType: any = null;
let ClientRoleType: any = null;
let VideoMirrorModeType: any = null;
let RenderModeType: any = null;

if (Platform.OS !== 'web') {
  try {
    const agora = require('react-native-agora');
    AgoraModule = agora;
    createAgoraRtcEngine = agora.createAgoraRtcEngine;
    ChannelProfileType = agora.ChannelProfileType;
    ClientRoleType = agora.ClientRoleType;
    VideoMirrorModeType = agora.VideoMirrorModeType;
    RenderModeType = agora.RenderModeType;
  } catch (error) {
    console.warn('Agora SDK not available. Video calling requires a development build with native modules.');
  }
}

import { supabase } from './supabase';

interface AgoraConfig {
  appId: string;
  token: string;
  channelName: string;
  uid: number;
}

export class AgoraService {
  private static instance: AgoraService;
  private engine: any = null;
  private isInitialized = false;
  private eventHandler: any = null;

  private constructor() {}

  static getInstance(): AgoraService {
    if (!AgoraService.instance) {
      AgoraService.instance = new AgoraService();
    }
    return AgoraService.instance;
  }

  async initialize(appId: string, eventHandler?: any): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (Platform.OS === 'web') {
      console.warn('Agora is not supported on web platform');
      return;
    }

    if (!createAgoraRtcEngine) {
      throw new Error('Agora SDK not available. Please create a development build.');
    }

    try {
      this.engine = createAgoraRtcEngine();
      this.eventHandler = eventHandler || {};

      await this.engine.initialize({
        appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      this.engine.registerEventHandler(this.eventHandler);

      await this.engine.enableVideo();
      await this.engine.enableAudio();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Agora engine:', error);
      throw error;
    }
  }

  async getCallToken(callId: string, roomId: string): Promise<AgoraConfig> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-call-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ callId, roomId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate token');
    }

    const data = await response.json();

    return {
      appId: data.appId,
      token: data.token,
      channelName: data.roomId,
      uid: data.uid,
    };
  }

  async joinChannel(config: AgoraConfig): Promise<void> {
    if (!this.engine) {
      throw new Error('Agora engine not initialized');
    }

    if (Platform.OS === 'web') {
      console.warn('Cannot join channel on web platform');
      return;
    }

    try {
      await this.engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      await this.engine.startPreview();

      await this.engine.joinChannel(config.token, config.channelName, config.uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
    } catch (error) {
      console.error('Failed to join channel:', error);
      throw error;
    }
  }

  async leaveChannel(): Promise<void> {
    if (!this.engine) {
      return;
    }

    if (Platform.OS === 'web') {
      return;
    }

    try {
      await this.engine.leaveChannel();
      await this.engine.stopPreview();
    } catch (error) {
      console.error('Failed to leave channel:', error);
      throw error;
    }
  }

  async toggleMicrophone(muted: boolean): Promise<void> {
    if (!this.engine || Platform.OS === 'web') {
      return;
    }

    try {
      await this.engine.muteLocalAudioStream(muted);
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
      throw error;
    }
  }

  async toggleCamera(enabled: boolean): Promise<void> {
    if (!this.engine || Platform.OS === 'web') {
      return;
    }

    try {
      await this.engine.muteLocalVideoStream(!enabled);
    } catch (error) {
      console.error('Failed to toggle camera:', error);
      throw error;
    }
  }

  async switchCamera(): Promise<void> {
    if (!this.engine || Platform.OS === 'web') {
      return;
    }

    try {
      await this.engine.switchCamera();
    } catch (error) {
      console.error('Failed to switch camera:', error);
      throw error;
    }
  }

  async enableSpeakerphone(enabled: boolean): Promise<void> {
    if (!this.engine || Platform.OS === 'web') {
      return;
    }

    try {
      await this.engine.setEnableSpeakerphone(enabled);
    } catch (error) {
      console.error('Failed to enable speakerphone:', error);
      throw error;
    }
  }

  async setVideoEncoderConfiguration(
    width: number = 640,
    height: number = 480,
    frameRate: number = 15,
    bitrate: number = 400
  ): Promise<void> {
    if (!this.engine || Platform.OS === 'web') {
      return;
    }

    try {
      await this.engine.setVideoEncoderConfiguration({
        dimensions: { width, height },
        frameRate,
        bitrate,
        minBitrate: bitrate / 2,
        orientationMode: 0,
        degradationPreference: 0,
        mirrorMode: VideoMirrorModeType.VideoMirrorModeDisabled,
      });
    } catch (error) {
      console.error('Failed to set video configuration:', error);
      throw error;
    }
  }

  getEngine(): any {
    return this.engine;
  }

  isWebPlatform(): boolean {
    return Platform.OS === 'web';
  }

  async destroy(): Promise<void> {
    if (!this.engine) {
      return;
    }

    if (Platform.OS === 'web') {
      return;
    }

    try {
      await this.engine.leaveChannel();
      await this.engine.release();
      this.engine = null;
      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to destroy Agora engine:', error);
    }
  }
}

export default AgoraService.getInstance();
