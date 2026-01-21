import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ControlsComponent } from '../../components/controls/controls.component';
import { SoundboardComponent } from '../../components/soundboard/soundboard.component';
import { CrtSceneService } from '../../services/crt-scene.service';
import * as THREE from 'three';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ControlsComponent, SoundboardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('threeBackground') threeRef!: ElementRef<HTMLDivElement>;

  time: string = '';
  date: string = '';
  private timer: any;

  playbackProgress: number = 35;
  rpmGaugeValue: number = 120;
  tempGaugeValue: number = 80;
  
  // 3D elements
  private gridFloor: THREE.Group | null = null;
  private floatingParticles: THREE.Points | null = null;
  private ambientOrbs: THREE.Group | null = null;
  private clock = new THREE.Clock();

  constructor(
    private router: Router,
    private crtScene: CrtSceneService
  ) {
    this.updateTime();
  }

  ngOnInit() {
    this.timer = setInterval(() => this.updateTime(), 1000);
  }

  ngAfterViewInit() {
    this.initThreeBackground();
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.crtScene.destroyScene('home');
  }

  private initThreeBackground() {
    const { scene, camera } = this.crtScene.createScene('home', {
      container: this.threeRef.nativeElement,
      enableCRT: true,
      crtIntensity: 0.6
    });

    camera.position.set(0, 3, 8);
    camera.lookAt(0, 0, 0);

    // Create retrowave grid floor
    this.createGridFloor(scene);

    // Create floating particles
    this.createFloatingParticles(scene);

    // Create ambient orbs
    this.createAmbientOrbs(scene);

    // Create horizon glow
    this.createHorizonGlow(scene);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.4);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00ff88, 1.5, 30);
    pointLight1.position.set(-5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff8800, 1.5, 30);
    pointLight2.position.set(5, 3, -5);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x8800ff, 1, 25);
    pointLight3.position.set(0, 8, 0);
    scene.add(pointLight3);

    // Start render loop
    this.crtScene.startRenderLoop('home', (delta) => {
      this.animateBackground(delta, camera);
    });
  }

  private createGridFloor(scene: THREE.Scene) {
    this.gridFloor = new THREE.Group();

    // Main grid lines - X direction
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.4
    });

    // Create grid
    const gridSize = 40;
    const gridDivisions = 40;
    const halfSize = gridSize / 2;
    const step = gridSize / gridDivisions;

    // X lines
    for (let i = 0; i <= gridDivisions; i++) {
      const geometry = new THREE.BufferGeometry();
      const z = -halfSize + i * step;
      geometry.setFromPoints([
        new THREE.Vector3(-halfSize, 0, z),
        new THREE.Vector3(halfSize, 0, z)
      ]);
      const line = new THREE.Line(geometry, gridMaterial.clone());
      this.gridFloor.add(line);
    }

    // Z lines
    for (let i = 0; i <= gridDivisions; i++) {
      const geometry = new THREE.BufferGeometry();
      const x = -halfSize + i * step;
      geometry.setFromPoints([
        new THREE.Vector3(x, 0, -halfSize),
        new THREE.Vector3(x, 0, halfSize)
      ]);
      const line = new THREE.Line(geometry, gridMaterial.clone());
      this.gridFloor.add(line);
    }

    // Add glowing center lines
    const centerLineMaterial = new THREE.LineBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.8
    });

    const centerLineX = new THREE.BufferGeometry();
    centerLineX.setFromPoints([
      new THREE.Vector3(-halfSize, 0.01, 0),
      new THREE.Vector3(halfSize, 0.01, 0)
    ]);
    this.gridFloor.add(new THREE.Line(centerLineX, centerLineMaterial));

    const centerLineZ = new THREE.BufferGeometry();
    centerLineZ.setFromPoints([
      new THREE.Vector3(0, 0.01, -halfSize),
      new THREE.Vector3(0, 0.01, halfSize)
    ]);
    this.gridFloor.add(new THREE.Line(centerLineZ, centerLineMaterial));

    this.gridFloor.position.y = -2;
    this.gridFloor.rotation.x = -0.1;
    scene.add(this.gridFloor);
  }

  private createFloatingParticles(scene: THREE.Scene) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const sizes = [];

    for (let i = 0; i < 500; i++) {
      vertices.push(
        (Math.random() - 0.5) * 30,
        Math.random() * 15 - 2,
        (Math.random() - 0.5) * 30
      );

      const colorChoice = Math.random();
      const color = new THREE.Color();
      if (colorChoice < 0.4) {
        color.setHex(0x00ff88);
      } else if (colorChoice < 0.7) {
        color.setHex(0xff8800);
      } else {
        color.setHex(0x8800ff);
      }
      colors.push(color.r, color.g, color.b);
      sizes.push(Math.random() * 0.1 + 0.02);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.floatingParticles = new THREE.Points(geometry, material);
    scene.add(this.floatingParticles);
  }

  private createAmbientOrbs(scene: THREE.Scene) {
    this.ambientOrbs = new THREE.Group();

    const orbPositions = [
      { x: -6, y: 2, z: -5, color: 0x00ff88, size: 0.5 },
      { x: 6, y: 3, z: -8, color: 0xff8800, size: 0.4 },
      { x: -4, y: 5, z: -10, color: 0x8800ff, size: 0.6 },
      { x: 3, y: 1, z: -6, color: 0x00ff88, size: 0.3 },
      { x: -8, y: 4, z: -12, color: 0xff8800, size: 0.5 }
    ];

    orbPositions.forEach((orb, index) => {
      const geometry = new THREE.SphereGeometry(orb.size, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: orb.color,
        transparent: true,
        opacity: 0.6
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(orb.x, orb.y, orb.z);
      mesh.userData = { 
        baseY: orb.y, 
        speed: 0.5 + Math.random() * 0.5,
        phase: index * 0.5
      };

      // Add glow ring
      const glowGeometry = new THREE.RingGeometry(orb.size * 1.5, orb.size * 2, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: orb.color,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      mesh.add(glow);

      this.ambientOrbs!.add(mesh);
    });

    scene.add(this.ambientOrbs);
  }

  private createHorizonGlow(scene: THREE.Scene) {
    // Gradient plane at horizon
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, 'rgba(255, 136, 0, 0.3)');
    gradient.addColorStop(0.3, 'rgba(136, 0, 255, 0.2)');
    gradient.addColorStop(0.6, 'rgba(0, 255, 136, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(60, 20);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    const horizonPlane = new THREE.Mesh(geometry, material);
    horizonPlane.position.set(0, 5, -25);
    scene.add(horizonPlane);

    // Add sun/moon
    const sunGeometry = new THREE.CircleGeometry(3, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.6
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(0, 8, -30);
    scene.add(sun);

    // Sun glow
    const sunGlowGeometry = new THREE.CircleGeometry(5, 32);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.2
    });
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    sunGlow.position.set(0, 8, -30.1);
    scene.add(sunGlow);
  }

  private animateBackground(delta: number, camera: THREE.PerspectiveCamera) {
    const time = this.clock.getElapsedTime();

    // Animate grid scroll
    if (this.gridFloor) {
      this.gridFloor.children.forEach((line, index) => {
        if (line instanceof THREE.Line) {
          const material = line.material as THREE.LineBasicMaterial;
          // Pulse effect
          material.opacity = 0.3 + Math.sin(time * 2 + index * 0.1) * 0.15;
        }
      });
    }

    // Animate particles
    if (this.floatingParticles) {
      this.floatingParticles.rotation.y += delta * 0.02;
      
      const positions = this.floatingParticles.geometry.attributes['position'].array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(time + i) * 0.002;
      }
      this.floatingParticles.geometry.attributes['position'].needsUpdate = true;
    }

    // Animate orbs
    if (this.ambientOrbs) {
      this.ambientOrbs.children.forEach((orb) => {
        if (orb instanceof THREE.Mesh) {
          const data = orb.userData;
          orb.position.y = data['baseY'] + Math.sin(time * data['speed'] + data['phase']) * 0.5;
          
          // Pulse glow
          if (orb.children[0] instanceof THREE.Mesh) {
            const glowMaterial = orb.children[0].material as THREE.MeshBasicMaterial;
            glowMaterial.opacity = 0.15 + Math.sin(time * 2 + data['phase']) * 0.1;
            orb.children[0].rotation.z += delta * 0.5;
          }
        }
      });
    }

    // Subtle camera movement
    camera.position.x = Math.sin(time * 0.1) * 0.3;
    camera.position.y = 3 + Math.sin(time * 0.15) * 0.2;
    camera.lookAt(0, 0, -5);
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

  goToAudioSettings() {
    this.router.navigate(['/audio-settings']);
  }

  goToBluetoothSettings() {
    this.router.navigate(['/bluetooth-settings']);
  }
}
