import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { CrtSceneService } from '../../services/crt-scene.service';

@Component({
  selector: 'app-intro',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './intro.component.html',
  styleUrl: './intro.component.css'
})
export class IntroComponent implements AfterViewInit, OnDestroy {
  @ViewChild('threeCanvas') canvasRef!: ElementRef<HTMLDivElement>;
  
  private rx7Audio: HTMLAudioElement | null = null;
  private phase: 'boot' | 'rotary' | 'rx7' | 'transition' = 'boot';
  private clock = new THREE.Clock();
  private bootTextMesh: THREE.Mesh | null = null;
  private rotaryGroup: THREE.Group | null = null;
  private rx7Group: THREE.Group | null = null;
  private particles: THREE.Points | null = null;
  private glitchIntensity = 0;
  private targetGlitch = 0;
  private phaseTime = 0;

  constructor(
    private router: Router,
    private crtScene: CrtSceneService
  ) {}

  ngAfterViewInit() {
    this.initScene();
  }

  ngOnDestroy() {
    this.crtScene.destroyScene('intro');
    if (this.rx7Audio) {
      this.rx7Audio.pause();
      this.rx7Audio = null;
    }
  }

  skipIntro() {
    this.router.navigate(['/home']);
  }

  private initScene() {
    const { scene, camera, crtEffect } = this.crtScene.createScene('intro', {
      container: this.canvasRef.nativeElement,
      enableCRT: true,
      crtIntensity: 0.8
    });

    camera.position.z = 8;

    // Create starfield particles
    this.createStarfield(scene);

    // Create boot sequence text
    this.createBootText(scene);

    // Create rotary engine group (hidden initially)
    this.createRotaryEngine(scene);

    // Create RX7 logo group (hidden initially)
    this.createRX7Logo(scene);

    // Add ambient lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Add point lights
    const pointLight1 = new THREE.PointLight(0x00ff88, 2, 50);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff8800, 2, 50);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // Start animation
    this.crtScene.startRenderLoop('intro', (delta) => {
      this.animate(delta, scene, camera, crtEffect);
    });

