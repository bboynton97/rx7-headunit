import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from '@tauri-apps/api/window';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private inactivityTimer: any;
  private readonly INACTIVITY_TIMEOUT = 120000; // 2 minutes in milliseconds

  log = "hello";
  constructor(private router: Router) {
    getCurrentWindow().setCursorVisible(false);
    document.body.style.cursor = 'none';
    
    // Reset inactivity timer on any user interaction
    const resetTimer = () => {
      if (this.router.url === '/home') {
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = setTimeout(() => {
          this.router.navigate(['/screensaver']);
        }, this.INACTIVITY_TIMEOUT);
      }
    };

    // Add event listeners for user interaction
    document.addEventListener('mousemove', () => {
      document.body.style.cursor = 'none';
      resetTimer();
    });
    document.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || 
          target.tagName === 'BUTTON' || 
          target.getAttribute('role') === 'slider' ||
          target.closest('[role="slider"]')) {
        return;
      }
      e.preventDefault();
      resetTimer();
    });
    document.addEventListener('keydown', resetTimer);
    document.addEventListener('touchstart', resetTimer);

    // Initialize timer
    resetTimer();
  }

  playSound() {
    invoke<void>("play_synth").then(r => {
      console.log("sound played");
    });
  }
}
