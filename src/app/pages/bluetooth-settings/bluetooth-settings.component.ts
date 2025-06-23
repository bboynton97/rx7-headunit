import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { invoke } from '@tauri-apps/api/core';

interface BluetoothDevice {
  address: string;
  name?: string;
  class?: number;
  paired: boolean;
  connected: boolean;
  trusted: boolean;
}

interface BluetoothStatus {
  adapter_powered: boolean;
  discoverable: boolean;
  pairable: boolean;
  devices: BluetoothDevice[];
}

interface MediaPlayerInfo {
  name: string;
  position?: number;
  duration?: number;
  status: string; // "playing", "paused", "stopped"
  track?: string;
  artist?: string;
  album?: string;
}

@Component({
  selector: 'app-bluetooth-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bluetooth-settings.component.html',
  styleUrls: ['./bluetooth-settings.component.css']
})
export class BluetoothSettingsComponent implements OnInit, OnDestroy {
  devices: BluetoothDevice[] = [];
  status: BluetoothStatus | null = null;
  isDiscovering = false;
  isLoading = false;
  errorMessage = '';
  mediaInfo: { [address: string]: MediaPlayerInfo } = {};
  volumeLevels: { [address: string]: number } = {};

  private statusInterval: any;

  constructor(private router: Router) {}

  ngOnInit() {
    this.initializeBluetooth();
    this.startStatusPolling();
  }