    // Start phase sequence
    this.startBootSequence();
  }

  private createStarfield(scene: THREE.Scene) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];

    for (let i = 0; i < 2000; i++) {
      vertices.push(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100
      );
      
      const color = new THREE.Color();
      color.setHSL(0.4 + Math.random() * 0.2, 0.8, 0.6 + Math.random() * 0.4);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    this.particles = new THREE.Points(geometry, material);
    scene.add(this.particles);
  }

  private createBootText(scene: THREE.Scene) {
    const group = new THREE.Group();

    // Create wireframe hexagon as frame
    const hexGeometry = new THREE.RingGeometry(2.5, 2.8, 6);
    const hexMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const hexMesh = new THREE.Mesh(hexGeometry, hexMaterial);
    group.add(hexMesh);

    // Create inner hexagon
    const innerHexGeometry = new THREE.RingGeometry(1.8, 2.0, 6);
    const innerHexMesh = new THREE.Mesh(innerHexGeometry, hexMaterial.clone());
    group.add(innerHexMesh);

    // Create boot lines as small boxes
    for (let i = 0; i < 5; i++) {
      const lineGeometry = new THREE.BoxGeometry(2, 0.08, 0.01);
      const lineMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0
      });
      const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
      lineMesh.position.y = 0.5 - i * 0.25;
      lineMesh.userData = { delay: i * 0.15 };
      group.add(lineMesh);
    }

    // Create loading bar frame
    const loadingFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.3, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.3 })
    );
    loadingFrame.position.y = -1.2;
    group.add(loadingFrame);

    // Create loading bar fill
    const loadingFill = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.25, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9 })
    );
    loadingFill.position.y = -1.2;
    loadingFill.position.x = -1.45;
    loadingFill.userData = { isLoadingBar: true };
    group.add(loadingFill);

    // Add scanline effect planes
    for (let i = 0; i < 8; i++) {
      const scanline = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 0.02),
        new THREE.MeshBasicMaterial({ 
          color: 0x00ff88, 
          transparent: true, 
          opacity: 0.1 
        })
      );
      scanline.position.y = 2 - i * 0.5;
      scanline.position.z = 0.1;
      group.add(scanline);
    }

    group.visible = true;
    scene.add(group);
    this.bootTextMesh = group as unknown as THREE.Mesh;
  }

  private createRotaryEngine(scene: THREE.Scene) {
    this.rotaryGroup = new THREE.Group();

    // Create rotor housing (epitrochoid shape approximation)
    const housingShape = new THREE.Shape();
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      // Epitrochoid parameters
      const R = 1.5;
      const r = 0.5;
      const d = 0.3;
      const x = (R - r) * Math.cos(angle) + d * Math.cos(((R - r) / r) * angle);
      const y = (R - r) * Math.sin(angle) - d * Math.sin(((R - r) / r) * angle);
      
      if (i === 0) {
        housingShape.moveTo(x * 1.2, y * 1.2);
      } else {
        housingShape.lineTo(x * 1.2, y * 1.2);
      }
    }

    const housingGeometry = new THREE.ExtrudeGeometry(housingShape, {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2
    });
    
    const housingMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.3,
      transparent: true,
      opacity: 0
    });
    
    const housing = new THREE.Mesh(housingGeometry, housingMaterial);
    housing.position.z = -0.15;
    this.rotaryGroup.add(housing);

    // Create triangular rotor
    const rotorShape = new THREE.Shape();
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * 1.2;
      const y = Math.sin(angle) * 1.2;
      if (i === 0) {
        rotorShape.moveTo(x, y);
      } else {
        rotorShape.lineTo(x, y);
      }
    }
    rotorShape.closePath();

    const rotorGeometry = new THREE.ExtrudeGeometry(rotorShape, {
      depth: 0.25,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2
    });

    const rotorMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      metalness: 0.6,
      roughness: 0.4,
      emissive: 0x00ff88,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0
    });

    const rotor = new THREE.Mesh(rotorGeometry, rotorMaterial);
    rotor.userData = { isRotor: true };
    this.rotaryGroup.add(rotor);

    // Add glow ring
    const glowRing = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 2.2, 32),
      new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      })
    );
    glowRing.position.z = 0.2;
    this.rotaryGroup.add(glowRing);

    // Add outer glow ring
    const outerGlow = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.8, 32),
      new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      })
    );
    outerGlow.position.z = 0.15;
    this.rotaryGroup.add(outerGlow);

    this.rotaryGroup.visible = false;
    scene.add(this.rotaryGroup);
  }

  private createRX7Logo(scene: THREE.Scene) {
    this.rx7Group = new THREE.Group();

    // Create "RX-7" text using 3D geometry
    // R
    const rGroup = new THREE.Group();
    rGroup.add(this.createLetterBar(0, 0.5, 0.1, 1.2)); // vertical
    rGroup.add(this.createLetterBar(0.25, 1, 0.6, 0.1)); // top horizontal
    rGroup.add(this.createLetterBar(0.25, 0.5, 0.6, 0.1)); // middle horizontal
    rGroup.add(this.createLetterBar(0.45, 0.75, 0.1, 0.6)); // right vertical top
    rGroup.add(this.createLetterBar(0.35, 0.1, 0.4, 0.1, Math.PI / 6)); // diagonal leg
    rGroup.position.x = -2;
    this.rx7Group.add(rGroup);

    // X
    const xGroup = new THREE.Group();
    xGroup.add(this.createLetterBar(0, 0.5, 0.12, 1.4, Math.PI / 4));
    xGroup.add(this.createLetterBar(0, 0.5, 0.12, 1.4, -Math.PI / 4));
    xGroup.position.x = -0.7;
    this.rx7Group.add(xGroup);

    // Dash
    const dashGroup = new THREE.Group();
    dashGroup.add(this.createLetterBar(0, 0.5, 0.5, 0.12));
    dashGroup.position.x = 0.4;
    this.rx7Group.add(dashGroup);

    // 7
    const sevenGroup = new THREE.Group();
    sevenGroup.add(this.createLetterBar(0, 1, 0.7, 0.12)); // top
    sevenGroup.add(this.createLetterBar(0.15, 0.4, 0.12, 1.3, Math.PI / 8)); // diagonal
    sevenGroup.position.x = 1.3;
    this.rx7Group.add(sevenGroup);

    // Add glowing underline
    const underline = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.08, 0.05),
      new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0
      })
    );
    underline.position.y = -0.3;
    underline.userData = { isUnderline: true };
    this.rx7Group.add(underline);

    // Add FC badge
    const fcGroup = new THREE.Group();
    
    const fcBadge = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.5, 0.05),
      new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0
      })
    );
    fcGroup.add(fcBadge);
    fcGroup.position.y = -0.8;
    fcGroup.userData = { isFCBadge: true };
    this.rx7Group.add(fcGroup);

    // Add outer glow frame
    const glowFrame = new THREE.Mesh(
      new THREE.RingGeometry(2.5, 3.0, 64),
      new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      })
    );
    glowFrame.position.z = -0.1;
    this.rx7Group.add(glowFrame);

    this.rx7Group.visible = false;
    this.rx7Group.position.y = 0.3;
    scene.add(this.rx7Group);
  }

  private createLetterBar(x: number, y: number, width: number, height: number, rotation = 0): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(width, height, 0.15);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff8800,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0xff8800,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0);
    mesh.rotation.z = rotation;
    return mesh;
  }

  private startBootSequence() {
    this.phase = 'boot';
    this.phaseTime = 0;

    // Boot phase timing
    setTimeout(() => {
      this.transitionToRotary();
    }, 2500);
  }

  private transitionToRotary() {
    this.targetGlitch = 1.0;
    
    setTimeout(() => {
      this.phase = 'rotary';
      this.phaseTime = 0;
      
      if (this.bootTextMesh) {
        (this.bootTextMesh as unknown as THREE.Group).visible = false;
      }
      if (this.rotaryGroup) {
        this.rotaryGroup.visible = true;
      }
      
      this.targetGlitch = 0;
      
      setTimeout(() => {
        this.transitionToRX7();
      }, 3000);
    }, 500);
  }

  private transitionToRX7() {
    this.targetGlitch = 1.0;
    this.playRx7Audio();
    
    setTimeout(() => {
      this.phase = 'rx7';
      this.phaseTime = 0;
      
      if (this.rotaryGroup) {
        this.rotaryGroup.visible = false;
      }
      if (this.rx7Group) {
        this.rx7Group.visible = true;
      }
      
      this.targetGlitch = 0;
      
      setTimeout(() => {
        this.transitionToHome();
      }, 3000);
    }, 500);
  }

  private transitionToHome() {
    this.phase = 'transition';
    this.targetGlitch = 1.5;
    
        setTimeout(() => {
          this.router.navigate(['/home']);
    }, 800);
  }

  private animate(delta: number, scene: THREE.Scene, camera: THREE.PerspectiveCamera, crtEffect: any) {
    this.phaseTime += delta;
    
    // Smooth glitch transition
    this.glitchIntensity += (this.targetGlitch - this.glitchIntensity) * delta * 5;
    
    // Apply glitch to CRT effect
    crtEffect.uniforms.get('chromaticAberration').value = 1.0 + this.glitchIntensity * 5;
    crtEffect.uniforms.get('noiseIntensity').value = 0.3 + this.glitchIntensity * 2;

    // Animate starfield
    if (this.particles) {
      this.particles.rotation.y += delta * 0.02;
      this.particles.rotation.x += delta * 0.01;
    }

    // Phase-specific animations
    switch (this.phase) {
      case 'boot':
        this.animateBoot(delta);
        break;
      case 'rotary':
        this.animateRotary(delta);
        break;
      case 'rx7':
        this.animateRX7(delta);
        break;
      case 'transition':
        camera.position.z -= delta * 10;
        break;
    }
  }

  private animateBoot(delta: number) {
    if (!this.bootTextMesh) return;
    
    const group = this.bootTextMesh as unknown as THREE.Group;
    
    // Animate boot text lines appearing
    group.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.userData['delay'] !== undefined) {
        const delay = child.userData['delay'];
        if (this.phaseTime > delay) {
          const material = child.material as THREE.MeshBasicMaterial;
          material.opacity = Math.min(1, (this.phaseTime - delay) * 2);
        }
      }
      
      // Animate loading bar
      if (child instanceof THREE.Mesh && child.userData['isLoadingBar']) {
        const progress = Math.min(1, this.phaseTime / 2);
        child.scale.x = progress * 290;
        child.position.x = -1.45 + progress * 1.45;
      }
    });

    // Pulse outer hexagons
    const pulse = Math.sin(this.phaseTime * 5) * 0.1 + 1;
    group.scale.set(pulse, pulse, 1);
  }

  private animateRotary(delta: number) {
    if (!this.rotaryGroup) return;
    
    // Fade in all parts
    this.rotaryGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
        material.opacity = Math.min(material.opacity + delta * 2, child.userData['isRotor'] ? 0.9 : 0.7);
      }
    });

    // Rotate the rotor
    this.rotaryGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.userData['isRotor']) {
        child.rotation.z += delta * 3;
      }
    });

    // Pulsing scale
    const scale = 1 + Math.sin(this.phaseTime * 3) * 0.05;
    this.rotaryGroup.scale.set(scale, scale, 1);
    
    // Slight wobble
    this.rotaryGroup.rotation.x = Math.sin(this.phaseTime * 2) * 0.1;
    this.rotaryGroup.rotation.y = Math.cos(this.phaseTime * 1.5) * 0.1;
  }

  private animateRX7(delta: number) {
    if (!this.rx7Group) return;
    
    // Fade in letters with cascade effect
    let delay = 0;
    this.rx7Group.children.forEach((child) => {
      if (child instanceof THREE.Group) {
        child.children.forEach((letterPart) => {
          if (letterPart instanceof THREE.Mesh) {
            const material = letterPart.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
            if (this.phaseTime > delay) {
              material.opacity = Math.min(1, (this.phaseTime - delay) * 3);
            }
          }
        });
        delay += 0.15;
      } else if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshBasicMaterial;
        
        if (child.userData['isUnderline']) {
          if (this.phaseTime > 0.6) {
            material.opacity = Math.min(0.9, (this.phaseTime - 0.6) * 2);
            child.scale.x = Math.min(1, (this.phaseTime - 0.6) * 2);
          }
        } else if (child.userData['isFCBadge']) {
          if (this.phaseTime > 0.8) {
            material.opacity = Math.min(0.8, (this.phaseTime - 0.8) * 2);
          }
        } else {
          // Glow frame
          if (this.phaseTime > 1) {
            material.opacity = Math.min(0.4, (this.phaseTime - 1) * 0.5);
          }
        }
      }
    });

    // Gentle floating animation
    this.rx7Group.position.y = 0.3 + Math.sin(this.phaseTime * 2) * 0.1;
    
    // Subtle rotation
    this.rx7Group.rotation.y = Math.sin(this.phaseTime * 1.5) * 0.05;
  }

  playRx7Audio() {
    if (!this.rx7Audio) {
      this.rx7Audio = new Audio('assets/audio/intro2.wav');
    }
    this.rx7Audio.currentTime = 0;
    this.rx7Audio.play();
  }
}
