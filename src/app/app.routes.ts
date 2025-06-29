import { Routes } from "@angular/router";
import { IntroComponent } from './pages/intro/intro.component';
import { HomeComponent } from './pages/home/home.component';
import { AudioSettingsComponent } from './pages/audio-settings/audio-settings.component';
import { ScreensaverComponent } from './pages/screensaver/screensaver.component';
import { BluetoothSettingsComponent } from './pages/bluetooth-settings/bluetooth-settings.component';

export const routes: Routes = [
  { path: '', component: IntroComponent },
  { path: 'home', component: HomeComponent },
  { path: 'audio-settings', component: AudioSettingsComponent },
  { path: 'bluetooth-settings', component: BluetoothSettingsComponent },
  { path: 'screensaver', component: ScreensaverComponent },
];