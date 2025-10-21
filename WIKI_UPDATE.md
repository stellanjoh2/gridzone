# GridZone Wiki Update

This file contains the complete updated wiki content for your GitHub repository. You can copy this content to your GitHub wiki at: https://github.com/stellanjoh2/gridzone/wiki

## Instructions:
1. Go to https://github.com/stellanjoh2/gridzone/wiki
2. Edit the Home page
3. Replace all content with the content below
4. Save the page

---

# GridZone®

A modern 3D take on Pong with cinematic visuals, weighty audio, and a smooth feel. This is my first web development project, built with Three.js and pure JavaScript.

## Live

* Game: <https://gridzone.online>
* Repo: <https://github.com/stellanjoh2/gridzone>
* Wiki: <https://github.com/stellanjoh2/gridzone/wiki>

## Table of Contents

* Quick Start
* Overview
* Features
* Tech Stack
* Controls
* Gameplay Systems
* Visual & Audio
* Performance
* Browser Support
* System Requirements
* Troubleshooting
* Recent Updates (Latest Session)
* Development Process Guide
* Roadmap

## Quick Start

1. Open https://gridzone.online
2. Press **Space** or **Enter** to start
3. Use **WASD**, **Arrow Keys**, **Mouse**, or **Gamepad** to move
4. Press **J** for fullscreen (recommended)

## Overview

GridZone blends classic arcade gameplay with modern rendering, camera systems, and post-processing effects. It focuses on feel: responsive paddles, impactful hits, clean UI, and celebration moments that land. The game features advanced 3D graphics, dynamic lighting, particle systems, and immersive audio design.

## Features

### 🎮 **Core Gameplay**
* Classic Pong vs AI with modern 3D presentation
* Multi-ball system with dynamic spawning and management
* Bonus pickups (2X width, multi-ball) with visual feedback
* Stuck ball detection and automatic collision recovery
* Score sequence locking to prevent multiple death/win triggers

### 🎨 **Visual Excellence**
* **Dynamic 3D lighting system** with real-time shadows and reflections
* Senior atmospheric particle effects** with color-shifting mechanics
* **Smooth camera animations** with shake effects and drift correction
* **Celebratory visual sequences** with wall lighting waves
* **Custom UI design** with Terminal Grotesque typography
* **Lens flare system** with dynamic ghost effects
* **Dynamic floor glow** with magnetic tile elevation effects
* **3D Death Skull Animation** with material brightness transitions
* **CRT Post-Processing Effects** with scanlines, vignette, and chromatic aberration
* **Advanced Camera System** with seamless transitions and drift correction

### 🎵 **Audio Design**
* **Dynamic music integration** with multiple atmospheric tracks
* **Real-time audio feedback** for paddle hits, wall collisions, and special events
* **Celebration sound sequences** synchronized with visual effects
* **Ambient wave sounds** for wall celebrations
* **Performance-optimized audio** with efficient memory management
* **Sound queuing system** to prevent audio conflicts

## Tech Stack

### **Frontend**
* **Three.js** - 3D graphics rendering and scene management
* **Vanilla JavaScript** - Game logic, physics, and state management
* **HTML5 Canvas** - WebGL rendering pipeline
* **CSS3** - UI styling, animations, and responsive design
* **HTML5 Audio API** - Sound effects and music playback
* **Web Audio API** - Advanced audio processing and spatial sound
* **Gamepad API** - Controller support with vibration
* **Mouse API** - Precise cursor control integration

### **Typography**
* **Terminal Grotesque** by Raphaël Bastide, with the contribution of Jérémy Landes
* Distributed by velvetyne.fr
* Custom font loading with `@font-face` declarations

### **Post-Processing Effects**
* **CRT Shader** - Scanlines, vignette, and chromatic aberration effects
* **Bloom Effects** - Dynamic lighting enhancement
* **Lens Flare** - Atmospheric ghost effects
* **Chromatic Aberration** - RGB separation effects during special events

### **3D Assets**
* **OBJ Model Loading** - 3D skull model for death sequences
* **Custom Materials** - Animated material brightness transitions
* **Dynamic Geometry** - Procedural particle systems

### **Development & Deployment**
* **Git** - Version control and collaboration
* **GitHub Pages** - Static site hosting and CI/CD
* **Custom Domain** - Professional domain management with SSL
* **Performance Monitoring** - Frame rate tracking and optimization

## Controls

### **Keyboard**
* **Movement**: WASD or Arrow Keys
* **Start Game**: Space or Enter
* **Pause**: P key
* **Reset**: R key (while paused)
* **Fullscreen Toggle**: J key or F11
* **Performance Mode**: P key (toggle)
* **Show/Hide FPS Counter**: F key
* **Music Previous Track**: [ key
* **Music Next Track**: ] key

