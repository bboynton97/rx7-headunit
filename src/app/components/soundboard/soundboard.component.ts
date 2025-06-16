import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-soundboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './soundboard.component.html',
  styleUrl: './soundboard.component.css'
})
export class SoundboardComponent {
  // Track last 2 sounds played in each category
  private lastPlayedSounds: { [key: string]: string[] } = {
    music: [],
    anime: [],
    nostalgia: [],
    do_not_push: []
  };

  private audio: HTMLAudioElement | null = null;

  // Define available sound categories and their sounds
  readonly soundCategories = {
    music: [
      'pedro-song.mp3',
      'deja-vu_1qHyNkn.mp3',
      'anime_song.mp3',
      'speed.mp3',
      'bye-bye-deadpool.mp3',
      'celebration.mp3'
    ],
    anime: [
      'tole-tole-kawaii.mp3',
      'gmi2-salvaje.mp3',
      'ara-ara-sayonara-mp3cut.mp3',
      'anime-yamete01.mp3',
      'amazed-onniich.mp3',
      'anime_song.mp3',
      'tuturu_1.mp3',
      'anime-ahh.mp3',
      'anime-wow-sound-effect.mp3'
    ],
    nostalgia: [
      'windows-shutdown_lWRhnkD.mp3',
      'ps2_start_up.mp3',
      'windows-7-startup.mp3'
    ],
    do_not_push: [
      'daddyy-chill.mp3',
      'guest-1337-forsaken.mp3',
      'ew-dude-wtf.mp3',
      'metal-slug-mission-complete.mp3',
      'danger-siren-alarm_BfknMds.mp3'
    ]
  };

  playSound(sound_category: string) {
    if (this.audio) {
      this.audio.pause();
    }
    const sounds = this.soundCategories[sound_category as keyof typeof this.soundCategories];
    if (sounds && sounds.length > 0) {
      // Filter out the last 2 played sounds
      const availableSounds = sounds.filter(
        sound => !this.lastPlayedSounds[sound_category].includes(sound)
      );

      // If all sounds have been played recently, reset the history for this category
      const soundsToChooseFrom = availableSounds.length > 0 ? availableSounds : sounds;
      
      const randomSound = soundsToChooseFrom[Math.floor(Math.random() * soundsToChooseFrom.length)];
      
      // Update the last played sounds for this category
      this.lastPlayedSounds[sound_category] = [
        randomSound,
        ...this.lastPlayedSounds[sound_category].slice(0, 1)
      ];

      this.audio = new Audio(`assets/audio/soundboard/${sound_category}/${randomSound}`);
      this.audio.play();
    }
  }
} 