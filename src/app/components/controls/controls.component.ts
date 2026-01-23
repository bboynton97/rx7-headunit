import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { invoke } from '@tauri-apps/api/core';
import { BluetoothService } from '../../services/bluetooth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './controls.component.html',
  styleUrls: ['./controls.component.css']
})
export class ControlsComponent implements OnInit, OnDestroy {
  private _brightness: number = 60;
  private volumeSubscription: Subscription | null = null;

  constructor(private bluetooth: BluetoothService) {}

  ngOnInit() {
    // Subscribe to bluetooth volume changes
    this.volumeSubscription = this.bluetooth.volume$.subscribe(vol => {
      this._volume = vol;
    });
  }

  ngOnDestroy() {
    if (this.volumeSubscription) {
      this.volumeSubscription.unsubscribe();
    }
  }

  get brightness(): number {
    return this._brightness;
  }

  set brightness(value: number) {
    this._brightness = value;
    this.updateBrightness(value);
  }

  private _volume: number = 50;

  get volume(): number {
    return this._volume;
  }

  set volume(value: number) {
    this._volume = value;
    this.updateVolume(value);
  }

  async incrementBrightness() {
    this.brightness = Math.min(100, this.brightness + 1);
  }

  async decrementBrightness() {
    this.brightness = Math.max(0, this.brightness - 1);
  }

  private async updateBrightness(value: number) {
    await invoke('set_brightness', { value });
  }

  private async updateVolume(value: number) {
    await this.bluetooth.setVolume(value);
  }

  async incrementVolume() {
    this.volume = Math.min(100, this.volume + 1);
  }

  async decrementVolume() {
    this.volume = Math.max(0, this.volume - 1);
  }
} 