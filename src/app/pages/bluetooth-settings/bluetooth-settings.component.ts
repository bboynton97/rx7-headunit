import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  private statusInterval: any;

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
      console.log(`Audio sinks for ${device.name || device.address}:`, sinks);
    } catch (error) {
      this.errorMessage = `Failed to get audio sinks: ${error}`;
    }
  }

    async refreshStatus() {
    try {
      this.status = await invoke<BluetoothStatus>('get_bluetooth_status');
      this.devices = this.status?.devices || [];
    } catch (error) {
      console.error('Failed to refresh Bluetooth status:', error);
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
} 