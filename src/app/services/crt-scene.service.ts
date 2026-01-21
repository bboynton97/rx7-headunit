import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, Effect, BlendFunction } from 'postprocessing';

// Custom CRT Effect Shader
const crtFragmentShader = `
uniform float time;
uniform float scanlineIntensity;
uniform float scanlineCount;
uniform float vignetteIntensity;
uniform float curvature;
uniform float chromaticAberration;
uniform float flickerIntensity;
uniform float noiseIntensity;
uniform float brightness;
uniform float contrast;
uniform float saturation;
uniform float phosphorGlow;
uniform vec3 screenTint;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 curvedUV = uv;
  
  // Screen curvature distortion
  vec2 dc = abs(0.5 - uv);
  dc *= dc;
  curvedUV.x -= 0.5; curvedUV.x *= 1.0 + (dc.y * (0.3 * curvature)); curvedUV.x += 0.5;
  curvedUV.y -= 0.5; curvedUV.y *= 1.0 + (dc.x * (0.4 * curvature)); curvedUV.y += 0.5;
  
  // Check if we're outside the curved screen
  if (curvedUV.x < 0.0 || curvedUV.x > 1.0 || curvedUV.y < 0.0 || curvedUV.y > 1.0) {
    outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  
  // Chromatic aberration
  float aberrationAmount = chromaticAberration * 0.003;
  float r = texture2D(inputBuffer, curvedUV + vec2(aberrationAmount, 0.0)).r;
  float g = texture2D(inputBuffer, curvedUV).g;
  float b = texture2D(inputBuffer, curvedUV - vec2(aberrationAmount, 0.0)).b;
  vec3 color = vec3(r, g, b);
  
  // Scanlines
  float scanline = sin(curvedUV.y * scanlineCount * 3.14159) * 0.5 + 0.5;
  scanline = pow(scanline, 1.5) * scanlineIntensity;
  color *= 1.0 - scanline * 0.3;
  
  // Horizontal scanline bands (thicker lines)
  float scanlineBand = sin(curvedUV.y * scanlineCount * 0.5 + time * 0.5) * 0.5 + 0.5;
  color *= 0.95 + scanlineBand * 0.05;
  
  // RGB sub-pixel simulation
  float subPixel = mod(gl_FragCoord.x, 3.0);
  vec3 subPixelMask = vec3(
    subPixel < 1.0 ? 1.0 : 0.7,
    subPixel >= 1.0 && subPixel < 2.0 ? 1.0 : 0.7,
    subPixel >= 2.0 ? 1.0 : 0.7
  );
  color *= mix(vec3(1.0), subPixelMask, 0.15);
  
  // Phosphor glow (bloom-like effect on bright areas)
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  vec3 glow = color * phosphorGlow * luminance * 0.5;
  color += glow;
  
  // Screen flicker
  float flicker = 1.0 - flickerIntensity * 0.03 * sin(time * 8.0);
  color *= flicker;
  
  // Noise/static
  float noise = random(curvedUV + time) * noiseIntensity * 0.05;
  color += noise;
  
  // Vignette
  float vignette = 1.0 - length(dc) * vignetteIntensity * 2.5;
  vignette = clamp(vignette, 0.0, 1.0);
  color *= vignette;
  
  // Screen edge glow
  float edgeGlow = 1.0 - smoothstep(0.0, 0.05, min(min(curvedUV.x, 1.0 - curvedUV.x), min(curvedUV.y, 1.0 - curvedUV.y)));
  color += vec3(0.0, 0.02, 0.03) * edgeGlow * 2.0;
  
  // Color adjustments
  color = (color - 0.5) * contrast + 0.5;
  color *= brightness;
  
  // Saturation
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(gray), color, saturation);
  
  // Screen tint
  color *= screenTint;
  
  outputColor = vec4(color, 1.0);
}
`;