  ngOnDestroy() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
  }

  async initializeBluetooth() {
    try {
      this.isLoading = true;
      this.errorMessage = '';
      await invoke('initialize_bluetooth');
      await this.refreshStatus();
    } catch (error) {
      this.errorMessage = `Failed to initialize Bluetooth: ${error}`;
    } finally {
      this.isLoading = false;
    }
  }

  async startDiscovery() {
    try {
      this.isDiscovering = true;
      this.errorMessage = '';
      await invoke('start_bluetooth_discovery');
    } catch (error) {
      this.errorMessage = `Failed to start discovery: ${error}`;
      this.isDiscovering = false;
    }
  }

  async stopDiscovery() {
    try {
      this.isDiscovering = false;
      this.errorMessage = '';
      await invoke('stop_bluetooth_discovery');
    } catch (error) {
      this.errorMessage = `Failed to stop discovery: ${error}`;
    }
  }

  async pairDevice(device: BluetoothDevice) {
    try {
      this.errorMessage = '';
      await invoke('pair_bluetooth_device', { address: device.address });
      await this.refreshStatus();
    } catch (error) {
      this.errorMessage = `Failed to pair device: ${error}`;
    }
  }

  async unpairDevice(device: BluetoothDevice) {
    try {
      this.errorMessage = '';
      await invoke('unpair_bluetooth_device', { address: device.address });
      await this.refreshStatus();
    } catch (error) {
      this.errorMessage = `Failed to unpair device: ${error}`;
    }
  }

  async connectDevice(device: BluetoothDevice) {
    try {
      this.errorMessage = '';
      await invoke('connect_bluetooth_device', { address: device.address });
      await this.refreshStatus();
    } catch (error) {
      this.errorMessage = `Failed to connect device: ${error}`;
    }
  }

  async disconnectDevice(device: BluetoothDevice) {
    try {
      this.errorMessage = '';
      await invoke('disconnect_bluetooth_device', { address: device.address });
      await this.refreshStatus();
    } catch (error) {
      this.errorMessage = `Failed to disconnect device: ${error}`;
    }
  }

  async getAudioSinks(device: BluetoothDevice) {
    try {
      this.errorMessage = '';
      const sinks = await invoke<string[]>('get_bluetooth_audio_sinks', { address: device.address });
      console.log(`Audio sinks for ${device.name}:`, sinks);
      // You could display this in a modal or notification
    } catch (error) {
      this.errorMessage = `Failed to get audio sinks: ${error}`;
    }
  }

  // Media control methods
  async playMedia(device: BluetoothDevice) {
    try {
      this.errorMessage = '';
      await invoke('play_bluetooth_media', { address: device.address });
      await this.refreshMediaInfo(device);
    } catch (error) {
      this.errorMessage = `Failed to play media: ${error}`;
    }
  }

  async pauseMedia(device: BluetoothDevice) {
    try {
      this.errorMessage = '';
      await invoke('pause_bluetooth_media', { address: device.address });
      await this.refreshMediaInfo(device);
    } catch (error) {
      this.errorMessage = `Failed to pause media: ${error}`;
    }
  }

  async nextTrack(device: BluetoothDevice) {
    try {
      this.errorMessage = '';
      await invoke('next_bluetooth_track', { address: device.address });
      await this.refreshMediaInfo(device);
    } catch (error) {
      this.errorMessage = `Failed to skip to next track: ${error}`;
    }
  }

  async previousTrack(device: BluetoothDevice) {
    try {
      this.errorMessage = '';
      await invoke('previous_bluetooth_track', { address: device.address });
      await this.refreshMediaInfo(device);
    } catch (error) {
      this.errorMessage = `Failed to skip to previous track: ${error}`;
    }
  }

  async stopMedia(device: BluetoothDevice) {
    try {
      this.errorMessage = '';
      await invoke('stop_bluetooth_media', { address: device.address });
      await this.refreshMediaInfo(device);
    } catch (error) {
      this.errorMessage = `Failed to stop media: ${error}`;
    }
  }

  async refreshMediaInfo(device: BluetoothDevice) {
    try {
      const info = await invoke<MediaPlayerInfo | null>('get_bluetooth_media_info', { address: device.address });
      if (info) {
        this.mediaInfo[device.address] = info;
      } else {
        delete this.mediaInfo[device.address];
      }
    } catch (error) {
      console.error('Failed to refresh media info:', error);
    }
  }

  async setVolume(device: BluetoothDevice, volume: number) {
    try {
      this.errorMessage = '';
      await invoke('set_bluetooth_volume', { address: device.address, volume });
      this.volumeLevels[device.address] = volume;
    } catch (error) {
      this.errorMessage = `Failed to set volume: ${error}`;
    }
  }

  async getVolume(device: BluetoothDevice) {
    try {
      const volume = await invoke<number | null>('get_bluetooth_volume', { address: device.address });
      if (volume !== null) {
        this.volumeLevels[device.address] = volume;
      }
    } catch (error) {
      console.error('Failed to get volume:', error);
    }
  }

  async refreshStatus() {
    try {
      this.status = await invoke<BluetoothStatus>('get_bluetooth_status');
      this.devices = this.status?.devices || [];
      
      // Refresh media info for connected devices
      for (const device of this.devices) {
        if (device.connected) {
          await this.refreshMediaInfo(device);
          await this.getVolume(device);
        }
      }
    } catch (error) {
      console.error('Failed to refresh Bluetooth status:', error);
    }
  }

  async refreshDevices() {
    try {
      this.errorMessage = '';
      await invoke('refresh_bluetooth_devices');
      await this.refreshStatus();
    } catch (error) {
      this.errorMessage = `Failed to refresh devices: ${error}`;
    }
  }

  private startStatusPolling() {
    this.statusInterval = setInterval(() => {
      this.refreshStatus();
    }, 2000); // Poll every 2 seconds
  }

  getDeviceClassIcon(device: BluetoothDevice): string {
    if (!device.class) return '📱';
    
    const deviceClass = device.class >> 8;
    switch (deviceClass) {
      case 0x04: return '💻'; // Computer
      case 0x05: return '📱'; // Phone
      case 0x06: return '🎧'; // Audio/Video
      case 0x08: return '🎵'; // Audio
      default: return '📱';
    }
  }

  getDeviceStatusText(device: BluetoothDevice): string {
    if (device.connected) return 'Connected';
    if (device.paired) return 'Paired';
    return 'Available';
  }

  getDeviceStatusClass(device: BluetoothDevice): string {
    if (device.connected) return 'status-connected';
    if (device.paired) return 'status-paired';
    return 'status-available';
  }

  getMediaStatusIcon(device: BluetoothDevice): string {
    const info = this.mediaInfo[device.address];
    if (!info) return '🎵';
    
    switch (info.status.toLowerCase()) {
      case 'playing': return '▶️';
      case 'paused': return '⏸️';
      case 'stopped': return '⏹️';
      default: return '🎵';
    }
  }

  getMediaStatusText(device: BluetoothDevice): string {
    const info = this.mediaInfo[device.address];
    if (!info) return '';
    
    return `${info.status} - ${info.track || 'Unknown Track'}`;
  }

  goBack() {
    this.router.navigate(['/home']);
  }
} 