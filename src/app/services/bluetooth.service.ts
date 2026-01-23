import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { invoke } from '@tauri-apps/api/core';

export interface BluetoothDevice {
  address: string;
  name?: string;
  class?: number;
  paired: boolean;
  connected: boolean;
  trusted: boolean;
}

export interface BluetoothStatus {
  adapter_powered: boolean;
  discoverable: boolean;
  pairable: boolean;
  devices: BluetoothDevice[];
}

export interface MediaPlayerInfo {
  name: string;
  position?: number;
  duration?: number;
  status: string; // "playing", "paused", "stopped"
  track?: string;
  artist?: string;
  album?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BluetoothService implements OnDestroy {
  private statusSubject = new BehaviorSubject<BluetoothStatus | null>(null);
  private connectedDeviceSubject = new BehaviorSubject<BluetoothDevice | null>(null);
  private mediaInfoSubject = new BehaviorSubject<MediaPlayerInfo | null>(null);
  private volumeSubject = new BehaviorSubject<number>(50);
  private isInitializedSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string>('');

  private statusInterval: ReturnType<typeof setInterval> | null = null;
  private mediaInterval: ReturnType<typeof setInterval> | null = null;

  status$ = this.statusSubject.asObservable();
  connectedDevice$ = this.connectedDeviceSubject.asObservable();
  mediaInfo$ = this.mediaInfoSubject.asObservable();
  volume$ = this.volumeSubject.asObservable();
  isInitialized$ = this.isInitializedSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  get connectedDevice(): BluetoothDevice | null {
    return this.connectedDeviceSubject.value;
  }

  get mediaInfo(): MediaPlayerInfo | null {
    return this.mediaInfoSubject.value;
  }

  get volume(): number {
    return this.volumeSubject.value;
  }

  get isInitialized(): boolean {
    return this.isInitializedSubject.value;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.errorSubject.next('');
      await invoke('initialize_bluetooth');
      this.isInitializedSubject.next(true);
      await this.refreshStatus();
      this.startPolling();
    } catch (error) {
      this.errorSubject.next(`Failed to initialize Bluetooth: ${error}`);
      throw error;
    }
  }

  async refreshStatus(): Promise<void> {
    try {
      const status = await invoke<BluetoothStatus>('get_bluetooth_status');
      this.statusSubject.next(status);

      // Find and track the first connected device
      const connected = status.devices.find(d => d.connected);
      this.connectedDeviceSubject.next(connected || null);

      // Refresh media info for connected device
      if (connected) {
        await this.refreshMediaInfo();
        await this.refreshVolume();
      } else {
        this.mediaInfoSubject.next(null);
      }
    } catch (error) {
      console.error('Failed to refresh Bluetooth status:', error);
    }
  }

  async refreshMediaInfo(): Promise<void> {
    const device = this.connectedDevice;
    if (!device) {
      this.mediaInfoSubject.next(null);
      return;
    }

    try {
      const info = await invoke<MediaPlayerInfo | null>('get_bluetooth_media_info', { 
        address: device.address 
      });
      this.mediaInfoSubject.next(info);
    } catch (error) {
      console.error('Failed to refresh media info:', error);
    }
  }

  async refreshVolume(): Promise<void> {
    const device = this.connectedDevice;
    if (!device) return;

    try {
      const volume = await invoke<number | null>('get_bluetooth_volume', { 
        address: device.address 
      });
      if (volume !== null) {
        this.volumeSubject.next(volume);
      }
    } catch (error) {
      console.error('Failed to get volume:', error);
    }
  }

  // Playback controls
  async play(): Promise<void> {
    const device = this.connectedDevice;
    if (!device) return;

    try {
      this.errorSubject.next('');
      await invoke('play_bluetooth_media', { address: device.address });
      await this.refreshMediaInfo();
    } catch (error) {
      this.errorSubject.next(`Failed to play: ${error}`);
    }
  }

  async pause(): Promise<void> {
    const device = this.connectedDevice;
    if (!device) return;

    try {
      this.errorSubject.next('');
      await invoke('pause_bluetooth_media', { address: device.address });
      await this.refreshMediaInfo();
    } catch (error) {
      this.errorSubject.next(`Failed to pause: ${error}`);
    }
  }

  async togglePlayPause(): Promise<void> {
    const info = this.mediaInfo;
    if (info?.status.toLowerCase() === 'playing') {
      await this.pause();
    } else {
      await this.play();
    }
  }

  async next(): Promise<void> {
    const device = this.connectedDevice;
    if (!device) return;

    try {
      this.errorSubject.next('');
      await invoke('next_bluetooth_track', { address: device.address });
      await this.refreshMediaInfo();
    } catch (error) {
      this.errorSubject.next(`Failed to skip: ${error}`);
    }
  }

  async previous(): Promise<void> {
    const device = this.connectedDevice;
    if (!device) return;

    try {
      this.errorSubject.next('');
      await invoke('previous_bluetooth_track', { address: device.address });
      await this.refreshMediaInfo();
    } catch (error) {
      this.errorSubject.next(`Failed to go back: ${error}`);
    }
  }

  async stop(): Promise<void> {
    const device = this.connectedDevice;
    if (!device) return;

    try {
      this.errorSubject.next('');
      await invoke('stop_bluetooth_media', { address: device.address });
      await this.refreshMediaInfo();
    } catch (error) {
      this.errorSubject.next(`Failed to stop: ${error}`);
    }
  }

  async setVolume(volume: number): Promise<void> {
    const device = this.connectedDevice;
    if (!device) return;

    try {
      this.errorSubject.next('');
      await invoke('set_bluetooth_volume', { address: device.address, volume });
      this.volumeSubject.next(volume);
    } catch (error) {
      this.errorSubject.next(`Failed to set volume: ${error}`);
    }
  }

  // Device management
  async connectDevice(address: string): Promise<void> {
    try {
      this.errorSubject.next('');
      await invoke('connect_bluetooth_device', { address });
      await this.refreshStatus();
    } catch (error) {
      this.errorSubject.next(`Failed to connect: ${error}`);
      throw error;
    }
  }

  async disconnectDevice(address: string): Promise<void> {
    try {
      this.errorSubject.next('');
      await invoke('disconnect_bluetooth_device', { address });
      await this.refreshStatus();
    } catch (error) {
      this.errorSubject.next(`Failed to disconnect: ${error}`);
      throw error;
    }
  }

  private startPolling(): void {
    // Poll status every 3 seconds
    this.statusInterval = setInterval(() => {
      this.refreshStatus();
    }, 3000);

    // Poll media info more frequently when playing
    this.mediaInterval = setInterval(() => {
      if (this.connectedDevice && this.mediaInfo?.status.toLowerCase() === 'playing') {
        this.refreshMediaInfo();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
    if (this.mediaInterval) {
      clearInterval(this.mediaInterval);
    }
  }

  // Helpers
  formatDuration(ms?: number): string {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getPlaybackProgress(): number {
    const info = this.mediaInfo;
    if (!info?.position || !info?.duration || info.duration === 0) {
      return 0;
    }
    return (info.position / info.duration) * 100;
  }
}
