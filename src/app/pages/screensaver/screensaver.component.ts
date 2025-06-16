import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-screensaver',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './screensaver.component.html',
  styleUrl: './screensaver.component.css'
})
export class ScreensaverComponent implements OnInit {
  constructor(private router: Router) {}
  
  public videoSrc: string = '';

  private videoFiles: string[] = [
    'assets/video/screensavers/girl_short.mov',
    'assets/video/screensavers/ride.mp4',
    'assets/video/screensavers/grid.mp4',
    'assets/video/screensavers/sunset.mp4',
  ];

  ngOnInit() {
    const randomIndex = Math.floor(Math.random() * this.videoFiles.length);
    this.videoSrc = this.videoFiles[randomIndex];
  }

  goToHome() {
    this.router.navigate(['/home']);
  }

  onTimeUpdate(video: HTMLVideoElement) {
    // If we're near the end of the video (within 0.1 seconds), restart it
    if (video.duration - video.currentTime < 0.1) {
      video.currentTime = 0;
      video.play().catch(err => console.error('Error playing video:', err));
    }
  }
}
