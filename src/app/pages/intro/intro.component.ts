import { Component, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-intro',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './intro.component.html',
  styleUrl: './intro.component.css'
})
export class IntroComponent {
  fadeState: 'hidden' | 'visible' | 'fading-out' = 'hidden';
  currentImage: 'rotary' | 'rx7' = 'rotary';
  private rx7Audio: HTMLAudioElement | null = null;

  constructor(private router: Router) {}

  ngOnInit() {
    this.startRotarySequence();
  }

  startRotarySequence() {
    setTimeout(() => {
      this.fadeState = 'visible';
      setTimeout(() => {
        this.fadeState = 'fading-out';
        setTimeout(() => {
          this.currentImage = 'rx7';
          this.playRx7Audio();
          this.startRx7Sequence();
        }, 2000); // rotary fade out
      }, 2500); // rotary show
    }, 100); // rotary fade in delay
  }

  startRx7Sequence() {
    this.fadeState = 'hidden';
    setTimeout(() => {
      this.fadeState = 'visible';
      setTimeout(() => {
        this.fadeState = 'fading-out';
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 2000); // rx7 fade out
      }, 2500); // rx7 show
    }, 100); // rx7 fade in delay
  }

  playRx7Audio() {
    if (!this.rx7Audio) {
      this.rx7Audio = new Audio('assets/audio/intro2.wav');
    }
    this.rx7Audio.currentTime = 0;
    this.rx7Audio.play();
  }
}
