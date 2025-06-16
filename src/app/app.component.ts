import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
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

  log = "hello";
  constructor() {
    getCurrentWindow().setCursorVisible(false);
  }

  playSound() {
    invoke<void>("play_synth").then(r => {
      console.log("sound played");
    });
  }
}
