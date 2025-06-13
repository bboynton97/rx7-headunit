import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  brightness: number = 60;
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
}