### **Mouse**
* **Paddle Movement**: Mouse Y-axis
* **Camera Tilt**: Mouse movement
* **Click to Start**: Left click

### **Gamepad**
* **Movement**: Left Stick or D-Pad
* **Camera Tilt**: Right Stick
* **Start Game**: Any button or Start button
* **Pause**: Start button
* **Reset**: Square button (Xbox) or X button (PlayStation)
* **Rumble**: Used on impacts when supported

## Gameplay Systems

### **Multi-ball System**
* Spawns after scoring streaks
* Camera and timing tuned to stay readable
* Automatic cleanup and management

### **Bonus Pickup System**
* **2X Width**: Temporary paddle width boost with clean yellow vignette
* **Multi-ball**: Spawns additional balls with cyan flash effects
* Visual feedback with underground light color changes

### **Stuck-ball Recovery**
* Detects rapid collision loops
* Automatically frees stuck balls without side effects
* Prevents infinite collision scenarios

### **Message System**
* Queue-based with hard override capability
* "YOU DIED!" clears all other messages immediately
* Non-overlapping big text displays

### **Pause System**
* Hides all in-game messages during pause
* Dedicated pause camera positioning
* Clean UI with staggered entry animations

## Visual & Audio

### **Lighting Systems**
* Overhead lights with dynamic intensity
* Paddle and ball emissive lighting
* Celebratory wall illumination with traveling waves
* Underground purple light with color transitions

### **Particle Effects**
* Volumetric field near camera
* Size, spread, and opacity tuned for impact
* Color-shifting based on game events
* Performance-optimized rendering

### **Post-Processing**
* Custom bloom effects
* Lens flare with ghost artifacts
* RGB split during special moments
* CRT effects with scanlines and vignette
* Chromatic aberration with 32x boost during death

### **Audio Design**
* Spatialized impact sounds
* Celebration sound sequences
* Adaptive music volume
* Sound queuing to prevent conflicts
* Performance-optimized audio management

## Performance

### **Optimization Techniques**
* Frame-skipping for non-critical systems
* Memory cleanup after major events
* Bloom optimization to reduce cost
* Safe toggles for heavy rendering passes
* Efficient particle system management

### **Performance Monitoring**
* Real-time FPS counter
* Performance mode toggle
* Automatic quality adjustments
* Memory usage tracking

## Browser Support

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ Full | Recommended |
| Firefox | ✅ Full | - |
| Safari | ✅ Full | - |
| Edge | ✅ Full | - |
| Mobile | ⚠️ Limited | Touch controls available |

## System Requirements

* **WebGL 1.0+** support required
* **Modern browser** (Chrome 60+, Firefox 55+, Safari 12+)
* **2GB RAM** recommended for smooth performance
* **Gamepad** optional but recommended for best experience
* **Mouse** supported with adjustable sensitivity

## Troubleshooting

* **Low FPS**: Press **P** for Performance Mode
* **No Audio**: Check browser permissions
* **Controller Issues**: Ensure controller is connected before starting
* **Black Screen**: Try refreshing or different browser
* **Stuck Ball**: Game automatically detects and fixes collision loops
* **Camera Drift**: Game includes automatic drift correction
* **Music Issues**: Check browser audio permissions

## Recent Updates (Latest Session)

### **🎮 Gameplay Enhancements**
* **Ball Speed Consistency** - Fixed ball speed multiplier reset system ensuring consistent gameplay after win/loss events
* **Wall Collision Optimization** - Eliminated random wall lighting during special events
* **Multi-ball Score Prevention** - Implemented sequence locking to prevent multiple death/win triggers
* **Camera System Improvements** - Eliminated camera pops and implemented smooth drift correction

### **💀 Death Sequence Overhaul**
* **3D Skull Animation** - Replaced text-based death screen with animated 3D skull model
* **Material Brightness Animation** - Skull transitions from 80% darker to normal brightness
* **Chromatic Aberration Boost** - 32x intensity increase during death sequences
* **Camera Shake Enhancement** - Consistent death camera shake effects
* **FOV Animation System** - Smooth zoom from 75° to 50° during death, returning to normal after restart

### **🎨 Visual System Upgrades**
* **CRT Post-Processing Pipeline** - Complete implementation with scanlines, vignette, and noise
* **Chromatic Aberration Animation** - Smooth transitions during special events
* **Enhanced Lighting Systems** - Improved lens flare ghost effects and underground light transitions
* **Wall Collision Prevention** - Smart collision detection preventing false triggers during celebrations

