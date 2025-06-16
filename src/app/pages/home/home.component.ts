import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { invoke } from '@tauri-apps/api/core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  time: string = '';
  date: string = '';
  private timer: any;

  currentTime: string = '';
  playbackProgress: number = 35;
  private _brightness: number = 60;

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

  rpmGaugeValue: number = 120; // Out of 314 (full circle)
  tempGaugeValue: number = 80;
  
  private timeInterval: any;

  constructor(private router: Router) {
    this.updateTime();
  }

  ngOnInit() {
    this.timer = setInterval(() => this.updateTime(), 1000);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  updateTime() {
    const now = new Date();
    this.time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }

  goToIntro() {
    this.router.navigate(['/']);
  }

  goToScreensaver() {
    this.router.navigate(['/screensaver']);
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
    await invoke('set_system_volume', { value });
  }

  async incrementVolume() {
    this.volume = Math.min(100, this.volume + 1);
    await this.updateVolume(this.volume);
  }

  async decrementVolume() {
    this.volume = Math.max(0, this.volume - 1);
    await this.updateVolume(this.volume);
  }
}
