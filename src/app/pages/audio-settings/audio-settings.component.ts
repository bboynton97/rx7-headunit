import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { invoke } from '@tauri-apps/api/core';

interface EQBand {
  name: string;
  frequency: string;
  value: number; // -12 to +12 dB
}

interface EQPreset {
  name: string;
  icon: string;
  bands: number[];
}

@Component({
  selector: 'app-audio-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audio-settings.component.html',
  styleUrl: './audio-settings.component.css'
})
export class AudioSettingsComponent implements OnInit, OnDestroy {
  // Volume
  systemVolume = 50;
  isMuted = false;
  private previousVolume = 50;

  // Equalizer bands
  eqBands: EQBand[] = [
    { name: 'SUB', frequency: '32Hz', value: 0 },
    { name: 'BASS', frequency: '64Hz', value: 0 },
    { name: 'LOW', frequency: '125Hz', value: 0 },
    { name: 'LOW-MID', frequency: '250Hz', value: 0 },
    { name: 'MID', frequency: '500Hz', value: 0 },
    { name: 'HIGH-MID', frequency: '1kHz', value: 0 },
    { name: 'HIGH', frequency: '4kHz', value: 0 },
    { name: 'TREBLE', frequency: '8kHz', value: 0 },
    { name: 'AIR', frequency: '16kHz', value: 0 }
  ];

  // Balance and Fade
  balance = 0; // -100 (left) to +100 (right)
  fade = 0; // -100 (rear) to +100 (front)

  // EQ Presets
  presets: EQPreset[] = [
    { name: 'FLAT', icon: '━', bands: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: 'ROCK', icon: '🎸', bands: [4, 3, -1, -2, 1, 3, 4, 3, 2] },
    { name: 'POP', icon: '🎤', bands: [-1, 1, 3, 4, 3, 1, -1, -1, -1] },
    { name: 'JAZZ', icon: '🎷', bands: [2, 3, 1, 2, -1, -1, 0, 1, 2] },
    { name: 'BASS', icon: '🔊', bands: [6, 5, 4, 2, 0, -1, -1, 0, 0] },
    { name: 'VOCAL', icon: '🎙️', bands: [-2, -1, 1, 3, 4, 3, 1, 0, -1] },
    { name: 'ELECTRONIC', icon: '⚡', bands: [5, 4, 1, -1, -2, 1, 3, 4, 5] },
    { name: 'CUSTOM', icon: '🎛️', bands: [0, 0, 0, 0, 0, 0, 0, 0, 0] }
  ];

  activePreset = 'FLAT';
  
  // Animation for visualizer
  private animationFrame: number | null = null;
  visualizerBars: number[] = new Array(32).fill(0);

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadSettings();
    this.startVisualizer();
  }

  ngOnDestroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  async loadSettings() {
    // In a real implementation, load saved settings from storage
    // For now, use defaults
  }

  async setVolume(volume: number) {
    this.systemVolume = volume;
    this.isMuted = volume === 0;
    
    try {
      await invoke('set_system_volume', { volume: Math.round(volume) });
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  }

  toggleMute() {
    if (this.isMuted) {
      this.systemVolume = this.previousVolume;
      this.isMuted = false;
    } else {
      this.previousVolume = this.systemVolume;
      this.systemVolume = 0;
      this.isMuted = true;
    }
    this.setVolume(this.systemVolume);
  }

  setEQBand(index: number, value: number) {
    this.eqBands[index].value = value;
    this.activePreset = 'CUSTOM';
    // In a real implementation, send to audio backend
  }

  applyPreset(preset: EQPreset) {
    this.activePreset = preset.name;
    preset.bands.forEach((value, index) => {
      if (this.eqBands[index]) {
        this.eqBands[index].value = value;
      }
    });
  }

  setBalance(value: number) {
    this.balance = value;
    // In a real implementation, send to audio backend
  }

  setFade(value: number) {
    this.fade = value;
    // In a real implementation, send to audio backend
  }

  getBalanceLabel(): string {
    if (this.balance === 0) return 'CENTER';
    if (this.balance < 0) return `L ${Math.abs(this.balance)}%`;
    return `R ${this.balance}%`;
  }

  getFadeLabel(): string {
    if (this.fade === 0) return 'CENTER';
    if (this.fade < 0) return `REAR ${Math.abs(this.fade)}%`;
    return `FRONT ${this.fade}%`;
  }

  getVolumeIcon(): string {
    if (this.isMuted || this.systemVolume === 0) return '🔇';
    if (this.systemVolume < 33) return '🔈';
    if (this.systemVolume < 66) return '🔉';
    return '🔊';
  }

  // EQ bar height calculation for visual representation
  getEQBarHeight(value: number): number {
    // Convert -12 to +12 range to 0-100% height
    return ((value + 12) / 24) * 100;
  }

  getEQBarColor(value: number): string {
    if (value > 6) return '#ff4444';
    if (value > 0) return '#00ff88';
    if (value < -6) return '#4488ff';
    return '#ff8800';
  }

  private startVisualizer() {
    const animate = () => {
      // Generate random visualizer bars for aesthetic effect
      for (let i = 0; i < this.visualizerBars.length; i++) {
        const target = Math.random() * 80 + 10;
        this.visualizerBars[i] += (target - this.visualizerBars[i]) * 0.3;
      }
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
