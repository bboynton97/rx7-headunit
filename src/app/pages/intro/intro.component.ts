import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { CrtSceneService } from '../../services/crt-scene.service';
// @ts-ignore - omggif doesn't have type definitions
import { GifReader } from 'omggif';

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
  private bootGroup: THREE.Group | null = null;
  private rotarySprite: THREE.Mesh | null = null;
  private rx7Sprite: THREE.Mesh | null = null;
  private particles: THREE.Points | null = null;
  private glitchIntensity = 0;
  private targetGlitch = 0;
  private phaseTime = 0;
  private camera: THREE.PerspectiveCamera | null = null;
  
  // GIF animation frames
  private gifFrames: THREE.DataTexture[] = [];
  private gifFrameDelays: number[] = [];
  private gifStartTime = 0;
  private currentGifFrame = 0;

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

    this.camera = camera;
    camera.position.z = 5;

    // Create starfield particles
    this.createStarfield(scene);

    // Create boot sequence elements
    this.createBootSequence(scene);

    // Load and create rotary.gif sprite with frame-by-frame animation
    this.createRotarySprite(scene);

    // Load and create rx7.png sprite
    this.createRx7Sprite(scene);

    // Add ambient lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    // Add point lights for glow effects
    const pointLight1 = new THREE.PointLight(0x00ff88, 1, 50);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff8800, 1, 50);
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

    for (let i = 0; i < 1500; i++) {
      vertices.push(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 80
      );
      
      const color = new THREE.Color();
      color.setHSL(0.4 + Math.random() * 0.2, 0.8, 0.6 + Math.random() * 0.4);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.6
    });

    this.particles = new THREE.Points(geometry, material);
    scene.add(this.particles);
  }

  private createBootSequence(scene: THREE.Scene) {
    this.bootGroup = new THREE.Group();

    // Create hexagonal frame
    const hexGeometry = new THREE.RingGeometry(2.2, 2.5, 6);
    const hexMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const hexMesh = new THREE.Mesh(hexGeometry, hexMaterial);
    hexMesh.userData['type'] = 'hex';
    this.bootGroup.add(hexMesh);

    // Inner hexagon
    const innerHexGeometry = new THREE.RingGeometry(1.6, 1.8, 6);
    const innerHexMesh = new THREE.Mesh(innerHexGeometry, hexMaterial.clone());
    innerHexMesh.userData['type'] = 'hex';
    this.bootGroup.add(innerHexMesh);

    // Create "INITIALIZING" text placeholder (horizontal lines)
    for (let i = 0; i < 4; i++) {
      const lineGeometry = new THREE.BoxGeometry(1.8, 0.06, 0.01);
      const lineMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0
      });
      const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
      lineMesh.position.y = 0.4 - i * 0.2;
      lineMesh.userData['type'] = 'line';
      lineMesh.userData['delay'] = i * 0.12;
      this.bootGroup.add(lineMesh);
    }

    // Loading bar frame
    const loadingFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.2, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0 })
    );
    loadingFrame.position.y = -0.8;
    loadingFrame.userData['type'] = 'loadingFrame';
    this.bootGroup.add(loadingFrame);

    // Loading bar fill
    const loadingFill = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.15, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0 })
    );
    loadingFill.position.y = -0.8;
    loadingFill.position.x = -1.2;
    loadingFill.userData['type'] = 'loadingFill';
    this.bootGroup.add(loadingFill);

    this.bootGroup.visible = true;
    scene.add(this.bootGroup);
  }

  private async createRotarySprite(scene: THREE.Scene) {
    try {
      // Fetch the GIF file
      const response = await fetch('assets/rotary.gif');
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Decode GIF using omggif
      const gifReader = new GifReader(bytes);
      const numFrames = gifReader.numFrames();
      const width = gifReader.width;
      const height = gifReader.height;
      
      // Create a canvas to composite frames properly (handles GIF disposal methods)
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      
      // Create an ImageData to work with
      const compositeData = ctx.createImageData(width, height);
      
      // Extract each frame with proper compositing
      this.gifFrames = [];
      this.gifFrameDelays = [];
      
      for (let i = 0; i < numFrames; i++) {
        const frameInfo = gifReader.frameInfo(i);
        const frameData = new Uint8Array(width * height * 4);
        
        // Decode frame - this gives us just the changed pixels for this frame
        gifReader.decodeAndBlitFrameRGBA(i, frameData);
        
        // Composite onto the running canvas
        // Handle disposal method
        if (i === 0 || frameInfo.disposal === 2) {
          // Clear to background (or first frame)
          for (let j = 0; j < compositeData.data.length; j++) {
            compositeData.data[j] = 0;
          }
        }
        
        // Blit the new frame data onto the composite
        // Only overwrite pixels that are not transparent in the new frame
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * 4;
            const alpha = frameData[srcIdx + 3];
            
            if (alpha > 0) {
              compositeData.data[srcIdx] = frameData[srcIdx];       // R
              compositeData.data[srcIdx + 1] = frameData[srcIdx + 1]; // G
              compositeData.data[srcIdx + 2] = frameData[srcIdx + 2]; // B
              compositeData.data[srcIdx + 3] = frameData[srcIdx + 3]; // A
            }
          }
        }
        
        // Create a copy of the current composite state for this frame
        const frameCopy = new Uint8Array(compositeData.data);
        
        // Create texture from composited frame data
        const frameTexture = new THREE.DataTexture(frameCopy, width, height, THREE.RGBAFormat);
        frameTexture.minFilter = THREE.LinearFilter;
        frameTexture.magFilter = THREE.LinearFilter;
        frameTexture.flipY = true;
        frameTexture.needsUpdate = true;
        
        this.gifFrames.push(frameTexture);
        // GIF delays are in centiseconds, convert to milliseconds (minimum 20ms to prevent too fast animation)
        this.gifFrameDelays.push(Math.max(frameInfo.delay * 10, 20));
      }
      
      // Create the sprite mesh with the first frame
      if (this.gifFrames.length > 0) {
        const aspectRatio = width / height;
        const spriteHeight = 3;
        const spriteWidth = spriteHeight * aspectRatio;
        
        const geometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const material = new THREE.MeshBasicMaterial({
          map: this.gifFrames[0],
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide
        });
        
        this.rotarySprite = new THREE.Mesh(geometry, material);
        this.rotarySprite.visible = false;
        scene.add(this.rotarySprite);
        
        this.gifStartTime = Date.now();
      }
      
    } catch (error) {
      console.error('Error loading GIF:', error);
      // Fallback: create a placeholder
      this.createFallbackRotarySprite(scene);
    }
  }
  
  private createFallbackRotarySprite(scene: THREE.Scene) {
    const geometry = new THREE.PlaneGeometry(3, 3);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0
    });
    this.rotarySprite = new THREE.Mesh(geometry, material);
    this.rotarySprite.visible = false;
    scene.add(this.rotarySprite);
  }
  
  private updateGifFrame() {
    if (this.gifFrames.length === 0 || !this.rotarySprite) return;
    
    // Calculate current frame based on elapsed time and frame delays
    let elapsed = Date.now() - this.gifStartTime;
    
    // Calculate total loop duration
    const totalLoopTime = this.gifFrameDelays.reduce((sum, delay) => sum + delay, 0);
    elapsed = elapsed % totalLoopTime;
    
    // Find which frame we should be on based on cumulative delays
    let cumulativeTime = 0;
    let currentFrame = 0;
    
    for (let i = 0; i < this.gifFrameDelays.length; i++) {
      cumulativeTime += this.gifFrameDelays[i];
      if (elapsed < cumulativeTime) {
        currentFrame = i;
        break;
      }
    }
    
    // Update texture to current frame
    if (this.gifFrames[currentFrame] && currentFrame !== this.currentGifFrame) {
      const material = this.rotarySprite.material as THREE.MeshBasicMaterial;
      material.map = this.gifFrames[currentFrame];
      material.needsUpdate = true;
      this.currentGifFrame = currentFrame;
    }
  }

  private createRx7Sprite(scene: THREE.Scene) {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('assets/rx7.png', (texture) => {
      const aspectRatio = texture.image.width / texture.image.height;
      const height = 3;
      const width = height * aspectRatio;
      
      const geometry = new THREE.PlaneGeometry(width, height);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      
      this.rx7Sprite = new THREE.Mesh(geometry, material);
      this.rx7Sprite.visible = false;
      scene.add(this.rx7Sprite);
    });

    // Fallback
    setTimeout(() => {
      if (!this.rx7Sprite) {
        const geometry = new THREE.PlaneGeometry(3, 3);
        const material = new THREE.MeshBasicMaterial({
          color: 0xff8800,
          transparent: true,
          opacity: 0
        });
        this.rx7Sprite = new THREE.Mesh(geometry, material);
        this.rx7Sprite.visible = false;
        scene.add(this.rx7Sprite);
      }
    }, 2000);
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
      this.gifStartTime = Date.now(); // Reset GIF animation timing
      
      if (this.bootGroup) {
        this.bootGroup.visible = false;
      }
      if (this.rotarySprite) {
        this.rotarySprite.visible = true;
      }
      
      this.targetGlitch = 0;
      
      setTimeout(() => {
        this.transitionToRX7();
      }, 2500);
    }, 500);
  }

  private transitionToRX7() {
    this.targetGlitch = 1.0;
    this.playRx7Audio();
    
    setTimeout(() => {
      this.phase = 'rx7';
      this.phaseTime = 0;
      
      if (this.rotarySprite) {
        this.rotarySprite.visible = false;
      }
      if (this.rx7Sprite) {
        this.rx7Sprite.visible = true;
      }
      
      this.targetGlitch = 0;
      
      setTimeout(() => {
        this.transitionToHome();
      }, 2500);
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
        if (this.camera) {
          this.camera.position.z -= delta * 8;
        }
        break;
    }
  }

  private animateBoot(delta: number) {
    if (!this.bootGroup) return;
    
    this.bootGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshBasicMaterial;
        const type = child.userData['type'];
        
        if (type === 'hex') {
          // Fade in hexagons
          material.opacity = Math.min(0.8, this.phaseTime * 0.8);
        } else if (type === 'line') {
          const delay = child.userData['delay'] || 0;
          if (this.phaseTime > delay) {
            material.opacity = Math.min(0.9, (this.phaseTime - delay) * 2);
          }
        } else if (type === 'loadingFrame') {
          material.opacity = Math.min(0.4, this.phaseTime * 0.5);
        } else if (type === 'loadingFill') {
          material.opacity = Math.min(0.9, this.phaseTime * 0.8);
          const progress = Math.min(1, this.phaseTime / 2);
          child.scale.x = progress * 240;
          child.position.x = -1.2 + progress * 1.2;
        }
      }
    });
  }

  private animateRotary(delta: number) {
    if (!this.rotarySprite) return;
    
    // Update GIF frame
    this.updateGifFrame();
    
    const material = this.rotarySprite.material as THREE.MeshBasicMaterial;
    
    // Fade in
    material.opacity = Math.min(1, this.phaseTime * 1.5);
  }

  private animateRX7(delta: number) {
    if (!this.rx7Sprite) return;
    
    const material = this.rx7Sprite.material as THREE.MeshBasicMaterial;
    
    // Fade in
    material.opacity = Math.min(1, this.phaseTime * 1.5);
  }

  playRx7Audio() {
    if (!this.rx7Audio) {
      this.rx7Audio = new Audio('assets/audio/intro2.wav');
    }
    this.rx7Audio.currentTime = 0;
    this.rx7Audio.play();
  }
}
