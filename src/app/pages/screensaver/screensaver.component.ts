import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-screensaver',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './screensaver.component.html',
  styleUrl: './screensaver.component.css'
})
export class ScreensaverComponent implements OnInit, OnDestroy {
  constructor(private router: Router) {}
  
  public videoSrc: string = '';
  public videoError: boolean = false;
  public time: string = '';
  public date: string = '';
  
  private clockInterval: any;

  private videoFiles: string[] = [
    'assets/video/screensavers/girl_short.mov',
    'assets/video/screensavers/ride.mp4',
    'assets/video/screensavers/grid.mp4',
    'assets/video/screensavers/sunset.mp4',
  ];

  ngOnInit() {
    const randomIndex = Math.floor(Math.random() * this.videoFiles.length);
    this.videoSrc = this.videoFiles[randomIndex];
    
    // Start clock updates
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }
  
  ngOnDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }
  
  private updateClock() {
    const now = new Date();
    this.time = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    this.date = now.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  goToHome() {
    this.router.navigate(['/home']);
  }
  
  onVideoError() {
    console.error('Video failed to load:', this.videoSrc);
    this.videoError = true;
  }
}