class CRTEffect extends Effect {
  constructor() {
    const uniforms = new Map<string, THREE.Uniform<number | THREE.Vector3>>();
    uniforms.set('time', new THREE.Uniform(0.0));
    uniforms.set('scanlineIntensity', new THREE.Uniform(0.7));
    uniforms.set('scanlineCount', new THREE.Uniform(800.0));
    uniforms.set('vignetteIntensity', new THREE.Uniform(1.2));
    uniforms.set('curvature', new THREE.Uniform(0.5));
    uniforms.set('chromaticAberration', new THREE.Uniform(1.0));
    uniforms.set('flickerIntensity', new THREE.Uniform(0.3));
    uniforms.set('noiseIntensity', new THREE.Uniform(0.4));
    uniforms.set('brightness', new THREE.Uniform(1.15));
    uniforms.set('contrast', new THREE.Uniform(1.1));
    uniforms.set('saturation', new THREE.Uniform(1.2));
    uniforms.set('phosphorGlow', new THREE.Uniform(0.4));
    uniforms.set('screenTint', new THREE.Uniform(new THREE.Vector3(1.0, 0.98, 0.95)));

    super('CRTEffect', crtFragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: uniforms as Map<string, THREE.Uniform<number>>
    });
  }

  override update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime: number) {
    const time = this.uniforms.get('time')!;
    (time as THREE.Uniform<number>).value += deltaTime;
  }
}

export interface SceneConfig {
  container: HTMLElement;
  width?: number;
  height?: number;
  enableCRT?: boolean;
  crtIntensity?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CrtSceneService {
  private scenes: Map<string, {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer;
    crtEffect: CRTEffect;
    animationId: number | null;
  }> = new Map();

  createScene(id: string, config: SceneConfig): {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer;
    crtEffect: CRTEffect;
  } {
    const width = config.width || window.innerWidth;
    const height = config.height || window.innerHeight;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Create camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 5;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    config.container.appendChild(renderer.domElement);

    // Create post-processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Add CRT effect
    const crtEffect = new CRTEffect();
    if (config.crtIntensity !== undefined) {
      this.setCRTIntensity(crtEffect, config.crtIntensity);
    }
    
    const effectPass = new EffectPass(camera, crtEffect);
    composer.addPass(effectPass);

    this.scenes.set(id, { scene, camera, renderer, composer, crtEffect, animationId: null });

    return { scene, camera, renderer, composer, crtEffect };
  }

  setCRTIntensity(crtEffect: CRTEffect, intensity: number) {
    const i = Math.max(0, Math.min(1, intensity));
    crtEffect.uniforms.get('scanlineIntensity')!.value = 0.5 + i * 0.5;
    crtEffect.uniforms.get('curvature')!.value = 0.3 + i * 0.4;
    crtEffect.uniforms.get('chromaticAberration')!.value = 0.5 + i * 1.0;
    crtEffect.uniforms.get('flickerIntensity')!.value = 0.1 + i * 0.4;
    crtEffect.uniforms.get('noiseIntensity')!.value = 0.2 + i * 0.4;
    crtEffect.uniforms.get('vignetteIntensity')!.value = 0.8 + i * 0.6;
    crtEffect.uniforms.get('phosphorGlow')!.value = 0.2 + i * 0.4;
  }

  startRenderLoop(id: string, onFrame?: (delta: number) => void) {
    const sceneData = this.scenes.get(id);
    if (!sceneData) return;

    const clock = new THREE.Clock();
    
    const animate = () => {
      const delta = clock.getDelta();
      
      if (onFrame) {
        onFrame(delta);
      }
      
      sceneData.composer.render(delta);
      sceneData.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  stopRenderLoop(id: string) {
    const sceneData = this.scenes.get(id);
    if (sceneData?.animationId) {
      cancelAnimationFrame(sceneData.animationId);
      sceneData.animationId = null;
    }
  }

  destroyScene(id: string) {
    const sceneData = this.scenes.get(id);
    if (!sceneData) return;

    this.stopRenderLoop(id);
    
    sceneData.renderer.dispose();
    sceneData.composer.dispose();
    sceneData.scene.clear();
    
    if (sceneData.renderer.domElement.parentElement) {
      sceneData.renderer.domElement.parentElement.removeChild(sceneData.renderer.domElement);
    }
    
    this.scenes.delete(id);
  }

  resize(id: string, width: number, height: number) {
    const sceneData = this.scenes.get(id);
    if (!sceneData) return;

    const camera = sceneData.camera as THREE.PerspectiveCamera;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    sceneData.renderer.setSize(width, height);
    sceneData.composer.setSize(width, height);
  }
}
