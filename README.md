# GridZone - 3D Arcade Game

🎮 **Live Demo**: <https://gridzone.online>

A modern, immersive 3D arcade game featuring stunning visuals, dynamic lighting, and atmospheric sound design. This is my **first web development project**, built from scratch with modern web technologies.

## ✨ Standout Features

### 🎨 **Visual Excellence**

* **Dynamic 3D lighting system** with real-time shadows and reflections
* **Atmospheric particle effects** and follows trails with color-shifting mechanics
* **Smooth camera animations** with shake effects and intelligent drift correction
* **Celebratory visual sequences** with wall lighting waves and traveling lights
* **Custom UI design** with Terminal Grotesque typography and animations
* **Lens flare system** with dynamic ghost effects
* **Dynamic floor glow** with magnetic tile elevation effects
* **3D Death Skull Animation** with material brightness transitions and chromatic aberration
* **CRT Post-Processing Effects** with scanlines, vignette, and chromatic aberration
* **Advanced Camera System** with seamless transitions and drift correction

### 🎵 **Audio Design**

* **Dynamic music integration** with multiple atmospheric tracks
* **Real-time audio feedback** for paddle hits, wall collisions, and special events
* **Celebration sound sequences** synchronized with visual effects
* **Ambient wave sounds** for wall celebrations
* **Performance-optimized audio** with efficient memory management
* **Sound queuing system** to prevent audio conflicts

### 🎯 **Gameplay Innovation**

* **Multi-ball system** with dynamic ball spawning and management
* **Bonus cube mechanics** with collectible items and denial states
* **Advanced physics** with realistic ball trajectory and collision detection
* **Adaptive AI opponent** with intelligent paddle movement
* **Stuck ball detection** with automatic collision recovery
* **Performance optimization** with frame rate monitoring and quality modes
* **Fullscreen support** with keyboard toggle (J key)
* **Gamepad vibration** with haptic feedback
* **Mouse controls** with adjustable sensitivity
* **Consistent ball speed system** ensuring predictable gameplay after events

## 🛠️ **Technology Stack**

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

## 🚀 **Recent Updates (Latest Session)**

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

## 🎮 **How to Play**

### **Controls**

* **Movement**: WASD, Arrow Keys, Mouse, or Gamepad
* **Start Game**: Space, Enter, or Gamepad Start button
* **Pause**: P key or Gamepad Start button
* **Reset**: Square button (gamepad) or Reset button
* **Fullscreen Toggle**: J key (keyboard) or F11
* **Performance Mode**: Available in pause menu
* **Camera Tilt**: Mouse movement or Gamepad right stick
* **Paddle Control**: Mouse Y-axis, Gamepad left stick, or WASD/Arrow Keys

### **Gameplay**

1. **Hit the ball** to score points against the AI
2. **Collect bonus cubes** for special effects (2X width, multi-ball)
3. **Avoid letting the ball** pass your paddle
4. **Experience dynamic lighting** and visual effects during gameplay
5. **Watch for wall celebrations** with traveling light waves
6. **Enjoy particle effects** that change color based on game events
7. **Experience 3D death sequences** with skull animations and visual effects

## 🌐 **Live Deployment**

* **Website**: <https://gridzone.online>
* **GitHub Repository**: <https://github.com/stellanjoh2/gridzone>
* **Wiki Documentation**: <https://github.com/stellanjoh2/gridzone/wiki>
* **Status**: ✅ Live and fully functional

## 🎯 **Learning Journey**

This project represents my **first foray into web development**, where I gained knowledge in:

* **3D graphics programming** with WebGL and Three.js
* **Game development fundamentals** including physics, collision detection, and game loops
* **Modern JavaScript** features and best practices
* **Web performance optimization** and debugging techniques
* **Version control** and collaborative development workflows
* **Deployment and DevOps** including DNS configuration and SSL setup
* **Typography integration** with custom font loading
* **Post-processing effects** and visual enhancement techniques
* **Camera systems** and smooth movement algorithms
* **Particle systems** and dynamic visual effects
* **3D model integration** and material animation systems
* **Shader programming** and post-processing pipelines

## 🏆 **Technical Achievements**

### **Advanced Systems**

* **Built a complete 3D game engine** from scratch using Three.js
* **Implemented advanced lighting systems** with real-time shadow mapping
* **Created a sophisticated physics engine** with collision detection and response
* **Developed a modular audio system** with dynamic mixing
* **Optimized for performance** across different devices and browsers
* **Implemented camera drift correction** for consistent gameplay experience
* **Created particle color-shifting system** for dynamic visual feedback
* **Built comprehensive message queue system** for UI notifications
* **Developed 3D model loading system** with OBJ file support
* **Implemented post-processing pipeline** with CRT effects and chromatic aberration

### **Visual & UX Design**

* **Designed an immersive cyberpunk aesthetic** with neon colors and futuristic UI
* **Created smooth, cinematic camera movements** that enhance gameplay
* **Implemented particle effects systems** for visual feedback and atmosphere
* **Built responsive UI components** that work across desktop and mobile
* **Integrated custom typography** with Terminal Grotesque font
* **Created dynamic floor lighting** with magnetic tile effects
* **Developed 3D death sequences** with animated skull models
* **Implemented chromatic aberration effects** for dramatic visual impact

## 📄 **License**

This project is released under the **Creative Commons Zero (CC0)** license, making it completely free for anyone to use, modify, and distribute.

## 🙏 **Credits**

* **Typography**: Terminal Grotesque by Raphaël Bastide, with the contribution of Jérémy Landes. Distributed by velvetyne.fr
* **3D Graphics**: Three.js library
* **CRT Effect**: [react three fiber crt effect](https://codesandbox.io/p/sandbox/react-three-fiber-crt-effect-rrdco) by bfollington
* **Sound Effects**: freesound.org and itch.io
* **Soundtrack**: Generated by Suno.ai
* **Development**: Vibecoded with Cursor AI

---

**Vibecoded with ❤️ by Stellar Corp. Publishing**

_Experience the future of arcade gaming at gridzone.online_ 🚀