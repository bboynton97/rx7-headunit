import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-screensaver',
  standalone: true,
  imports: [],
  templateUrl: './screensaver.component.html',
  styleUrl: './screensaver.component.css'
})
export class ScreensaverComponent implements OnInit {
  constructor(private router: Router) {}
  
  public videoSrc: string = '';

  private videoFiles: string[] = [
    'assets/video/screensavers/girl_short.mov',
  ];

  ngOnInit() {
    const randomIndex = Math.floor(Math.random() * this.videoFiles.length);
    this.videoSrc = this.videoFiles[randomIndex];
  }

  goToHome() {
    this.router.navigate(['/home']);
  }
}