### **⚡ Performance Optimizations**
* **Frame Drop Analysis** - Comprehensive performance review identifying bottlenecks
* **Animation System Optimization** - Reduced conflicts between multiple animation loops
* **Memory Management** - Improved cleanup of accumulated objects and timers
* **Collision Detection Enhancement** - More robust ball-wall collision system

### **🎯 UI and Controls**
* **Mouse Control Integration** - Full mouse support with adjustable sensitivity
* **Enhanced Gamepad Support** - Improved controller responsiveness and vibration
* **Pause Menu Improvements** - Staggered entry animations and improved styling
* **Text Glow Standardization** - Consistent glow effects across all UI elements

## Development Process Guide

### **Getting Started from Scratch**

This guide walks through the complete development process for creating a 3D web game similar to GridZone.

#### **Phase 1: Foundation Setup**

1. **Project Structure**
   ```
   your-game/
   ├── index.html
   ├── script.js
   ├── assets/
   │   ├── images/
   │   ├── sounds/
   │   ├── music/
   │   ├── fonts/
   │   └── 3D/
   ├── css/
   │   └── styles.css
   └── README.md
   ```

2. **HTML Foundation**
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Your 3D Game</title>
       <link rel="stylesheet" href="css/styles.css">
   </head>
   <body>
       <div id="gameContainer"></div>
       <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
       <script src="script.js"></script>
   </body>
   </html>
   ```

3. **Three.js Scene Setup**
   ```javascript
   class Game {
       constructor() {
           this.scene = new THREE.Scene();
           this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
           this.renderer = new THREE.WebGLRenderer({ antialias: true });
           
           this.renderer.setSize(window.innerWidth, window.innerHeight);
           this.renderer.setClearColor(0x000000);
           this.renderer.shadowMap.enabled = true;
           this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
           
           document.getElementById('gameContainer').appendChild(this.renderer.domElement);
       }
   }
   ```

#### **Phase 2: Core Game Systems**

1. **Game Loop Implementation**
   ```javascript
   animate() {
       requestAnimationFrame(() => this.animate());
       
       const deltaTime = this.clock.getDelta();
       
       // Update game systems
       this.updatePhysics(deltaTime);
       this.updateCamera(deltaTime);
       this.updateParticles(deltaTime);
       
       // Render
       this.renderer.render(this.scene, this.camera);
   }
   ```

2. **Physics System**
   ```javascript
   updatePhysics(deltaTime) {
       // Ball movement and collision detection
       for (let ball of this.balls) {
           ball.position.add(ball.velocity.clone().multiplyScalar(deltaTime));
           
           // Collision detection with walls, paddles
           this.checkCollisions(ball);
       }
   }
   ```

3. **Input System**
   ```javascript
   setupInput() {
       // Keyboard
       document.addEventListener('keydown', (event) => {
           this.handleKeyDown(event);
       });
       
       // Mouse
       document.addEventListener('mousemove', (event) => {
           this.handleMouseMove(event);
       });
       
       // Gamepad
       window.addEventListener('gamepadconnected', (event) => {
           this.gamepad = event.gamepad;
       });
   }
   ```

#### **Phase 3: Visual Systems**

1. **Lighting Setup**
   ```javascript
   setupLighting() {
       // Ambient light
       const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
       this.scene.add(ambientLight);
       
       // Directional light
       const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
       directionalLight.position.set(0, 20, 10);
       directionalLight.castShadow = true;
       this.scene.add(directionalLight);
       
       // Point lights
       const pointLight = new THREE.PointLight(0x00ff00, 2, 100);
       pointLight.position.set(0, 10, 0);
       this.scene.add(pointLight);
   }
   ```

2. **Particle System**
   ```javascript
   createParticleSystem() {
       const particleCount = 1000;
       const particles = new THREE.BufferGeometry();
       const positions = new Float32Array(particleCount * 3);
       
       for (let i = 0; i < particleCount * 3; i++) {
           positions[i] = (Math.random() - 0.5) * 20;
       }
       
       particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
       
       const material = new THREE.PointsMaterial({
           color: 0x00ff00,
           size: 0.1
       });
       
       const particleSystem = new THREE.Points(particles, material);
       this.scene.add(particleSystem);
   }
   ```

3. **Post-Processing Effects**
   ```javascript
   setupPostProcessing() {
       // CRT Shader
       const crtMaterial = new THREE.ShaderMaterial({
           vertexShader: crtVertexShader,
           fragmentShader: crtFragmentShader,
           uniforms: {
               tDiffuse: { value: null },
               time: { value: 0.0 },
               resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
           }
       });
       
       const crtEffect = new THREE.ShaderPass(crtMaterial);
       this.composer.addPass(crtEffect);
   }
   ```

#### **Phase 4: Audio System**

1. **Audio Manager**
   ```javascript
   class AudioManager {
       constructor() {
           this.sounds = {};
           this.music = null;
           this.loadSounds();
       }
       
       loadSounds() {
           this.sounds.hit = new Audio('assets/sounds/hit.wav');
           this.sounds.score = new Audio('assets/sounds/score.wav');
           this.music = new Audio('assets/music/background.mp3');
           this.music.loop = true;
       }
       
       playSound(soundName) {
           if (this.sounds[soundName]) {
               this.sounds[soundName].currentTime = 0;
               this.sounds[soundName].play();
           }
       }
   }
   ```

#### **Phase 5: Advanced Features**

1. **3D Model Loading**
   ```javascript
   load3DModel(path, onLoad) {
       const loader = new THREE.OBJLoader();
       loader.load(path, (obj) => {
           // Process loaded model
           obj.traverse((child) => {
               if (child.isMesh) {
                   child.material = new THREE.MeshStandardMaterial({
                       color: 0xffffff,
                       metalness: 0.5,
                       roughness: 0.5
                   });
               }
           });
           onLoad(obj);
       });
   }
   ```

2. **Animation System**
   ```javascript
   animateModel(model, duration, easing = 'easeOutCubic') {
       const startTime = performance.now();
       
       const animate = () => {
           const elapsed = performance.now() - startTime;
           const progress = Math.min(elapsed / duration, 1);
           const eased = this.applyEasing(progress, easing);
           
           // Apply animation based on progress
           model.scale.setScalar(eased);
           
           if (progress < 1) {
               requestAnimationFrame(animate);
           }
       };
       
       animate();
   }
   ```

3. **Performance Optimization**
   ```javascript
   optimizePerformance() {
       // Frame skipping for non-critical systems
       if (this.frameCount % 2 === 0) {
           this.updateParticles();
       }
       
       // Memory cleanup
       if (this.frameCount % 1000 === 0) {
           this.cleanupMemory();
       }
       
       // Dynamic quality adjustment
       if (this.fps < 30) {
           this.enablePerformanceMode();
       }
   }
   ```

#### **Phase 6: Deployment**

1. **GitHub Pages Setup**
   - Create GitHub repository
   - Enable GitHub Pages in repository settings
   - Push code to main branch
   - Configure custom domain if desired

2. **Performance Monitoring**
   ```javascript
   monitorPerformance() {
       setInterval(() => {
           const fps = this.calculateFPS();
           if (fps < 30) {
               console.warn('Low FPS detected:', fps);
               this.enablePerformanceMode();
           }
       }, 1000);
   }
   ```

### **Key Learning Points**

1. **Start Simple**: Begin with basic Three.js scene and gradually add complexity
2. **Performance First**: Always consider performance implications of new features
3. **Modular Design**: Keep systems separate and well-organized
4. **User Experience**: Focus on smooth, responsive gameplay
5. **Testing**: Test on multiple browsers and devices
6. **Documentation**: Keep detailed notes of your development process

### **Resources and Tools**

- **Three.js Documentation**: https://threejs.org/docs/
- **WebGL Fundamentals**: https://webglfundamentals.org/
- **Game Development Patterns**: Study existing games for inspiration
- **Performance Tools**: Browser dev tools, WebGL Inspector
- **Audio Tools**: Audacity, online audio converters
- **3D Modeling**: Blender (free), or use existing models

## Roadmap

### **Short Term**
* **QoL Improvements**: Options menu (graphics/audio), high score system
* **Polish Passes**: UI refinements, animation improvements
* **Mobile Optimization**: Touch controls, responsive design

### **Medium Term**
* **New Game Modes**: Time Attack, Survival, Practice
* **Content Expansion**: More power-ups, arenas, lighting themes
* **AI Enhancement**: More challenging AI opponent

### **Long Term**
* **WebXR Exploration**: VR/AR support
* **PWA Features**: Offline play, app installation
* **Analytics Integration**: Player behavior tracking
* **Multiplayer**: Online multiplayer support

---

Built with ❤️ using Three.js and WebGL. Best experienced in fullscreen with a gamepad.

**Development**: Vibecoded with Cursor AI
**Typography**: Terminal Grotesque by Raphaël Bastide, distributed by velvetyne.fr
**CRT Effect**: [react three fiber crt effect](https://codesandbox.io/p/sandbox/react-three-fiber-crt-effect-rrdco) by bfollington
**Soundtrack**: Generated by Suno.ai


