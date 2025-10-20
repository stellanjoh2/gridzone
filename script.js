// Tron-style 3D Pong Game with Enhanced Trail & Background
// OPTIMIZED VERSION - Performance improvements:

// Production mode - disable console logs on live site for better performance
const isProduction = window.location.hostname === 'gridzone.online' || window.location.hostname === 'stellanjoh2.github.io';
const log = isProduction ? () => {} : console.log;
// - Object pooling for impact particles (prevents memory leaks)
// - Enhanced particle count: 800 particles (optimized with smart updates)
// - Smart particle updates (alternating frames & particles)
// - Selective shadow casting (only nearby objects)
// - Reduced polygon counts on spheres (32→24, 8→6)
// - Consolidated event listeners
// - Optimized lighting (fewer shadow maps)
class TronPong {
    constructor() {
        // ═══════════════════════════════════════════════════════════════════════
        // 🎨 CENTRALIZED MATERIAL SETTINGS
        // ═══════════════════════════════════════════════════════════════════════
        // Edit these values to change the entire game's look (floor, walls, environment)!
        // This controls ALL standard materials in the game for consistency.
        // 
        // Examples:
        //   - Brighter: color: 0x0a0f0f
        //   - Darker:   color: 0x000000
        //   - More reflective: roughness: 0.1
        //   - Less reflective: roughness: 0.8
        // ═══════════════════════════════════════════════════════════════════════
        this.defaultMaterialConfig = {
            color: 0x0a0a0a,              // Main surface color (10% darker from previous)
            metalness: 0.9,               // High metalness for reflections
            roughness: 0.3,               // Lower = more reflective
            emissive: 0x000000,           // Emissive glow color (black)
            emissiveIntensity: 0.15       // Emissive strength - increased for better CRT glow
        };
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.balls = []; // Changed to array for multi-ball
        this.ballVelocities = []; // Velocity for each ball
        this.ballSounds = []; // Spatial audio for each ball
        this.paddle1 = null;
        this.paddle2 = null;
        this.clock = new THREE.Clock();
        
        // Multi-ball system
        this.successfulHits = 0; // Track successful paddle hits
        this.nextBallThreshold = 4; // Add ball after this many hits (changed from 2 to 4)
        this.maxBalls = 2; // Maximum 2 balls on screen (multi-ball only)
        
        // BONUS CUBE SYSTEM
        this.playerHits = 0; // Track player-only hits
        this.bonusCube = null; // The active bonus cube
        this.bonusCubeSpawnInterval = 5; // Spawn every 5 player hits
        this.bonusCubeActive = false; // Only 1 can exist at a time
        
        // BONUS EFFECT - Paddle Width
        this.bonusActivePaddle = null; // Which paddle has bonus (paddle1 or paddle2)
        this.bonusTimer = 0; // Countdown timer for bonus duration
        this.bonusDuration = 5.0; // 5 seconds
        this.normalPaddleWidth = 5; // Normal paddle width
        this.bonusPaddleWidth = 10; // 2x width
        this.paddleWidthTransition = 0; // 0 = normal, 1 = bonus width
        
        // RED FLICKER on enemy hit
        this.bonusCubeFlickerActive = false;
        this.bonusCubeFlickerTimer = 0;
        this.bonusCubeFlickerDuration = 1.0; // Fast red blinks for 1.0s total
        
        // Cache DOM elements for better performance
        this.domElements = {
            player1Score: null,
            player2Score: null,
            combo: null,
            ui: null,
            pauseMenu: null,
            awesomeText: null,
            multiBallText: null,
            deathScreen: null,
            deathText: null
        };
        
        // Game state
        this.paddleSpeed = 0.5;
        this.aiSpeed = 0.4;
        this.aiDifficulty = 0.8;
        this.score = { player1: 0, player2: 0 };
        this.gameStarted = false;
        this.isPaused = false;
        this.isGameFrozen = false; // Game freeze flag for win/death sequences
        this.timeScale = 1.0; // For slow motion effects (1.0 = normal, 0.3 = slow mo)
        
        // Combo system
        this.consecutiveHits = 0;
        this.currentCombo = 0;
        this.comboTimeout = null;
        
        // Music track name display timeout
        this.trackNameTimeout = null;
        
        // Death reset optimization
        this.deathResetPhase = 0;
        this.deathResetProgress = 0;
        
        // Death camera lock
        this.deathCameraLocked = false;
        this.deathCameraPosition = null;
        
        // Timeout tracking for cleanup
        this.activeTimeouts = [];
        
        // Interval tracking for cleanup (prevents background process accumulation)
        this.activeIntervals = [];
        
        // Ball speed management
        this.baseBallSpeed = 0.15; // Base ball speed (consistent across all spawns)
        this.ballSpeedMultiplier = 1.0; // Current speed multiplier from paddle hits
        
        // Anti-stuck collision system
        this.ballCollisionCooldowns = []; // Track collision cooldowns per ball
        this.ballLastPositions = []; // Track ball positions for stuck detection
        this.ballStuckFrames = []; // Count frames ball hasn't moved much
        this.maxStuckFrames = 60; // Reset ball after 60 frames of being stuck (1 second at 60fps)
        this.collisionCooldownTime = 3; // Frames to wait between same collision type
        
        // FPS counter system
        this.fpsCounter = {
            visible: false,
            element: null,
            frameCount: 0,
            lastTime: 0,
            fps: 0
        };
        
        // Performance mode system
        this.performanceMode = false; // Start in quality mode for full experience
        this.performanceModeKeyPressed = false; // Track key state
        this.lastCirclePress = false;
        this.performanceSettings = {
            renderScale: 1.0, // 1.0 = full resolution, 0.5 = half resolution
            enableFisheye: true,
            enableBloom: true,
            particleCount: 225,
            shadowQuality: 'high'
        };
        
        // Performance mode will be initialized after post-processing setup
        
        // Math calculation cache for performance
        this.mathCache = {
            sin: new Map(),
            cos: new Map(),
            sqrt: new Map(),
            lastCleanup: 0,
            maxCacheSize: 1000
        };
        
        // Memory management system (DISABLED - was too aggressive)
        this.memoryManagement = {
            enabled: false, // Disabled due to crashes
            lastCleanse: 0,
            cleanseInterval: 60000,
            lowFpsThreshold: 45,
            consecutiveLowFps: 0,
            maxConsecutiveLowFps: 5
        };
        
        // Bonus light system
        this.bonusLight = null;
        
        // SHARED GEOMETRIES - Create once, reuse everywhere for performance!
        this.sharedGeometries = {
            ball: new THREE.SphereGeometry(0.5, 24, 24),
            trailSphere: new THREE.SphereGeometry(0.3, 6, 6),
            impactParticle: new THREE.SphereGeometry(0.1, 4, 4),
            box: new THREE.BoxGeometry(1, 1, 1), // Will be scaled as needed
            cylinder: new THREE.CylinderGeometry(0.5, 0.5, 4, 16),
            plane: new THREE.PlaneGeometry(1, 1)
        };
        
        // Frame skipping optimization
        this._heavyUpdateFrame = 0;
        
        // Memory cleanup system - only used for win/death resets
        
        this.cameraShake = { 
            intensity: 0, 
            decay: 0.98, // Slower decay for longer shake
            rotation: 0, 
            rotationDecay: 0.92,
            pullback: 0,
            pullbackDecay: 0.94,
            horizontalShift: 0,
            horizontalShiftDecay: 0.85 // Slower ease back (was 0.9)
        };
        this.cameraTarget = { x: 0, z: 0, zoom: 20 };
        this.cameraSmooth = 0.02;
        
        // Start menu camera (cinematic rotation)
        this.startMenuCamera = {
            active: true,
            angle: 0, // Current rotation angle
            radius: 15, // Distance from center (closer to arena)
            height: 8, // Height above arena (lifted up)
            speed: 0.2, // Rotation speed (radians per second) - faster
            lookAtHeight: -2, // Look down a few degrees
            tilt: 0.15 // Horizontal tilt in radians
        };
        
        // Pause menu camera (slower idle rotation)
        this.pauseCamera = {
            active: false,
            startAngle: 0, // Where camera was when paused
            startPos: { x: 0, y: 0, z: 0 }, // Original camera position
            angle: 0, // Current rotation offset
            radius: 28, // Slightly further out than start menu
            height: 18, // Higher up for better view
            speed: 0.08, // Slower rotation (about half of start menu)
            lookAtHeight: 1 // Look at center of arena
        };
        
        
        // Multi-ball camera zoom (dramatic effect when new ball spawns)
        this.multiBallZoom = {
            active: false,
            startTime: 0,
            duration: 1900, // 1.9 seconds total
            zoomInDuration: 400, // Zoom in fast (0.4s)
            holdDuration: 1000, // Hold on target (1.0s)
            flybackDuration: 500, // Fly back smooth (0.5s)
            startPos: { x: 0, y: 0, z: 0 },
            targetPos: { x: 0, y: 0, z: 0 }, // Will be set to new ball position
            lookAtPos: { x: 0, y: 0, z: 0 }, // Center between balls
            originalFOV: 75, // Default FOV
            zoomFOV: 95, // FOV during zoom (75 + 20)
            rotationSpeed: 0.3 // Camera rotation during hold
        };
        
        // Goal camera zoom (dramatic effect when goal is scored)
        // Subtle camera zoom for goals
        this.subtleGoalZoom = {
            active: false,
            targetZoom: 0 // Target y offset
        };
        
        
        // Paddle tilt and look effect
        this.paddlePreviousX = 0;
        this.cameraTilt = 0;
        this.cameraTiltSmooth = 0.15;
        this.cameraLookOffset = 0; // Horizontal look offset
        this.cameraLookSmooth = 0.08; // How fast camera follows paddle
        
        // Keyboard camera smoothing (to match gamepad analog feel)
        this.keyboardTiltVelocity = 0; // Current keyboard tilt velocity
        this.keyboardTiltAcceleration = 0.15; // How fast keyboard tilt ramps up
        this.keyboardTiltDecay = 0.92; // How fast keyboard tilt ramps down
        this.maxKeyboardTiltVelocity = 0.02; // Maximum tilt velocity for keyboard (75% reduction)
        
        // Mouse controls for camera tilt
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseX = 0;
        this.mouseTiltVelocity = 0;
        this.mouseSensitivity = 0.000075; // How sensitive mouse movement is (reduced by 96.25% total)
        this.mouseTiltAcceleration = 0.12; // How fast mouse tilt ramps up
        this.mouseTiltDecay = 0.94; // How fast mouse tilt ramps down
        this.maxMouseTiltVelocity = 1.2; // Maximum mouse tilt velocity
        this.mouseControlsEnabled = false; // Only active during gameplay
        
        // CRT Shader Effect
        this.crtEffect = {
            enabled: true, // Always on by default
            composer: null,
            renderPass: null,
            crtPass: null
        };
        
        
        // Camera system
        this.cameraTarget = { x: 0, y: 0, z: 0, zoom: 22 };
        this.cameraSmooth = 0.015; // Much more gradual camera movement (was 0.05)
        this.cameraTrackingRampUp = 0; // Gradual ramp-up for ball tracking
        
        // Camera drift correction system
        this.cameraDriftCorrection = {
            enabled: true, // Re-enabled for camera positioning after game restarts
            originalPosition: { x: 0, y: 18, z: 22 },
            originalLookAt: { x: 0, y: -4, z: 0 },
            correctionSpeed: 0.008,
            maxDriftDistance: 1.5,
            checkDelay: 2000,
            lastCheckTime: 0
        };
        
        // Underground light fade-in system for dramatic effect
        this.undergroundLightFadeIn = {
            active: false,
            startTime: 0,
            duration: 5000, // 5 seconds
            targetIntensity: 0.5
        };
        
        // Underground light flash transition system for smooth color changes
        this.undergroundLightFlashTransition = {
            active: false,
            startTime: 0,
            duration: 0,
            startColor: 0x6600cc,
            endColor: 0x6600cc,
            targetIntensity: 0.5
        };
        
        
        // Controls
        this.keys = {};
        this.gamepad = null;
        
        // Animated lights
        this.animatedLights = [];
        this.overheadLight = null; // Reference to cyan overhead light
        this.overheadLight2 = null; // Reference to magenta overhead light
        this.worldLightBoost = 0; // Boost both lights on any hit
        
        // VFX
        this.paddleBlinkTimers = { paddle1: 0, paddle2: 0 };
        this.wallBlinkTimers = { left: 0, right: 0 };
        
        // Paddle pushback
        this.paddle1Pushback = 0; // Current pushback distance
        this.paddle2Pushback = 0;
        
        // Paddle tilt (for directional movement immersion)
        this.paddle1Tilt = 0; // Current tilt angle
        this.paddle2Tilt = 0;
        this.paddleTiltSpeed = 0.15; // How fast tilt responds to movement
        this.maxPaddleTilt = 0.35; // Max tilt angle in radians (~20 degrees)
        
        // Random floor obstacles
        this.obstacleTimer = 0;
        this.obstacleInterval = 10.0; // Spawn obstacle every 10 seconds
        this.activeObstacle = null; // Currently raised obstacle
        this.obstacleHeight = 6; // Same height as walls
        this.obstacleDuration = 8.0; // How long obstacle stays up
        
        // Particles
        this.particles = null;
        this.particleOriginalPositions = [];
        this.particleVelocities = [];
        this.particleOriginalColors = []; // Store original particle colors for color shifting
        
        // Item highlight particle system (for bonus icons, etc.)
        this.itemHighlightParticles = null;
        this.itemHighlightActive = false;
        this.itemHighlightTarget = null; // What item is being highlighted
        this.itemHighlightColor = { r: 1.0, g: 1.0, b: 0.0 }; // Default yellow
        this.itemHighlightRadius = 1.0; // Radius of particle sphere around item
        
        // Dynamic particle opacity system
        this.particleOpacityBoost = 0.0; // 0.0 = default 25%, 1.0 = full opacity
        this.particleOpacityTimer = 0.0; // Timer for opacity fade-back
        this.particleOpacityFadeSpeed = 2.0; // How fast opacity returns to default
        
        // Particle color shifting system
        this.particleColorShift = 0.0; // 0.0 = original colors, 1.0 = full color shift
        this.particleColorTimer = 0.0; // Timer for color fade-back
        this.particleColorFadeSpeed = 1.5; // How fast colors return to original
        this.lastHitPaddle = null; // Track which paddle hit last ('player' or 'enemy')
        
        // Stuck ball detection and recovery system
        this.ballCollisionHistory = []; // Track recent collision positions and times
        this.maxCollisionHistory = 10; // Keep last 10 collisions
        this.stuckDetectionRadius = 3.0; // If ball collides within 3 units of previous collision
        this.stuckDetectionTime = 500; // Within 0.5 seconds
        this.stuckCollisionThreshold = 6; // If 6+ collisions in same area within 0.5s = stuck
        this.collisionDisabled = false; // Flag to disable collisions temporarily
        this.collisionDisableTimer = 0; // Timer for re-enabling collisions
        
        
        // Environment map for reflections
        this.envMap = null;
        
        // Laser forcefield goals
        this.playerGoal = null;
        this.aiGoal = null;
        this.goalAnimationTime = 0;
        this.goalBlinkTimer = 0; // Timer for fast green blink effect
        this.goalBlinkTarget = null; // Which goal is blinking
        this.goalBlinkStartTime = 0; // Real time start for blink timer
        
        // Impact effects - object pooling
        this.impactParticles = [];
        this.impactLights = [];
        this.particlePool = [];
        this.particlePoolSize = 100;
        
        // Lens flare system (triggered on impacts)
        this.lensFlareOpacity = 0.0;
        this.lensFlareFadeSpeed = 4.0; // Fast fade out
        
        // Score visibility (hidden until first score)
        this.scoreShown = false;
        
        // Trail system - enhanced (supports multiple balls)
        this.trails = []; // Array of trail objects, one per ball
        this.maxTrailLength = 50; // Longer trail
        this.performanceTrailLength = 25; // Shorter trail in performance mode
        this.ballOwners = []; // Track who last hit each ball (array for multi-ball support)
        
        // Audio
        this.sounds = {
            paddleHit: null,
            wallHit: null,
            death: null,
            music: null,
            combo: null,
            score: null,
            multiBall: null,
            goalAlarm: null,
            menuSelect: null,
            pause: null,  // New pause sound
            electroFlow: null  // New electro-flow sound for wall wave celebration
        };
        
        // Sound queuing system to prevent multiple sounds on same frame
        this.soundQueue = [];
        this.lastSoundTime = 0;
        this.soundDelay = 50; // 50ms delay between sounds
        
        
        this.cacheDOMElements(); // Cache DOM first!
        this.init();
        this.loadSounds();
    }
    
    cacheDOMElements() {
        // Cache DOM queries to avoid repeated lookups
        this.domElements.player1Score = document.getElementById('player1Score');
        this.domElements.player2Score = document.getElementById('player2Score');
        this.domElements.combo = document.getElementById('combo');
        this.domElements.ui = document.getElementById('ui');
        this.domElements.pauseMenu = document.getElementById('pauseMenu');
        this.domElements.awesomeText = document.getElementById('awesomeText');
        this.domElements.multiBallText = document.getElementById('multiBallText');
        this.domElements.deathScreen = document.getElementById('deathScreen');
        this.domElements.deathText = document.getElementById('deathText');
    }
    
    // Spatial audio system removed - not working properly

    // Spatial audio system removed - not working properly

    playStereoWallHit(side) {
        // Simple wall hit sound - no stereo effects
        this.playSound('wallHit');
        this.boostParticleOpacity(); // Boost particles on wall hit
        log(`🎵 Wall hit: ${side} side`);
    }
    
    boostParticleOpacity(paddleType = null) {
        // Boost particles to full opacity on impact
        this.particleOpacityBoost = 1.0;
        this.particleOpacityTimer = 0.0; // Reset timer
        
        // Trigger color shifting based on paddle type
        if (paddleType) {
            this.triggerParticleColorShift(paddleType);
        }
        
        log('✨ Particle opacity boosted to full intensity!');
    }
    
    triggerParticleColorShift(paddleType) {
        // Track which paddle hit and trigger color shift
        this.lastHitPaddle = paddleType;
        this.particleColorShift = 1.0;
        this.particleColorTimer = 0.0;
        
        log(`🎨 Particle color shift triggered by ${paddleType} paddle!`);
    }
    
    updateParticleOpacity(deltaTime) {
        // Update particle opacity based on boost and timer
        if (this.particleOpacityBoost > 0) {
            this.particleOpacityTimer += deltaTime;
            
            // Fade back to default opacity over time
            this.particleOpacityBoost = Math.max(0, 1.0 - (this.particleOpacityTimer * this.particleOpacityFadeSpeed));
            
            // Update actual particle material opacity
            if (this.particles && this.particles.material) {
                // Blend between 25% (0.15) and full (0.75) opacity
                const targetOpacity = 0.15 + (this.particleOpacityBoost * 0.6); // 0.15 to 0.75
                this.particles.material.opacity = targetOpacity;
            }
        }
        
        // Update particle color shifting
        if (this.particleColorShift > 0) {
            this.particleColorTimer += deltaTime;
            
            // Fade back to original colors over time
            this.particleColorShift = Math.max(0, 1.0 - (this.particleColorTimer * this.particleColorFadeSpeed));
            
            // Update particle colors based on color shift
            if (this.particles && this.particles.geometry) {
                this.updateParticleColors();
            }
        }
    }
    
    updateParticleColors() {
        if (!this.particles || !this.particles.geometry) return;
        
        const colors = this.particles.geometry.attributes.color.array;
        
        for (let i = 0; i < this.particleOriginalColors.length; i++) {
            const originalColor = this.particleOriginalColors[i];
            let targetColor = { ...originalColor }; // Default to original
            
            // Apply color shift based on last hit paddle
            if (this.lastHitPaddle === 'player') {
                // 75% of particles turn cyan on player hit
                if (Math.random() < 0.75) {
                    targetColor = { r: 0.0, g: 1.0, b: 1.0 }; // Pure cyan
                }
            } else if (this.lastHitPaddle === 'enemy') {
                // 90% of particles turn magenta on enemy hit
                if (Math.random() < 0.90) {
                    targetColor = { r: 1.0, g: 0.0, b: 1.0 }; // Pure magenta
                }
            } else if (this.lastHitPaddle === 'bonus') {
                // 100% of particles turn yellow on bonus pickup
                targetColor = { r: 1.0, g: 1.0, b: 0.0 }; // Pure yellow
            }
            
            // Blend between original and target color based on shift amount
            const blendFactor = this.particleColorShift;
            colors[i * 3] = originalColor.r + (targetColor.r - originalColor.r) * blendFactor;
            colors[i * 3 + 1] = originalColor.g + (targetColor.g - originalColor.g) * blendFactor;
            colors[i * 3 + 2] = originalColor.b + (targetColor.b - originalColor.b) * blendFactor;
        }
        
        // Mark colors as needing update
        this.particles.geometry.attributes.color.needsUpdate = true;
    }
    
    recordBallCollision(ballPosition) {
        // Record collision position and timestamp
        const currentTime = performance.now();
        this.ballCollisionHistory.push({
            position: ballPosition.clone(),
            timestamp: currentTime
        });
        
        // Keep only recent collisions
        if (this.ballCollisionHistory.length > this.maxCollisionHistory) {
            this.ballCollisionHistory.shift();
        }
        
        // Check for stuck ball pattern
        this.checkForStuckBall();
    }
    
    checkForStuckBall() {
        if (this.ballCollisionHistory.length < this.stuckCollisionThreshold) return;
        
        const currentTime = performance.now();
        const recentCollisions = this.ballCollisionHistory.filter(collision => 
            currentTime - collision.timestamp <= this.stuckDetectionTime
        );
        
        if (recentCollisions.length >= this.stuckCollisionThreshold) {
            // Check if collisions are clustered in a small area
            const positions = recentCollisions.map(c => c.position);
            const centerPosition = this.calculateCenter(positions);
            
            // Count collisions within detection radius of center
            const clusteredCollisions = positions.filter(pos => 
                pos.distanceTo(centerPosition) <= this.stuckDetectionRadius
            );
            
            if (clusteredCollisions.length >= this.stuckCollisionThreshold) {
                this.triggerStuckBallRecovery();
            }
        }
    }
    
    calculateCenter(positions) {
        // Calculate center position of collision cluster
        const center = new THREE.Vector3();
        positions.forEach(pos => center.add(pos));
        center.divideScalar(positions.length);
        return center;
    }
    
    triggerStuckBallRecovery() {
        // Disable collisions for just THIS frame to break the loop
        this.collisionDisabled = true;
        this.collisionDisableTimer = 0; // No timer - reset immediately next frame
        
        // Clear collision history to reset detection
        this.ballCollisionHistory = [];
        
        log('🚨 STUCK BALL DETECTED! Collisions disabled for current frame to break loop');
    }
    
    updateStuckBallRecovery(deltaTime) {
        // Update collision disable timer
        if (this.collisionDisabled) {
            // If timer is 0, re-enable immediately (same frame)
            if (this.collisionDisableTimer <= 0) {
                this.collisionDisabled = false;
                log('✅ Ball collision recovery complete - collisions re-enabled immediately');
            } else {
                // Decrease timer
                this.collisionDisableTimer -= deltaTime;
                
                if (this.collisionDisableTimer <= 0) {
                    this.collisionDisabled = false;
                    log('✅ Ball collision recovery complete - collisions re-enabled');
                }
            }
        }
    }
    
    
    loadSounds() {
        
        // Load sound files
        try {
            this.sounds.paddleHit = new Audio('SoundEffects/jump-10.wav');
            this.sounds.wallHit = new Audio('SoundEffects/jump-5.wav');
            this.sounds.death = new Audio('SoundEffects/lose-10.wav');
            this.sounds.combo = new Audio('SoundEffects/video-game-bonus-323603.mp3');
            this.sounds.score = new Audio('SoundEffects/win-1.wav');
            this.sounds.multiBall = new Audio('SoundEffects/win-9.wav');
            this.sounds.goalAlarm = new Audio('SoundEffects/going-up.wav'); // Wall lighting sound after win
            this.sounds.menuSelect = new Audio('SoundEffects/Coin_22_converted.wav');
            this.sounds.bonusDenied = new Audio('SoundEffects/bonk-5.wav');
            this.sounds.waveBuzz = new Audio('SoundEffects/Robotic_low_buzz.wav');
            this.sounds.bonusSpawn = new Audio('SoundEffects/coin-6.wav');
            this.sounds.paddleWiden = new Audio('SoundEffects/Robotic_twang.wav'); // Use existing file
            this.sounds.electroFlow = new Audio('SoundEffects/Robotic_low_buzz.wav'); // Wall wave celebration sound
            this.sounds.bonusAppear = new Audio('SoundEffects/coin-6.wav');
            this.sounds.pause = new Audio('SoundEffects/collect-2.wav');
            log('🎵 Loaded bonusAppear sound:', this.sounds.bonusAppear);
            log('🎵 Loaded pause sound:', this.sounds.pause);
            
            // Music Player System
            this.musicTracks = [
                { file: null, name: 'No Music' }, // Muted option
                { file: 'Music/the-antlers.mp3', name: 'The Antlers' },
                { file: 'Music/ambient-synthwave-arpeggio.mp3', name: 'Ambient Synthwave' },
                { file: 'Music/ethereal-ambient-music-55115.mp3', name: 'Ethereal Ambient' },
                { file: 'Music/hello-doctor.mp3', name: 'Hello Doctor' },
                { file: 'Music/magical-technology-sci-fi-science-futuristic-game-music-300607.mp3', name: 'Magical Technology' },
                { file: 'Music/midnight-zone.mp3', name: 'Midnight Zone' },
                { file: 'Music/minimal-90s-acid-techno.mp3', name: 'Minimal 90s Acid' },
                { file: 'Music/pong9000-main-menu.mp3', name: 'PONG9000 Main Menu' },
                { file: 'Music/purple-acid.mp3', name: 'Purple Acid' },
                { file: 'Music/rave-cop.mp3', name: 'Rave Cop' },
                { file: 'Music/sleepwalker.mp3', name: 'Sleepwalker' },
                { file: 'Music/space-age.mp3', name: 'Space Age' },
                { file: 'Music/untitled.mp3', name: 'Untitled' },
                { file: 'Music/world-of-ruin.mp3', name: 'World of Ruin' }
            ];
            this.currentTrackIndex = 1; // Start with first real track
            this.sounds.music = new Audio(this.musicTracks[1].file);
            this.sounds.music.volume = 0.67;
            this.sounds.music.loop = true;
            
            // Set volumes
            this.sounds.paddleHit.volume = 0.8;
            this.sounds.wallHit.volume = 0.7; // Bounce_Deep sound (back to original)
            this.sounds.death.volume = 0.5;
            this.sounds.combo.volume = 0.6;
            this.sounds.score.volume = 0.7;
            this.sounds.multiBall.volume = 0.7;
            this.sounds.menuSelect.volume = 0.6;
            this.sounds.goalAlarm.volume = 0.8;
            this.sounds.bonusDenied.volume = 0.8; // Loud alarm for goal flash!
            this.sounds.waveBuzz.volume = 0.7;
            this.sounds.bonusSpawn.volume = 0.6;
            this.sounds.paddleWiden.volume = 0.7;
            this.sounds.bonusAppear.volume = 0.8;
            this.sounds.electroFlow.volume = 0.8; // Wall wave celebration sound
            this.sounds.pause.volume = 0.6;
            
            // Music settings
            this.sounds.goalAlarm.loop = false; // Don't loop the alarm - play once only
            
            // Shoulder button debounce
            this.lastLBPress = false;
            this.lastRBPress = false;
            this.lastTrianglePress = false;
            
        // Traveling wave light (celebratory wave)
        this.waveLights = []; // Array of traveling lights (one per wall side)
        
        // Celebration state
        this.isCelebrating = false;
        this.celebrationTimer = 0;
        this.waveSoundPlayed = false;
        this.lastWaveSoundTime = 0; // Track when wave sound was last played
        
        // Message queue system to prevent overlapping on-screen messages
        this.messageQueue = [];
        this.currentMessage = null;
        this.messageActive = false;
        this.deathScreenWasHidden = false; // Track if death screen was hidden during pause
        
        // RGB Split effect - always active at low level to prevent rendering pipeline changes
        this.rgbSplitActive = true; // Always active
        this.rgbSplitIntensity = 0.05; // Always at 5% base level
        this.rgbSplitDuration = 0;
        this.rgbSplitOriginalDuration = 0;
        
        
        // Color transition system
        this.undergroundLightTransition = {
            active: false,
            startColor: 0x6600cc, // Purple
            endColor: 0x00FFFF,   // Pure cyan (was 0x00FEFC - too pale)
            currentColor: 0x6600cc,
            progress: 0,
            duration: 1000, // 1 second transition
            direction: 1 // 1 = to cyan, -1 = to purple
        };
        
        // Traveling celebration light
        this.celebrationLight = null;
        this.celebrationLightActive = false;
        
        // Building height animation system - REMOVED for performance
        
        // Wall wave animation system
        this.wallWaveAnimation = {
            active: false,
            startTime: 0,
            duration: 3000, // 3 seconds (compressed for faster animation)
            originalHeights: new Map(), // Store original wall heights
            wavePhase: 0, // Wave phase offset for smooth animation
            waveDirection: 1 // 1 = towards player, -1 = towards enemy
        };
            
            log('Sounds loaded successfully!');
            log('🎵 Music tracks loaded:', this.musicTracks.length);
        } catch (e) {
            log('Could not load sounds:', e);
        }
    }
    
    playSound(soundName, priority = false) {
        const sound = this.sounds[soundName];
        if (!sound) {
            log('❌ Sound not found:', soundName);
            return;
        }
        
        // Priority sounds (like music) play immediately
        if (priority || soundName === 'music') {
            sound.currentTime = 0;
            sound.play().catch(e => log('Audio play failed for', soundName, ':', e));
            log('🎵 Playing priority sound:', soundName);
            this.lastSoundTime = performance.now();
            return;
        }
        
        // Queue other sounds to prevent conflicts
        const currentTime = performance.now();
        const timeSinceLastSound = currentTime - this.lastSoundTime;
        
        if (timeSinceLastSound >= this.soundDelay) {
            // Can play immediately
            sound.currentTime = 0;
            sound.play().catch(e => log('Audio play failed for', soundName, ':', e));
            log('🎵 Playing sound:', soundName);
            this.lastSoundTime = currentTime;
        } else {
            // Queue the sound
            const delay = this.soundDelay - timeSinceLastSound;
            setTimeout(() => {
                sound.currentTime = 0;
                sound.play().catch(e => log('Audio play failed for queued', soundName, ':', e));
                log('🎵 Playing queued sound:', soundName);
                this.lastSoundTime = performance.now();
            }, delay);
        }
    }
    
    changeTrack(direction) {
        // direction: 1 = next, -1 = previous
        
        // Check if we're currently on "No Music"
        const wasOnNoMusic = this.musicTracks[this.currentTrackIndex].file === null;
        const wasPlaying = !this.sounds.music.paused;
        const currentTime = this.sounds.music.currentTime;
        
        // Stop current track (if there is one)
        if (!wasOnNoMusic) {
            this.sounds.music.pause();
            this.sounds.music.currentTime = 0;
        }
        
        // Update track index (with wrapping)
        this.currentTrackIndex += direction;
        if (this.currentTrackIndex >= this.musicTracks.length) {
            this.currentTrackIndex = 0;
        } else if (this.currentTrackIndex < 0) {
            this.currentTrackIndex = this.musicTracks.length - 1;
        }
        
        // Load new track
        const newTrack = this.musicTracks[this.currentTrackIndex];
        
        // Handle "No Music" option
        if (newTrack.file === null) {
            // Muted - no track loaded
            // Stop current music if playing
            if (!wasOnNoMusic) {
                this.sounds.music.pause();
                this.sounds.music.currentTime = 0;
            }
            this.showTrackName(newTrack.name, true); // Pass true for magenta styling
            log('🎵 No Music (Muted)');
            return;
        }
        
        this.sounds.music = new Audio(newTrack.file);
        this.sounds.music.volume = 0.67;
        this.sounds.music.loop = true;
        
        // Play if game started AND (was playing OR coming from "No Music")
        if (this.gameStarted && (wasPlaying || wasOnNoMusic)) {
            this.sounds.music.play().catch(e => log('Could not play new track'));
        }
        
        // Show track name
        this.showTrackName(newTrack.name);
        
        log('🎵 Now playing:', newTrack.name);
    }
    
    showTrackName(trackName, isMuted = false) {
        // Create or update track display element
        let trackDisplay = document.getElementById('trackName');
        if (!trackDisplay) {
            trackDisplay = document.createElement('div');
            trackDisplay.id = 'trackName';
            document.body.appendChild(trackDisplay);
        }
        
        // Clear any existing fade timeout to prevent timing conflicts
        if (this.trackNameTimeout) {
            clearTimeout(this.trackNameTimeout);
            this.trackNameTimeout = null;
        }
        
        // Update color based on muted state
        const color = isMuted ? '#ff00ff' : '#00FEFC';
        const shadow = isMuted ? '0 0 10px #ff00ff, 0 0 20px #ff00ff' : '0 0 10px #00FEFC, 0 0 20px #00FEFC';
        
        trackDisplay.style.cssText = `
            position: fixed;
            top: 25%;
            left: 5%;
            color: ${color};
            font-size: 29px;
            font-weight: bold;
            text-shadow: ${shadow};
            font-family: 'Terminal Grotesque', monospace;
            text-transform: uppercase;
            z-index: 200;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease-out;
        `;
        
        // Update text
        trackDisplay.textContent = '♫ ' + trackName;
        
        // Fade in
        trackDisplay.style.opacity = '1';
        
        // Fade out after 2 seconds (store timeout ID to prevent conflicts)
        this.trackNameTimeout = setTimeout(() => {
            trackDisplay.style.opacity = '0';
            this.trackNameTimeout = null;
        }, 2000);
    }
    
    triggerRumble(intensity = 0.3, duration = 100) {
        // Get the latest gamepad state
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[0];
        
        if (gamepad && gamepad.vibrationActuator) {
            log('🎮 Triggering rumble:', { intensity, duration, gamepadId: gamepad.id });
            
            // Try the modern Gamepad API vibration
            gamepad.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration: duration,
                weakMagnitude: intensity * 0.5,
                strongMagnitude: intensity
            }).catch(e => {
                log('❌ Rumble failed:', e);
                // Fallback to legacy vibration if available
                if (gamepad.vibrate) {
                    gamepad.vibrate([intensity * 100, intensity * 100]);
                }
            });
        } else {
            log('❌ No gamepad or vibrationActuator found:', { 
                hasGamepad: !!gamepad, 
                hasVibrationActuator: gamepad ? !!gamepad.vibrationActuator : false,
                gamepadId: gamepad ? gamepad.id : 'none',
                gamepadButtons: gamepad ? gamepad.buttons.length : 0,
                gamepadAxes: gamepad ? gamepad.axes.length : 0
            });
            
            // Try legacy vibration API as fallback
            if (gamepad && gamepad.vibrate) {
                log('🔄 Trying legacy vibrate() method');
                gamepad.vibrate([intensity * 100, intensity * 100]);
            } else if (gamepad) {
                log('❌ No vibration support available for this gamepad');
            }
        }
    }
    
    getParticleFromPool() {
        // Reuse particles from pool for better performance
        for (let i = 0; i < this.particlePool.length; i++) {
            if (!this.particlePool[i].visible) {
                return this.particlePool[i];
            }
        }
        // Create new particle if pool is empty - use shared geometry!
            const material = new THREE.MeshBasicMaterial({
                transparent: true,
                blending: THREE.AdditiveBlending
            });
            const particle = new THREE.Mesh(this.sharedGeometries.impactParticle, material);
        this.scene.add(particle);
        this.particlePool.push(particle);
        return particle;
    }
    
    createImpactEffect(position, color) {
        // Create particle burst using object pooling
        const particleCount = this.performanceMode ? 8 : 15; // Reduce particles in performance mode
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticleFromPool();
            particle.visible = true;
            particle.position.copy(position);
            particle.material.color.setHex(color);
            particle.material.opacity = 1.0;
            
            // Random velocity
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 0.3 + Math.random() * 0.2;
            particle.velocity = {
                x: Math.cos(angle) * speed,
                y: Math.random() * 0.3,
                z: Math.sin(angle) * speed
            };
            
            particle.life = 1.0;
            particle.decay = 0.02;
            
            
            particles.push(particle);
        }
        
        this.impactParticles.push(...particles);
        
        // Create impact light - no shadows for better performance
        const impactLight = new THREE.PointLight(color, 6.4, 15, 1); // Decay 1 = soft edges, distance 15 for wider spread
        impactLight.position.copy(position);
        impactLight.castShadow = false; // Disabled for performance
        impactLight.life = 1.0;
        impactLight.decay = 0.04;
        impactLight.maxIntensity = 6.4;
        this.scene.add(impactLight);
        this.impactLights.push(impactLight);
        
        // Create soft glow sprite for smooth falloff
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Create radial gradient
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 1)`);
        gradient.addColorStop(0.3, `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.6)`);
        gradient.addColorStop(0.6, `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.2)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 1.0
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(position);
        sprite.scale.set(15, 15, 1);
        sprite.life = 1.0;
        sprite.decay = 0.04;
        sprite.isGlowSprite = true;
        this.scene.add(sprite);
        this.impactLights.push(sprite);
    }
    
    updateImpactEffects() {
        // AGGRESSIVE CLEANUP: Limit impact particles to prevent memory buildup
        const maxParticles = this.performanceMode ? 25 : 50; // Reduce limit in performance mode
        if (this.impactParticles.length > maxParticles) {
            const excessCount = this.impactParticles.length - maxParticles;
            for (let i = 0; i < excessCount; i++) {
                const particle = this.impactParticles.shift();
                if (particle && this.scene) {
                    this.scene.remove(particle);
                }
            }
        }
        
        // Update particles - optimized with object pooling
        for (let i = this.impactParticles.length - 1; i >= 0; i--) {
            const particle = this.impactParticles[i];
            
            // Move particle
            particle.position.x += particle.velocity.x;
            particle.position.y += particle.velocity.y;
            particle.position.z += particle.velocity.z;
            
            // Apply gravity
            particle.velocity.y -= 0.01;
            
            // Fade out
            particle.life -= particle.decay;
            particle.material.opacity = particle.life;
            
            
            // Recycle dead particles instead of disposing
            if (particle.life <= 0) {
                particle.visible = false;
                this.impactParticles.splice(i, 1);
            }
        }
        
        // AGGRESSIVE CLEANUP: Limit impact lights to prevent memory buildup
        if (this.impactLights.length > 25) {
            const excessCount = this.impactLights.length - 25;
            for (let i = 0; i < excessCount; i++) {
                const light = this.impactLights.shift();
                if (light && this.scene) {
                    this.scene.remove(light);
                    if (light.material) {
                        if (light.material.map) {
                            light.material.map.dispose();
                        }
                        light.material.dispose();
                    }
                }
            }
        }
        
        // Update lights and glow sprites
        for (let i = this.impactLights.length - 1; i >= 0; i--) {
            const light = this.impactLights[i];
            
            // Smooth fade out with easing
            light.life -= light.decay;
            const easedLife = light.life * light.life; // Quadratic easing for smoother falloff
            
            if (light.isGlowSprite) {
                // Fade sprite opacity
                light.material.opacity = easedLife;
            } else {
                // Fade point light intensity
                light.intensity = easedLife * light.maxIntensity;
            }
            
            // Remove dead lights/sprites
            if (light.life <= 0) {
                this.scene.remove(light);
                if (light.isGlowSprite && light.material.map) {
                    light.material.map.dispose();
                    light.material.dispose();
                }
                this.impactLights.splice(i, 1);
            }
        }
    }
    
    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x4d0099, 25, 110); // Vibrant purple fog
        
        // Camera setup - tilted down more
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 18, 22);
        this.camera.lookAt(0, -4, 0);
        // Enable camera to see both layer 0 and layer 1 (paddles are on layer 1)
        this.camera.layers.enable(0);
        this.camera.layers.enable(1);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x1a0033); // Dark purple background (matches fog)
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Initialize CRT effect
        this.initCRTEffect();
        
        // Shadow quality will be initialized after ballLights are created
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.5;
        this.renderer.outputEncoding = THREE.sRGBEncoding; // Important for proper reflection rendering
        this.renderer.autoClear = false; // Important for bloom effect
        document.body.appendChild(this.renderer.domElement);
        
        
        // Custom bloom setup using render targets
        this.setupCustomBloom();
        
        // Setup environment map for reflections
        this.setupEnvironmentMap();
        
        // Create game elements
        this.createLighting();
        this.createGrid();
        this.createEnvironmentCubes();
        this.createGoals(); // Laser forcefield goals!
        // Don't create ball yet - wait for game to start!
        this.createPaddles();
        this.createBoundaries();
        this.createParticles();
        
        // Event listeners
        this.setupEventListeners();
        this.setupLogo3DEffects();
        this.createWorldLogo();
        
        
        // Create FPS counter
        this.createFPSCounter();
        
        // Start animation
        this.animate();
        
        // Show start message
        this.domElements.ui.style.display = 'block';
    }
    
    setupCustomBloom() {
        // Create render targets for bloom effect
        const renderTargetParameters = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            stencilBuffer: false
        };
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Main render target (FULL resolution for maximum bloom quality!)
        this.bloomRenderTarget = new THREE.WebGLRenderTarget(
            width,
            height,
            renderTargetParameters
        );
        
        // Fisheye distortion render target (full resolution)
        this.fisheyeRenderTarget = new THREE.WebGLRenderTarget(width, height, renderTargetParameters);
        
        // Lens flare render target (full resolution)
        this.lensFlareRenderTarget = new THREE.WebGLRenderTarget(width, height, renderTargetParameters);
        
        // RGB Split effect render target (full resolution)
        this.rgbSplitRenderTarget = new THREE.WebGLRenderTarget(width, height, renderTargetParameters);
        
        
        // Depth of Field render targets - DISABLED for performance
        // this.dofRenderTarget = new THREE.WebGLRenderTarget(width, height, renderTargetParameters);
        this.depthRenderTarget = new THREE.WebGLRenderTarget(width, height, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat
        });
        
        // Bloom quad mesh with additive blending shader
        const bloomShader = {
            uniforms: {
                tDiffuse: { value: null },
                bloomStrength: { value: 0.75 }, // +20% from 2.8
                bloomRadius: { value: 0.5 } // 20% reduction from 2.125
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float bloomStrength;
                uniform float bloomRadius;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    
                    // Optimized blur - same visual quality, much better performance
                    vec4 sum = vec4(0.0);
                    float blurSize = 0.0055 * bloomRadius; // Slightly larger blur size to compensate for fewer samples
                    float totalWeight = 0.0;
                    
                    // Optimized 9x9 kernel (was 15x15) - 81 samples instead of 225!
                    for(float x = -4.0; x <= 4.0; x += 1.0) {
                        for(float y = -4.0; y <= 4.0; y += 1.0) {
                            float distance = length(vec2(x, y));
                            float weight = exp(-distance * 0.12); // Slightly sharper falloff for better quality with fewer samples
                            vec2 offset = vec2(x, y) * blurSize;
                            sum += texture2D(tDiffuse, vUv + offset) * weight;
                            totalWeight += weight;
                        }
                    }
                    
                    sum /= totalWeight;
                    
                    // Low threshold - emissive objects bloom easily
                    float brightness = dot(sum.rgb, vec3(0.2126, 0.7152, 0.0722));
                    float bloomAmount = smoothstep(0.01, 0.2, brightness); // Very low threshold
                    gl_FragColor = sum * bloomStrength * bloomAmount;
                }
            `
        };
        
        this.bloomMaterial = new THREE.ShaderMaterial({
            uniforms: bloomShader.uniforms,
            vertexShader: bloomShader.vertexShader,
            fragmentShader: bloomShader.fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false
        });
        
        // Fullscreen quad
        const geometry = new THREE.PlaneBufferGeometry(2, 2);
        this.bloomQuad = new THREE.Mesh(geometry, this.bloomMaterial);
        
        // Orthographic scene/camera for bloom quad
        this.bloomScene = new THREE.Scene();
        this.bloomScene.add(this.bloomQuad);
        this.bloomCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        // Fisheye lens distortion shader
        const fisheyeShader = {
            uniforms: {
                tDiffuse: { value: null },
                strength: { value: 0.15 }, // Distortion strength (0.15 = subtle fisheye)
                aspectRatio: { value: width / height },
                zoom: { value: 0.9 } // Zoom in slightly to prevent black borders
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float strength;
                uniform float aspectRatio;
                uniform float zoom;
                varying vec2 vUv;
                
                void main() {
                    // Center UV coordinates
                    vec2 uv = vUv - 0.5;
                    
                    // Apply zoom to prevent black borders
                    uv *= zoom;
                    
                    // Correct for aspect ratio
                    uv.x *= aspectRatio;
                    
                    // Calculate distance from center
                    float dist = length(uv);
                    
                    // Apply barrel distortion (fisheye effect)
                    // Formula: r' = r * (1 + strength * r^2)
                    float distortion = 1.0 + strength * dist * dist;
                    uv *= distortion;
                    
                    // Restore aspect ratio
                    uv.x /= aspectRatio;
                    
                    // Move back to 0-1 range
                    uv += 0.5;
                    
                    // Clamp UV coordinates to prevent black borders
                    uv = clamp(uv, 0.0, 1.0);
                    
                    // Sample texture with distorted coordinates
                    vec4 color = texture2D(tDiffuse, uv);
                    
                    // Subtle edge darkening (vignette)
                    float edge = smoothstep(0.7, 1.0, dist * 2.0);
                    color.rgb *= 1.0 - edge * 0.3;
                    
                    gl_FragColor = color;
                }
            `
        };
        
        this.fisheyeMaterial = new THREE.ShaderMaterial({
            uniforms: fisheyeShader.uniforms,
            vertexShader: fisheyeShader.vertexShader,
            fragmentShader: fisheyeShader.fragmentShader,
            depthTest: false
        });
        
        this.fisheyeQuad = new THREE.Mesh(geometry, this.fisheyeMaterial);
        
        // Fisheye scene/camera
        this.fisheyeScene = new THREE.Scene();
        this.fisheyeScene.add(this.fisheyeQuad);
        this.fisheyeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        // Lens flare post-processing (lightweight!)
        const lensFlareShader = {
            uniforms: {
                tDiffuse: { value: null },
                threshold: { value: 0.85 }, // Only bright lights trigger flares
                intensity: { value: 0.4 }, // Flare strength
                ghostIntensity: { value: 0.1035 }, // Ghost artifacts strength (increased by 35% total)
                aspectRatio: { value: window.innerWidth / window.innerHeight },
                flareOpacity: { value: 0.0 } // 0 = off, 1 = full strength (controlled by impacts)
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float threshold;
                uniform float intensity;
                uniform float ghostIntensity;
                uniform float aspectRatio;
                uniform float flareOpacity;
                varying vec2 vUv;
                
                void main() {
                    vec4 original = texture2D(tDiffuse, vUv);
                    vec3 flare = vec3(0.0);
                    
                    // Vector from center to current pixel
                    vec2 toCenter = vec2(0.5) - vUv;
                    
                    // Classic lens flare: circular ghosts along center line (50% smaller)
                    // Ghost 1 (close, bright)
                    vec2 ghost1 = vUv + toCenter * 0.15;
                    vec4 g1 = texture2D(tDiffuse, ghost1);
                    float g1Brightness = max(g1.r, max(g1.g, g1.b));
                    float g1Mask = step(threshold, g1Brightness);
                    flare += g1.rgb * ghostIntensity * 1.45 * g1Mask; // Increased by 45% total (25% + 20%)
                    
                    // Ghost 2 (medium distance) - made brighter for opposite side
                    vec2 ghost2 = vUv + toCenter * 0.3;
                    vec4 g2 = texture2D(tDiffuse, ghost2);
                    float g2Brightness = max(g2.r, max(g2.g, g2.b));
                    float g2Mask = step(threshold, g2Brightness);
                    flare += g2.rgb * ghostIntensity * 1.3125 * g2Mask; // Increased by 50% total (0.875 * 1.5)
                    
                    // Ghost 3 (far, subtle) - made brighter for opposite side
                    vec2 ghost3 = vUv + toCenter * 0.6;
                    vec4 g3 = texture2D(tDiffuse, ghost3);
                    float g3Brightness = max(g3.r, max(g3.g, g3.b));
                    float g3Mask = step(threshold, g3Brightness);
                    flare += g3.rgb * ghostIntensity * 1.125 * g3Mask; // Increased by 50% total (0.75 * 1.5)
                    
                    // Subtle radial glow around bright spots (+25% intensity)
                    float brightness = max(original.r, max(original.g, original.b));
                    float brightMask = step(threshold, brightness);
                    float glow = (brightness - threshold) * intensity * 0.625 * brightMask;
                    flare += original.rgb * glow;
                    
                    gl_FragColor = vec4(original.rgb + flare * flareOpacity, original.a);
                }
            `
        };
        
        this.lensFlareMaterial = new THREE.ShaderMaterial({
            uniforms: lensFlareShader.uniforms,
            vertexShader: lensFlareShader.vertexShader,
            fragmentShader: lensFlareShader.fragmentShader,
            depthTest: false
        });
        
        this.lensFlareQuad = new THREE.Mesh(geometry, this.lensFlareMaterial);
        this.lensFlareScene = new THREE.Scene();
        this.lensFlareScene.add(this.lensFlareQuad);
        this.lensFlareCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        // Gaussian blur for pause menu (HEAVY blur)
        this.blurRenderTarget = new THREE.WebGLRenderTarget(width, height, renderTargetParameters);
        
        const blurShader = {
            uniforms: {
                tDiffuse: { value: null },
                blurSize: { value: 1.75 } // Reduced blur (50% of 3.5) for pause menu
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float blurSize;
                varying vec2 vUv;
                
                void main() {
                    vec4 sum = vec4(0.0);
                    float totalWeight = 0.0;
                    
                    // Large kernel for strong Gaussian blur
                    for(float x = -8.0; x <= 8.0; x += 1.0) {
                        for(float y = -8.0; y <= 8.0; y += 1.0) {
                            float distance = length(vec2(x, y));
                            float weight = exp(-distance * distance / 32.0); // Gaussian falloff
                            vec2 offset = vec2(x, y) * 0.002 * blurSize;
                            sum += texture2D(tDiffuse, vUv + offset) * weight;
                            totalWeight += weight;
                        }
                    }
                    
                    gl_FragColor = sum / totalWeight;
                }
            `
        };
        
        this.blurMaterial = new THREE.ShaderMaterial({
            uniforms: blurShader.uniforms,
            vertexShader: blurShader.vertexShader,
            fragmentShader: blurShader.fragmentShader,
            depthTest: false
        });
        
        this.blurQuad = new THREE.Mesh(geometry, this.blurMaterial);
        
        // Blur scene/camera
        this.blurScene = new THREE.Scene();
        this.blurScene.add(this.blurQuad);
        this.blurCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        // Depth of Field shader
        const dofShader = {
            uniforms: {
                tDiffuse: { value: null },
                tDepth: { value: null },
                cameraNear: { value: this.camera.near },
                cameraFar: { value: this.camera.far },
                focusDistance: { value: 25.0 }, // Distance to the game field
                focalLength: { value: 2.5 }, // Higher for more noticeable blur
                aperture: { value: 0.025 } // Stronger blur for distant objects
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform sampler2D tDepth;
                uniform float cameraNear;
                uniform float cameraFar;
                uniform float focusDistance;
                uniform float focalLength;
                uniform float aperture;
                varying vec2 vUv;
                
                float getDepth(vec2 uv) {
                    float depth = texture2D(tDepth, uv).r;
                    // Convert to linear depth
                    float z = depth * 2.0 - 1.0;
                    return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
                }
                
                void main() {
                    float depth = getDepth(vUv);
                    
                    // Calculate circle of confusion with sharp cutoff for game field
                    float depthDiff = abs(depth - focusDistance);
                    
                    // Very large focus range to keep player 100% sharp
                    float focusRange = 25.0; // Massive range - player/ball/walls perfectly sharp
                    float coc = 0.0;
                    
                    if (depthDiff > focusRange) {
                        // Blur things far away with stronger effect
                        float distanceFromRange = depthDiff - focusRange;
                        coc = (aperture * focalLength * distanceFromRange) / 30.0; // Much stronger blur
                        coc = clamp(coc, 0.0, 0.06); // Higher max blur for distant objects
                    }
                    
                    vec4 color = vec4(0.0);
                    float totalWeight = 0.0;
                    
                    // Bokeh blur using hexagonal pattern
                    const int samples = 12;
                    for(int i = 0; i < samples; i++) {
                        float angle = float(i) * 3.14159265 * 2.0 / float(samples);
                        vec2 offset = vec2(cos(angle), sin(angle)) * coc;
                        
                        color += texture2D(tDiffuse, vUv + offset);
                        totalWeight += 1.0;
                    }
                    
                    // Add center sample with more weight
                    color += texture2D(tDiffuse, vUv) * 2.0;
                    totalWeight += 2.0;
                    
                    gl_FragColor = color / totalWeight;
                }
            `
        };
        
        // DoF disabled - causing black screen issues
        // this.dofMaterial = new THREE.ShaderMaterial({
        //     uniforms: dofShader.uniforms,
        //     vertexShader: dofShader.vertexShader,
        //     fragmentShader: dofShader.fragmentShader,
        //     depthTest: false
        // });
        
        // this.dofQuad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), this.dofMaterial);
        // this.dofScene = new THREE.Scene();
        // this.dofScene.add(this.dofQuad);
        
        // RGB Split effect shader
        const rgbSplitShader = {
            uniforms: {
                tDiffuse: { value: null },
                intensity: { value: 0.0 },
                time: { value: 0.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float intensity;
                uniform float time;
                varying vec2 vUv;
                
                void main() {
                    // Create RGB split effect by sampling different channels with offset
                    vec2 redOffset = vec2(-intensity * 0.0125, -intensity * 0.005);
                    vec2 greenOffset = vec2(0.0, 0.0);
                    vec2 blueOffset = vec2(intensity * 0.0125, intensity * 0.005);
                    
                    // Sample each color channel with different offsets
                    float r = texture2D(tDiffuse, vUv + redOffset).r;
                    float g = texture2D(tDiffuse, vUv + greenOffset).g;
                    float b = texture2D(tDiffuse, vUv + blueOffset).b;
                    
                    // Add some glitchy noise for extra effect
                    float noise = sin(vUv.x * 100.0 + time * 10.0) * 0.1 * intensity;
                    
                    gl_FragColor = vec4(r + noise, g + noise, b + noise, 1.0);
                }
            `
        };
        
        // RGB Split material and scene
        this.rgbSplitMaterial = new THREE.ShaderMaterial({
            uniforms: rgbSplitShader.uniforms,
            vertexShader: rgbSplitShader.vertexShader,
            fragmentShader: rgbSplitShader.fragmentShader,
            depthTest: false
        });
        
        this.rgbSplitQuad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), this.rgbSplitMaterial);
        this.rgbSplitScene = new THREE.Scene();
        this.rgbSplitScene.add(this.rgbSplitQuad);
        this.rgbSplitCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        log('✓ Custom bloom effects enabled! (DoF disabled - was causing black screen)');
        log('✓ RGB Split effect ready!');
    }
    
    setupEnvironmentMap() {
        // Load the actual cubemap image
        const textureLoader = new THREE.TextureLoader();
        
        // Skip loading external cubemap - use procedural fallback directly
        log('🎨 Creating procedural environment map (no external files)');
        this.createFallbackEnvMap();
    }
    
    createFallbackEnvMap() {
        // Fallback: Create a simple gradient cubemap for reflections
        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
            format: THREE.RGBAFormat,
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter
        });
        
        const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
        const tempScene = new THREE.Scene();
        
        const gradientShader = {
            uniforms: {},
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec3 viewDirection = normalize(vWorldPosition);
                    float t = viewDirection.y * 0.5 + 0.5;
                    vec3 topColor = vec3(0.0, 1.0, 1.2);
                    vec3 midColor = vec3(0.8, 0.0, 1.0);
                    vec3 bottomColor = vec3(0.1, 0.3, 0.3);
                    vec3 color = t > 0.5 ? mix(midColor, topColor, (t - 0.5) * 2.0) : mix(bottomColor, midColor, t * 2.0);
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        };
        
        const skyGeo = new THREE.SphereGeometry(50, 16, 16);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: gradientShader.uniforms,
            vertexShader: gradientShader.vertexShader,
            fragmentShader: gradientShader.fragmentShader,
            side: THREE.BackSide
        });
        tempScene.add(new THREE.Mesh(skyGeo, skyMat));
        
        cubeCamera.update(this.renderer, tempScene);
        this.envMap = cubeRenderTarget.texture;
        this.envMap.encoding = THREE.sRGBEncoding;
        
        this.updateMaterialsWithEnvMap();
        log('✓ Fallback environment map created');
    }
    
    updateMaterialsWithEnvMap() {
        // This will be called after envMap is loaded to update materials
        if (!this.envMap) {
            console.warn('⚠️ envMap is not loaded yet!');
            return;
        }
        
        let updatedCount = 0;
        this.scene.traverse((object) => {
            if (object.isMesh && object.material) {
                const mat = object.material;
                // Update materials that should have reflections (StandardMaterial with metalness)
                if (mat.isMeshStandardMaterial && mat.metalness > 0.5) {
                    mat.envMap = this.envMap;
                    mat.envMapIntensity = 1.2;
                    mat.needsUpdate = true;
                    updatedCount++;
                }
            }
        });
        
        log(`✓ Materials updated with environment map! (${updatedCount} materials updated)`);
    }
    
    
    createLighting() {
        const ambientLight = new THREE.AmbientLight(0x6600cc, 10.0); // Purple color, 25% increase from 8.0 to 10.0
        this.scene.add(ambientLight);
        
        this.overheadLight = new THREE.PointLight(0xff6600, 6.75, 120); // Orange laser gate - back to original intensity
        this.overheadLight.position.set(0, 60, 20);
        this.overheadLight.castShadow = false; // Keep shadows disabled for performance
        this.overheadLight.layers.set(0);
        this.overheadLight.visible = false; // Hidden during title screen
        this.scene.add(this.overheadLight);
        
        this.overheadLight2 = new THREE.PointLight(0xff6600, 23.2, 100); // Orange laser gate - 25% increase
        this.overheadLight2.position.set(0, 80, -60); // Halfway back from -70 to -60
        this.overheadLight2.castShadow = false; // Keep shadows disabled for performance
        this.overheadLight2.layers.set(0);
        this.overheadLight2.visible = false; // Hidden during title screen
        this.scene.add(this.overheadLight2);
        
        // Underground purple light for building illumination
        this.undergroundLight = new THREE.PointLight(0x6600cc, 0, 150); // Purple color - starts at zero for dramatic effect
        this.undergroundLight.position.set(0, -30, -20); // Moved forward towards enemy (from 0 to -20)
        this.undergroundLight.castShadow = false; // No shadows for performance
        this.undergroundLight.layers.set(0);
        this.scene.add(this.undergroundLight);
        
        // Paddle lights to illuminate environment!
        // Player paddle light (lime-yellow)
        this.playerLight = new THREE.PointLight(0x00FEFC, 0.75, 75); // Restored to reasonable paddle light intensity
        this.playerLight.castShadow = false; // No shadows for performance
        this.playerLight.layers.set(0);
        this.scene.add(this.playerLight);
        
        // AI paddle light (magenta)
        this.aiLight = new THREE.PointLight(0xff00ff, 0.75, 75); // Restored to reasonable paddle light intensity
        this.aiLight.castShadow = false; // No shadows for performance
        this.aiLight.layers.set(0);
        this.scene.add(this.aiLight);
        
        // Ball lights with shadows - one per ball (max 2)
        this.ballLights = [];
        
        // Create first ball light - boosted for better illumination
        const ballLight = new THREE.PointLight(0x00FEFC, 0.15, 75); // 2% intensity for very subtle effect
        ballLight.castShadow = true;
        ballLight.shadow.mapSize.width = 256; // 50% reduction from 512 to 256
        ballLight.shadow.mapSize.height = 256; // 50% reduction from 512 to 256
        ballLight.shadow.bias = -0.001;
        ballLight.layers.set(0);
        this.scene.add(ballLight);
        this.ballLights.push(ballLight);
        
        // Keep reference to first light for compatibility
        this.ballLight = ballLight;
    }
    
    createEnvironmentCubes() {
        // Create symmetrical grid of cubes around the play area (like reference image)
        const playAreaWidth = 24; // Keep clear of the play area (12 units on each side)
        const playAreaDepth = 34; // Keep clear of play area depth
        const clearance = 8; // More distance from play area
        
        // Environment cubes material - uses centralized config
        const material = new THREE.MeshStandardMaterial({
            color: this.defaultMaterialConfig.color,
            metalness: this.defaultMaterialConfig.metalness,
            roughness: this.defaultMaterialConfig.roughness,
            emissive: this.defaultMaterialConfig.emissive,
            emissiveIntensity: this.defaultMaterialConfig.emissiveIntensity
            // envMap will be set after loading via updateMaterialsWithEnvMap()
        });
        
        // Create grid of cubes on the sides (left and right) - optimized shadows
        const sideGridRows = 15;
        const sideGridCols = 10;
        const spacing = 4;
        
        for (let side of [-1, 1]) { // Left and right
            for (let row = 0; row < sideGridRows; row++) {
                for (let col = 0; col < sideGridCols; col++) {
                    const width = 1 + Math.random() * 3;
                    const height = 0.2 + Math.random() * 7.6; // Average height ~4 units
                    const depth = 1 + Math.random() * 3;
                    
                    const geometry = new THREE.BoxGeometry(width, height, depth);
                    const cube = new THREE.Mesh(geometry, material.clone());
                    
                    const x = side * (playAreaWidth / 2 + clearance + col * spacing);
                    const z = (row - sideGridRows / 2) * spacing;
                    const y = height / 2 - 2;
                    
                    cube.position.set(x, y, z);
                    
                    // Randomly make some cubes 2x larger
                    if (Math.random() < 0.3) {
                        cube.scale.set(2, 2, 2);
                    }
                    
                    // Only close cubes cast/receive shadows for performance
                    const isClose = Math.abs(z) < 20 && col < 3;
                    cube.castShadow = isClose;
                    cube.receiveShadow = isClose;
                    
                    this.scene.add(cube);
                    this.cityBuildings.push(cube);
                }
            }
        }
        
        // Create grid of cubes at the back - optimized shadows
        const backGridRows = 8;
        const backGridCols = 20;
        
        for (let row = 0; row < backGridRows; row++) {
            for (let col = 0; col < backGridCols; col++) {
                const width = 1 + Math.random() * 3;
                const height = 0.2 + Math.random() * 11.6; // Average height ~6 (wall height)
                const depth = 1 + Math.random() * 3;
                
                const geometry = new THREE.BoxGeometry(width, height, depth);
                const cube = new THREE.Mesh(geometry, material.clone());
                
                const x = (col - backGridCols / 2) * spacing;
                const z = -(playAreaDepth / 2 + clearance + row * spacing);
                const y = height / 2 - 2;
                
                cube.position.set(x, y, z);
                
                // Randomly make some cubes 2x larger
                if (Math.random() < 0.3) {
                    cube.scale.set(2, 2, 2);
                }
                
                // Only close cubes cast/receive shadows
                const isClose = row < 3 && Math.abs(x) < 30;
                cube.castShadow = isClose;
                cube.receiveShadow = isClose;
                
                this.scene.add(cube);
            }
        }
        
        // REMOVED: Environment boxes behind player gate to prevent blocking camera view
        // Only keep the absolutely closest ones (first row only)
        const frontGridRows = 1; // Only first row - closest to player
        const frontGridCols = 20;
        
        for (let row = 0; row < frontGridRows; row++) {
            for (let col = 0; col < frontGridCols; col++) {
                const width = 1 + Math.random() * 3;
                const height = 0.2 + Math.random() * 2.3; // SHORT! Max 2.5 units
                const depth = 1 + Math.random() * 3;
                
                const geometry = new THREE.BoxGeometry(width, height, depth);
                const cube = new THREE.Mesh(geometry, material.clone());
                
                const x = (col - frontGridCols / 2) * spacing;
                const z = (playAreaDepth / 2 + clearance + row * spacing);
                const y = height / 2 - 2;
                
                cube.position.set(x, y, z);
                
                // Only close cubes cast/receive shadows
                const isClose = row < 2 && Math.abs(x) < 30;
                cube.castShadow = isClose;
                cube.receiveShadow = isClose;
                
                this.scene.add(cube);
            }
        }
        
        // Add larger boxes further away from the existing ones
        const farClearance = playAreaWidth / 2 + clearance + sideGridCols * spacing + 8;
        const farBackClearance = playAreaDepth / 2 + clearance + backGridRows * spacing + 8;
        
        // Far sides (left and right) - larger boxes
        for (let side of [-1, 1]) {
            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 5; j++) {
                    const width = 3 + Math.random() * 5; // Much larger
                    const height = 0.5 + Math.random() * 4;
                    const depth = 3 + Math.random() * 5;
                    
                    const geometry = new THREE.BoxGeometry(width, height, depth);
                    const cube = new THREE.Mesh(geometry, material.clone());
                    
                    const x = side * (farClearance + j * 8);
                    const z = (i - 4) * 10;
                    const y = height / 2 - 2;
                    
                    cube.position.set(x, y, z);
                    cube.castShadow = true;
                    cube.receiveShadow = true;
                    
                    this.scene.add(cube);
                    this.cityBuildings.push(cube);
                }
            }
        }
        
        // Far back - larger boxes
        for (let i = 0; i < 12; i++) {
            for (let j = 0; j < 3; j++) {
                const width = 3 + Math.random() * 5;
                const height = 0.5 + Math.random() * 4;
                const depth = 3 + Math.random() * 5;
                
                const geometry = new THREE.BoxGeometry(width, height, depth);
                const cube = new THREE.Mesh(geometry, material.clone());
                
                const x = (i - 6) * 8;
                const z = -(farBackClearance + j * 8);
                const y = height / 2 - 2;
                
                cube.position.set(x, y, z);
                cube.castShadow = true;
                cube.receiveShadow = true;
                
                this.scene.add(cube);
            }
        }
        
        // REMOVED: Far front boxes behind player gate to prevent camera blocking
        // No far front boxes - they would be behind the player gate
        
        // Extra distant boxes - even further into the background (30% reduction)
        // Very far sides
        for (let side of [-1, 1]) {
            for (let i = 0; i < 10; i++) { // 30% reduction from 15 to 10
                for (let j = 0; j < 3; j++) { // 30% reduction from 4 to 3
                    const width = 4 + Math.random() * 8; // Even larger
                    const height = 0.8 + Math.random() * 5;
                    const depth = 4 + Math.random() * 8;
                    
                    const geometry = new THREE.BoxGeometry(width, height, depth);
                    const cube = new THREE.Mesh(geometry, material.clone());
                    
                    const x = side * (farClearance + 50 + j * 12);
                    const z = (i - 7.5) * 15;
                    const y = height / 2 - 2;
                    
                    cube.position.set(x, y, z);
                    
                    // More chance for 2x scale in distant boxes
                    if (Math.random() < 0.4) {
                        cube.scale.set(2, 2, 2);
                    }
                    
                    cube.castShadow = false; // Optimize distant boxes
                    cube.receiveShadow = false;
                    
                    this.scene.add(cube);
                    this.cityBuildings.push(cube);
                }
            }
        }
        
        // Very far back (30% reduction)
        for (let i = 0; i < 14; i++) { // 30% reduction from 20 to 14
            for (let j = 0; j < 3; j++) { // 30% reduction from 4 to 3
                const width = 4 + Math.random() * 8;
                const height = 0.8 + Math.random() * 5;
                const depth = 4 + Math.random() * 8;
                
                const geometry = new THREE.BoxGeometry(width, height, depth);
                const cube = new THREE.Mesh(geometry, material.clone());
                
                const x = (i - 10) * 10;
                const z = -(farBackClearance + 40 + j * 12);
                const y = height / 2 - 2;
                
                cube.position.set(x, y, z);
                
                // More chance for 2x scale in distant boxes
                if (Math.random() < 0.4) {
                    cube.scale.set(2, 2, 2);
                }
                
                cube.castShadow = false; // Optimize distant boxes
                cube.receiveShadow = false;
                
                this.scene.add(cube);
                this.cityBuildings.push(cube);
            }
        }
    }
    
    createGrid() {
        // Create floor as a grid of separated cubes
        const gridSize = 40; // Total floor size
        const cubeSize = 1.8; // Size of each cube
        const gap = 0.15; // Gap between cubes
        const cubesPerRow = Math.floor(gridSize / (cubeSize + gap));
        
        // Laser wall boundaries - floor should end right at the laser walls!
        const laserWallBoundary = 19;
        
        // Array to store all floor cubes for later effects
        this.floorCubes = [];
        
        // Array to store all city buildings for height animation
        this.cityBuildings = [];
        
        // Spatial grid for floor glow optimization
        this.floorGlowGrid = new Map();
        this.gridSize = 5; // 5x5 unit cells
        
        // Floor cubes material - uses centralized config
        const cubeMaterial = new THREE.MeshStandardMaterial({
            color: this.defaultMaterialConfig.color,
            metalness: this.defaultMaterialConfig.metalness,
            roughness: this.defaultMaterialConfig.roughness,
            emissive: this.defaultMaterialConfig.emissive,
            emissiveIntensity: this.defaultMaterialConfig.emissiveIntensity
            // envMap will be set after loading via updateMaterialsWithEnvMap()
        });
        
        // Create grid of cubes
        const cubeGeometry = new THREE.BoxGeometry(cubeSize, 0.2, cubeSize);
        
        for (let x = 0; x < cubesPerRow; x++) {
            for (let z = 0; z < cubesPerRow; z++) {
                // Position cube
                const posX = (x - cubesPerRow / 2) * (cubeSize + gap) + (cubeSize + gap) / 2;
                const posZ = (z - cubesPerRow / 2) * (cubeSize + gap) + (cubeSize + gap) / 2;
                
                // Only create floor cubes within laser wall boundaries!
                if (Math.abs(posZ) > laserWallBoundary) continue;
                
                // OPTIMIZATION: Only create cubes in the extended play area
                // Play area: -12 to +12 in X (walls), extended to -18 to +18 in Z (includes some buffer)
                if (Math.abs(posX) > 14 || Math.abs(posZ) > 18) continue;
                
                const cube = new THREE.Mesh(cubeGeometry, cubeMaterial.clone());
                
                cube.position.set(posX, -2, posZ);
                cube.receiveShadow = true;
                cube.castShadow = false; // Floor tiles don't cast shadows
                
                // Store original values for animation
                cube.userData.originalY = -2;
                cube.userData.targetY = -2;
                cube.userData.currentElevation = 0;
                cube.userData.originalColor = this.defaultMaterialConfig.color;
                cube.userData.originalEmissive = this.defaultMaterialConfig.emissive;
                cube.userData.originalEmissiveIntensity = this.defaultMaterialConfig.emissiveIntensity;
                
                this.scene.add(cube);
                this.floorCubes.push(cube);
            }
        }
        
        log(`Floor created with ${this.floorCubes.length} cubes (confined within laser walls)`);
        
        // Build spatial grid for floor glow optimization
        this.buildFloorGlowGrid();
    }
    
    buildFloorGlowGrid() {
        // Clear existing grid
        this.floorGlowGrid.clear();
        
        // Add each cube to its appropriate grid cell
        for (let cube of this.floorCubes) {
            const gridX = Math.floor(cube.position.x / this.gridSize);
            const gridZ = Math.floor(cube.position.z / this.gridSize);
            const cellKey = `${gridX},${gridZ}`;
            
            if (!this.floorGlowGrid.has(cellKey)) {
                this.floorGlowGrid.set(cellKey, []);
            }
            this.floorGlowGrid.get(cellKey).push(cube);
        }
        
        log(`🏗️ Built spatial grid with ${this.floorGlowGrid.size} cells for floor glow optimization`);
    }
    
    
    createBall() {
        // Create first ball
        this.spawnBall(0, 0, 0, { x: 0, y: 0, z: -this.baseBallSpeed });
    }
    
    spawnBall(x, y, z, velocity) {
        // Reset stuck ball collision system when spawning new ball
        this.collisionDisabled = false;
        this.collisionDisableTimer = 0;
        this.ballCollisionHistory = [];
        
        // Use shared geometry for performance!
        const ballMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                baseColor: { value: new THREE.Color(0x00FEFC) }, // Bright lime-yellow!
                emissiveIntensity: { value: 12.0 }, // Increased for better CRT glow
                opacity: { value: 1.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 baseColor;
                uniform float emissiveIntensity;
                uniform float opacity;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    // Animated gradient moving downwards quickly
                    float gradient = fract(vUv.y * 3.0 - time * 2.0);
                    
                    // Create striped pattern
                    float stripes = smoothstep(0.3, 0.7, gradient);
                    
                    // Pulsing intensity
                    float pulse = 0.8 + 0.2 * sin(time * 3.0);
                    
                    // Combine effects
                    vec3 color = baseColor * (stripes * 0.5 + 0.5) * pulse;
                    
                    gl_FragColor = vec4(color * emissiveIntensity, opacity);
                }
            `,
            transparent: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        const ball = new THREE.Mesh(this.sharedGeometries.ball, ballMaterial);
        ball.position.set(x, y, z);
        ball.castShadow = true;
        this.scene.add(ball);
        
        const ballIndex = this.balls.length;
        this.balls.push(ball);
        this.ballVelocities.push({ ...velocity });
        
        // Initialize ball ownership (default to AI since balls start toward AI)
        this.ballOwners[ballIndex] = 'ai';
        
        // Initialize anti-stuck system for this ball
        this.initializeBallAntiStuck(ballIndex);
        
        // Create trail for this ball
        this.createTrailForBall(ballIndex);
        
        // Create light for this ball (if we don't have one yet)
        if (ballIndex >= this.ballLights.length) {
            const ballLight = new THREE.PointLight(0x00FEFC, 0.15, 75); // 2% intensity for very subtle effect
            ballLight.castShadow = true;
            ballLight.shadow.mapSize.width = 256; // 50% reduction from 512 to 256
            ballLight.shadow.mapSize.height = 256; // 50% reduction from 512 to 256
            ballLight.shadow.bias = -0.001;
            ballLight.layers.set(0);
            this.scene.add(ballLight);
            this.ballLights.push(ballLight);
            log(`Created light for ball ${ballIndex + 1}`);
        } else {
            // Restore intensity for existing light (in case it was turned off)
            if (this.ballLights[ballIndex]) {
                // Ensure the light is still in the scene
                if (!this.scene.children.includes(this.ballLights[ballIndex])) {
                    this.scene.add(this.ballLights[ballIndex]);
                    log(`💡 Re-added ball light ${ballIndex} to scene`);
                }
                this.ballLights[ballIndex].intensity = 0.15;
                log(`💡 Restored ball light ${ballIndex} intensity to 0.15`);
            } else {
                // Light doesn't exist, create a new one
                const ballLight = new THREE.PointLight(0x00FEFC, 0.15, 75);
                ballLight.castShadow = true;
                ballLight.shadow.mapSize.width = 256;
                ballLight.shadow.mapSize.height = 256;
                ballLight.shadow.bias = -0.001;
                ballLight.layers.set(0);
                this.scene.add(ballLight);
                this.ballLights[ballIndex] = ballLight;
                log(`💡 Recreated missing ball light ${ballIndex}`);
            }
        }
        
        // Ball sound removed - no automatic sound on spawn
        
        log(`Ball spawned! Total balls: ${this.balls.length}`);
        return ball;
    }
    
    setBallColor(ballIndex, owner) {
        const ball = this.balls[ballIndex];
        if (!ball) return;
        
        const trail = this.trails[ballIndex];
        
        if (owner === 'player') {
            // LIME YELLOW for player
            if (ball.material.uniforms && ball.material.uniforms.baseColor) {
                ball.material.uniforms.baseColor.value.setHex(0x00FEFC); // ShaderMaterial
            } else if (ball.material.color) {
                ball.material.color.setHex(0x00FEFC); // Fallback
            }
            
            // Update trail color
            if (trail) {
                trail.mesh.material.color.setHex(0x00FFFF);
                trail.spheres.forEach(sphere => {
                    sphere.material.color.setHex(0x00FFFF);
            });
            }
            
            // Update ball light color
            if (this.ballLights[ballIndex]) {
                this.ballLights[ballIndex].color.setHex(0x00FEFC);
            }
        } else if (owner === 'ai') {
            // Magenta for AI
            if (ball.material.uniforms && ball.material.uniforms.baseColor) {
                ball.material.uniforms.baseColor.value.setHex(0xff00ff); // ShaderMaterial
            } else if (ball.material.color) {
                ball.material.color.setHex(0xff00ff); // Fallback
            }
            
            // Update trail color
            if (trail) {
                trail.mesh.material.color.setHex(0xff00ff);
                trail.spheres.forEach(sphere => {
                sphere.material.color.setHex(0xff00ff);
            });
            }
            
            // Update ball light color
            if (this.ballLights[ballIndex]) {
                this.ballLights[ballIndex].color.setHex(0xff00ff);
        }
        }
        
        // Track ownership for this specific ball
        this.ballOwners[ballIndex] = owner;
    }
    
    createTrail() {
        // Create first trail for first ball
        this.createTrailForBall(0);
    }
    
    createTrailForBall(ballIndex) {
        // Create soft glowing trail for specific ball
        const trailGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxTrailLength * 3);
        
        // Initialize with origin
        for (let i = 0; i < this.maxTrailLength; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
        }
        
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Soft glowing material (hidden - we only use ghost spheres)
        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0x00FFFF, // Pure cyan
            transparent: true,
            opacity: 0.0, // Hidden - only using ghost spheres for trail
            linewidth: 8,
            blending: THREE.AdditiveBlending
        });
        
        const trailMesh = new THREE.Line(trailGeometry, trailMaterial);
        trailMesh.visible = false; // Line hidden, only ghost spheres visible
        this.scene.add(trailMesh);
        
        // Add glow spheres for softer trail
        const trailSpheres = [];
        for (let i = 0; i < 12; i++) {
            // Use shared geometry for performance!
            const sphereMaterial = new THREE.MeshBasicMaterial({
                color: 0x00FFFF,        // Pure cyan
                transparent: true,
                opacity: 0.3 * (1 - i / 12),
                blending: THREE.AdditiveBlending
            });
            const sphere = new THREE.Mesh(this.sharedGeometries.trailSphere, sphereMaterial);
            sphere.visible = false;
            this.scene.add(sphere);
            trailSpheres.push(sphere);
        }
        
        // Store trail data
        this.trails[ballIndex] = {
            positions: [],
            mesh: trailMesh,
            spheres: trailSpheres
        };
    }
    
    updateTrail() {
        // Update trail for each ball
        // OPTIMIZED: Update trail line every frame, but spheres every other frame
        if (!this._trailUpdateFrame) this._trailUpdateFrame = 0;
        this._trailUpdateFrame++;
        const updateSpheres = this._trailUpdateFrame % 2 === 0;
        
        // PERFORMANCE MODE: Skip trail updates more aggressively
        if (this.performanceMode && this._trailUpdateFrame % 3 !== 0) {
            return; // Skip 2 out of 3 trail updates in performance mode
        }
        
        for (let ballIndex = 0; ballIndex < this.balls.length; ballIndex++) {
            if (!this.trails[ballIndex]) continue;
            
            const ball = this.balls[ballIndex];
            const trail = this.trails[ballIndex];
            
        // Add current ball position to trail - FIXED MEMORY LEAK!
            trail.positions.unshift({
                x: ball.position.x,
                y: ball.position.y,
                z: ball.position.z
        });
        
        // CRITICAL FIX: Remove from BACK (oldest) to keep array size constant
        const maxLength = this.performanceMode ? this.performanceTrailLength : this.maxTrailLength;
            if (trail.positions.length > maxLength) {
                trail.positions.pop(); // Remove OLDEST position (from back)
        }
        
            // Update trail line (important for visual smoothness)
            const positions = trail.mesh.geometry.attributes.position.array;
            const posLength = trail.positions.length;
            for (let i = 0; i < posLength; i++) {
                const i3 = i * 3;
                const pos = trail.positions[i];
                positions[i3] = pos.x;
                positions[i3 + 1] = pos.y;
                positions[i3 + 2] = pos.z;
            }
            trail.mesh.geometry.attributes.position.needsUpdate = true;
        
            // Update soft trail spheres (every other frame for performance)
            if (updateSpheres) {
                const sphereLength = trail.spheres.length;
                for (let i = 0; i < sphereLength; i++) {
                    if (i < posLength) {
                    const pos = trail.positions[i * 2]; // Every other position for performance
                if (pos) {
                        trail.spheres[i].position.set(pos.x, pos.y, pos.z);
                        trail.spheres[i].visible = true;
                            trail.spheres[i].material.opacity = 0.4 * (1 - i / sphereLength);
                }
            } else {
                    trail.spheres[i].visible = false;
                    }
                }
            }
        }
    }
    
    createPaddles() {
        // Player paddle (LIME GREEN) - at bottom
        // PILL SHAPE - Create using cylinder + 2 hemispheres (compatible with r128!)
        // EXPERIMENT: Use exact laser wall shader!
        const paddle1Material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                baseColor: { value: new THREE.Color(0x00FEFC) }, // Bright lime-yellow!
                emissiveIntensity: { value: 12.0 }, // Increased for better CRT glow
                opacity: { value: 1.0 } // Opaque for paddle
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 baseColor;
                uniform float emissiveIntensity;
                uniform float opacity;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    // Animated gradient moving downwards quickly
                    float gradient = fract(vUv.y * 3.0 - time * 2.0); // Fast downward movement
                    
                    // Create striped pattern
                    float stripes = smoothstep(0.3, 0.7, gradient);
                    
                    // Pulsing intensity
                    float pulse = 0.8 + 0.2 * sin(time * 3.0);
                    
                    // Combine effects
                    vec3 color = baseColor * (stripes * 0.5 + 0.5) * pulse;
                    
                    gl_FragColor = vec4(color * emissiveIntensity, opacity);
                }
            `,
            transparent: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        // Create pill shape: cylinder body + 2 sphere caps
        const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 16);
        cylinderGeometry.rotateZ(Math.PI / 2); // Rotate to horizontal
        const cylinder = new THREE.Mesh(cylinderGeometry, paddle1Material);
        cylinder.castShadow = true; // Enable shadow on mesh
        
        const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const leftCap = new THREE.Mesh(sphereGeometry, paddle1Material);
        leftCap.position.x = -2; // Left end
        leftCap.castShadow = true; // Enable shadow on mesh
        const rightCap = new THREE.Mesh(sphereGeometry, paddle1Material);
        rightCap.position.x = 2; // Right end
        rightCap.castShadow = true; // Enable shadow on mesh
        
        // Combine into single paddle
        this.paddle1 = new THREE.Group();
        this.paddle1.add(cylinder);
        this.paddle1.add(leftCap);
        this.paddle1.add(rightCap);
        this.paddle1.position.set(0, 0, 15);
        this.paddle1.userData.originalColor = 0x00FEFC; // Lime-yellow
        this.paddle1.userData.originalEmissive = 0x00FEFC; // Lime-yellow emissive for glow
        this.paddle1.userData.originalEmissiveIntensity = 0.8; // Show true color (was 2.0)
        // Store material reference for blink animations
        this.paddle1.userData.material = paddle1Material;
        // Store paddle parts for proper scaling (cylinder extends, caps move)
        this.paddle1.userData.cylinder = cylinder;
        this.paddle1.userData.leftCap = leftCap;
        this.paddle1.userData.rightCap = rightCap;
        this.scene.add(this.paddle1);
        
        // AI paddle (MAGENTA) - at top
        // PILL SHAPE - Create using cylinder + 2 hemispheres
        // Use same laser wall shader!
        const paddle2Material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                baseColor: { value: new THREE.Color(0xff00ff) }, // Bright magenta!
                emissiveIntensity: { value: 12.0 }, // Increased for better CRT glow
                opacity: { value: 1.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 baseColor;
                uniform float emissiveIntensity;
                uniform float opacity;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    // Animated gradient moving downwards quickly
                    float gradient = fract(vUv.y * 3.0 - time * 2.0);
                    
                    // Create striped pattern
                    float stripes = smoothstep(0.3, 0.7, gradient);
                    
                    // Pulsing intensity
                    float pulse = 0.8 + 0.2 * sin(time * 3.0);
                    
                    // Combine effects
                    vec3 color = baseColor * (stripes * 0.5 + 0.5) * pulse;
                    
                    gl_FragColor = vec4(color * emissiveIntensity, opacity);
                }
            `,
            transparent: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        // Create pill shape: cylinder body + 2 sphere caps
        const cylinder2Geometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 16);
        cylinder2Geometry.rotateZ(Math.PI / 2); // Rotate to horizontal
        const cylinder2 = new THREE.Mesh(cylinder2Geometry, paddle2Material);
        cylinder2.castShadow = true; // Enable shadow on mesh
        
        const sphereGeometry2 = new THREE.SphereGeometry(0.5, 16, 16);
        const leftCap2 = new THREE.Mesh(sphereGeometry2, paddle2Material);
        leftCap2.position.x = -2; // Left end
        leftCap2.castShadow = true; // Enable shadow on mesh
        const rightCap2 = new THREE.Mesh(sphereGeometry2, paddle2Material);
        rightCap2.position.x = 2; // Right end
        rightCap2.castShadow = true; // Enable shadow on mesh
        
        // Combine into single paddle
        this.paddle2 = new THREE.Group();
        this.paddle2.add(cylinder2);
        this.paddle2.add(leftCap2);
        this.paddle2.add(rightCap2);
        this.paddle2.position.set(0, 0, -15);
        this.paddle2.userData.originalColor = 0xff00ff;
        this.paddle2.userData.originalEmissive = 0xff00ff; // MAGENTA emissive for glow
        this.paddle2.userData.originalEmissiveIntensity = 0.8; // Show true color (was 2.0)
        // Store material reference for blink animations
        this.paddle2.userData.material = paddle2Material;
        this.scene.add(this.paddle2);
        
        // TEST: Comment out layer isolation to see if paddles match ball
        // Exclude paddles from their own point lights using layers
    }
    
    createBoundaries() {
        // Create walls from tall pillar cubes aligned with floor grid!
        const cubeSize = 1.8; // Same as floor width/depth
        const gap = 0.15; // Same as floor
        const pillarHeight = 6; // Tall vertical pillars
        
        // Use same grid calculation as floor for Z-axis alignment
        const gridSize = 40; // Same as floor total size
        const totalCubesInFloor = Math.floor(gridSize / (cubeSize + gap));
        
        // Extended corridor depth - add 4 extra pieces on each end
        const extraPieces = 4;
        const totalPillars = totalCubesInFloor + (extraPieces * 2);
        
        // Laser wall boundaries - walls should end right at the laser walls!
        const laserWallBoundary = 19;
        
        // Arrays to store wall pillars
        this.leftWallCubes = [];
        this.rightWallCubes = [];
        
        // Wall pillars material - uses centralized config
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: this.defaultMaterialConfig.color,
            metalness: this.defaultMaterialConfig.metalness,
            roughness: this.defaultMaterialConfig.roughness,
            emissive: this.defaultMaterialConfig.emissive,
            emissiveIntensity: this.defaultMaterialConfig.emissiveIntensity
            // envMap will be set after loading via updateMaterialsWithEnvMap()
        });
        
        // Pillar geometry - tall vertical boxes
        const pillarGeometry = new THREE.BoxGeometry(0.2, pillarHeight, cubeSize);
        
        // Create LEFT wall pillars - confined within laser walls
        for (let z = 0; z < totalPillars; z++) {
            // Position Z - Extended formula with extra pieces
            const posZ = (z - totalPillars / 2) * (cubeSize + gap) + (cubeSize + gap) / 2;
            
            // Only create wall pillars within laser wall boundaries!
            if (Math.abs(posZ) > laserWallBoundary) continue;
            
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial.clone());
            
            pillar.position.set(-12, pillarHeight / 2 - 2, posZ); // Center pillar vertically
            pillar.receiveShadow = true;
            pillar.castShadow = true;
            
            // Store original values for blink animation + position for hit detection
            pillar.userData.originalColor = this.defaultMaterialConfig.color;
            pillar.userData.originalEmissive = this.defaultMaterialConfig.emissive;
            pillar.userData.originalEmissiveIntensity = this.defaultMaterialConfig.emissiveIntensity;
            pillar.userData.blinkTimer = 0; // Individual blink timer
            pillar.userData.blinkDelay = 0; // Delay before animation starts (for wave effect)
            pillar.userData.zPosition = posZ; // Store Z position for hit detection
            pillar.userData.originalX = -12; // Store original X position for displacement
            pillar.userData.targetDisplacement = 0; // Target push-in amount
            pillar.userData.side = 'left'; // Which wall side
            
            this.scene.add(pillar);
            this.leftWallCubes.push(pillar);
        }
        
        // Create RIGHT wall pillars - confined within laser walls
        for (let z = 0; z < totalPillars; z++) {
            // Position Z - Extended formula with extra pieces
            const posZ = (z - totalPillars / 2) * (cubeSize + gap) + (cubeSize + gap) / 2;
            
            // Only create wall pillars within laser wall boundaries!
            if (Math.abs(posZ) > laserWallBoundary) continue;
            
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial.clone());
            
            pillar.position.set(12, pillarHeight / 2 - 2, posZ); // Center pillar vertically
            pillar.receiveShadow = true;
            pillar.castShadow = true;
            
            // Store original values for blink animation + position for hit detection
            pillar.userData.originalColor = this.defaultMaterialConfig.color;
            pillar.userData.originalEmissive = this.defaultMaterialConfig.emissive;
            pillar.userData.originalEmissiveIntensity = this.defaultMaterialConfig.emissiveIntensity;
            pillar.userData.blinkTimer = 0; // Individual blink timer
            pillar.userData.blinkDelay = 0; // Delay before animation starts (for wave effect)
            pillar.userData.zPosition = posZ; // Store Z position for hit detection
            pillar.userData.originalX = 12; // Store original X position for displacement
            pillar.userData.targetDisplacement = 0; // Target push-in amount
            pillar.userData.side = 'right'; // Which wall side
            
            this.scene.add(pillar);
            this.rightWallCubes.push(pillar);
        }
        
        log(`Walls created: Left ${this.leftWallCubes.length} pillars, Right ${this.rightWallCubes.length} pillars - CONFINED WITHIN LASER WALLS!`);
    }
    
    createGoals() {
        // Create laser forcefield goal walls with animated gradient shader
        const goalWidth = 24; // Match play area width
        const goalHeight = 6; // Match wall pillar height
        
        // Shader material for animated gradient laser effect
        const goalShader = {
            uniforms: {
                time: { value: 0 },
                baseColor: { value: new THREE.Color(0xff3300) }, // Deep red/orange - DANGER MODE!
                emissiveIntensity: { value: 7.8125 }, // AGGRESSIVE GLOW + 25% increase (was 6.25)
                opacity: { value: 0.3 } // More transparent for deeper effect
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 baseColor;
                uniform float emissiveIntensity;
                uniform float opacity;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    // Animated gradient moving downwards quickly
                    float gradient = fract(vUv.y * 3.0 - time * 2.0); // Fast downward movement
                    
                    // Create striped pattern
                    float stripes = smoothstep(0.3, 0.7, gradient);
                    
                    // Pulsing intensity
                    float pulse = 0.8 + 0.2 * sin(time * 3.0);
                    
                    // Combine effects
                    vec3 color = baseColor * (stripes * 0.5 + 0.5) * pulse;
                    
                    // Hyper-emissive glow
                    vec3 finalColor = color * emissiveIntensity;
                    
                    // Add edge glow
                    float edgeGlow = 1.0 - abs(vUv.x * 2.0 - 1.0);
                    edgeGlow = pow(edgeGlow, 2.0) * 0.5;
                    finalColor += baseColor * edgeGlow;
                    
                    gl_FragColor = vec4(finalColor, opacity);
                }
            `
        };
        
        // Create player goal (at z = 17, behind player paddle)
        const playerGoalGeometry = new THREE.PlaneGeometry(goalWidth, goalHeight);
        const playerGoalMaterial = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone(goalShader.uniforms),
            vertexShader: goalShader.vertexShader,
            fragmentShader: goalShader.fragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        this.playerGoal = new THREE.Mesh(playerGoalGeometry, playerGoalMaterial);
        this.playerGoal.position.set(0, goalHeight / 2 - 2, 19); // Moved 2 units closer to camera
        this.playerGoal.userData.originalColor = new THREE.Color(0xff3300); // Deep red/orange
        this.scene.add(this.playerGoal);
        
        // Create AI goal (at z = -19, 2 units deeper down the corridor)
        const aiGoalGeometry = new THREE.PlaneGeometry(goalWidth, goalHeight);
        const aiGoalMaterial = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone(goalShader.uniforms),
            vertexShader: goalShader.vertexShader,
            fragmentShader: goalShader.fragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        this.aiGoal = new THREE.Mesh(aiGoalGeometry, aiGoalMaterial);
        this.aiGoal.position.set(0, goalHeight / 2 - 2, -19); // Moved 2 units further down corridor
        this.aiGoal.userData.originalColor = new THREE.Color(0xff3300); // Deep red/orange
        this.scene.add(this.aiGoal);
        
        log('✨ Laser forcefield goals created!');
    }
    
    createParticles() {
        // OPTIMIZED: Focus particles around player area for better performance!
        const particleCount = this.performanceSettings.particleCount; // Dynamic based on performance mode
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            // OPTIMIZATION: Focus particles around player paddle area (z = 15)
            // Most particles near player paddle where they're most visible
            const playerAreaZ = 15; // Player paddle Z position
            const focusRadius = 4; // Focus area around player (ultra close to camera)
            
            let x, y, z;
            
            // 80% of particles in camera view area (closer to camera) - 20% larger spread
            if (Math.random() < 0.8) {
                x = (Math.random() - 0.5) * 30; // Increased from 25 to 30 (20% larger X spread)
                y = Math.random() * 12 + 5; // Height range 5-17 (increased from 10 to 12)
                z = playerAreaZ + (Math.random() - 0.5) * 24; // Increased from 20 to 24 (20% larger Z spread)
            } else {
                // 20% scattered elsewhere for atmosphere - 20% larger spread
                x = (Math.random() - 0.5) * 42; // Increased from 35 to 42 (20% larger)
                y = Math.random() * 9.6 + 3; // Increased from 8 to 9.6 (20% larger)
                z = (Math.random() - 0.5) * 60; // Increased from 50 to 60 (20% larger)
            }
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            
            // Store original positions for return animation
            this.particleOriginalPositions.push({ x, y, z });
            
            // Initialize velocities
            this.particleVelocities.push({ x: 0, y: 0, z: 0 });
            
            // Random neon colors (LIME GREEN for player, MAGENTA for enemy)
            const colorChoice = Math.random();
            if (colorChoice < 0.5) {
                // Player color - LIME GREEN
                colors[i * 3] = 0.53;      // Red: 0x88 = 136/255 = 0.53
                colors[i * 3 + 1] = 1.0;   // Green: 0xff = 255/255 = 1.0
                colors[i * 3 + 2] = 0.0;   // Blue: 0x00 = 0/255 = 0.0
            } else {
                // Enemy color - MAGENTA
                colors[i * 3] = 1.0;       // Red: 0xff = 1.0
                colors[i * 3 + 1] = 0.0;   // Green: 0x00 = 0.0
                colors[i * 3 + 2] = 1.0;   // Blue: 0xff = 1.0
            }
            
            // Store original colors for color shifting
            this.particleOriginalColors.push({
                r: colors[i * 3],
                g: colors[i * 3 + 1],
                b: colors[i * 3 + 2]
            });
            
            // Random sizes with variation - some much bigger (increased by 20%)
            const sizeVariation = Math.random();
            if (sizeVariation < 0.1) {
                // 10% chance of large particles
                sizes[i] = 0.18 + Math.random() * 0.18; // 0.18 to 0.36 (20% increase)
            } else if (sizeVariation < 0.3) {
                // 20% chance of medium particles
                sizes[i] = 0.096 + Math.random() * 0.084; // 0.096 to 0.18 (20% increase)
            } else {
                // 70% chance of small particles
                sizes[i] = 0.03 + Math.random() * 0.06; // 0.03 to 0.09 (20% increase)
            }
        }
        
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.075, // 50% smaller (was 0.15)
            vertexColors: true,
            transparent: true,
            opacity: 0.15, // Start at 25% opacity (0.6 * 0.25 = 0.15)
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.particles);
        
        log(`✨ Created ${particleCount} optimized particles focused around player area!`);
    }
    
    createItemHighlightParticles(targetPosition, color = { r: 1.0, g: 1.0, b: 0.0 }, radius = 1.0) {
        // Create small particle sphere around specific items (like bonus icons)
        const particleCount = 5; // Even fewer for maximum impact
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            // Create particles in a sphere around the target position
            const angle = (Math.PI * 2 * i) / particleCount;
            const height = (Math.random() - 0.5) * 2; // Random height variation
            const distance = radius + (Math.random() - 0.5) * 0.5; // Slight radius variation
            
            const x = targetPosition.x + Math.cos(angle) * distance;
            const y = targetPosition.y + height;
            const z = targetPosition.z + Math.sin(angle) * distance;
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            
            // Set colors based on input
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            // Even larger, consistent particle sizes (+50% more)
            sizes[i] = 0.1125 + Math.random() * 0.0675; // 0.1125 to 0.18 (was 0.075 to 0.12)
        }
        
        // Create geometry and material
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.135, // +50% more size (was 0.09)
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        // Create particles mesh
        this.itemHighlightParticles = new THREE.Points(geometry, material);
        this.scene.add(this.itemHighlightParticles);
        
        // Store properties
        this.itemHighlightTarget = targetPosition;
        this.itemHighlightColor = color;
        this.itemHighlightRadius = radius;
        this.itemHighlightActive = true;
        
        log('✨ Item highlight particles created!');
    }
    
    updateItemHighlightParticles(deltaTime) {
        if (!this.itemHighlightActive || !this.itemHighlightParticles || !this.itemHighlightTarget) return;
        
        // Safety check: Remove particles if bonus cube no longer exists
        if (!this.bonusCube || !this.bonusCubeActive) {
            this.removeItemHighlightParticles();
            return;
        }
        
        const positions = this.itemHighlightParticles.geometry.attributes.position.array;
        const time = performance.now() * 0.002; // Slower, smoother rotation speed
        
        // Update target position to follow bonus cube
        this.itemHighlightTarget = this.bonusCube.position;
        
        // Animate particles in a revolving sphere around the target
        for (let i = 0; i < positions.length; i += 3) {
            const particleIndex = i / 3;
            const angle = (Math.PI * 2 * particleIndex) / (positions.length / 3) + time;
            const height = (Math.random() - 0.5) * 2; // Random height variation
            const distance = this.itemHighlightRadius + (Math.random() - 0.5) * 0.5;
            
            positions[i] = this.itemHighlightTarget.x + Math.cos(angle) * distance;
            positions[i + 1] = this.itemHighlightTarget.y + height;
            positions[i + 2] = this.itemHighlightTarget.z + Math.sin(angle) * distance;
        }
        
        // Mark positions as needing update
        this.itemHighlightParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    setItemHighlightColor(color) {
        if (!this.itemHighlightParticles) return;
        
        this.itemHighlightColor = color;
        const colors = this.itemHighlightParticles.geometry.attributes.color.array;
        
        // Update all particle colors
        for (let i = 0; i < colors.length; i += 3) {
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }
        
        this.itemHighlightParticles.geometry.attributes.color.needsUpdate = true;
    }
    
    fadeOutItemHighlightParticles(duration = 1000) {
        if (!this.itemHighlightParticles) return;
        
        const startOpacity = this.itemHighlightParticles.material.opacity;
        const startTime = performance.now();
        
        const fadeOut = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            
            this.itemHighlightParticles.material.opacity = startOpacity * (1.0 - progress);
            
            if (progress < 1.0) {
                requestAnimationFrame(fadeOut);
            } else {
                // Remove particles when fade is complete
                this.removeItemHighlightParticles();
            }
        };
        
        fadeOut();
    }
    
    removeItemHighlightParticles() {
        if (this.itemHighlightParticles) {
            this.scene.remove(this.itemHighlightParticles);
            this.itemHighlightParticles = null;
        }
        this.itemHighlightActive = false;
        this.itemHighlightTarget = null;
        log('✨ Item highlight particles removed!');
    }
    
    setupEventListeners() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Start game on space
            if (e.key === ' ' && !this.gameStarted) {
                this.startGame();
            }
            
            // Pause on ESC
            if (e.key === 'Escape') {
                this.togglePause();
            }
            
            // Performance mode toggle on 'P' key
            if (e.key.toLowerCase() === 'p' && !this.performanceModeKeyPressed) {
                this.performanceModeKeyPressed = true;
                this.togglePerformanceMode();
            }
            
            
            // FPS counter toggle on 'F' key
            if (e.key.toLowerCase() === 'f' && !this.lastFPSTogglePress) {
                this.lastFPSTogglePress = true;
                this.toggleFPSCounter();
            }
            
            // CRT effect toggle on 'C' key
            if (e.key.toLowerCase() === 'c') {
                this.toggleCRTEffect();
            }
            
            
            // Track controls
            if (e.key === '[' || e.key === '{') {
                this.changeTrack(-1); // Previous track
            }
            if (e.key === ']' || e.key === '}') {
                this.changeTrack(1); // Next track
            }
            
            // Reset game on 'R' key when paused
            if (e.key.toLowerCase() === 'r' && this.isPaused && !this.lastResetPress) {
                this.lastResetPress = true;
                this.superHardReset();
            }
            
            // Toggle fullscreen on 'J' key
            if (e.key.toLowerCase() === 'j' && !this.lastFullscreenTogglePress) {
                this.lastFullscreenTogglePress = true;
                this.toggleFullscreen();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            
            // Reset key states
            if (e.key.toLowerCase() === 'p') {
                this.performanceModeKeyPressed = false;
            }
            if (e.key.toLowerCase() === 'f') {
                this.lastFPSTogglePress = false;
            }
            if (e.key.toLowerCase() === 'j') {
                this.lastFullscreenTogglePress = false;
            }
            if (e.key.toLowerCase() === 'r') {
                this.lastResetPress = false;
            }
        });
        
        // Gamepad support
        this.lastStartPress = false; // Debounce for start button
        this.lastFPSTogglePress = false; // Debounce for FPS toggle
        this.lastResetPress = false; // Debounce for reset
        this.lastFullscreenTogglePress = false; // Debounce for fullscreen toggle
        
        window.addEventListener('gamepadconnected', (e) => {
            log('🎮 Gamepad connected:', e.gamepad.id);
            this.gamepad = e.gamepad;
        });
        
        window.addEventListener('gamepaddisconnected', (e) => {
            log('🎮 Gamepad disconnected');
            this.gamepad = null;
        });
        
        // Window resize (consolidated single listener)
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            
            // Resize bloom render target (FULL resolution!)
            if (this.bloomRenderTarget) {
                this.bloomRenderTarget.setSize(window.innerWidth, window.innerHeight);
            }
            
            // Resize fisheye render target
            if (this.fisheyeRenderTarget) {
                this.fisheyeRenderTarget.setSize(window.innerWidth, window.innerHeight);
            }
            
            // Update fisheye aspect ratio
            if (this.fisheyeMaterial) {
                this.fisheyeMaterial.uniforms.aspectRatio.value = window.innerWidth / window.innerHeight;
            }
            
            // Resize lens flare render target
            if (this.lensFlareRenderTarget) {
                this.lensFlareRenderTarget.setSize(window.innerWidth, window.innerHeight);
            }
            
            // Resize RGB split render target
            if (this.rgbSplitRenderTarget) {
                this.rgbSplitRenderTarget.setSize(window.innerWidth, window.innerHeight);
            }
            
            
            // Update lens flare aspect ratio
            if (this.lensFlareMaterial) {
                this.lensFlareMaterial.uniforms.aspectRatio.value = window.innerWidth / window.innerHeight;
            }
            
            // Resize blur render target
            if (this.blurRenderTarget) {
                this.blurRenderTarget.setSize(window.innerWidth, window.innerHeight);
            }
        });
        
        // Reset button
        const resetButton = document.getElementById('resetButton');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.superHardReset();
            });
        }
        
        // Mouse controls for paddle movement and camera tilt
        window.addEventListener('mousemove', (e) => {
            if (this.mouseControlsEnabled && this.gameStarted && !this.isPaused) {
                // Calculate mouse movement delta
                const deltaX = e.movementX || 0;
                
                // Update mouse position and calculate velocity
                this.lastMouseX = this.mouseX;
                this.mouseX += deltaX;
                
                // Calculate mouse velocity for tilt
                const mouseVelocity = deltaX * this.mouseSensitivity;
                
                // Apply mouse tilt with smoothing similar to keyboard
                if (Math.abs(mouseVelocity) > 0.001) {
                    const targetVelocity = Math.sign(mouseVelocity) * Math.min(Math.abs(mouseVelocity), this.maxMouseTiltVelocity);
                    this.mouseTiltVelocity += (targetVelocity - this.mouseTiltVelocity) * this.mouseTiltAcceleration;
                } else {
                    // No mouse movement - ramp down smoothly
                    this.mouseTiltVelocity *= this.mouseTiltDecay;
                    if (Math.abs(this.mouseTiltVelocity) < 0.001) {
                        this.mouseTiltVelocity = 0;
                    }
                }
                
                // Move paddle based on mouse movement
                if (Math.abs(deltaX) > 0) {
                    // Calculate paddle movement speed based on mouse delta
                    const paddleMoveSpeed = deltaX * this.mouseSensitivity * 1000; // Scale up for paddle movement
                    
                    // Calculate paddle half-width (accounts for bonus effect)
                    const scaleFactor = 1.0 + (this.bonusActivePaddle === this.paddle1 ? this.paddleWidthTransition : 0);
                    const paddleHalfWidth = 2.5 * scaleFactor;
                    
                    // Wall boundaries (walls are at ±11.5)
                    const wallPosition = 11.5;
                    const maxX = wallPosition - paddleHalfWidth;
                    const minX = -(wallPosition - paddleHalfWidth);
                    
                    // Move paddle with mouse input
                    this.paddle1.position.x += paddleMoveSpeed * this.timeScale;
                    
                    // Clamp to prevent wall intersection
                    this.paddle1.position.x = Math.max(minX, Math.min(maxX, this.paddle1.position.x));
                }
            }
        });
        
        // Enable mouse controls when game starts
        window.addEventListener('click', (e) => {
            if (this.gameStarted && !this.isPaused) {
                // Request pointer lock for better mouse control
                if (document.pointerLockElement !== document.body) {
                    document.body.requestPointerLock().catch(err => {
                        // Pointer lock failed, but we can still use mouse movement
                        log('Pointer lock failed:', err);
                    });
                }
                this.mouseControlsEnabled = true;
            }
        });
        
        // Handle pointer lock changes
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === document.body) {
                this.mouseControlsEnabled = true;
            } else {
                this.mouseControlsEnabled = false;
                this.mouseTiltVelocity = 0; // Reset mouse tilt when losing pointer lock
            }
        });
    }
    
    setupLogo3DEffects() {
        // 3D logo effects with mouse movement
        const logo = document.getElementById('logo');
        const logoImg = logo.querySelector('img');
        
        let mouseX = 0;
        let mouseY = 0;
        let targetRotateX = 0;
        let targetRotateY = 0;
        let currentRotateX = 0;
        let currentRotateY = 0;
        
        // Mouse movement handler
        const handleMouseMove = (e) => {
            const rect = logo.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Calculate relative mouse position (-1 to 1)
            mouseX = (e.clientX - centerX) / (rect.width / 2);
            mouseY = (e.clientY - centerY) / (rect.height / 2);
            
            // Clamp values and scale for subtle rotation
            mouseX = Math.max(-1, Math.min(1, mouseX));
            mouseY = Math.max(-1, Math.min(1, mouseY));
            
            // Calculate target rotation (subtle angles)
            targetRotateY = mouseX * 8; // Max 8 degrees
            targetRotateX = -mouseY * 6; // Max 6 degrees (inverted)
        };
        
        // Gamepad handler for controller support
        const handleGamepad = () => {
            const gamepads = navigator.getGamepads();
            if (gamepads[0]) {
                const gamepad = gamepads[0];
                
                // Gamepad detected and ready
                
                // Try different axis combinations for PS5 controller
                // PS5 controller typically has: 0=Left X, 1=Left Y, 2=Right X, 3=Right Y
                const stickX = gamepad.axes[2] || 0; // Right stick X
                const stickY = gamepad.axes[3] || 0; // Right stick Y
                
                if (Math.abs(stickX) > 0.1 || Math.abs(stickY) > 0.1) {
                    targetRotateY = stickX * 8;
                    targetRotateX = -stickY * 6;
                } else {
                    targetRotateY = 0;
                    targetRotateX = 0;
                }
            }
        };
        
        // Smooth rotation interpolation
        const animateRotation = () => {
            // Smooth interpolation
            currentRotateX += (targetRotateX - currentRotateX) * 0.1;
            currentRotateY += (targetRotateY - currentRotateY) * 0.1;
            
            // Apply rotation to logo image
            const rotationTransform = `
                rotateX(${currentRotateX}deg) 
                rotateY(${currentRotateY}deg)
            `;
            
            logoImg.style.transform = rotationTransform;
            
            requestAnimationFrame(animateRotation);
        };
        
        // Wait for entry animation to complete, then start interactive rotation
        setTimeout(() => {
            // Reset logo to neutral position after entry animation
            logoImg.style.transform = 'rotateX(0deg) rotateY(0deg)';
            
            // Start the interactive rotation system
            animateRotation();
        }, 3250); // 2.25s start + 1s duration = 3.25s
        
        // Add event listeners
        window.addEventListener('mousemove', handleMouseMove);
        
        // Store handler for gamepad updates
        this.handleLogoGamepad = handleGamepad;
    }
    
    createWorldLogo() {
        // Create 3D logo in the world that receives lighting
        this.worldLogo = null;
        this.worldLogoRotation = { x: 0, y: 0 };
        
        // Load both SVG textures
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin(''); // Remove CORS restrictions for local files
        let loadedCount = 0;
        const textures = {};
        
        const createSingleLogo = (texture) => {
            // Create text-based logo instead of SVG texture for better post-processing compatibility
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 144;
            const context = canvas.getContext('2d');
            
            // Set background to transparent
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Set font properties
            context.font = 'bold 80px Terminal Grotesque';
            context.fillStyle = '#00ffff';
            context.strokeStyle = '#ffffff';
            context.lineWidth = 3;
            
            // Draw text with stroke for better visibility
            context.strokeText('GRIDZONE', 50, 90);
            context.fillText('GRIDZONE', 50, 90);
            
            // Create texture from canvas
            const textTexture = new THREE.CanvasTexture(canvas);
            textTexture.needsUpdate = true;
            
            // Create a plane geometry for the logo
            const logoGeometry = new THREE.PlaneGeometry(8, 2.3); // Adjusted for text
            
            // Create material for main logo that's compatible with post-processing
            const mainMaterial = new THREE.MeshStandardMaterial({
                map: textTexture,
                metalness: 0.8, // Very metallic for better effects
                roughness: 0.1, // Very smooth for better bloom
                emissive: new THREE.Color(0x00ffff), // Bright cyan glow for maximum visibility
                emissiveIntensity: 3.0, // Increased for better CRT glow
                transparent: false, // CRITICAL: Must be false for post-processing
                alphaTest: 0.1,
                side: THREE.DoubleSide, // Ensure both sides are rendered
                // Force the material to be very bright for testing
                color: new THREE.Color(0xffffff) // Pure white for maximum visibility
            });
            
            // Create main logo mesh
            this.worldLogo = new THREE.Mesh(logoGeometry, mainMaterial);
            
            // CRITICAL: Set logo to layer 0 so it gets post-processed with other scene elements
            this.worldLogo.layers.set(0);
            
            // Comment out stroke layer for now
            // this.worldLogoStroke = new THREE.Mesh(logoGeometry, strokeMaterial);
            
            // Position main logo in the world (closer to camera for better visibility)
            this.worldLogo.position.set(0, 8, -8);
            this.worldLogo.rotation.x = -0.1; // Less tilt toward camera
            
            // Comment out stroke positioning for now
            // this.worldLogoStroke.position.set(0, 12, -4.0);
            // this.worldLogoStroke.rotation.x = -0.2;
            
            // Add main logo to scene
            this.scene.add(this.worldLogo);
            
            // Add dedicated lights for logo specular highlights
            this.createLogoLights();
            
            log('🌍 Single world logo created!');
            log('Main logo position:', this.worldLogo.position);
            log('Main logo visible:', this.worldLogo.visible);
        };
        
        // Error handling for texture loading
        const handleError = (error) => {
            console.warn('Could not load logo texture:', error);
        };
        
        // Create a simple fallback logo (no external files needed)
        log('🎨 Creating procedural logo (no external files)');
        createSingleLogo(null);
        
    }
    
    
    createLogoLights() {
        // Create lights positioned to create specular highlights on the logo
        this.logoLights = [];
        
        // Main highlight light - positioned to the side and above
        const mainLight = new THREE.PointLight(0x00FEFC, 8.0, 25);
        mainLight.position.set(8, 15, -2);
        this.scene.add(mainLight);
        this.logoLights.push(mainLight);
        
        // Secondary light - from the opposite side for rim lighting
        const rimLight = new THREE.PointLight(0xFF00FF, 6.0, 22);
        rimLight.position.set(-6, 14, 0);
        this.scene.add(rimLight);
        this.logoLights.push(rimLight);
        
        // Accent light - from behind for edge definition
        const accentLight = new THREE.PointLight(0xFFFFFF, 5.0, 18);
        accentLight.position.set(0, 10, 2);
        this.scene.add(accentLight);
        this.logoLights.push(accentLight);
        
        log('💡 Logo lights created for specular highlights!');
    }
    
    updateWorldLogo(deltaTime) {
        if (!this.worldLogo) return;
        
        // Gentle rotation animation
        this.worldLogoRotation.y += deltaTime * 0.3; // Slow rotation
        this.worldLogo.rotation.y = this.worldLogoRotation.y;
        
        // Gentle floating motion
        const floatY = 8 + this.cachedSin(this.worldLogoRotation.y * 0.5) * 0.5;
        this.worldLogo.position.y = floatY;
        
        // Comment out stroke animation for now
        // this.worldLogoStroke.rotation.y = this.worldLogoRotation.y;
        // this.worldLogoStroke.position.y = floatY;
        // this.worldLogoStroke.position.z = -4.0 + Math.sin(this.worldLogoRotation.y * 0.7) * 0.1;
        
        // Animate logo lights for dynamic specular highlights
        if (this.logoLights && this.logoLights.length > 0) {
            const time = this.worldLogoRotation.y;
            
            // Main light - gentle orbit
            this.logoLights[0].position.x = 8 + this.cachedSin(time * 0.4) * 2;
            this.logoLights[0].position.z = -2 + this.cachedCos(time * 0.4) * 1.5;
            
            // Rim light - counter-orbit
            this.logoLights[1].position.x = -6 + this.cachedSin(time * 0.3 + Math.PI) * 1.5;
            this.logoLights[1].position.z = this.cachedCos(time * 0.3 + Math.PI) * 1;
            
            // Accent light - subtle pulsing
            this.logoLights[2].intensity = 5.0 + this.cachedSin(time * 0.8) * 1.5;
        }
        
        // Hide during main menu sequence, show after logo animation completes
        // Only show 3D world logo during title screen (gets full post-processing), not during gameplay
        if (this.gameStarted) {
            this.worldLogo.visible = false;
            // Hide DOM logo when game starts
            document.getElementById('logo').style.display = 'none';
        } else if (performance.now() < 3250) { // Hide until logo entry animation completes
            this.worldLogo.visible = false;
            // Hide DOM logo initially, let 3D logo take over
            document.getElementById('logo').style.display = 'none';
        } else {
            // FORCE logo to be visible during title screen for full post-processing
            this.worldLogo.visible = true;
            // Keep DOM logo hidden - 3D logo with full effects is better
            document.getElementById('logo').style.display = 'none';
            // Also hide the presents text to avoid conflicts
            document.getElementById('presents').style.display = 'none';
            
            // Show logo lights during title screen
            if (this.logoLights) {
                this.logoLights.forEach(light => light.visible = true);
            }
            
        }
        
        // Comment out stroke visibility for now
        // if (this.worldLogoStroke) {
        //     this.worldLogoStroke.visible = true;
        // }
    }
    
    updateStartMenuGamepad() {
        // Check for gamepad input during start menu
        const gamepads = navigator.getGamepads();
        if (gamepads[0]) {
            this.gamepad = gamepads[0];
        }
        
        if (!this.gamepad) return;
        
        // X button (button 0) or any face button to start game
        const startButton = this.gamepad.buttons[0]; // X on PlayStation, A on Xbox
        
        if (startButton && startButton.pressed) {
            if (!this.lastStartPress) {
                log('🎮 Start button pressed!');
                this.startGame();
                this.lastStartPress = true;
            }
        } else {
            this.lastStartPress = false;
        }
    }
    
    startGame() {
        // Common function for starting game (keyboard or gamepad)
        if (this.gameStarted) return; // Prevent double-start
        
        log('🚀 Starting game...');
        
        // Ensure we start with normal speed
        this.forceNormalSpeed();
        
        // Reset stuck ball collision system
        this.collisionDisabled = false;
        this.collisionDisableTimer = 0;
        this.ballCollisionHistory = [];
        
            this.gameStarted = true;
            this.domElements.ui.style.display = 'none';
        document.getElementById('logo').style.display = 'none';
        document.getElementById('presents').style.display = 'none';
        document.getElementById('copyright').style.display = 'none';
        
        // Switch to game start fade-in mode
        if (document.getElementById('titleBackground')) {
            const titleBackground = document.getElementById('titleBackground');
            titleBackground.classList.remove('titleScreen');
            titleBackground.classList.add('gameStart');
            
            // Start fade-in from black after a brief moment
            setTimeout(() => {
                titleBackground.classList.add('hidden');
            }, 100); // Small delay to ensure the solid black is visible first
        }
        
        // Hide world logo and lights when game starts
        if (this.worldLogo) {
            this.worldLogo.visible = false;
        }
        // Comment out stroke hiding for now
        // if (this.worldLogoStroke) {
        //     this.worldLogoStroke.visible = false;
        // }
        if (this.logoLights) {
            this.logoLights.forEach(light => light.visible = false);
        }
        
        // Show overhead lights when game starts
        if (this.overheadLight) {
            this.overheadLight.visible = true;
        }
        if (this.overheadLight2) {
            this.overheadLight2.visible = true;
        }
        
        // Start underground light fade-in for dramatic effect
        this.undergroundLightFadeIn.active = true;
        this.undergroundLightFadeIn.startTime = performance.now();
        
            // Set camera to gameplay position once at start
            this.camera.position.set(0, 18, 22);
            this.camera.lookAt(0, -4, 0);
            this.camera.fov = 75;
            this.camera.updateProjectionMatrix();
            
            // Initialize camera target for normal gameplay
            this.cameraTarget.x = 0;
            this.cameraTarget.z = 0;
            this.cameraTarget.zoom = 22;
            
            // Reset camera tracking ramp-up for gradual tracking
            this.cameraTrackingRampUp = 0;
        
        // Delay ball spawn slightly to let camera transition start smoothly
        // This prevents visual glitch where ball appears before camera moves
        setTimeout(() => {
        log('⚽ Ball spawning - clean start!');
        this.spawnBall(0, 0, 0, {
            x: 0,      // No horizontal movement initially
            y: 0,
            z: -0.15   // Always toward enemy/AI (negative Z)
        });
        }, 400); // 400ms delay for smooth camera-to-ball transition
        
        // Reset game state
        this.successfulHits = 0;
        this.nextBallThreshold = 4; // Changed from 2 to 4
        this.playerHits = 0;
        
        // Reset bonus effect
        if (this.bonusActivePaddle) {
            // Reset paddle parts
            const cylinder = this.bonusActivePaddle.userData.cylinder;
            const leftCap = this.bonusActivePaddle.userData.leftCap;
            const rightCap = this.bonusActivePaddle.userData.rightCap;
            if (cylinder && leftCap && rightCap) {
                cylinder.scale.x = 1.0;
                leftCap.position.x = -2;
                rightCap.position.x = 2;
            }
            this.bonusActivePaddle = null;
        }
        this.bonusTimer = 0;
        this.paddleWidthTransition = 0;
        
        this.paddle1Pushback = 0;
        this.paddle2Pushback = 0;
        this.paddle1Tilt = 0;
        this.paddle2Tilt = 0;
        this.paddle1.position.z = 15;
        this.paddle2.position.z = -15;
        this.paddle1.rotation.z = 0;
        this.paddle2.rotation.z = 0;
        
        this.playSound('menuSelect');
        
        // Select random track from music catalogue (excluding "No Music" option)
        const availableTracks = this.musicTracks.filter(track => track.file !== null);
        const randomIndex = Math.floor(Math.random() * availableTracks.length);
        const randomTrack = availableTracks[randomIndex];
        
        // Find the index in the full musicTracks array
        this.currentTrackIndex = this.musicTracks.findIndex(track => track.file === randomTrack.file);
        
        // Load the random track
        this.sounds.music = new Audio(randomTrack.file);
        this.sounds.music.volume = 0.67;
        this.sounds.music.loop = true;
        
        // Show track name
        this.showTrackName(randomTrack.name);
        
        log(`🎵 Random track selected: ${randomTrack.name}`);
        
        // Audio context removed - was causing issues
            
            // Start music
            if (this.sounds.music) {
            this.sounds.music.play().catch(e => log('Could not play music'));
        }
    }
    
    updateGamepad() {
        // Get latest gamepad state (during gameplay)
        const gamepads = navigator.getGamepads();
        if (gamepads[0]) {
            this.gamepad = gamepads[0];
        }
        
        if (!this.gamepad) return;
        
        // PS5 DualSense: Left stick horizontal axis (axis 0)
        const leftStickX = this.gamepad.axes[0];
        const deadzone = 0.15;
        
        const isGamepadMoving = Math.abs(leftStickX) > deadzone;
        
        if (isGamepadMoving) {
            // Calculate paddle half-width (accounts for bonus effect)
            const scaleFactor = 1.0 + (this.bonusActivePaddle === this.paddle1 ? this.paddleWidthTransition : 0);
            const paddleHalfWidth = 2.5 * scaleFactor; // Normal: 2.5, Bonus: 5.0
            
            // Wall boundaries (walls are at ±11.5)
            const wallPosition = 11.5;
            const maxX = wallPosition - paddleHalfWidth;
            const minX = -(wallPosition - paddleHalfWidth);
            
            const speed = this.paddleSpeed * Math.abs(leftStickX) * this.timeScale; // Apply timeScale for slow motion
            if (leftStickX < 0 && this.paddle1.position.x > minX) {
                this.paddle1.position.x -= speed;
                // Clamp to prevent wall intersection
                this.paddle1.position.x = Math.max(this.paddle1.position.x, minX);
            } else if (leftStickX > 0 && this.paddle1.position.x < maxX) {
                this.paddle1.position.x += speed;
                // Clamp to prevent wall intersection
                this.paddle1.position.x = Math.min(this.paddle1.position.x, maxX);
            }
        }
        
        
        // Options button (button 9) to pause
        if (this.gamepad.buttons[9] && this.gamepad.buttons[9].pressed) {
            if (!this.lastPausePress) {
                log('⏸️ Gamepad pause button pressed');
                this.togglePause();
                this.lastPausePress = true;
            }
        } else {
            this.lastPausePress = false;
        }
        
        // LB/L1 button (button 4) - Previous track
        if (this.gamepad.buttons[4] && this.gamepad.buttons[4].pressed) {
            if (!this.lastLBPress) {
                this.changeTrack(-1); // Previous track
                this.lastLBPress = true;
            }
        } else {
            this.lastLBPress = false;
        }
        
        // RB/R1 button (button 5) - Next track
        if (this.gamepad.buttons[5] && this.gamepad.buttons[5].pressed) {
            if (!this.lastRBPress) {
                this.changeTrack(1); // Next track
                this.lastRBPress = true;
            }
        } else {
            this.lastRBPress = false;
        }
        
        // Triangle/Y button (button 3) - FPS counter toggle
        if (this.gamepad.buttons[3] && this.gamepad.buttons[3].pressed) {
            if (!this.lastTrianglePress) {
                this.toggleFPSCounter();
                this.lastTrianglePress = true;
            }
        } else {
            this.lastTrianglePress = false;
        }
        
        // Circle/B button (button 1) - Performance mode toggle
        if (this.gamepad.buttons[1] && this.gamepad.buttons[1].pressed) {
            if (!this.lastCirclePress) {
                this.togglePerformanceMode();
                this.lastCirclePress = true;
            }
        } else {
            this.lastCirclePress = false;
        }
        
        // Square button (button 2) to reset game when paused
        if (this.isPaused && this.gamepad.buttons[2] && this.gamepad.buttons[2].pressed) {
            if (!this.lastResetPress) {
                log('🔄 Gamepad reset button pressed - super hard reset');
                this.superHardReset();
                this.lastResetPress = true;
            }
        } else {
            this.lastResetPress = false;
        }
    }
    
    togglePause() {
        if (!this.gameStarted) return;
        
        this.isPaused = !this.isPaused;
        log('⏸️ Game paused:', this.isPaused);
        
        if (this.isPaused) {
            this.domElements.pauseMenu.style.display = 'block';
            
            // Reset pause menu animations
            const pauseElements = this.domElements.pauseMenu.querySelectorAll('h2, .controls-section, #resetButton');
            pauseElements.forEach(element => {
                element.style.animation = 'none';
                element.offsetHeight; // Trigger reflow
                element.style.animation = null;
            });
            
            // Hide score UI during pause
            this.domElements.ui.style.display = 'none';
            document.getElementById('score').style.display = 'none';
            // Play pause sound
            if (this.sounds.pause) {
                this.sounds.pause.currentTime = 0;
                this.sounds.pause.play().catch(e => log('Could not play pause sound'));
            }
            
            // Activate pause camera - start from current position
            this.pauseCamera.active = true;
            this.pauseCamera.angle = 0;
            this.pauseCamera.startPos = {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            };
            // Calculate starting angle based on current camera position
            this.pauseCamera.startAngle = Math.atan2(this.camera.position.z, this.camera.position.x);
            
            // Hide any active in-game messages during pause
            this.hideActiveMessage();
            
            // Mute music when paused
            if (this.sounds.music) {
                this.sounds.music.pause();
            }
            
            // Stop goal alarm if playing
            if (this.sounds.goalAlarm) {
                this.sounds.goalAlarm.pause();
                this.sounds.goalAlarm.currentTime = 0;
            }
        } else {
            this.domElements.pauseMenu.style.display = 'none';
            // Don't show UI element - it contains "PRESS SPACE TO START" text
            // Show score UI again when unpausing
            document.getElementById('score').style.display = 'block';
            
            // Restore any active messages when unpausing
            this.restoreActiveMessage();
            
            // Reset stuck ball collision system when unpausing
            this.collisionDisabled = false;
            this.collisionDisableTimer = 0;
            this.ballCollisionHistory = [];
            // Play unpause sound (same sound for consistency)
            if (this.sounds.pause) {
                this.sounds.pause.currentTime = 0;
                this.sounds.pause.play().catch(e => log('Could not play unpause sound'));
            }
            
            // Deactivate pause camera
            this.pauseCamera.active = false;
            
            // Resume music when unpaused (only if not "No Music")
            if (this.sounds.music && this.musicTracks[this.currentTrackIndex].file !== null) {
                // Ensure volume is set correctly (prevent any volume drift)
                this.sounds.music.volume = 0.67;
                this.sounds.music.play().catch(e => log('Could not resume music'));
            }
        }
    }
    
    updatePauseCamera(deltaTime) {
        // Slow rotation during pause menu (idle camera)
        if (!this.pauseCamera.active) return;
        
        // Increment rotation angle slowly
        this.pauseCamera.angle += this.pauseCamera.speed * deltaTime;
        
        // Calculate camera position - rotate around arena
        const totalAngle = this.pauseCamera.startAngle + this.pauseCamera.angle;
        const x = this.cachedCos(totalAngle) * this.pauseCamera.radius;
        const z = this.cachedSin(totalAngle) * this.pauseCamera.radius;
        const y = this.pauseCamera.height;
        
        // Set camera position
        this.camera.position.set(x, y, z);
        
        // Look at center of arena
        this.camera.lookAt(0, this.pauseCamera.lookAtHeight, 0);
    }
    
    startMultiBallZoom() {
        // Quick dramatic zoom on NEW ball (enemy ball) + super slow-mo
        log('🎬 MULTI-BALL CAMERA ZOOM STARTING!');
        
        // Record current camera position
        this.multiBallZoom.startPos = {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
        };
        
        // Find the NEWEST ball (last one in array - the one that just spawned)
        const newestBall = this.balls[this.balls.length - 1];
        
        // Zoom in CLOSE on the new enemy ball
        this.multiBallZoom.targetPos = {
            x: newestBall.position.x * 1.3, // Slightly offset horizontally
            y: 5, // Low dramatic angle
            z: newestBall.position.z + 6 // Very close to the new ball!
        };
        
        this.multiBallZoom.lookAtPos = {
            x: newestBall.position.x,
            y: newestBall.position.y + 0.5,
            z: newestBall.position.z
        };
        
        // Activate zoom
        this.multiBallZoom.active = true;
        this.multiBallZoom.startTime = performance.now();
        
        // SUPER SLOW-MO!
        this.timeScale = 0.15; // Very slow (15% speed)
        
        // After full sequence (zoom + hold + flyback), deactivate and restore speed
        const multiBallTimeout = setTimeout(() => {
            this.multiBallZoom.active = false;
            this.timeScale = 1.0; // Back to normal speed
            
            // Ensure FOV is back to normal
            this.camera.fov = this.multiBallZoom.originalFOV;
            this.camera.updateProjectionMatrix();
            
            // NO CAMERA RESET - just let normal gameplay camera continue
            // Camera will naturally return to normal gameplay behavior
            
            log('✅ Multi-ball sequence complete!');
        }, this.multiBallZoom.duration);
        this.activeTimeouts.push(multiBallTimeout);
    }
    
    updateMultiBallZoom() {
        // Three phases: zoom in, hold with rotation, flyback
        if (!this.multiBallZoom.active) return;
        
        const elapsed = performance.now() - this.multiBallZoom.startTime;
        const zoom = this.multiBallZoom;
        
        // Calculate phase timings
        const zoomInEnd = zoom.zoomInDuration;
        const holdEnd = zoomInEnd + zoom.holdDuration;
        const flybackEnd = holdEnd + zoom.flybackDuration;
        
        // PHASE 1: Zoom in (0-400ms)
        if (elapsed < zoomInEnd) {
            const progress = elapsed / zoom.zoomInDuration;
            const eased = this.easeInOutCubic(progress);
            
            // Interpolate to target position
            this.camera.position.x = zoom.startPos.x + (zoom.targetPos.x - zoom.startPos.x) * eased;
            this.camera.position.y = zoom.startPos.y + (zoom.targetPos.y - zoom.startPos.y) * eased;
            this.camera.position.z = zoom.startPos.z + (zoom.targetPos.z - zoom.startPos.z) * eased;
            
            // Increase FOV during zoom
            this.camera.fov = zoom.originalFOV + (zoom.zoomFOV - zoom.originalFOV) * eased;
            this.camera.updateProjectionMatrix();
            
            this.camera.lookAt(zoom.lookAtPos.x, zoom.lookAtPos.y, zoom.lookAtPos.z);
        }
        // PHASE 2: Hold with rotation (400-1400ms)
        else if (elapsed < holdEnd) {
            const holdTime = elapsed - zoomInEnd;
            const holdProgress = holdTime / zoom.holdDuration;
            
            // Stay at target position
            this.camera.position.copy(zoom.targetPos);
            
            // Keep FOV at max
            this.camera.fov = zoom.zoomFOV;
            this.camera.updateProjectionMatrix();
            
            // Rotate camera around the ball
            const angle = holdTime * 0.001 * zoom.rotationSpeed;
            const radius = 6;
            const offsetX = this.cachedSin(angle) * radius * 0.5;
            const offsetZ = this.cachedCos(angle) * radius * 0.3;
            
            this.camera.position.x = zoom.targetPos.x + offsetX;
            this.camera.position.z = zoom.targetPos.z + offsetZ;
            
            // Slowly tilt camera upwards toward the goal (moves text away from ball)
            const tiltAmount = holdProgress * 3; // Tilt 3 units upward over hold duration
            const lookAtY = zoom.lookAtPos.y + tiltAmount;
            const lookAtZ = zoom.lookAtPos.z - (holdProgress * 8); // Also look toward goal
            
            this.camera.lookAt(zoom.lookAtPos.x, lookAtY, lookAtZ);
        }
        // PHASE 3: Flyback (1400-1900ms)
        else if (elapsed < flybackEnd) {
            const flybackTime = elapsed - holdEnd;
            const progress = flybackTime / zoom.flybackDuration;
            const eased = this.easeInOutCubic(progress);
            
            // Default gameplay camera position (same as after Press Start)
            const finalPos = { x: 0, y: 18, z: 22 };
            const finalLookAt = { x: 0, y: -4, z: 0 };
            
            // Smooth interpolate back to default gameplay position
            this.camera.position.x = zoom.targetPos.x + (finalPos.x - zoom.targetPos.x) * eased;
            this.camera.position.y = zoom.targetPos.y + (finalPos.y - zoom.targetPos.y) * eased;
            this.camera.position.z = zoom.targetPos.z + (finalPos.z - zoom.targetPos.z) * eased;
            
            // Return FOV to normal
            this.camera.fov = zoom.zoomFOV + (zoom.originalFOV - zoom.zoomFOV) * eased;
            this.camera.updateProjectionMatrix();
            
            // Smooth look-at transition
            const lookX = zoom.lookAtPos.x + (finalLookAt.x - zoom.lookAtPos.x) * eased;
            const lookY = zoom.lookAtPos.y + (finalLookAt.y - zoom.lookAtPos.y) * eased;
            const lookZ = zoom.lookAtPos.z + (finalLookAt.z - zoom.lookAtPos.z) * eased;
            
            this.camera.lookAt(lookX, lookY, lookZ);
        }
    }
    
    
    triggerPaddleBlink(paddle, paddleName) {
        // Flash paddle WHITE (similar to walls!)
        const material = paddle.userData.material;
        
        // Set target color to white for shader material
        material.uniforms.baseColor.value.setHex(0xffffff); // WHITE!
        material.uniforms.emissiveIntensity.value = 20.0; // SUPER BRIGHT - increased for CRT glow
        
        // Boost the paddle's point light intensity when hit
        if (paddleName === 'paddle1' && this.playerLight) {
            this.playerLight.intensity = 12.0; // SUPER bright flash!
        } else if (paddleName === 'paddle2' && this.aiLight) {
            this.aiLight.intensity = 12.0; // SUPER bright flash!
        }
        
        // Set timer for fade back to original color (0.3 seconds - sharp triangle curve)
        this.paddleBlinkTimers[paddleName] = 0.3;
    }
    
    updatePaddleBlinks(deltaTime) {
        // Paddle 1 blink - fade from white back to green
        if (this.paddleBlinkTimers.paddle1 > 0) {
            this.paddleBlinkTimers.paddle1 -= deltaTime;
            
            // Calculate fade progress (0 = fully faded back to original, 1 = white)
            const fadeProgress = Math.max(0, this.paddleBlinkTimers.paddle1 / 0.3);
            
            const material = this.paddle1.userData.material;
            const originalColor = 0x00FEFC; // Lime-yellow (original working color)
            const whiteColor = 0xffffff;
            
            // Lerp from white back to original green
            const r = Math.floor(((whiteColor >> 16) & 255) * fadeProgress + ((originalColor >> 16) & 255) * (1 - fadeProgress));
            const g = Math.floor(((whiteColor >> 8) & 255) * fadeProgress + ((originalColor >> 8) & 255) * (1 - fadeProgress));
            const b = Math.floor((whiteColor & 255) * fadeProgress + (originalColor & 255) * (1 - fadeProgress));
            
            const lerpedColor = (r << 16) | (g << 8) | b;
            material.uniforms.baseColor.value.setHex(lerpedColor);
            
            // Fade emissive intensity back to original
            material.uniforms.emissiveIntensity.value = 20.0 * fadeProgress + 12.0 * (1 - fadeProgress);
            
            // Also fade the light intensity (flash at 12.0, base is 0.75)
            if (this.playerLight) {
                this.playerLight.intensity = 12.0 * fadeProgress + 0.75 * (1 - fadeProgress);
            }
        }
        
        // Paddle 2 blink - fade from white back to magenta
        if (this.paddleBlinkTimers.paddle2 > 0) {
            this.paddleBlinkTimers.paddle2 -= deltaTime;
            
            // Calculate fade progress (0 = fully faded back to original, 1 = white)
            const fadeProgress = Math.max(0, this.paddleBlinkTimers.paddle2 / 0.3);
            
            const material = this.paddle2.userData.material;
            const originalColor = 0xff00ff; // Magenta
            const whiteColor = 0xffffff;
            
            // Lerp from white back to original magenta
            const r = Math.floor(((whiteColor >> 16) & 255) * fadeProgress + ((originalColor >> 16) & 255) * (1 - fadeProgress));
            const g = Math.floor(((whiteColor >> 8) & 255) * fadeProgress + ((originalColor >> 8) & 255) * (1 - fadeProgress));
            const b = Math.floor((whiteColor & 255) * fadeProgress + (originalColor & 255) * (1 - fadeProgress));
            
            const lerpedColor = (r << 16) | (g << 8) | b;
            material.uniforms.baseColor.value.setHex(lerpedColor);
            
            // Fade emissive intensity back to original
            material.uniforms.emissiveIntensity.value = 20.0 * fadeProgress + 12.0 * (1 - fadeProgress);
            
            // Also fade the light intensity (flash at 12.0, base is 0.75)
            if (this.aiLight) {
                this.aiLight.intensity = 12.0 * fadeProgress + 0.75 * (1 - fadeProgress);
            }
        }
        
        // Update individual pillar blinks for left wall with wave propagation
        for (let pillar of this.leftWallCubes) {
            // Skip individual blinks during celebratory wave (to prevent secondary light waves)
            if (this.isCelebrating) continue;
            
            // Handle delay countdown first (wave propagation)
            if (pillar.userData.blinkDelay > 0) {
                pillar.userData.blinkDelay -= deltaTime;
                
                // When delay reaches 0, start the blink animation
                if (pillar.userData.blinkDelay <= 0) {
                    pillar.userData.blinkDelay = 0;
                    pillar.userData.blinkTimer = pillar.userData.blinkDuration || 0.25;
                    
                    // Set initial bright state
                    pillar.material.color.setHex(pillar.userData.targetColor || 0xffffff);
                    pillar.material.emissive.setHex(pillar.userData.targetEmissive || 0xffffff);
                    pillar.material.emissiveIntensity = pillar.userData.targetIntensity || 3.0;
                }
            }
            // Then handle the fade animation + physical displacement
            else if (pillar.userData.blinkTimer > 0) {
                pillar.userData.blinkTimer -= deltaTime;
                
                // Calculate fade progress (0 = fully faded, 1 = full bright)
                const fadeProgress = Math.max(0, pillar.userData.blinkTimer / (pillar.userData.blinkDuration || 0.25));
                
                const originalColor = pillar.userData.originalColor;
                const originalEmissive = pillar.userData.originalEmissive;
                const targetColor = pillar.userData.targetColor || 0xffffff;
                const targetEmissive = pillar.userData.targetEmissive || 0xffffff;
                const targetIntensity = pillar.userData.targetIntensity || 3.0;
                
                // Lerp from target color back to original
                const r = Math.floor(((targetColor >> 16) & 255) * fadeProgress + ((originalColor >> 16) & 255) * (1 - fadeProgress));
                const g = Math.floor(((targetColor >> 8) & 255) * fadeProgress + ((originalColor >> 8) & 255) * (1 - fadeProgress));
                const b = Math.floor((targetColor & 255) * fadeProgress + (originalColor & 255) * (1 - fadeProgress));
                
                const er = Math.floor(((targetEmissive >> 16) & 255) * fadeProgress + ((originalEmissive >> 16) & 255) * (1 - fadeProgress));
                const eg = Math.floor(((targetEmissive >> 8) & 255) * fadeProgress + ((originalEmissive >> 8) & 255) * (1 - fadeProgress));
                const eb = Math.floor((targetEmissive & 255) * fadeProgress + (originalEmissive & 255) * (1 - fadeProgress));
                
                pillar.material.color.setRGB(r / 255, g / 255, b / 255);
                pillar.material.emissive.setRGB(er / 255, eg / 255, eb / 255);
                pillar.material.emissiveIntensity = targetIntensity * fadeProgress + 0.08 * (1 - fadeProgress);
                
                // PHYSICAL DISPLACEMENT: Push pillar OUTWARD (away from impact)
                // Apply ease-out quintic curve for ULTRA smooth, gentle deceleration
                const easeOutQuint = 1 - Math.pow(1 - fadeProgress, 5);
                
                // Left wall: push LEFT (negative X direction - away from center)
                const displacement = (pillar.userData.targetDisplacement || 0) * easeOutQuint;
                pillar.position.x = pillar.userData.originalX - displacement;
            } else {
                // Reset position when animation is done
                pillar.position.x = pillar.userData.originalX;
            }
        }
        
        // Update individual pillar blinks for right wall with wave propagation
        for (let pillar of this.rightWallCubes) {
            // Skip individual blinks during celebratory wave (to prevent secondary light waves)
            if (this.isCelebrating) continue;
            
            // Handle delay countdown first (wave propagation)
            if (pillar.userData.blinkDelay > 0) {
                pillar.userData.blinkDelay -= deltaTime;
                
                // When delay reaches 0, start the blink animation
                if (pillar.userData.blinkDelay <= 0) {
                    pillar.userData.blinkDelay = 0;
                    pillar.userData.blinkTimer = pillar.userData.blinkDuration || 0.25;
                    
                    // Set initial bright state
                    pillar.material.color.setHex(pillar.userData.targetColor || 0xffffff);
                    pillar.material.emissive.setHex(pillar.userData.targetEmissive || 0xffffff);
                    pillar.material.emissiveIntensity = pillar.userData.targetIntensity || 3.0;
                }
            }
            // Then handle the fade animation + physical displacement
            else if (pillar.userData.blinkTimer > 0) {
                pillar.userData.blinkTimer -= deltaTime;
                
                // Calculate fade progress (0 = fully faded, 1 = full bright)
                const fadeProgress = Math.max(0, pillar.userData.blinkTimer / (pillar.userData.blinkDuration || 0.25));
                
                const originalColor = pillar.userData.originalColor;
                const originalEmissive = pillar.userData.originalEmissive;
                const targetColor = pillar.userData.targetColor || 0xffffff;
                const targetEmissive = pillar.userData.targetEmissive || 0xffffff;
                const targetIntensity = pillar.userData.targetIntensity || 3.0;
                
                // Lerp from target color back to original
                const r = Math.floor(((targetColor >> 16) & 255) * fadeProgress + ((originalColor >> 16) & 255) * (1 - fadeProgress));
                const g = Math.floor(((targetColor >> 8) & 255) * fadeProgress + ((originalColor >> 8) & 255) * (1 - fadeProgress));
                const b = Math.floor((targetColor & 255) * fadeProgress + (originalColor & 255) * (1 - fadeProgress));
                
                const er = Math.floor(((targetEmissive >> 16) & 255) * fadeProgress + ((originalEmissive >> 16) & 255) * (1 - fadeProgress));
                const eg = Math.floor(((targetEmissive >> 8) & 255) * fadeProgress + ((originalEmissive >> 8) & 255) * (1 - fadeProgress));
                const eb = Math.floor((targetEmissive & 255) * fadeProgress + (originalEmissive & 255) * (1 - fadeProgress));
                
                pillar.material.color.setRGB(r / 255, g / 255, b / 255);
                pillar.material.emissive.setRGB(er / 255, eg / 255, eb / 255);
                pillar.material.emissiveIntensity = targetIntensity * fadeProgress + 0.08 * (1 - fadeProgress);
                
                // PHYSICAL DISPLACEMENT: Push pillar OUTWARD (away from impact)
                // Apply ease-out quintic curve for ULTRA smooth, gentle deceleration
                const easeOutQuint = 1 - Math.pow(1 - fadeProgress, 5);
                
                // Right wall: push RIGHT (positive X direction - away from center)
                const displacement = (pillar.userData.targetDisplacement || 0) * easeOutQuint;
                pillar.position.x = pillar.userData.originalX + displacement;
            } else {
                // Reset position when animation is done
                pillar.position.x = pillar.userData.originalX;
            }
        }
    }
    
    updateBonusEffect(deltaTime) {
        // Handle bonus paddle width effect
        if (this.bonusActivePaddle) {
            const cylinder = this.bonusActivePaddle.userData.cylinder;
            const leftCap = this.bonusActivePaddle.userData.leftCap;
            const rightCap = this.bonusActivePaddle.userData.rightCap;
            
            // Timer expired - start contracting
            if (this.bonusTimer <= 0) {
                // Quick contract (0.3 seconds)
                this.paddleWidthTransition -= deltaTime * 5;
                this.paddleWidthTransition = Math.max(0, this.paddleWidthTransition);
                
                // Calculate scale factor during contraction
                const scaleFactor = 1.0 + this.paddleWidthTransition;
                
                if (cylinder && leftCap && rightCap) {
                    cylinder.scale.x = scaleFactor;
                    leftCap.position.x = -2 * scaleFactor;
                    rightCap.position.x = 2 * scaleFactor;
                }
                
                // Fully contracted - deactivate bonus
                if (this.paddleWidthTransition <= 0) {
                    // Reset to normal
                    if (cylinder && leftCap && rightCap) {
                        cylinder.scale.x = 1.0;
                        leftCap.position.x = -2;
                        rightCap.position.x = 2;
                    }
                    
                    // RESET PADDLE TO NORMAL COLORS
                    if (this.bonusActivePaddle === this.paddle1 && this.paddle1.material) {
                        if (this.paddle1.material.color) {
                            this.paddle1.material.color.setHex(0x00FEFC); // Back to cyan
                        }
                        if (this.paddle1.material.emissive) {
                            this.paddle1.material.emissive.setHex(0x00FEFC); // Back to cyan emissive
                        }
                        if (this.paddle1.material.emissiveIntensity !== undefined) {
                            this.paddle1.material.emissiveIntensity = 0.2; // Normal emissive intensity
                        }
                        
                        // Reset overhead light to normal
                        if (this.overheadLight1) {
                            this.overheadLight1.color.setHex(0x00FEFC); // Back to cyan
                            this.overheadLight1.intensity = 6.75; // Back to normal intensity
                        }
                    }
                    
                    this.bonusActivePaddle = null;
                    this.bonusTimer = 0;
                    log('⏱️ BONUS EXPIRED - Paddle back to normal');
                }
            }
            // Widening or staying wide
            else {
            // Quick widen (0.3 seconds)
            if (this.paddleWidthTransition < 1.0) {
                this.paddleWidthTransition += deltaTime * 5; // Fast transition (5x speed)
                this.paddleWidthTransition = Math.min(1.0, this.paddleWidthTransition);
                } else {
                    // Only countdown timer AFTER paddle is fully widened
                    this.bonusTimer -= deltaTime;
            }
            
            // Calculate scale factor (1.0 = normal, 2.0 = double)
            const scaleFactor = 1.0 + this.paddleWidthTransition;
            
            // PROPER SCALING: Only extend cylinder, move caps outward
            if (cylinder && leftCap && rightCap) {
                // Scale cylinder in X (extends the body)
                cylinder.scale.x = scaleFactor;
                
                // Move caps outward to match extended cylinder
                leftCap.position.x = -2 * scaleFactor; // Move left cap
                rightCap.position.x = 2 * scaleFactor; // Move right cap
                }
            }
        }
    }
    
    triggerLensFlare() {
        // Instantly set lens flare to full opacity on impact
        this.lensFlareOpacity = 1.0;
    }
    
    triggerRGBSplit() {
        // Boost RGB split effect for win celebration (always active at 5% base)
        this.rgbSplitIntensity = 0.0; // Start boost at 0 intensity for smooth ease-in
        this.rgbSplitDuration = 1200; // 1.2 seconds duration for win celebration (no hold, just ease-in and fade-out)
        this.rgbSplitOriginalDuration = 1200; // Store original duration
        this.rgbSplitPhase = 'ease-in'; // Start with ease-in phase
        this.rgbSplitEaseInDuration = 300; // 300ms ease-in duration
        this.rgbSplitEaseInStartTime = performance.now();
        
        log('🌈 RGB Split win celebration boosted! Duration: 1.2 seconds with ease-in and smooth fade-out');
    }
    
    triggerRGBSplitBonus() {
        // Boost RGB split effect for bonus pickup (always active at 5% base)
        // NOTE: This is PURELY a visual effect - NO camera interaction whatsoever
        this.rgbSplitIntensity = 0.0; // Start boost at 0 intensity for smooth ease-in
        this.rgbSplitDuration = 300; // 0.3 seconds duration for bonus pickup (much shorter)
        this.rgbSplitOriginalDuration = 300; // Store original duration
        this.rgbSplitPhase = 'ease-in'; // Start with ease-in phase
        this.rgbSplitEaseInDuration = 150; // 150ms quick ease-in duration
        this.rgbSplitEaseInStartTime = performance.now();
        
        // Camera continues normal ball tracking during bonus pickup
        
        log('🌈 RGB Split bonus pickup boosted! Duration: 0.3s with smooth ease-in and fade-out (NO camera interaction)');
    }
    
    // Message queue system to prevent overlapping on-screen messages
    queueMessage(text, duration = 2000, style = 'default') {
        // NEW MESSAGE OVERRIDE: Clear any existing message immediately
        this.clearCurrentMessage();
        
        // Clear the queue and add only this new message
        this.messageQueue = [{
            text: text,
            duration: duration,
            style: style,
            timestamp: performance.now()
        }];
        
        // Process the new message immediately
        this.processMessageQueue();
        
        log(`📝 Message queued (override): "${text}" (previous message cleared)`);
    }
    
    clearCurrentMessage() {
        // Immediately remove any currently active message element
        if (this.currentMessage && this.currentMessage.element) {
            if (this.currentMessage.element.parentNode) {
                document.body.removeChild(this.currentMessage.element);
            }
            this.currentMessage.element = null;
        }
        
        // Clear any message elements in the DOM
        const existingMessages = document.querySelectorAll('[data-message]');
        existingMessages.forEach(msg => {
            if (msg.parentNode) {
                document.body.removeChild(msg);
            }
        });
        
        // Reset message state
        this.messageActive = false;
        this.currentMessage = null;
        
        // Clear any pending timeouts for message removal
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
            this.messageTimeout = null;
        }
        
        // Clear the message queue completely
        this.messageQueue = [];
        
        log('🧹 Current message cleared for override');
    }
    
    processMessageQueue() {
        if (this.messageQueue.length === 0 || this.messageActive) {
            return;
        }
        
        const message = this.messageQueue.shift();
        this.currentMessage = message;
        this.messageActive = true;
        
        this.showQueuedMessage(message);
        
        log(`📺 Showing message: "${message.text}"`);
    }
    
    showQueuedMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.textContent = message.text;
        
        // Apply style based on message type
        if (message.style === 'awesome') {
            messageElement.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 173px;
                font-weight: bold;
                color: #ffffff;
                text-shadow: 
                    0 0 40px #00FEFC,
                    0 0 80px #00FEFC,
                    0 0 120px #00FEFC;
                font-family: 'Terminal Grotesque', monospace;
            text-transform: uppercase;
                z-index: 1000;
                pointer-events: none;
                white-space: nowrap;
                animation: hardBlinkEnter 0.6s ease-out forwards;
            `;
        } else if (message.style === 'bonus') {
            messageElement.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 173px;
                font-weight: bold;
                color: #ffffff;
                text-shadow: 
                    0 0 40px #FFD700,
                    0 0 80px #FFD700,
                    0 0 120px #FFD700;
                font-family: 'Terminal Grotesque', monospace;
            text-transform: uppercase;
                z-index: 1000;
                pointer-events: none;
                white-space: nowrap;
                animation: hardBlinkEnter 0.6s ease-out forwards;
            `;
        } else {
            // Default style
            messageElement.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 173px;
                font-weight: bold;
                color: #ffffff;
                text-shadow: 0 0 20px #00FEFC;
                font-family: 'Terminal Grotesque', monospace;
            text-transform: uppercase;
                z-index: 1000;
                pointer-events: none;
                white-space: nowrap;
                animation: hardBlinkEnter 0.6s ease-out forwards;
            `;
        }
        
        document.body.appendChild(messageElement);
        
        // Store element reference in message object for pause/unpause handling
        this.currentMessage.element = messageElement;
        
        // Remove message after duration
        setTimeout(() => {
            messageElement.style.animation = 'hardBlinkExit 0.6s ease-out forwards';
            setTimeout(() => {
                if (messageElement.parentNode) {
                    document.body.removeChild(messageElement);
                }
                this.messageActive = false;
                this.currentMessage = null;
                
                // Process next message in queue
                this.processMessageQueue();
                
                log(`📺 Message completed: "${message.text}"`);
            }, 600);
        }, message.duration);
    }
    
    hideActiveMessage() {
        // Hide any currently active message element
        if (this.currentMessage && this.currentMessage.element) {
            this.currentMessage.element.style.display = 'none';
        }
        
        // Also hide any message elements that might be in the DOM
        const existingMessages = document.querySelectorAll('[data-message]');
        existingMessages.forEach(msg => {
            msg.style.display = 'none';
        });
        
        // Hide death screen elements during pause
        if (this.domElements.deathScreen && this.domElements.deathScreen.style.display === 'block') {
            this.domElements.deathScreen.style.display = 'none';
            // Store that we hid it so we can restore it
            this.deathScreenWasHidden = true;
        }
    }
    
    restoreActiveMessage() {
        // Restore any active message when unpausing
        if (this.currentMessage && this.currentMessage.element) {
            this.currentMessage.element.style.display = 'block';
        }
        
        // Also restore any message elements that might be in the DOM
        const existingMessages = document.querySelectorAll('[data-message]');
        existingMessages.forEach(msg => {
            msg.style.display = 'block';
        });
        
        // Restore death screen if it was hidden during pause
        if (this.deathScreenWasHidden && this.domElements.deathScreen) {
            this.domElements.deathScreen.style.display = 'block';
            this.deathScreenWasHidden = false;
        }
    }
    
    updateLensFlare(deltaTime) {
        // Fade out lens flare over time
        if (this.lensFlareOpacity > 0) {
            this.lensFlareOpacity -= deltaTime * this.lensFlareFadeSpeed;
            this.lensFlareOpacity = Math.max(0, this.lensFlareOpacity);
        }
        
        // Update shader uniform
        if (this.lensFlareMaterial) {
            this.lensFlareMaterial.uniforms.flareOpacity.value = this.lensFlareOpacity;
        }
    }
    
    updateRGBSplit(deltaTime) {
        // Update RGB split effect
        if (this.rgbSplitActive && this.rgbSplitDuration > 0) {
            this.rgbSplitDuration -= deltaTime * 1000; // Convert to milliseconds
            
            // Handle ease-in phase
            if (this.rgbSplitPhase === 'ease-in') {
                const easeInElapsed = performance.now() - this.rgbSplitEaseInStartTime;
                const easeInProgress = Math.min(easeInElapsed / this.rgbSplitEaseInDuration, 1.0);
                
                // Quick ease-in curve (cubic ease-in)
                this.rgbSplitIntensity = easeInProgress * easeInProgress * easeInProgress;
                
                // Switch to hold phase when ease-in is complete
                if (easeInProgress >= 1.0) {
                    this.rgbSplitPhase = 'hold';
                    this.rgbSplitIntensity = 1.0; // Ensure we reach full intensity
                }
            }
            // Handle fade-out phase
            else if (this.rgbSplitPhase === 'fade-out') {
                // Calculate fade-out progress based on remaining time vs fade-out duration
                // Use different fade-out durations for win celebration vs bonus pickup
                const fadeOutDuration = this.rgbSplitOriginalDuration === 1200 ? 600 : 150; // 600ms for win, 150ms for bonus
                const fadeProgress = Math.max(0, this.rgbSplitDuration / fadeOutDuration);
                
                // Smooth fade out with easing (prevents pop at end)
                this.rgbSplitIntensity = fadeProgress * fadeProgress * (3 - 2 * fadeProgress); // Smoothstep function
            }
            // Handle hold phase - check if we should start fade-out
            else if (this.rgbSplitPhase === 'hold') {
                // Start fade-out based on effect type (win celebration vs bonus pickup)
                let fadeStartTime;
                if (this.rgbSplitOriginalDuration === 1200) {
                    // Win celebration: 600ms fade-out
                    fadeStartTime = 600;
                } else {
                    // Bonus pickup: 150ms fade-out (much shorter)
                    fadeStartTime = 150;
                }
                
                if (this.rgbSplitDuration <= fadeStartTime) {
                    this.rgbSplitPhase = 'fade-out';
                }
            }
            
            if (this.rgbSplitDuration <= 0) {
                // Smoothly fade out intensity to prevent visual pop
                this.rgbSplitIntensity = Math.max(0, this.rgbSplitIntensity - 0.02); // Slower fade-out
                
                // Only deactivate when intensity is very low to prevent pop
                if (this.rgbSplitIntensity <= 0.001) {
                    this.rgbSplitActive = false;
                    this.rgbSplitIntensity = 0;
                    log('🌈 RGB Split effect ended');
                }
            }
            
            // Update shader uniforms (add base intensity of 5%)
            if (this.rgbSplitMaterial) {
                this.rgbSplitMaterial.uniforms.intensity.value = this.rgbSplitIntensity + 0.05; // Always add 5% base
                this.rgbSplitMaterial.uniforms.time.value = performance.now() * 0.001;
            } else {
                log('❌ RGB Split material not found!');
            }
        }
    }
    
    updateWaveLights() {
        // Update traveling wave lights
        if (this.waveLights.length > 0) {
            log('💡 Updating', this.waveLights.length, 'traveling lights');
        }
        
        for (let i = this.waveLights.length - 1; i >= 0; i--) {
            const waveLight = this.waveLights[i];
            const elapsed = performance.now() - waveLight.startTime;
            const progress = Math.min(elapsed / waveLight.duration, 1);
            
            // Move light along Z axis
            waveLight.light.position.z = waveLight.startZ + (waveLight.endZ - waveLight.startZ) * progress;
            
            // Fade intensity as wave progresses (bright at start, dim at end)
            waveLight.light.intensity = 8.0 * (1 - progress);
            
            // Remove when complete
            if (progress >= 1) {
                this.scene.remove(waveLight.light);
                this.waveLights.splice(i, 1);
            }
        }
    }
    
    updateBonusCube(deltaTime) {
        if (!this.bonusCube) return;
        
        // RED FLICKER ANIMATION (enemy hit) - matches AWESOME text timing
        if (this.bonusCubeFlickerActive) {
            this.bonusCubeFlickerTimer += deltaTime;
            
            // Timeline: Immediate red blinks (no yellow delay)
            let color = 0x000000;
            let intensity = 0.0;
            
            // Immediate red blinking - no yellow delay
            const blinkCycle = (this.bonusCubeFlickerTimer % 0.15) / 0.15; // 0-1 per blink
            if (blinkCycle < 0.6) { // 60% on, 40% off
                    color = 0xff0000; // Red
                    intensity = 8.0;
                } else {
                    color = 0x000000; // Off
                    intensity = 0.0;
            }
            
            if (this.bonusCube.userData.material && this.bonusCube.userData.material.uniforms) {
                this.bonusCube.userData.material.uniforms.baseColor.value.setHex(color);
                this.bonusCube.userData.material.uniforms.emissiveIntensity.value = intensity;
            }
            
            // After 1.4s total (0.6s blinks + 0.8s hold), remove cube
            if (this.bonusCubeFlickerTimer >= this.bonusCubeFlickerDuration) {
                // Remove ambient light
                if (this.bonusCube.userData.ambientLight) {
                    this.scene.remove(this.bonusCube.userData.ambientLight);
                }
                this.scene.remove(this.bonusCube);
                this.bonusCube = null;
                this.bonusCubeActive = false;
                this.bonusCubeFlickerActive = false;
                this.bonusCubeFlickerTimer = 0;
                
                // Fade out highlight particles when bonus is denied and removed
                this.fadeOutItemHighlightParticles(500);
                
                // Clean up bonus denied light when cube is removed
                if (this.bonusLight && this.bonusLight.light) {
                    this.scene.remove(this.bonusLight.light);
                    this.bonusLight = null;
                    log('🔴 Bonus denied light cleaned up with cube');
                } else {
                    log('🔴 No bonus light to clean up when cube removed');
                }
                
                log('🔴 BONUS CUBE REMOVED after red flicker');
            }
            return;
        }
        
        // Spin the icosahedron around its own axis (1 revolution per second)
        this.bonusCube.rotation.y += deltaTime * (2 * Math.PI * 1); // 1 revolution per second
        
        // Gentle up and down sway
        const swaySpeed = 1.5; // Slow, gentle motion
        const swayAmount = 0.3; // Small vertical movement
        const sway = this.cachedSin(this.goalAnimationTime * swaySpeed) * swayAmount;
        this.bonusCube.position.y = this.bonusCube.userData.baseY + sway;
        
        // Update ambient light position to follow the bonus cube
        if (this.bonusCube.userData.ambientLight) {
            this.bonusCube.userData.ambientLight.position.copy(this.bonusCube.position);
        }
        
        // Update shader time for animation
        if (this.bonusCube.userData.material && this.bonusCube.userData.material.uniforms) {
            this.bonusCube.userData.material.uniforms.time.value = this.goalAnimationTime;
            
            // HARD FAST BLINK like text animations!
            const blinkSpeed = 6.0;
            const blinkCycle = (this.goalAnimationTime * blinkSpeed) % 1.0;
            const isOn = blinkCycle < 0.5;
            const blinkIntensity = isOn ? 8.0 : 3.0;
            this.bonusCube.userData.material.uniforms.emissiveIntensity.value = blinkIntensity;
        }
        
        // Update bonus light blinking (same timing as mesh)
        if (this.bonusLight && this.bonusLight.active && this.bonusCubeFlickerActive) {
            // Blink light with same timing as mesh
            const blinkCycle = (this.bonusCubeFlickerTimer % 0.15) / 0.15; // Match cube timing exactly
            const isOn = blinkCycle < 0.6; // 60% on, 40% off - same as mesh
            this.bonusLight.light.intensity = isOn ? 8.0 : 0.0;
        }
        
        // Safety check: If bonus cube is gone but light still exists, clean it up
        if (this.bonusLight && !this.bonusCube) {
                this.scene.remove(this.bonusLight.light);
                this.bonusLight = null;
            log('🔴 Safety cleanup: Bonus light removed (cube was already gone)');
        }
        
        // Additional safety check: If bonus light exists but no cube, clean it up
        if (this.bonusLight && !this.bonusCube) {
            log('🔴 Additional safety check: Cleaning up orphaned bonus light');
            this.scene.remove(this.bonusLight.light);
            this.bonusLight = null;
        }
        
        // Spawn scale animation
        if (this.bonusCube.userData.blinkTimer < this.bonusCube.userData.blinkDuration) {
            this.bonusCube.userData.blinkTimer += deltaTime;
            
            // Scale from 0.5 to 1.0 with bounce
            const progress = this.bonusCube.userData.blinkTimer / this.bonusCube.userData.blinkDuration;
            const scale = 0.5 + (0.5 * Math.min(1.0, progress * 1.2)); // Slightly overshoot
            this.bonusCube.scale.set(scale, scale, scale);
        } else {
            // Ensure it's at full scale
            this.bonusCube.scale.set(1.0, 1.0, 1.0);
        }
    }
    
    triggerWallBlink(wallPillars, ballZ) {
        // Create shockwave effect - impact center sends wave outward to nearby pillars
        // Energy dissipates as wave travels: weaker light + slower fadeout at distance
        const shockwaveRadius = 4.5; // Reduced radius to affect exactly 5 segments total
        const waveSpeed = 0.0125; // Time delay per unit distance (ultra fast wave for 0.5s total)
        
        for (let pillar of wallPillars) {
            const dist = Math.abs(pillar.userData.zPosition - ballZ);
            
            // If within shockwave radius, trigger blink with delay based on distance
            if (dist < shockwaveRadius) {
                // Calculate intensity falloff (1.0 at center, 0.0 at edge)
                const intensity = 1.0 - (dist / shockwaveRadius);
                
                // REVERSED: Delay increases with distance (wave propagates outward!)
                pillar.userData.blinkDelay = dist * waveSpeed; // Farther = more delay
                
                // Energy dissipation: farther = weaker light (smooth gradient)
                const colorIntensity = intensity; // 1.0 to 0.0
                
                // Interpolate color based on distance
                const maxR = 255, maxG = 255, maxB = 255; // White at center
                const minR = 85, minG = 102, minB = 102;   // Subtle glow at edge (0x556666)
                
                const r = Math.floor(minR + (maxR - minR) * colorIntensity);
                const g = Math.floor(minG + (maxG - minG) * colorIntensity);
                const b = Math.floor(minB + (maxB - minB) * colorIntensity);
                
                pillar.userData.targetColor = (r << 16) | (g << 8) | b;
                
                // Emissive follows same gradient but slightly darker
                const emR = Math.floor(r * 0.9);
                const emG = Math.floor(g * 0.9);
                const emB = Math.floor(b * 0.9);
                
                pillar.userData.targetEmissive = (emR << 16) | (emG << 8) | emB;
                
                // Emissive intensity scales with distance (3.0 at center, 0.3 at edge)
                pillar.userData.targetIntensity = 0.3 + (intensity * 2.7);
                
                // REVERSED DURATION: Farther pillars fade out SLOWER (energy lingers)
                // Close: 0.25s (ultra fast, snappy)
                // Far: 0.4s (very quick, gentle fade)
                pillar.userData.blinkDuration = 0.25 + ((1.0 - intensity) * 0.15);
                
                // PHYSICAL DISPLACEMENT: Push pillar inward MUCH more based on intensity
                // Maximum push at center (1.875 units), minimal at edge (0.25 units) - 25% stronger!
                pillar.userData.targetDisplacement = 0.25 + (intensity * 1.625);
            }
        }
    }
    
    triggerCelebratoryWave() {
        // Prevent multiple celebrations from running simultaneously
        if (this.isCelebrating) {
            log('🎉 Celebration already active - skipping duplicate wave');
            return;
        }
        
        // CELEBRATORY WAVE - travels from AI goal toward player!
        // Creates a wave of GREEN laser light that flows down both walls
        const waveSpeed = 0.05; // Time delay per unit distance
        const aiGoalZ = -19; // Starting point (AI goal end)
        
        // Start wall wave animation FIRST
        this.startWallWaveAnimation();
        
        // Building animation removed for performance
        
        // Trigger wave on BOTH walls
        const allWalls = [...this.leftWallCubes, ...this.rightWallCubes];
        
        for (let pillar of allWalls) {
            // Calculate distance from AI goal (wave origin)
            const distanceFromOrigin = Math.abs(pillar.userData.zPosition - aiGoalZ);
            
            // Delay based on distance from AI goal (wave travels toward player)
            pillar.userData.blinkDelay = distanceFromOrigin * waveSpeed;
            
            // PURE LASER CYAN - same as winning goal walls! (no white!)
            pillar.userData.targetColor = 0x00FEFC; // Bright cyan
            pillar.userData.targetEmissive = 0x00FEFC; // Cyan emissive
            pillar.userData.targetIntensity = 0.6; // Lower intensity - pure green, no white bloom
            
            // Wave duration - consistent across all pillars
            pillar.userData.blinkDuration = 1.5; // 1.5 second glow
            
            // No displacement for celebratory wave - keep segments in place
            pillar.userData.targetDisplacement = 0;
        }
        
        // Clear any existing individual blink systems to prevent secondary light waves
        for (let pillar of allWalls) {
            pillar.userData.blinkDelay = 0;
            pillar.userData.blinkTimer = 0;
        }
        
        // Start celebration - begin smooth transition to cyan
        this.isCelebrating = true;
        this.celebrationTimer = 2000; // 2.0 seconds celebration
        
        // Start smooth color transition to cyan
        this.undergroundLightTransition.active = true;
        this.undergroundLightTransition.progress = 0;
        this.undergroundLightTransition.direction = 1; // To cyan
        
        // Create traveling celebration light
        this.createCelebrationLight();
        
        // Wave sound is now handled in startWallWaveAnimation() - no need for duplicate sound
        
        log('🎉 CELEBRATORY WAVE TRIGGERED!');
    }
    
    createCelebrationLight() {
        // Create more visible cyan light above the playfield
        this.celebrationLight = new THREE.PointLight(0x00FEFC, 0, 150); // Start at 0 intensity, larger radius
        this.celebrationLight.position.set(0, 20, -19); // Above enemy goal, slightly lower for better visibility
        this.celebrationLight.castShadow = false;
        this.scene.add(this.celebrationLight);
        
        // Set up light properties
        this.celebrationLightActive = true;
        this.celebrationLightStartTime = performance.now();
        this.celebrationLightDuration = 2000; // 2 seconds travel time (matches celebration)
        this.celebrationLightStartZ = -19; // Enemy goal
        this.celebrationLightEndZ = 19;    // Player goal
        
        log('✨ Celebration light created - boosted visibility');
    }
    
    updateCelebration(deltaTime) {
        // Update color transition
        if (this.undergroundLightTransition.active) {
            this.undergroundLightTransition.progress += (deltaTime * 1000) / this.undergroundLightTransition.duration;
            
            if (this.undergroundLightTransition.progress >= 1.0) {
                this.undergroundLightTransition.progress = 1.0;
                this.undergroundLightTransition.active = false;
            }
            
            // Smooth color interpolation
            const startColor = new THREE.Color(this.undergroundLightTransition.startColor);
            const endColor = new THREE.Color(this.undergroundLightTransition.endColor);
            const currentColor = startColor.clone().lerp(endColor, this.undergroundLightTransition.progress);
            
            this.undergroundLight.color.copy(currentColor);
        }
        
        // Update traveling celebration light
        if (this.celebrationLightActive && this.celebrationLight) {
            const elapsed = performance.now() - this.celebrationLightStartTime;
            const progress = Math.min(elapsed / this.celebrationLightDuration, 1.0);
            
            // Move light from enemy goal to player goal
            this.celebrationLight.position.z = this.celebrationLightStartZ + 
                (this.celebrationLightEndZ - this.celebrationLightStartZ) * progress;
            
            // Fade in for first 25%, stay at max for 50%, fade out for last 25%
            let intensity = 0;
            if (progress <= 0.25) {
                // Fade in (reduced by 75%: 3.5 -> 0.875)
                intensity = (progress / 0.25) * 0.875; // Max intensity 0.875 (75% reduction)
            } else if (progress <= 0.75) {
                // Stay at max (reduced by 75%: 3.5 -> 0.875)
                intensity = 0.875;
            } else {
                // Fade out (reduced by 75%: 3.5 -> 0.875)
                intensity = 0.875 * (1 - (progress - 0.75) / 0.25);
            }
            
            this.celebrationLight.intensity = intensity;
            
            // Remove light when complete
            if (progress >= 1.0) {
                this.scene.remove(this.celebrationLight);
                this.celebrationLight = null;
                this.celebrationLightActive = false;
                log('✨ Celebration light completed');
            }
        }
        
        if (this.isCelebrating) {
            this.celebrationTimer -= deltaTime * 1000; // Convert to milliseconds
            
            if (this.celebrationTimer <= 1000) { // Start transition back 1.0 seconds before end
                if (this.undergroundLightTransition.direction === 1) { // Only start once
                    // Start transition back to purple
                    this.undergroundLightTransition.active = true;
                    this.undergroundLightTransition.progress = 0;
                    this.undergroundLightTransition.direction = -1; // To purple
                    
                    // Determine start color based on wave direction (player vs enemy)
                    if (this.wallWaveAnimation.waveDirection === 1) {
                        // Player wave - transition from cyan to purple
                        this.undergroundLightTransition.startColor = 0x00FFFF; // From pure cyan
                    } else {
                        // Enemy wave - transition from magenta to purple
                        this.undergroundLightTransition.startColor = 0xFF00FF; // From pure magenta
                    }
                    this.undergroundLightTransition.endColor = 0x6600cc;   // To purple
                }
            }
            
            if (this.celebrationTimer <= 0) {
                // Celebration ended
                this.isCelebrating = false;
                this.waveSoundPlayed = false; // Reset sound flag for next celebration
                this.undergroundLightTransition.active = false;
                this.undergroundLightTransition.direction = 1; // Reset for next celebration
                this.undergroundLightTransition.startColor = 0x6600cc; // Reset to purple
                this.undergroundLightTransition.endColor = 0x00FFFF;   // Reset to pure cyan
                
                // Safety: Ensure underground light is back to purple
                if (this.undergroundLight) {
                    this.undergroundLight.color.setHex(0x6600cc);
                }
                
                // Cyan vignette fades out automatically via CSS animation
                
                // UNFREEZE GAME: Resume normal gameplay after win sequence
                this.gameSpeed = 1.0;
                this.isGameFrozen = false;
                
                // Reset stuck ball collision system after win
                this.collisionDisabled = false;
                this.collisionDisableTimer = 0;
                this.ballCollisionHistory = [];
                
                
                // NO CAMERA RESET - just let normal gameplay camera continue
                // Camera will naturally return to normal gameplay behavior
                
                // Clean up celebration light if still active
                if (this.celebrationLight && this.celebrationLightActive) {
                    this.scene.remove(this.celebrationLight);
                    this.celebrationLight = null;
                    this.celebrationLightActive = false;
                }
                
                // CRITICAL: Reset game speed to normal after celebration
                this.timeScale = 1.0;
                log('🎉 Celebration ended - underground light back to purple, speed reset to normal');
            }
        }
    }
    
    // Building height animation functions removed for performance
    
    startWallWaveAnimation() {
        // Start wall wave animation synchronized with lights (ONLY ON WIN)
        this.wallWaveAnimation.active = true;
        this.wallWaveAnimation.startTime = performance.now();
        this.wallWaveAnimation.originalHeights.clear();
        this.wallWaveAnimation.wavePhase = 0;
        this.wallWaveAnimation.waveDirection = 1; // Towards player
        
        // Store original heights for all wall segments
        const allWalls = [...this.leftWallCubes, ...this.rightWallCubes];
        for (let pillar of allWalls) {
            this.wallWaveAnimation.originalHeights.set(pillar, pillar.scale.y);
        }
        
        log('🌊 Starting wall wave animation (towards player)...');
        
        // Play electro-flow sound for wall wave celebration
        this.playSound('electroFlow');
    }
    
    startEnemyWallWaveAnimation() {
        // Start enemy wall wave animation (inverse direction)
        this.wallWaveAnimation.active = true;
        this.wallWaveAnimation.startTime = performance.now();
        this.wallWaveAnimation.originalHeights.clear();
        this.wallWaveAnimation.wavePhase = 0;
        this.wallWaveAnimation.waveDirection = -1; // Towards enemy (opposite direction)
        
        // Store original heights for all wall segments
        const allWalls = [...this.leftWallCubes, ...this.rightWallCubes];
        for (let pillar of allWalls) {
            this.wallWaveAnimation.originalHeights.set(pillar, pillar.scale.y);
        }
        
        log('🌊 Starting enemy wall wave animation (towards enemy)...');
        
        // Play electro-flow sound for enemy wall wave celebration
        this.playSound('electroFlow');
    }
    
    triggerEnemyCelebratoryWave() {
        // Prevent multiple celebrations from running simultaneously
        if (this.isCelebrating) {
            log('🎉 Celebration already active - skipping duplicate wave');
            return;
        }
        
        // ENEMY CELEBRATORY WAVE - travels from PLAYER goal toward ENEMY!
        // Creates a wave of MAGENTA laser light that flows down both walls (opposite direction)
        const waveSpeed = 0.05; // Time delay per unit distance
        const playerGoalZ = 19; // Starting point (player goal end)
        
        // Start wall wave animation FIRST (inverse direction)
        this.startEnemyWallWaveAnimation();
        
        // Trigger wave on BOTH walls (traveling away from camera)
        const allWalls = [...this.leftWallCubes, ...this.rightWallCubes];
        
        for (let pillar of allWalls) {
            // Calculate distance from PLAYER goal (wave origin - opposite direction)
            const distanceFromOrigin = Math.abs(pillar.userData.zPosition - playerGoalZ);
            
            // Delay based on distance from PLAYER goal (wave travels toward ENEMY)
            pillar.userData.blinkDelay = distanceFromOrigin * waveSpeed;
            
            // MAGENTA LASER - enemy colors!
            pillar.userData.targetColor = 0xFF00FF; // Bright magenta
            pillar.userData.targetEmissive = 0xFF00FF; // Magenta emissive
            pillar.userData.targetIntensity = 0.6; // Lower intensity - pure magenta, no white bloom
            
            // Wave duration - consistent across all pillars
            pillar.userData.blinkDuration = 1.5; // 1.5 second glow
            
            // No displacement for enemy celebratory wave - keep segments in place
            pillar.userData.targetDisplacement = 0;
        }
        
        // Clear any existing individual blink systems to prevent secondary light waves
        for (let pillar of allWalls) {
            pillar.userData.blinkDelay = 0;
            pillar.userData.blinkTimer = 0;
        }
        
        // Start celebration - begin smooth transition to magenta
        this.isCelebrating = true;
        this.celebrationTimer = 2000; // 2.0 seconds celebration
        
        // Start smooth color transition to magenta
        this.undergroundLightTransition.active = true;
        this.undergroundLightTransition.progress = 0;
        this.undergroundLightTransition.direction = 1; // To magenta
        this.undergroundLightTransition.startColor = 0x6600cc; // From purple
        this.undergroundLightTransition.endColor = 0xFF00FF;   // To pure magenta
        
        log('🎉 Enemy celebratory wave triggered (towards enemy)!');
    }
    
    updateWallWaveAnimation(deltaTime) {
        if (!this.wallWaveAnimation.active) return;
        
        const elapsed = performance.now() - this.wallWaveAnimation.startTime;
        const progress = Math.min(elapsed / this.wallWaveAnimation.duration, 1.0);
        
        // Create wave motion - peaks in center, lower at ends
        const allWalls = [...this.leftWallCubes, ...this.rightWallCubes];
        
        for (let pillar of allWalls) {
            const originalHeight = this.wallWaveAnimation.originalHeights.get(pillar);
            if (!originalHeight) continue;
            
            // Calculate position along the wall (0 = enemy end, 1 = player end)
            const pillarZ = pillar.userData.zPosition || pillar.position.z;
            const wallLength = 38; // Total wall length (-19 to +19)
            const normalizedPos = (pillarZ + 19) / wallLength; // 0 to 1 (0=enemy, 1=player)
            
            // Wave direction based on waveDirection flag
            let waveDelay;
            if (this.wallWaveAnimation.waveDirection === 1) {
                // Player wave: travels from enemy end (z=-19) towards player end (z=+19)
            const distanceFromEnemy = Math.abs(pillarZ - (-19)); // Distance from enemy goal
                waveDelay = distanceFromEnemy * 0.05; // Delay based on distance
            } else {
                // Enemy wave: travels from player end (z=+19) towards enemy end (z=-19)
                const distanceFromPlayer = Math.abs(pillarZ - 19); // Distance from player goal
                waveDelay = distanceFromPlayer * 0.05; // Delay based on distance
            }
            
            // Calculate wave timing (wave reaches this pillar after delay)
            const waveProgress = Math.max(0, Math.min(1, (elapsed / 1000 - waveDelay) / 0.75)); // 0.75s wave duration
            
            // Keep original scale (no stretching) - just elevate the entire box upward
            pillar.scale.y = originalHeight; // Keep original shape intact
            
            // Pure vertical wave elevation: segments only move up and down
            let elevationAmount = 0;
            if (waveProgress > 0 && waveProgress < 1) {
                // Wave is passing through this pillar - simple sine wave
                const waveShape = this.cachedSin(waveProgress * Math.PI); // 0 to 1 to 0
                elevationAmount = waveShape * 2.25; // Rise up to 2.25 units maximum (50% higher than 1.5)
            }
            
            // ONLY change Y position - preserve exact original X and Z positions
            // Override any displacement from other systems during wave animation
            pillar.position.x = pillar.userData.originalX; // Keep original X position
            pillar.position.z = pillar.userData.zPosition; // Keep original Z position  
            pillar.position.y = elevationAmount; // Only change Y position
            
            // Clear any displacement targets to prevent interference
            pillar.userData.targetDisplacement = 0;
            
            // SYNC ILLUMINATION WITH PHYSICAL WAVE ELEVATION
            // Light intensity directly tied to how high the segment is elevated
            if (elevationAmount > 0) {
                // Segment is elevated - make it glow with wave colors
                const lightIntensity = Math.min(elevationAmount / 2.25, 1.0); // Normalize to 0-1 based on max elevation
                
                if (this.wallWaveAnimation.waveDirection === 1) {
                    // Player wave - cyan colors
                    pillar.material.color.setHex(0x00FEFC);
                    pillar.material.emissive.setHex(0x00FEFC);
                    pillar.material.emissiveIntensity = lightIntensity * 2.0; // Scale intensity
                } else {
                    // Enemy wave - magenta colors
                    pillar.material.color.setHex(0xFF00FF);
                    pillar.material.emissive.setHex(0xFF00FF);
                    pillar.material.emissiveIntensity = lightIntensity * 2.0; // Scale intensity
                }
                
                pillar.userData.peakEmissiveIntensity = lightIntensity * 2.0;
            } else {
                // Fade out emissive over 0.5s
                if (pillar.userData.peakEmissiveIntensity > 0) {
                    const fadeProgress_05s = Math.min((elapsed / 1000) * 2.0, 1.0); // 0.5s fade-out
                    const currentIntensity = pillar.userData.peakEmissiveIntensity * (1.0 - fadeProgress_05s);
                    if (currentIntensity > 0.01) {
                        // Keep wave colors with fading intensity
                        if (this.wallWaveAnimation.waveDirection === 1) {
                            pillar.material.color.setHex(0x00FEFC);
                            pillar.material.emissive.setHex(0x00FEFC);
                            pillar.material.emissiveIntensity = currentIntensity;
                        } else {
                            pillar.material.color.setHex(0xFF00FF);
                            pillar.material.emissive.setHex(0xFF00FF);
                            pillar.material.emissiveIntensity = currentIntensity;
                        }
                    } else {
                        // Fully faded - return to original colors
                        pillar.material.color.setHex(pillar.userData.originalColor || 0x666666);
                        pillar.material.emissive.setHex(pillar.userData.originalEmissive || 0x000000);
                        pillar.material.emissiveIntensity = pillar.userData.originalEmissiveIntensity || 0;
                        pillar.userData.peakEmissiveIntensity = 0;
                    }
                } else {
                    // No previous peak - return to original colors
                    pillar.material.color.setHex(pillar.userData.originalColor || 0x666666);
                    pillar.material.emissive.setHex(pillar.userData.originalEmissive || 0x000000);
                    pillar.material.emissiveIntensity = pillar.userData.originalEmissiveIntensity || 0;
                }
            }
        }
        
        // End animation when complete - let it fade out smoothly
        if (progress >= 1.0) {
            this.wallWaveAnimation.active = false;
            log('🌊 Wall wave animation complete - natural fade out!');
            
            // Clean up celebration light when wall waves finish
            if (this.celebrationLight && this.celebrationLightActive) {
                this.scene.remove(this.celebrationLight);
                this.celebrationLight = null;
                this.celebrationLightActive = false;
                log('✨ Celebration light cleaned up after wall waves finished');
            }
        }
    }
    
    initializePerformanceMode() {
        // Initialize to quality mode for full visual experience
        this.performanceMode = false;
        this.performanceSettings.renderScale = 1.0; // Full resolution
        this.performanceSettings.enableFisheye = true; // Full fisheye effect
        this.performanceSettings.enableBloom = true; // Full bloom effects
        this.performanceSettings.particleCount = 225; // Full particle count
        this.performanceSettings.shadowQuality = 'high'; // High quality shadows
        log('🎨 Game initialized in QUALITY mode (full visual experience)');
    }
    
    togglePerformanceMode() {
        this.performanceMode = !this.performanceMode;
        
        if (this.performanceMode) {
            // Performance mode: reduce quality for better FPS
            this.performanceSettings.renderScale = 0.5; // Half resolution
            this.performanceSettings.enableFisheye = false; // No fisheye
            this.performanceSettings.enableBloom = true; // Keep bloom but reduced quality
            this.performanceSettings.particleCount = 75; // Reduce particles more aggressively
            this.performanceSettings.shadowQuality = 'low'; // Lower shadow quality
            log('⚡ Performance mode: ENABLED (optimized for 60fps)');
        } else {
            // Quality mode: full visual effects
            this.performanceSettings.renderScale = 1.0; // Full resolution
            this.performanceSettings.enableFisheye = true; // Full fisheye
            this.performanceSettings.enableBloom = true; // Full bloom
            this.performanceSettings.particleCount = 225; // Full particles
            this.performanceSettings.shadowQuality = 'high'; // High shadow quality
            log('🎨 Quality mode: ENABLED (full visual effects)');
        }
        
        // Update render target sizes and shadow quality
        this.updateRenderTargetSizes();
        this.updateShadowQuality();
    }
    
    
    updateRenderTargetSizes() {
        const width = Math.floor(window.innerWidth * this.performanceSettings.renderScale);
        const height = Math.floor(window.innerHeight * this.performanceSettings.renderScale);
        
        if (this.bloomRenderTarget) {
            this.bloomRenderTarget.setSize(width, height);
        }
        if (this.fisheyeRenderTarget) {
            this.fisheyeRenderTarget.setSize(width, height);
        }
        if (this.lensFlareRenderTarget) {
            this.lensFlareRenderTarget.setSize(width, height);
        }
        if (this.rgbSplitRenderTarget) {
            this.rgbSplitRenderTarget.setSize(width, height);
        }
        if (this.blurRenderTarget) {
            this.blurRenderTarget.setSize(width, height);
        }
        
        // Update fisheye aspect ratio
        if (this.fisheyeMaterial) {
            this.fisheyeMaterial.uniforms.aspectRatio.value = width / height;
        }
    }
    
    updateShadowQuality() {
        if (this.performanceSettings.shadowQuality === 'low') {
            // Low quality shadows for performance mode
            this.renderer.shadowMap.type = THREE.BasicShadowMap;
            this.renderer.shadowMap.enabled = false; // Disable shadows entirely in performance mode
        } else {
            // High quality shadows for quality mode
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.shadowMap.enabled = true;
        }
        
        // Update ball light shadow quality (only if ballLights exists)
        if (this.ballLights && this.ballLights.length > 0) {
            for (let i = 0; i < this.ballLights.length; i++) {
                if (this.ballLights[i]) {
                    this.ballLights[i].castShadow = this.performanceSettings.shadowQuality === 'high';
                    if (this.ballLights[i].castShadow) {
                        this.ballLights[i].shadow.mapSize.width = 256; // 50% reduction from 512 to 256
                        this.ballLights[i].shadow.mapSize.height = 256; // 50% reduction from 512 to 256
                    }
                }
            }
        }
    }
    
    // Cached math functions for performance
    cachedSin(value) {
        const key = Math.round(value * 1000) / 1000; // Round to 3 decimal places
        if (this.mathCache.sin.has(key)) {
            return this.mathCache.sin.get(key);
        }
        const result = Math.sin(value);
        if (this.mathCache.sin.size < this.mathCache.maxCacheSize) {
            this.mathCache.sin.set(key, result);
        }
        return result;
    }
    
    cachedCos(value) {
        const key = Math.round(value * 1000) / 1000; // Round to 3 decimal places
        if (this.mathCache.cos.has(key)) {
            return this.mathCache.cos.get(key);
        }
        const result = Math.cos(value);
        if (this.mathCache.cos.size < this.mathCache.maxCacheSize) {
            this.mathCache.cos.set(key, result);
        }
        return result;
    }
    
    cachedSqrt(value) {
        const key = Math.round(value * 1000) / 1000; // Round to 3 decimal places
        if (this.mathCache.sqrt.has(key)) {
            return this.mathCache.sqrt.get(key);
        }
        const result = Math.sqrt(value);
        if (this.mathCache.sqrt.size < this.mathCache.maxCacheSize) {
            this.mathCache.sqrt.set(key, result);
        }
        return result;
    }
    
    cleanupMathCache() {
        const now = this.clock.getElapsedTime() * 1000;
        if (now - this.mathCache.lastCleanup > 10000) { // Cleanup every 10 seconds
            this.mathCache.sin.clear();
            this.mathCache.cos.clear();
            this.mathCache.sqrt.clear();
            this.mathCache.lastCleanup = now;
        }
    }

    clearAllTimeouts() {
        // Clear all active timeouts to prevent race conditions with timeScale resets
        for (let timeoutId of this.activeTimeouts) {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
        this.activeTimeouts = [];
        
        // Clear all active intervals to prevent background process accumulation
        for (let interval of this.activeIntervals) {
            if (interval.id) {
                clearInterval(interval.id);
            }
        }
        this.activeIntervals = [];
        
        // Also clear specific known timeouts
        if (this.comboTimeout) {
            clearTimeout(this.comboTimeout);
            this.comboTimeout = null;
        }
        if (this.trackNameTimeout) {
            clearTimeout(this.trackNameTimeout);
            this.trackNameTimeout = null;
        }
        
        log('🧹 All timeouts cleared to prevent timeScale interference');
    }
    
    forceNormalSpeed() {
        // Aggressive timeScale reset - call this whenever we need to ensure normal speed
        this.timeScale = 1.0;
        log('🚀 FORCED normal speed reset');
        
        // CRITICAL: Reset ball speed multiplier to ensure consistent ball speed
        this.ballSpeedMultiplier = 1.0;
        log('⚽ Ball speed multiplier reset to 1.0');
        
        // Clear any lingering effects
        this.goalBlinkTimer = 0;
        this.goalBlinkTarget = null;
        this.multiBallZoom.active = false;
    }
    
    initializeBallAntiStuck(ballIndex) {
        // Initialize anti-stuck tracking for a new ball
        this.ballCollisionCooldowns[ballIndex] = {
            wall: 0,
            paddle: 0,
            obstacle: 0
        };
        this.ballLastPositions[ballIndex] = { x: 0, z: 0 };
        this.ballStuckFrames[ballIndex] = 0;
    }
    
    isCollisionOnCooldown(ballIndex, collisionType) {
        // Check if this collision type is on cooldown for this ball
        return this.ballCollisionCooldowns[ballIndex][collisionType] > 0;
    }
    
    setCollisionCooldown(ballIndex, collisionType) {
        // Set cooldown for this collision type
        this.ballCollisionCooldowns[ballIndex][collisionType] = this.collisionCooldownTime;
    }
    
    updateCollisionCooldowns() {
        // Decrease all collision cooldowns
        for (let i = 0; i < this.ballCollisionCooldowns.length; i++) {
            const cooldowns = this.ballCollisionCooldowns[i];
            if (cooldowns) {
                cooldowns.wall = Math.max(0, cooldowns.wall - 1);
                cooldowns.paddle = Math.max(0, cooldowns.paddle - 1);
                cooldowns.obstacle = Math.max(0, cooldowns.obstacle - 1);
            }
        }
    }
    
    checkBallStuck(ballIndex, ball) {
        // Check if ball is stuck (not moving much)
        const lastPos = this.ballLastPositions[ballIndex];
        const currentPos = { x: ball.position.x, z: ball.position.z };
        
        const distance = Math.sqrt(
            (currentPos.x - lastPos.x) ** 2 + 
            (currentPos.z - lastPos.z) ** 2
        );
        
        if (distance < 0.1) { // Ball moved less than 0.1 units
            this.ballStuckFrames[ballIndex]++;
            
            if (this.ballStuckFrames[ballIndex] >= this.maxStuckFrames) {
                log(`🚨 Ball ${ballIndex} stuck for ${this.maxStuckFrames} frames - resetting!`);
                this.emergencyResetBall(ballIndex);
                return true;
            }
        } else {
            this.ballStuckFrames[ballIndex] = 0; // Reset stuck counter
        }
        
        this.ballLastPositions[ballIndex] = currentPos;
        return false;
    }
    
    emergencyResetBall(ballIndex) {
        // Emergency reset for stuck ball
        const ball = this.balls[ballIndex];
        const velocity = this.ballVelocities[ballIndex];
        
        if (!ball || !velocity) return;
        
        // Reset position to center
        ball.position.set(0, 0, 0);
        
        // Give ball strong velocity toward AI (away from player)
        velocity.x = (Math.random() - 0.5) * 0.1; // Small random X
        velocity.z = -this.baseBallSpeed * 1.5; // Strong toward AI
        
        // Reset anti-stuck tracking
        this.ballStuckFrames[ballIndex] = 0;
        this.ballLastPositions[ballIndex] = { x: 0, z: 0 };
        
        // Clear all cooldowns
        this.ballCollisionCooldowns[ballIndex] = {
            wall: 0,
            paddle: 0,
            obstacle: 0
        };
        
        log(`🔄 Emergency reset ball ${ballIndex} - unstuck!`);
    }
    
    performMemoryCleanse() {
        log('🧹 Starting light memory cleanse...');
        
        // ONLY clean up what's safe and necessary
        this.cleanupImpactEffects();
        this.clearAllTimeouts();
        
        log('✅ Light memory cleanse complete');
    }
    
    cleanupImpactEffects() {
        // AGGRESSIVE CLEANUP: Remove ALL impact particles and lights
        for (let i = this.impactParticles.length - 1; i >= 0; i--) {
            const particle = this.impactParticles[i];
            if (particle && this.scene) {
                this.scene.remove(particle);
            }
        }
        this.impactParticles = [];
        
        for (let i = this.impactLights.length - 1; i >= 0; i--) {
            const light = this.impactLights[i];
            if (light && this.scene) {
                this.scene.remove(light);
                // Dispose of materials to free GPU memory
                if (light.material) {
                    if (light.material.map) {
                        light.material.map.dispose();
                    }
                    light.material.dispose();
                }
            }
        }
        this.impactLights = [];
        
        // Clear wave lights too
        for (let i = this.waveLights.length - 1; i >= 0; i--) {
            const waveLight = this.waveLights[i];
            if (waveLight.light && this.scene) {
                this.scene.remove(waveLight.light);
            }
        }
        this.waveLights = [];
        
        log('🧹 AGGRESSIVE cleanup: All impact effects removed');
    }
    
    
    createFPSCounter() {
        // Create FPS counter element
        this.fpsCounter.element = document.createElement('div');
        this.fpsCounter.element.id = 'fps-counter';
        this.fpsCounter.element.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            color: #00FEFC;
            font-family: 'Terminal Grotesque', monospace;
            text-transform: uppercase;
            font-size: 19px;
            font-weight: bold;
            text-shadow: 0 0 10px #00FEFC;
            background: rgba(0, 0, 0, 0.7);
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #00FEFC;
            z-index: 1000;
            display: none;
        `;
        this.fpsCounter.element.textContent = 'FPS: 60';
        document.body.appendChild(this.fpsCounter.element);
        
        log('📊 FPS counter created');
    }
    
    toggleFPSCounter() {
        this.fpsCounter.visible = !this.fpsCounter.visible;
        if (this.fpsCounter.element) {
            this.fpsCounter.element.style.display = this.fpsCounter.visible ? 'block' : 'none';
        }
        log(`📊 FPS counter ${this.fpsCounter.visible ? 'shown' : 'hidden'}`);
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
                log('🖥️ Entered fullscreen mode');
            } else if (document.documentElement.webkitRequestFullscreen) {
                document.documentElement.webkitRequestFullscreen();
                log('🖥️ Entered fullscreen mode (webkit)');
            } else if (document.documentElement.msRequestFullscreen) {
                document.documentElement.msRequestFullscreen();
                log('🖥️ Entered fullscreen mode (ms)');
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
                log('🖥️ Exited fullscreen mode');
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
                log('🖥️ Exited fullscreen mode (webkit)');
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
                log('🖥️ Exited fullscreen mode (ms)');
            }
        }
    }
    
    updateFPSCounter() {
        this.fpsCounter.frameCount++;
        // Only call performance.now() when we need to update (every ~60 frames)
        if (this.fpsCounter.frameCount % 60 === 0) {
            const currentTime = performance.now();
            if (currentTime - this.fpsCounter.lastTime >= 1000) { // Update every second
            this.fpsCounter.fps = Math.round((this.fpsCounter.frameCount * 1000) / (currentTime - this.fpsCounter.lastTime));
            
            // Update display if visible
            if (this.fpsCounter.visible && this.fpsCounter.element) {
                const modeText = this.performanceMode ? ' [PERF]' : ' [QUALITY]';
                this.fpsCounter.element.textContent = `FPS: ${this.fpsCounter.fps}${modeText}`;
                
                // Color code based on FPS
                if (this.fpsCounter.fps >= 55) {
                    this.fpsCounter.element.style.color = '#00FEFC'; // Green - good
                } else if (this.fpsCounter.fps >= 30) {
                    this.fpsCounter.element.style.color = '#FFD700'; // Yellow - okay
                } else {
                    this.fpsCounter.element.style.color = '#FF4444'; // Red - poor
                }
            }
            
                // SMART MEMORY MANAGEMENT: Auto-cleanse based on FPS
                this.checkMemoryManagement(currentTime);
                
                this.fpsCounter.frameCount = 0;
                this.fpsCounter.lastTime = currentTime;
            }
        }
    }
    
    checkMemoryManagement(currentTime) {
        if (!this.memoryManagement.enabled) return;
        
        // Check if FPS is low
        if (this.fpsCounter.fps < this.memoryManagement.lowFpsThreshold) {
            this.memoryManagement.consecutiveLowFps++;
            
            // Trigger cleanse after consecutive low FPS readings
            if (this.memoryManagement.consecutiveLowFps >= this.memoryManagement.maxConsecutiveLowFps) {
                log(`🧹 Auto-memory cleanse triggered: FPS ${this.fpsCounter.fps} for ${this.memoryManagement.consecutiveLowFps} seconds`);
                this.performMemoryCleanse();
                this.memoryManagement.consecutiveLowFps = 0;
                this.memoryManagement.lastCleanse = currentTime;
            }
        } else {
            // Reset counter if FPS is good
            this.memoryManagement.consecutiveLowFps = 0;
        }
        
        // Periodic cleanse every 60 seconds
        if (currentTime - this.memoryManagement.lastCleanse >= this.memoryManagement.cleanseInterval) {
            log('🧹 Periodic memory cleanse triggered (60s interval)');
            this.performMemoryCleanse();
            this.memoryManagement.lastCleanse = currentTime;
        }
    }

    resetWallHeights() {
        // Reset all walls to their original heights
        const allWalls = [...this.leftWallCubes, ...this.rightWallCubes];
        for (let pillar of allWalls) {
            const originalHeight = this.wallWaveAnimation.originalHeights.get(pillar);
            if (originalHeight) {
                pillar.scale.y = originalHeight;
                pillar.position.y = (originalHeight - 1) * 0.5;
            }
        }
        log('🏗️ Wall heights reset to normal');
    }
    
    spawnBonusCube() {
        // Don't spawn if one already exists
        if (this.bonusCubeActive || this.bonusCube) {
            return;
        }
        
        // Play bonus appear sound
        log('🎵 Playing bonus appear sound...');
        this.playSound('bonusAppear');
        
        // Filter floor tiles to only playable arena area
        // Exclude tiles near walls (X) and behind players (Z)
        const validTiles = this.floorCubes.filter(cube => {
            const x = cube.position.x;
            const z = cube.position.z;
            // Keep tiles in central play area only
            // X: -10 to 10 (away from walls at ±11.5)
            // Z: -12 to 12 (not behind players at ±15)
            return Math.abs(x) < 10 && Math.abs(z) < 12;
        });
        
        // Choose random valid tile
        const randomTile = validTiles[Math.floor(Math.random() * validTiles.length)];
        
        // Create spinning icosahedron - strong orange/yellow!
        const cubeGeometry = new THREE.IcosahedronGeometry(1.2, 0);
        const cubeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                baseColor: { value: new THREE.Color(0xFF8C00) }, // Strong orange/yellow!
                emissiveIntensity: { value: 15.0 }, // Increased for better CRT glow
                opacity: { value: 1.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 baseColor;
                uniform float emissiveIntensity;
                uniform float opacity;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    // Animated gradient moving downwards quickly
                    float gradient = fract(vUv.y * 3.0 - time * 2.0);
                    
                    // Create striped pattern
                    float stripes = smoothstep(0.3, 0.7, gradient);
                    
                    // Pulsing intensity
                    float pulse = 0.8 + 0.2 * sin(time * 3.0);
                    
                    // Combine effects
                    vec3 color = baseColor * (stripes * 0.5 + 0.5) * pulse;
                    
                    gl_FragColor = vec4(color * emissiveIntensity, opacity);
                }
            `,
            transparent: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        this.bonusCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        this.bonusCube.position.set(
            randomTile.position.x,
            randomTile.position.y + 1.2, // Slightly elevated above tile
            randomTile.position.z
        );
        
        // Store shader reference and base position for animation
        this.bonusCube.userData.material = cubeMaterial;
        this.bonusCube.userData.baseY = randomTile.position.y + 1.2; // Store base Y for swaying
        
        // Blink animation on spawn
        this.bonusCube.userData.blinkTimer = 0;
        this.bonusCube.userData.blinkDuration = 0.5; // Quick blink
        this.bonusCube.scale.set(0.5, 0.5, 0.5); // Start small
        
        // Mark as active
        this.bonusCubeActive = true;
        
        // Add ambient orange/yellow light to illuminate the spinning bonus
        this.bonusCube.userData.ambientLight = new THREE.PointLight(0xFF8C00, 3.0, 12);
        this.bonusCube.userData.ambientLight.position.copy(this.bonusCube.position);
        this.bonusCube.userData.ambientLight.castShadow = false;
        this.scene.add(this.bonusCube.userData.ambientLight);
        
        this.scene.add(this.bonusCube);
        
        // Create highlight particles around the bonus cube
        this.createItemHighlightParticles(this.bonusCube.position, { r: 1.0, g: 1.0, b: 0.0 }, 2.0);
        
        // Play bonus spawn sound
        this.playSound('bonusSpawn');
        
        log('🟢 BONUS CUBE SPAWNED!');
    }
    
    checkBonusCubeCollision() {
        if (!this.bonusCube || !this.bonusCubeActive || this.bonusCubeFlickerActive) return;
        
        // Check all balls for collision with bonus cube
        for (let i = 0; i < this.balls.length; i++) {
            const ball = this.balls[i];
            const distance = ball.position.distanceTo(this.bonusCube.position);
            
            // Collision detected!
            if (distance < 1.5) {
                // Check who hit it based on this specific ball's ownership
                log(`🎯 Bonus collision: Ball ${i} owner = ${this.ballOwners[i]}`);
                if (this.ballOwners[i] === 'player') {
                    log('✅ Player gets bonus!');
                    
                    // Prevent multiple triggers by immediately deactivating
                    this.bonusCubeActive = false;
                    
                    this.triggerBonus();
                    // this.triggerRGBSplitBonus(); // RGB split effect for bonus pickup! - COMMENTED OUT
                    // Remove bonus cube immediately on player hit
                    // Remove ambient light
                    if (this.bonusCube.userData.ambientLight) {
                        this.scene.remove(this.bonusCube.userData.ambientLight);
                    }
                    this.scene.remove(this.bonusCube);
                    this.bonusCube = null;
                    this.bonusCubeActive = false;
                    // Remove any existing bonus light
                    if (this.bonusLight && this.bonusLight.light) {
                        this.scene.remove(this.bonusLight.light);
                        this.bonusLight = null;
                    }
                } else {
                    log('❌ AI gets bonus denied!');
                    
                    // Prevent multiple triggers by immediately deactivating
                    this.bonusCubeActive = false;
                    
                    this.triggerBonusLoss();
                    // Start flicker animation (cube removed after flicker)
                }
                return;
            }
        }
    }
    
    triggerBonus() {
        log('🎁 BONUS COLLECTED BY PLAYER!');
        
        // Play success sound
        this.playSound('multiBall'); // Nice uplifting sound!
        
        // Trigger yellow particle color shift for bonus pickup
        this.boostParticleOpacity('bonus');
        
        // Fade out highlight particles when bonus is picked up
        this.fadeOutItemHighlightParticles(800);
        
        // Flash yellow vignette for bonus pickup (CSS animation handles fade-out)
        const vignette = document.getElementById('vignette');
        vignette.classList.add('bonus');
        setTimeout(() => {
            vignette.classList.remove('bonus');
        }, 1200);
        
        // Flash underground light orange for bonus pickup
        if (this.undergroundLight) {
            const originalColor = this.undergroundLight.color.clone();
            const originalIntensity = this.undergroundLight.intensity;
            
            // Flash to orange
            this.undergroundLight.color.setHex(0xFF6600); // Orange
            this.undergroundLight.intensity = originalIntensity * 1.5; // Boost intensity briefly
            
            // Start smooth transition back to purple after 1200ms (when vignette ends)
            setTimeout(() => {
                if (this.undergroundLight) {
                    this.startUndergroundLightTransition(0xFF6600, 0x6600cc, originalIntensity, 1200);
                }
            }, 1200);
        }
        
        // Show 2X WIDTH text
        this.showBonusText();
        
        // Spawn orange point light at bonus position
        const bonusLight = new THREE.PointLight(0xFF8C00, 8.0, 15);
        bonusLight.position.copy(this.bonusCube.position);
        bonusLight.castShadow = false;
        this.scene.add(bonusLight);
        
        // Store light for blinking animation
        this.bonusLight = {
            light: bonusLight,
            startTime: performance.now(),
            duration: 2000, // 2 seconds
            active: true
        };
        
        // Keep original green paddle - just focus on width expansion
        // (Golden transformation removed - keeping original working system)
        
        // BONUS EFFECT: 2x Paddle Width for 5 seconds!
        this.bonusActivePaddle = this.paddle1; // Player paddle
        this.bonusTimer = this.bonusDuration;
        this.paddleWidthTransition = 0; // Start transition
        
        log('✨ PLAYER PADDLE WIDENING!');
    }
    
    triggerBonusLoss() {
        log('💀 ENEMY HIT BONUS - Red flicker then disappear!');
        
        // Play denied sound
        this.playSound('bonusDenied');
        
        // Change highlight particles to red when bonus is denied
        this.setItemHighlightColor({ r: 1.0, g: 0.0, b: 0.0 }); // Red
        
        // Spawn red point light at bonus position
        const bonusLight = new THREE.PointLight(0xff0000, 8.0, 15);
        bonusLight.position.copy(this.bonusCube.position);
        bonusLight.castShadow = false;
        this.scene.add(bonusLight);
        
        // Store light for blinking animation
        this.bonusLight = {
            light: bonusLight,
            startTime: performance.now(),
            duration: 1000, // 1 second - match cube flicker duration
            active: true
        };
        
        // Start red flicker animation immediately
        this.bonusCubeFlickerActive = true;
        this.bonusCubeFlickerTimer = 0;
        
        // Force immediate first frame of flicker animation
        this.updateBonusCube(0);
        
        // Enemy gets nothing - cube just flickers and disappears
    }
    
    showBonusText() {
        // Use message queue system to prevent overlapping
        this.queueMessage('2X WIDTH', 1200, 'bonus');
    }
    
    updateParticles() {
        if (!this.particles || this.isPaused) return;
        
        const positions = this.particles.geometry.attributes.position.array;
        const time = this.clock.getElapsedTime();
        
        // OPTIMIZED: Dynamic update frequency based on performance mode
        if (!this._particleUpdateFrame) this._particleUpdateFrame = 0;
        this._particleUpdateFrame++;
        const updateFrequency = this.performanceMode ? 6 : 3; // Update every 6th frame in performance mode (more aggressive)
        const skipFrame = this._particleUpdateFrame % updateFrequency !== 0;
        
        if (skipFrame) return; // Skip entire update for 2 out of 3 frames
        
        // Simple floating animation - use cached math for performance
        const globalFloat = this.cachedSin(time * 0.5) * 0.001; // One calculation for all particles
        
        for (let i = 0; i < this.particleOriginalPositions.length; i++) {
            const idx = i * 3;
            
            // Apply gentle floating motion (same for all particles)
            positions[idx + 1] += globalFloat;
            
            // Reset position if it drifts too far
            const originalY = this.particleOriginalPositions[i].y;
            if (Math.abs(positions[idx + 1] - originalY) > 2) {
                positions[idx + 1] = originalY;
            }
        }
        
        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.rotation.y += 0.0003; // Slower rotation for subtlety
    }
    
    updateFloorGlow() {
        // OPTIMIZED: Spatial grid system - 95% performance improvement!
        if (!this.floorCubes || this.floorCubes.length === 0) return;
        
        // Skip floor glow in performance mode for better FPS
        if (this.performanceMode) return;
        
        // MODERATE FRAME SKIPPING: Only update every 2nd frame for smoother animation
        if (!this._floorGlowFrame) this._floorGlowFrame = 0;
        this._floorGlowFrame++;
        if (this._floorGlowFrame % 2 !== 0) return;
        
        const maxElevation = 4.5; // Maximum dramatic elevation! Highest floor tiles
        const activationRadius = 4.5; // LARGER magnetic field (was 2.5)
        const activationRadiusSq = activationRadius * activationRadius; // Cache squared radius
        const easeSpeed = 0.06; // Slightly slower return for smoother feel
        
        // Mark all cubes as not active this frame
        for (let j = 0; j < this.floorCubes.length; j++) {
            this.floorCubes[j].userData.activeThisFrame = false;
        }
        
        // Check each ball using spatial grid optimization
        for (let i = 0; i < this.balls.length; i++) {
            const ball = this.balls[i];
            const bx = ball.position.x;
            const bz = ball.position.z;
            
            // Calculate which grid cells the ball affects
            const ballGridX = Math.floor(bx / this.gridSize);
            const ballGridZ = Math.floor(bz / this.gridSize);
            
            // Check 3x3 grid around ball (only 9 cells instead of all cubes!)
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const cellKey = `${ballGridX + dx},${ballGridZ + dz}`;
                    const cubesInCell = this.floorGlowGrid.get(cellKey);
                    
                    if (!cubesInCell) continue; // No cubes in this cell
                    
                    // Check each cube in this cell
                    for (let cube of cubesInCell) {
                        const cx = cube.position.x;
                        const cz = cube.position.z;
                        
                        // Quick bounding box test first (cheaper than distance)
                        const dx_actual = bx - cx;
                        const dz_actual = bz - cz;
                        if (Math.abs(dx_actual) > activationRadius || Math.abs(dz_actual) > activationRadius) continue;
                        
                        // Calculate distance squared (avoid sqrt when possible)
                        const distanceSq = dx_actual * dx_actual + dz_actual * dz_actual;
                        
                        // If ball is close enough, activate this cube with gradient
                        if (distanceSq < activationRadiusSq) {
                            cube.userData.activeThisFrame = true;
                            
                            // Only calculate sqrt when we need it
                            const distance = Math.sqrt(distanceSq);
                            const intensity = 1.0 - (distance / activationRadius);
                            const elevation = maxElevation * intensity;
                            
                            cube.userData.targetY = cube.userData.originalY + elevation;
                        }
                    }
                }
            }
        }
        
        // Ease all cubes back to their original state
        for (let j = 0; j < this.floorCubes.length; j++) {
            const cube = this.floorCubes[j];
            if (!cube.userData.activeThisFrame) {
                cube.userData.targetY = cube.userData.originalY;
            }
            
            // Smooth elevation animation
            const currentY = cube.position.y;
            const targetY = cube.userData.targetY;
            cube.position.y += (targetY - currentY) * easeSpeed;
        }
    }
    
    updateObstacles() {
        if (!this.gameStarted || this.isPaused || !this.floorCubes || this.floorCubes.length === 0) return;
        
        const deltaTime = this.clock.getDelta();
        
        // Timer for spawning new obstacles
        this.obstacleTimer += deltaTime;
        
        // Spawn new obstacle if it's time and no active obstacle
        if (this.obstacleTimer >= this.obstacleInterval && !this.activeObstacle) {
            this.spawnRandomObstacle();
            this.obstacleTimer = 0;
        }
        
        // Update active obstacle
        if (this.activeObstacle) {
            this.activeObstacle.lifetime += deltaTime;
            
            const cube = this.activeObstacle.cube;
            const targetHeight = this.obstacleHeight / 2 - 2; // Center at wall height
            
            // Rising phase (first 0.5 seconds)
            if (this.activeObstacle.lifetime < 0.5) {
                const riseProgress = this.activeObstacle.lifetime / 0.5;
                const easeOut = 1 - Math.pow(1 - riseProgress, 3);
                cube.position.y = cube.userData.originalY + (targetHeight - cube.userData.originalY) * easeOut;
                
                // Scale height up as it rises
                const heightScale = 1 + (29 * easeOut); // From 0.2 to 6 height (30x)
                cube.scale.y = heightScale;
                
                // Make it BRIGHT RED!
                cube.material.color.setHex(0xff0033);
                cube.material.emissive.setHex(0xff0033);
                cube.material.emissiveIntensity = riseProgress * 1.5; // Brighter!
            }
            // Staying up phase
            else if (this.activeObstacle.lifetime < this.obstacleDuration) {
                cube.position.y = targetHeight;
                cube.scale.y = 30; // Full height
                cube.material.color.setHex(0xff0033); // Bright RED base
                cube.material.emissive.setHex(0xff0033); // Keep it RED
                // Pulsing red glow while up (more intense)
                const pulse = Math.sin(this.activeObstacle.lifetime * 3) * 0.3 + 1.0;
                cube.material.emissiveIntensity = pulse;
            }
            // Lowering phase (last 0.5 seconds)
            else if (this.activeObstacle.lifetime < this.obstacleDuration + 0.5) {
                const lowerProgress = (this.activeObstacle.lifetime - this.obstacleDuration) / 0.5;
                const easeIn = Math.pow(lowerProgress, 3);
                cube.position.y = targetHeight + (cube.userData.originalY - targetHeight) * easeIn;
                
                // Scale height down as it lowers
                const heightScale = 30 - (29 * easeIn); // From 6 back to 0.2 height
                cube.scale.y = heightScale;
                
                cube.material.emissive.setHex(0xff0033); // Stay RED while lowering
                // Fade out red light
                cube.material.emissiveIntensity = (1 - lowerProgress) * 0.8;
            }
            // Remove obstacle
            else {
                cube.position.y = cube.userData.originalY;
                cube.scale.y = 1; // Reset scale
                cube.material.color.setHex(cube.userData.originalColor); // Reset base color
                cube.material.emissive.setHex(cube.userData.originalEmissive);
                cube.material.emissiveIntensity = cube.userData.originalEmissiveIntensity;
                this.activeObstacle = null;
            }
        }
    }
    
    spawnRandomObstacle() {
        // Only spawn in the play area (center of the floor)
        const playAreaCubes = this.floorCubes.filter(cube => {
            return Math.abs(cube.position.x) < 8 && Math.abs(cube.position.z) < 12;
        });
        
        if (playAreaCubes.length === 0) return;
        
        // Pick random cube
        const randomCube = playAreaCubes[Math.floor(Math.random() * playAreaCubes.length)];
        
        this.activeObstacle = {
            cube: randomCube,
            lifetime: 0
        };
        
        // Make it VERY visible - change base color too
        randomCube.material.color.setHex(0xff0033);
        
        log('🔴 RED OBSTACLE SPAWNED at:', randomCube.position.x, randomCube.position.z);
    }
    
    updatePlayerPaddle() {
        if (this.isPaused || this.isGameFrozen) return;
        
        // Store previous position for tilt calculation
        const previousX = this.paddle1.position.x;
        
        
        // Calculate paddle half-width (accounts for bonus effect)
        const scaleFactor = 1.0 + (this.bonusActivePaddle === this.paddle1 ? this.paddleWidthTransition : 0);
        const paddleHalfWidth = 2.5 * scaleFactor; // Normal: 2.5, Bonus: 5.0
        
        // Wall boundaries (walls are at ±11.5)
        const wallPosition = 11.5;
        const maxX = wallPosition - paddleHalfWidth; // Dynamic based on paddle width
        const minX = -(wallPosition - paddleHalfWidth);
        
        // Player controls (A/D or Arrow keys) - apply timeScale for slow motion
        if ((this.keys['a'] || this.keys['arrowleft']) && this.paddle1.position.x > minX) {
            this.paddle1.position.x -= this.paddleSpeed * this.timeScale;
            // Clamp to prevent wall intersection
            this.paddle1.position.x = Math.max(this.paddle1.position.x, minX);
        }
        if ((this.keys['d'] || this.keys['arrowright']) && this.paddle1.position.x < maxX) {
            this.paddle1.position.x += this.paddleSpeed * this.timeScale;
            // Clamp to prevent wall intersection
            this.paddle1.position.x = Math.min(this.paddle1.position.x, maxX);
        }
        
        
        // Calculate paddle velocity for camera tilt
        const paddleVelocity = this.paddle1.position.x - previousX;
        
        // Detect if keyboard input is being used (binary on/off)
        const isKeyboardInput = (this.keys['a'] || this.keys['arrowleft'] || this.keys['d'] || this.keys['arrowright']);
        
        // Calculate target tilt based on paddle movement (increased for more noticeable effect)
        let targetTilt = paddleVelocity * -0.3; // Doubled intensity (was -0.15)
        
        // Apply keyboard smoothing for gradual ramp-up/ramp-down
        if (isKeyboardInput && Math.abs(paddleVelocity) > 0.001) {
            // Keyboard input detected - use smooth ramp-up system
            const targetVelocity = Math.sign(paddleVelocity) * this.maxKeyboardTiltVelocity;
            this.keyboardTiltVelocity += (targetVelocity - this.keyboardTiltVelocity) * this.keyboardTiltAcceleration;
            targetTilt = this.keyboardTiltVelocity * -0.94; // Scale to match gamepad intensity (75% reduction)
        } else {
            // No keyboard input - ramp down smoothly
            this.keyboardTiltVelocity *= this.keyboardTiltDecay;
            if (Math.abs(this.keyboardTiltVelocity) < 0.001) {
                this.keyboardTiltVelocity = 0;
            }
            targetTilt = this.keyboardTiltVelocity * -0.94; // Continue with smoothed velocity (75% reduction)
        }
        
        // Add mouse tilt to the camera tilt calculation
        if (this.mouseControlsEnabled && Math.abs(this.mouseTiltVelocity) > 0.001) {
            targetTilt += this.mouseTiltVelocity * -0.8; // Mouse tilt contribution (negative for natural feel)
        }
        
        // Smoothly interpolate to target tilt
        this.cameraTilt += (targetTilt - this.cameraTilt) * this.cameraTiltSmooth;
        
        // Target camera look offset based on paddle position
        const targetLookOffset = this.paddle1.position.x * 0.4; // Camera looks in paddle direction
        
        // Smoothly interpolate camera look
        this.cameraLookOffset += (targetLookOffset - this.cameraLookOffset) * this.cameraLookSmooth;
        
        // Apply paddle pushback (HEAVY weighty impact feel)
        if (this.paddle1Pushback > 0) {
            this.paddle1.position.z = 15 + this.paddle1Pushback; // Base position + pushback
            // VERY slow ease back for maximum weight (takes ~3 seconds)
            this.paddle1Pushback *= 0.96; // Even slower decay (was 0.97)
            if (this.paddle1Pushback < 0.005) {
                this.paddle1Pushback = 0;
                this.paddle1.position.z = 15; // Reset to exact position
            }
        }
    }
    
    updateAIPaddle() {
        if (!this.gameStarted || this.isPaused || this.isGameFrozen || this.balls.length === 0) return;
        
        // Store previous position for tilt calculation
        const previousX = this.paddle2.position.x;
        
        
        // Track closest ball moving towards AI
        let closestBall = null;
        let closestDist = Infinity;
        
        for (let i = 0; i < this.balls.length; i++) {
            if (this.ballVelocities[i].z < 0) { // Moving towards AI
                const dist = Math.abs(this.balls[i].position.z + 15);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestBall = this.balls[i];
                }
            }
        }
        
        if (!closestBall && this.balls.length > 0) {
            closestBall = this.balls[0]; // Default to first ball
        }
        
        if (!closestBall) return;
        
        // AI logic
        const targetX = closestBall.position.x;
        const currentX = this.paddle2.position.x;
        
        const error = (Math.random() - 0.5) * (1 - this.aiDifficulty) * 2;
        const targetWithError = targetX + error;
        
        // Calculate AI paddle half-width (always normal width - no bonus for AI)
        const paddleHalfWidth = 2.5; // AI paddle is always normal size
        
        // Wall boundaries (walls are at ±11.5)
        const wallPosition = 11.5;
        const maxX = wallPosition - paddleHalfWidth; // = 9.0
        const minX = -(wallPosition - paddleHalfWidth); // = -9.0
        
        // Move towards target (apply timeScale for slow motion)
            if (currentX < targetWithError - 0.5 && this.paddle2.position.x < maxX) {
                this.paddle2.position.x += this.aiSpeed * this.timeScale;
                // Clamp to prevent wall intersection
                this.paddle2.position.x = Math.min(this.paddle2.position.x, maxX);
            } else if (currentX > targetWithError + 0.5 && this.paddle2.position.x > minX) {
                this.paddle2.position.x -= this.aiSpeed * this.timeScale;
                // Clamp to prevent wall intersection
                this.paddle2.position.x = Math.max(this.paddle2.position.x, minX);
            }
        
        
        // Calculate paddle velocity for tilt
        const paddleVelocity = this.paddle2.position.x - previousX;
        
        // Apply paddle pushback (HEAVY weighty impact feel)
        if (this.paddle2Pushback > 0) {
            this.paddle2.position.z = -15 - this.paddle2Pushback; // Base position - pushback (opposite direction)
            // VERY slow ease back for maximum weight (takes ~3 seconds)
            this.paddle2Pushback *= 0.96; // Even slower decay (was 0.97)
            if (this.paddle2Pushback < 0.005) {
                this.paddle2Pushback = 0;
                this.paddle2.position.z = -15; // Reset to exact position
            }
        }
    }
    
    updateBall() {
        if (!this.gameStarted || this.isPaused || this.isGameFrozen) return;
        
        // Frame skipping for collision detection in performance mode
        if (this.performanceMode) {
            this._ballUpdateFrame = (this._ballUpdateFrame || 0) + 1;
            if (this._ballUpdateFrame % 2 !== 0) {
                // Skip collision detection every other frame in performance mode
                // Still update ball positions and lights
                for (let i = 0; i < this.balls.length; i++) {
                    const ball = this.balls[i];
                    const velocity = this.ballVelocities[i];
                    ball.position.x += velocity.x * this.timeScale;
                    ball.position.z += velocity.z * this.timeScale;
                }
                
                // Update ball lights
                for (let i = 0; i < this.balls.length && i < this.ballLights.length; i++) {
                    if (this.ballLights[i]) {
                        // Ensure light is in scene and has proper intensity
                        if (!this.scene.children.includes(this.ballLights[i])) {
                            this.scene.add(this.ballLights[i]);
                            log(`💡 Re-added missing ball light ${i} to scene during performance update`);
                        }
                        if (this.ballLights[i].intensity === 0) {
                            this.ballLights[i].intensity = 0.15;
                            log(`💡 Restored ball light ${i} intensity during performance update`);
                        }
                    this.ballLights[i].position.copy(this.balls[i].position);
                    this.ballLights[i].position.y += 2;
                    }
                }
                return;
            }
        }
        
        // Update trail every frame (keep smooth for gameplay)
        this.updateTrail();
        
        // Update ball lights to follow their respective balls
        for (let i = 0; i < this.balls.length && i < this.ballLights.length; i++) {
            if (this.ballLights[i]) {
                // Ensure light is in scene and has proper intensity
                if (!this.scene.children.includes(this.ballLights[i])) {
                    this.scene.add(this.ballLights[i]);
                    log(`💡 Re-added missing ball light ${i} to scene during update`);
                }
                if (this.ballLights[i].intensity === 0) {
                    this.ballLights[i].intensity = 0.15;
                    log(`💡 Restored ball light ${i} intensity during update`);
                }
            this.ballLights[i].position.copy(this.balls[i].position);
            this.ballLights[i].position.y += 2;
            }
        }
        
        // Update spatial audio volume based on distance to player
        for (let i = 0; i < this.balls.length && i < this.ballSounds.length; i++) {
            const ball = this.balls[i];
            const sound = this.ballSounds[i];
            
            if (sound && ball) {
                // Calculate distance from ball to player paddle (z-axis)
                const distanceToPlayer = Math.abs(ball.position.z - this.paddle1.position.z);
                
                // Map distance to volume: closer = louder
                // Max distance = 30 (full field), Min distance = 0
                const maxDistance = 30;
                const minDistance = 0;
                
                // Inverse square falloff for more realistic spatial audio
                const normalizedDist = Math.max(0, Math.min(1, distanceToPlayer / maxDistance));
                const falloff = 1 - (normalizedDist * normalizedDist);
                
                // Volume range: 0.05 (far) to 0.5 (very close)
                sound.volume = 0.05 + (falloff * 0.45);
            }
        }
        
        // Track balls that scored (to remove after loop)
        const ballsToRemove = [];
        
        // Multi-ball spawn flag (prevent multiple spawns in same frame)
        let multiBallSpawnedThisFrame = false;
        
        // Cache paddle positions (avoid repeated property lookups)
        const paddle1X = this.paddle1.position.x;
        const paddle1Z = this.paddle1.position.z;
        const paddle2X = this.paddle2.position.x;
        const paddle2Z = this.paddle2.position.z;
        
        // Update collision cooldowns
        this.updateCollisionCooldowns();
        
        // Update each ball
        for (let i = 0; i < this.balls.length; i++) {
            const ball = this.balls[i];
            const velocity = this.ballVelocities[i];
            
            // Check if ball is stuck (before moving)
            if (this.checkBallStuck(i, ball)) {
                continue; // Skip this ball if it was reset
            }
            
            // Move ball (apply timeScale for slow motion effects!)
            ball.position.x += velocity.x * this.timeScale;
            ball.position.z += velocity.z * this.timeScale;
            
            // BONUS CUBE COLLISION CHECK
            this.checkBonusCubeCollision();
        
        // Wall collisions - ANTI-STUCK system prevents sound/effect spam
            if (ball.position.x <= -11.5 && !this.isCollisionOnCooldown(i, 'wall')) {
                // Set cooldown to prevent rapid-fire collisions
                this.setCollisionCooldown(i, 'wall');
                
                velocity.x = Math.abs(velocity.x); // Force positive (bounce right)
                ball.position.x = -11.5; // Push ball back to exact wall boundary
                
                // ENHANCED ANTI-STUCK: Stronger randomness to break shallow angles
                velocity.z += (Math.random() - 0.5) * 0.08; // Doubled randomness
                
                // ENHANCED ANTI-STUCK: Enforce stronger minimum Z velocity
                const minZVelocity = 0.12; // Increased from 0.08
                if (Math.abs(velocity.z) < minZVelocity) {
                    velocity.z = velocity.z > 0 ? minZVelocity : -minZVelocity;
                }
                
                // Trigger effects only once per cooldown period
                this.triggerCameraShake(0.4, false, false, -1);
                this.triggerWallBlink(this.leftWallCubes, ball.position.z);
                this.triggerRumble(0.2, 80);
                this.createImpactEffect(ball.position.clone(), 0x00FEFC);
                this.worldLightBoost = 12.0;
                this.playStereoWallHit('left');
                this.triggerLensFlare();
                
                // Record collision for stuck ball detection
                this.recordBallCollision(ball.position.clone());
            }
        
            if (ball.position.x >= 11.5 && !this.isCollisionOnCooldown(i, 'wall')) {
                // Set cooldown to prevent rapid-fire collisions
                this.setCollisionCooldown(i, 'wall');
                
                velocity.x = -Math.abs(velocity.x); // Force negative (bounce left)
                ball.position.x = 11.5; // Push ball back to wall boundary
                
                // ENHANCED ANTI-STUCK: Stronger randomness to break shallow angles
                velocity.z += (Math.random() - 0.5) * 0.08; // Doubled randomness
                
                // ENHANCED ANTI-STUCK: Enforce stronger minimum Z velocity
                const minZVelocity = 0.12; // Increased from 0.08
                if (Math.abs(velocity.z) < minZVelocity) {
                    velocity.z = velocity.z > 0 ? minZVelocity : -minZVelocity;
                }
                
                // Trigger effects only once per cooldown period
                this.triggerCameraShake(0.4, false, false, 1);
                this.triggerWallBlink(this.rightWallCubes, ball.position.z);
                this.triggerRumble(0.2, 80);
                this.createImpactEffect(ball.position.clone(), 0x00FEFC);
                this.worldLightBoost = 12.0;
                this.playStereoWallHit('right');
                this.triggerLensFlare();
                
                // Record collision for stuck ball detection
                this.recordBallCollision(ball.position.clone());
            }
        
            // Obstacle collision (raised floor tile)
            if (this.activeObstacle && this.activeObstacle.lifetime > 0.5) {
                const obstacleCube = this.activeObstacle.cube;
                const cubeSize = 1.8;
                
                // Check if ball is within obstacle bounds (3D collision)
                const dx = Math.abs(ball.position.x - obstacleCube.position.x);
                const dy = Math.abs(ball.position.y - obstacleCube.position.y);
                const dz = Math.abs(ball.position.z - obstacleCube.position.z);
                
                const collisionRadius = 0.5; // Ball radius
                const halfCubeSize = cubeSize / 2;
                const halfHeight = this.obstacleHeight / 2;
                
                // AABB collision detection
                if (dx < halfCubeSize + collisionRadius && 
                    dz < halfCubeSize + collisionRadius &&
                    dy < halfHeight + collisionRadius) {
                    
                    // Determine which face was hit
                    const overlapX = (halfCubeSize + collisionRadius) - dx;
                    const overlapZ = (halfCubeSize + collisionRadius) - dz;
                    
                    // Bounce based on smallest overlap (hit that face)
                    if (overlapX < overlapZ) {
                        // Hit left/right face
                        velocity.x *= -1;
                        ball.position.x += velocity.x > 0 ? 1 : -1; // Push out
                        
                        // ANTI-STUCK: Enforce minimum Z velocity
                        const minZVelocity = 0.08;
                        if (Math.abs(velocity.z) < minZVelocity) {
                            velocity.z = velocity.z > 0 ? minZVelocity : -minZVelocity;
                        }
                    } else {
                        // Hit front/back face
                        velocity.z *= -1;
                        ball.position.z += velocity.z > 0 ? 1 : -1; // Push out
                        
                        // ANTI-STUCK: Enforce minimum X velocity
                        const minXVelocity = 0.08;
                        if (Math.abs(velocity.x) < minXVelocity) {
                            velocity.x = velocity.x > 0 ? minXVelocity : -minXVelocity;
                        }
                    }
                    
                    // Visual/audio feedback
                    this.triggerCameraShake(0.6, false, false);
                    this.triggerRumble(0.3, 100);
                    this.createImpactEffect(ball.position.clone(), 0xff0033); // RED impact!
                    this.worldLightBoost = 15.0;
                    this.playStereoWallHit('left');
                    this.triggerLensFlare(); // Lens flare on obstacle impact!
                    this.boostParticleOpacity(); // Boost particles on obstacle impact
                    
                    // Flash the obstacle BRIGHT RED
                    obstacleCube.material.emissiveIntensity = 1.2;
                }
        }
        
        // Player paddle collision (bottom) - ANTI-STUCK system
            // Calculate paddle width (accounts for bonus effect)
            const paddle1HalfWidth = 2.5 * (1.0 + (this.bonusActivePaddle === this.paddle1 ? this.paddleWidthTransition : 0));
            if (ball.position.z >= 14.5 && 
                Math.abs(ball.position.x - paddle1X) < paddle1HalfWidth &&
                !this.isCollisionOnCooldown(i, 'paddle') &&
                !this.collisionDisabled) {
                
                // Set cooldown to prevent rapid-fire collisions
                this.setCollisionCooldown(i, 'paddle');
                
                // Increase ball speed multiplier
                this.ballSpeedMultiplier *= 1.05;
                velocity.z *= -1.05;
                velocity.x += (ball.position.x - paddle1X) * 0.1;
                
                // ENHANCED ANTI-STUCK: Add randomness to break shallow angles
                velocity.x += (Math.random() - 0.5) * 0.06;
                this.triggerCameraShake(0.8, true, true);
            this.triggerPaddleBlink(this.paddle1, 'paddle1');
                this.triggerRumble(0.4, 120);
                this.createImpactEffect(ball.position.clone(), 0x00FEFC); // Lime green
                this.playSound('paddleHit');
                this.boostParticleOpacity('player'); // Boost particles on player paddle hit
                
                // Update ball ownership to player
                this.ballOwners[i] = 'player';
                
                // Record collision for stuck ball detection
                this.recordBallCollision(ball.position.clone());
                
                // Paddle pushback!
                this.paddle1Pushback = 1.5; // Push back 1.5 units (increased from 0.8)
                
                // Track successful hits for multi-ball
                this.successfulHits++;
                
                // BONUS CUBE - spawn every 5th PLAYER hit!
                this.playerHits++;
                if (this.playerHits >= this.bonusCubeSpawnInterval && !this.bonusCubeActive) {
                    this.spawnBonusCube();
                    this.playerHits = 0; // Reset counter
                }
                
                // Spawn additional ball every 4 hits (max 2 balls)
                // SAFETY: Only spawn once per frame, even if multiple balls hit paddle
                if (!multiBallSpawnedThisFrame && 
                    this.successfulHits >= this.nextBallThreshold && 
                    this.balls.length < this.maxBalls) {
                    // SIMPLE SPAWN: Near AI paddle, heading toward player
                    // No camera tricks, no slow-mo, just clean gameplay
                    this.spawnBall(0, 0, -10, {  // Spawn near AI (z=-10)
                        x: 0,      // Straight down middle
                        y: 0, 
                        z: 0.15    // Toward player (simple & clean)
                    });
                    this.nextBallThreshold += 2; // Next ball at +2 hits
                    this.showMultiBallText(); // Show text
                    
                    // Flash underground light cyan for multiball pickup
                    if (this.undergroundLight) {
                        const originalColor = this.undergroundLight.color.clone();
                        const originalIntensity = this.undergroundLight.intensity;
                        
                        // Flash to cyan
                        this.undergroundLight.color.setHex(0x00FFFF); // Cyan
                        this.undergroundLight.intensity = originalIntensity * 1.5; // Boost intensity briefly
                        
                        // Start smooth transition back to purple after 1200ms
                        setTimeout(() => {
                            if (this.undergroundLight) {
                                this.startUndergroundLightTransition(0x00FFFF, 0x6600cc, originalIntensity, 1200);
                            }
                        }, 1200);
                    }
                    this.playSound('multiBall'); // Play sound
                    multiBallSpawnedThisFrame = true; // Prevent duplicate spawns this frame
                    
                    // NO CAMERA ZOOM, NO SLOW-MO - keep it simple!
                }
                
                // Combo system
                if (i === 0 && this.ballOwners[i] === 'ai') {
                this.consecutiveHits++;
                this.updateCombo();
                this.resetComboTimeout();
            }
            
                this.setBallColor(i, 'player');
                this.worldLightBoost = 12.0;
            this.triggerLensFlare(); // Lens flare on impact!
        }
        
        // AI paddle collision (top) - ANTI-STUCK system
            if (ball.position.z <= -14.5 && 
                Math.abs(ball.position.x - paddle2X) < 2.5 &&
                !this.isCollisionOnCooldown(i, 'paddle') &&
                !this.collisionDisabled) {
                
                // Set cooldown to prevent rapid-fire collisions
                this.setCollisionCooldown(i, 'paddle');
                
                // Increase ball speed multiplier
                this.ballSpeedMultiplier *= 1.05;
                velocity.z *= -1.05;
                velocity.x += (ball.position.x - paddle2X) * 0.1;
                
                // ENHANCED ANTI-STUCK: Add randomness to break shallow angles
                velocity.x += (Math.random() - 0.5) * 0.06;
                this.triggerCameraShake(0.3, true);
            this.triggerPaddleBlink(this.paddle2, 'paddle2');
                this.triggerRumble(0.3, 100);
                this.createImpactEffect(ball.position.clone(), 0xff00ff);
                this.setBallColor(i, 'ai');
                this.worldLightBoost = 12.0;
            this.playSound('paddleHit');
            this.triggerLensFlare(); // Lens flare on impact!
            this.boostParticleOpacity('enemy'); // Boost particles on enemy paddle hit
            
            // Update ball ownership to AI
            this.ballOwners[i] = 'ai';
            
                // Record collision for stuck ball detection
                this.recordBallCollision(ball.position.clone());
            
                // Paddle pushback!
                this.paddle2Pushback = 1.5; // Push back 1.5 units (increased from 0.8)
            
                if (i === 0) {
            this.resetCombo();
                }
            }
            
            // Scoring - mark balls for removal (match goal positions)
            if (ball.position.z > 19) {
                ballsToRemove.push({ index: i, scorer: 'player2', position: ball.position.clone() });
            }
            
            if (ball.position.z < -19) {
                ballsToRemove.push({ index: i, scorer: 'player1', position: ball.position.clone() });
            }
        }
        
        // Remove scored balls (in reverse order to maintain indices)
        ballsToRemove.sort((a, b) => b.index - a.index);
        
        // Check if ANY ball died (player failed)
        const playerDied = ballsToRemove.some(removal => removal.scorer === 'player2');
        
        // If player died, trigger death screen FIRST (before removing balls)
        // This ensures death camera locks position before any camera updates
        if (playerDied) {
            // NUCLEAR OPTION: IMMEDIATE timeScale reset - NO EXCEPTIONS
            this.timeScale = 1.0;
            log('🚀 NUCLEAR: IMMEDIATE speed reset on death - NO EXCEPTIONS');
            
            // NO SPECIAL CAMERA BEHAVIOR - let normal gameplay camera continue
            
            // Deactivate ALL camera systems
            this.multiBallZoom.active = false;
            this.startMenuCamera.active = false;
            this.pauseCamera.active = false;
            
            // Show death screen
            this.showDeathScreen();
            
            // Simple death handling - no special camera effects
            this.playSound('death');
            
            // CLEANUP AFTER DEATH: Clear all accumulated effects
            const deathCleanupTimeout = setTimeout(() => {
                log('🧹 Post-death cleanup triggered');
                this.cleanupImpactEffects();
            }, 800); // Clean up 0.8 seconds after death sequence starts
            this.activeTimeouts.push(deathCleanupTimeout);
            
            // Building animation removed for performance
        }
        
        for (const removal of ballsToRemove) {
            const ball = this.balls[removal.index];
            this.scene.remove(ball);
            
            // Clean up trail for this ball
            const trail = this.trails[removal.index];
            if (trail) {
                // Hide all trail spheres
                trail.spheres.forEach(sphere => {
                    sphere.visible = false;
                });
                // Clear trail line
                const positions = trail.mesh.geometry.attributes.position.array;
                for (let i = 0; i < positions.length; i++) {
                    positions[i] = 0;
                }
                trail.mesh.geometry.attributes.position.needsUpdate = true;
                trail.positions = [];
            }
            
            // Turn off ball light for this ball (will be restored when ball respawns)
                if (this.ballLights[removal.index]) {
                    this.ballLights[removal.index].intensity = 0;
                log(`💡 Ball light ${removal.index} turned off (ball removed)`);
            }
            
            // Stop ball sound for this ball
            if (this.ballSounds[removal.index]) {
                this.ballSounds[removal.index].pause();
                this.ballSounds[removal.index].currentTime = 0;
            }
            
            this.balls.splice(removal.index, 1);
            this.ballVelocities.splice(removal.index, 1);
            this.trails.splice(removal.index, 1);
            this.ballSounds.splice(removal.index, 1);
            
            if (removal.scorer === 'player2') {
            this.score.player2++;
                // Flash player goal MAGENTA (ball went past player - enemy scored!)
                this.flashGoalMagenta(this.playerGoal);
                
                // Trigger enemy celebratory wave (inverse direction with magenta colors)
                this.triggerEnemyCelebratoryWave();
            } else {
                this.score.player1++;
                
                // FREEZE GAME: Stop all ball and paddle movement during win
                this.gameSpeed = 0; // Freeze game speed
                this.isGameFrozen = true; // Set freeze flag
                
                // Trigger RGB split win celebration!
                // this.triggerRGBSplit(); // COMMENTED OUT
                
                // NUCLEAR OPTION: IMMEDIATE timeScale reset - NO EXCEPTIONS
                this.timeScale = 1.0;
                log('🚀 NUCLEAR: IMMEDIATE speed reset on win - NO EXCEPTIONS');
                
                // Flash AI goal GREEN (ball went past AI) - WIN!
                this.flashGoalGreen(this.aiGoal);
                
                // Add cyan vignette for win celebration (starts fading out immediately)
                const vignette = document.getElementById('vignette');
                vignette.classList.add('win');
                
                // Clean up vignette class after animation completes
                setTimeout(() => {
                    vignette.classList.remove('win');
                }, 3000); // Match CSS animation duration
                
                this.triggerCelebratoryWave(); // CELEBRATORY WAVE!
                this.playSound('score');
                this.showAwesomeText();
                
                // CLEANUP AFTER WIN: Clear all accumulated effects
                const winCleanupTimeout = setTimeout(() => {
                    log('🧹 Post-win cleanup triggered');
                    this.cleanupImpactEffects();
                }, 1000); // Clean up 1 second after win sequence starts
                this.activeTimeouts.push(winCleanupTimeout);
                
            this.updateScore();
            
            // Spawn new ball after celebration (2.5s delay to match goal animation)
            const ballSpawnTimeout = setTimeout(() => {
                // Clean up celebration light before spawning new ball
                if (this.celebrationLight && this.celebrationLightActive) {
                    this.scene.remove(this.celebrationLight);
                    this.celebrationLight = null;
                    this.celebrationLightActive = false;
                    log('✨ Celebration light cleaned up before new ball spawn');
                }
                
                this.spawnBall(0, 0, 0, { x: 0, y: 0, z: -this.baseBallSpeed });
            }, 2500);
            this.activeTimeouts.push(ballSpawnTimeout);
            }
        }
        
        // If ANY ball died, finish cleanup (death screen already triggered above)
        if (playerDied) {
            this.resetCombo();
            this.updateScore();
            
            // Delay ball respawn until AFTER death sequence completes (2 seconds)
            const deathRespawnTimeout = setTimeout(() => {
                this.resetBallAfterDeath(); // Optimized reset for death scenario
            }, 2000); // Exactly when death animation ends (2.0s)
            this.activeTimeouts.push(deathRespawnTimeout);
        }
    }
    
    
    showAwesomeText() {
        // Use message queue system to prevent overlapping
        this.queueMessage('AWESOME', 1200, 'awesome');
    }
    
    showMultiBallText() {
        // Use message queue system to prevent overlapping
        this.queueMessage('MULTI-BALL', 1200, 'default');
    }
    
    showDeathScreen() {
        // MESSAGE OVERRIDE: Clear any existing messages when "YOU DIED!" takes priority
        this.clearCurrentMessage();
        
        // FREEZE GAME: Stop all ball and paddle movement
        this.gameSpeed = 0; // Freeze game speed
        this.isGameFrozen = true; // Set freeze flag
        
        // Add magenta vignette for death atmosphere
        const vignette = document.getElementById('vignette');
        vignette.classList.add('death');
        
        // Ensure music volume stays constant during death sequence
        if (this.sounds.music) {
            this.sounds.music.volume = 0.67;
        }
        
        // Show death screen (transparent background, just for positioning)
        this.domElements.deathScreen.style.display = 'block';
        
        // Use same animation style as "AWESOME" text
        this.domElements.deathText.classList.remove('active', 'exit');
        void this.domElements.deathText.offsetWidth; // Force reflow
        
        // Enter with 3 hard blinks
        this.domElements.deathText.classList.add('active');
        
        // Start exit animation after display time
        setTimeout(() => {
            this.domElements.deathText.classList.remove('active');
            this.domElements.deathText.classList.add('exit');
            
            // Fully hide after exit animation
            setTimeout(() => {
                this.domElements.deathText.classList.remove('exit');
                this.domElements.deathScreen.style.display = 'none';
                
                // UNFREEZE GAME: Resume normal gameplay
                this.gameSpeed = 1.0;
                this.isGameFrozen = false;
                
                // Reset stuck ball collision system after death
                this.collisionDisabled = false;
                this.collisionDisableTimer = 0;
                this.ballCollisionHistory = [];
                
                // Clean up death vignette class after animation completes
                setTimeout(() => {
                    vignette.classList.remove('death');
                }, 1800); // Match updated timing (1.2s display + 0.6s exit = 1.8s)
            }, 600);
        }, 1200); // Show for 1.2s before starting exit (total 2.0s)
    }
    
    updateStartMenuCamera(deltaTime) {
        // Cinematic rotating camera around the arena (before game starts)
        if (!this.startMenuCamera.active) return;
        
        // Increment rotation angle
        this.startMenuCamera.angle += this.startMenuCamera.speed * deltaTime;
        
        // Calculate camera position in a circle
        const x = this.cachedCos(this.startMenuCamera.angle) * this.startMenuCamera.radius;
        const z = this.cachedSin(this.startMenuCamera.angle) * this.startMenuCamera.radius;
        const y = this.startMenuCamera.height;
        
        // Set camera position
        this.camera.position.set(x, y, z);
        
        // Apply horizontal tilt to camera
        this.camera.rotation.z = this.startMenuCamera.tilt;
        
        // Look at the center of the arena, looking down
        this.camera.lookAt(0, this.startMenuCamera.lookAtHeight, 0);
    }
    
    // Spatial audio system removed - was causing issues
    
    
    updateCameraResetTransition() {
        if (!this.cameraResetTransition || !this.cameraResetTransition.active) return;
        
        const elapsed = performance.now() - this.cameraResetTransition.startTime;
        const progress = Math.min(elapsed / this.cameraResetTransition.duration, 1);
        const eased = this.easeInOutCubic(progress);
        
        // Interpolate position
        this.camera.position.x = this.cameraResetTransition.startPos.x + (this.cameraResetTransition.targetPos.x - this.cameraResetTransition.startPos.x) * eased;
        this.camera.position.y = this.cameraResetTransition.startPos.y + (this.cameraResetTransition.targetPos.y - this.cameraResetTransition.startPos.y) * eased;
        this.camera.position.z = this.cameraResetTransition.startPos.z + (this.cameraResetTransition.targetPos.z - this.cameraResetTransition.startPos.z) * eased;
        
        // Interpolate lookAt
        const lookX = this.cameraResetTransition.startLookAt.x + (this.cameraResetTransition.targetLookAt.x - this.cameraResetTransition.startLookAt.x) * eased;
        const lookY = this.cameraResetTransition.startLookAt.y + (this.cameraResetTransition.targetLookAt.y - this.cameraResetTransition.startLookAt.y) * eased;
        const lookZ = this.cameraResetTransition.startLookAt.z + (this.cameraResetTransition.targetLookAt.z - this.cameraResetTransition.startLookAt.z) * eased;
        
        this.camera.lookAt(lookX, lookY, lookZ);
        
        // Interpolate FOV
        this.camera.fov = this.cameraResetTransition.startFOV + (this.cameraResetTransition.targetFOV - this.cameraResetTransition.startFOV) * eased;
        this.camera.updateProjectionMatrix();
        
        // Complete transition
        if (progress >= 1) {
            this.cameraResetTransition.active = false;
            log('✅ Camera reset transition complete - back to default position');
        }
    }
    
    
    resetCameraToDefault() {
        // Start smooth transition back to default gameplay position
        this.cameraResetTransition = {
            active: true,
            startTime: performance.now(),
            duration: 1500, // 1.5 seconds smooth transition
            startPos: {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
            },
            targetPos: { x: 0, y: 18, z: 22 }, // Default gameplay position
            startLookAt: {
                x: this.camera.position.x + this.cameraLookOffset,
                y: -4,
                z: this.camera.position.z
            },
            targetLookAt: { x: 0, y: -4, z: 0 }, // Default lookAt
            startFOV: this.camera.fov,
            targetFOV: 75
        };
        
        // Reset all camera targets to default
        this.cameraTarget.x = 0;
        this.cameraTarget.z = 0;
        this.cameraTarget.zoom = 22;
        this.cameraLookOffset = 0;
        this.camera.rotation.z = 0;
        
        // Deactivate any active camera systems
        this.multiBallZoom.active = false;
        this.cameraTransition.active = false;
        this.deathCameraLocked = false;
        
        log('📷 Camera smoothly transitioning to default gameplay position');
    }
    
    updateDynamicCamera() {
        if (this.isPaused) return;
        
        
        // No camera transitions - single camera system only
        
        // Multi-ball camera zoom override (dramatic zoom on new balls!)
        if (this.multiBallZoom.active) {
            this.updateMultiBallZoom();
            return;
        }
        
        
        
        // Smart camera positioning based on game state
        // NOTE: RGB split for bonus pickup does NOT affect camera - only win celebrations do
        if (this.balls.length > 0 && !this.isCelebrating && !this.deathResetPhase) {
            // Gradually ramp up camera tracking intensity over time
            this.cameraTrackingRampUp = Math.min(this.cameraTrackingRampUp + 0.008, 1.0); // Very slow ramp-up
            
            // Normal gameplay: Very gentle ball tracking that gradually increases
            const trackingIntensity = this.cameraTrackingRampUp * 0.05; // Much reduced from 0.088
            this.cameraTarget.x = this.balls[0].position.x * trackingIntensity;
            this.cameraTarget.z = this.balls[0].position.z * (trackingIntensity * 0.6); // Even gentler Z tracking
            
            // Very gentle zoom based on ball speed (also ramped up)
            const ballSpeed = Math.sqrt(this.ballVelocities[0].x ** 2 + this.ballVelocities[0].z ** 2);
            this.cameraTarget.zoom = 22 + (ballSpeed * 0.3 * this.cameraTrackingRampUp); // Much reduced zoom effect
        } else if (this.isCelebrating) {
            // During win celebration: Smoothly move camera to center
            this.cameraTarget.x += (0 - this.cameraTarget.x) * 0.03; // Very gentle transition to center
            this.cameraTarget.z += (0 - this.cameraTarget.z) * 0.03; // Very gentle transition to center
            this.cameraTarget.zoom += (22 - this.cameraTarget.zoom) * 0.03; // Very gentle transition to default zoom
        } else {
            // Other dramatic events: Smoothly transition to default position
            this.cameraTarget.x += (0 - this.cameraTarget.x) * 0.1; // Smooth transition to 0
            this.cameraTarget.z += (0 - this.cameraTarget.z) * 0.1; // Smooth transition to 0
            this.cameraTarget.zoom += (22 - this.cameraTarget.zoom) * 0.1; // Smooth transition to 22
        }
        
        // Very smooth camera movement
        const currentPos = this.camera.position;
        currentPos.x += (this.cameraTarget.x - currentPos.x) * this.cameraSmooth;
        currentPos.z += (this.cameraTarget.zoom + this.cameraTarget.z - currentPos.z) * this.cameraSmooth;
        
        // Look at target with paddle direction offset
        this.camera.lookAt(this.cameraTarget.x + this.cameraLookOffset, -4, this.cameraTarget.z);
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    triggerCameraShake(intensity, withRotation = false, withPullback = false, horizontalDirection = 0) {
        this.cameraShake.intensity = intensity;
        if (withRotation) {
            this.cameraShake.rotation = (Math.random() - 0.5) * 0.08; // Random tilt -0.04 to 0.04 radians (~2 degrees)
        }
        if (withPullback) {
            this.cameraShake.pullback = 3; // Pull camera back 3 units
        }
        if (horizontalDirection !== 0) {
            this.cameraShake.horizontalShift = horizontalDirection * 4; // Shift camera left (-) or right (+) - 2x deeper
        }
    }
    
    updateCameraShake() {
        if (this.isPaused) return;
        
        // Gradually reduce intensity for softer shake over time
        if (this.cameraShake.intensity > 0.001) {
            // Shake amount decreases as intensity decreases (more intense at start, softer over time)
            const currentIntensity = this.cameraShake.intensity * this.cameraShake.intensity; // Quadratic for faster falloff
            const shakeX = (Math.random() - 0.5) * currentIntensity;
            const shakeY = (Math.random() - 0.5) * currentIntensity;
            
            this.camera.position.x += shakeX;
            this.camera.position.y += shakeY;
            
            this.cameraShake.intensity *= this.cameraShake.decay;
        }
        
        // Handle rotation shake (horizontal tilt) + paddle tilt
        if (Math.abs(this.cameraShake.rotation) > 0.001) {
            this.camera.rotation.z = this.cameraShake.rotation + this.cameraTilt;
            this.cameraShake.rotation *= this.cameraShake.rotationDecay;
        } else {
            // Apply paddle tilt even without shake
            this.camera.rotation.z = this.cameraTilt;
        }
        
        // Handle camera pullback (re-enabled for player paddle impact)
        if (Math.abs(this.cameraShake.pullback) > 0.01) {
            this.camera.position.z += this.cameraShake.pullback * 0.1;
            this.cameraShake.pullback *= this.cameraShake.pullbackDecay;
        }
        
        // Handle horizontal shift (moves camera left/right then returns)
        if (Math.abs(this.cameraShake.horizontalShift) > 0.01) {
            this.camera.position.x += this.cameraShake.horizontalShift * 0.1;
            this.cameraShake.horizontalShift *= this.cameraShake.horizontalShiftDecay;
        }
    }
    
    // Enable camera drift correction after game restart
    enableCameraDriftCorrection() {
        this.cameraDriftCorrection.enabled = true;
        this.cameraDriftCorrection.lastCheckTime = performance.now();
        log('📷 Camera drift correction enabled - will check after 3 seconds');
    }
    
    // Update camera drift correction
    updateCameraDriftCorrection() {
        if (!this.cameraDriftCorrection.enabled) return;
        
        const currentTime = performance.now();
        
        // Wait for the delay period before starting to check
        if (currentTime - this.cameraDriftCorrection.lastCheckTime < this.cameraDriftCorrection.checkDelay) {
            return;
        }
        
        // Check every 1 second (more frequent monitoring)
        if (currentTime - this.cameraDriftCorrection.lastCheckTime < 1000) {
            return;
        }
        
        this.cameraDriftCorrection.lastCheckTime = currentTime;
        
        // Calculate current camera position
        const currentPos = this.camera.position;
        const originalPos = this.cameraDriftCorrection.originalPosition;
        
        // Calculate distance from original position
        const distance = Math.sqrt(
            Math.pow(currentPos.x - originalPos.x, 2) +
            Math.pow(currentPos.y - originalPos.y, 2) +
            Math.pow(currentPos.z - originalPos.z, 2)
        );
        
        // Only apply drift correction if camera has drifted significantly
        if (distance > this.cameraDriftCorrection.maxDriftDistance) {
            const gentleCorrectionSpeed = this.cameraDriftCorrection.correctionSpeed * 0.2; // Even more gentle correction
            
            // Gently drift back to original position only when needed
            this.cameraTarget.x += (originalPos.x - currentPos.x) * gentleCorrectionSpeed;
            this.cameraTarget.z += (originalPos.z - currentPos.z) * gentleCorrectionSpeed;
            this.cameraTarget.zoom += (22 - this.cameraTarget.zoom) * gentleCorrectionSpeed;
        }
        
        // Log only if drifted significantly
        if (distance > this.cameraDriftCorrection.maxDriftDistance) {
            log(`📷 Camera drift detected: ${distance.toFixed(2)} units from original position - applying gentle correction`);
        }
    }
    
    // Initialize CRT Effect
    initCRTEffect() {
        // CRT Shader adapted from bfollington's react-three-fiber CRT effect
        // https://codesandbox.io/p/sandbox/react-three-fiber-crt-effect-rrdco
        const crtVertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        const crtFragmentShader = `
            uniform sampler2D tDiffuse;
            uniform float time;
            uniform vec2 resolution;
            varying vec2 vUv;
            
            void main() {
                vec2 uv = vUv;
                
                // Sample the texture
                vec4 color = texture2D(tDiffuse, uv);
                
                // Scanlines
                float scanline = sin(uv.y * resolution.y * 0.7) * 0.04;
                color.rgb += scanline;
                
                // Vignette (simple distance from center)
                vec2 center = vec2(0.5, 0.5);
                float dist = length(uv - center);
                float vignette = 1.0 - dist * 0.8;
                color.rgb *= vignette;
                
                // Chromatic aberration
                float aberration = 0.002;
                color.r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
                color.b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;
                
                // Noise
                float noise = fract(sin(dot(uv + time, vec2(12.9898, 78.233))) * 43758.5453) * 0.02;
                color.rgb += noise;
                
                gl_FragColor = color;
            }
        `;
        
        // Create CRT material
        this.crtMaterial = new THREE.ShaderMaterial({
            vertexShader: crtVertexShader,
            fragmentShader: crtFragmentShader,
            uniforms: {
                tDiffuse: { value: null },
                time: { value: 0.0 },
                resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
            }
        });
        
        // Create CRT plane
        this.crtGeometry = new THREE.PlaneGeometry(2, 2);
        this.crtMesh = new THREE.Mesh(this.crtGeometry, this.crtMaterial);
        this.crtMesh.position.z = -1;
        this.crtScene = new THREE.Scene();
        this.crtScene.add(this.crtMesh);
        this.crtCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        // Create render target
        this.renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        
        log('📺 CRT effect initialized');
    }
    
    // Toggle CRT effect
    toggleCRTEffect() {
        this.crtEffect.enabled = !this.crtEffect.enabled;
        log(`📺 CRT effect ${this.crtEffect.enabled ? 'enabled' : 'disabled'}`);
    }
    
    // Update CRT effect
    updateCRTEffect() {
        if (!this.crtEffect.enabled) return;
        
        // Update time uniform
        this.crtMaterial.uniforms.time.value = performance.now() * 0.001;
        
        // Update resolution uniform
        this.crtMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    }
    
    // Update underground light fade-in system
    updateUndergroundLightFadeIn() {
        if (!this.undergroundLightFadeIn.active) return;
        
        const elapsed = performance.now() - this.undergroundLightFadeIn.startTime;
        const progress = Math.min(elapsed / this.undergroundLightFadeIn.duration, 1);
        
        // Use easing for smooth fade-in
        const eased = this.easeInOutCubic(progress);
        
        // Gradually increase underground light intensity
        if (this.undergroundLight) {
            this.undergroundLight.intensity = this.undergroundLightFadeIn.targetIntensity * eased;
        }
        
        // End fade-in when complete
        if (progress >= 1) {
            this.undergroundLightFadeIn.active = false;
            log('💜 Underground light fade-in complete - at full intensity');
        }
    }
    
    // Start smooth underground light color transition
    startUndergroundLightTransition(startColor, endColor, targetIntensity, duration) {
        this.undergroundLightFlashTransition.active = true;
        this.undergroundLightFlashTransition.startTime = performance.now();
        this.undergroundLightFlashTransition.duration = duration;
        this.undergroundLightFlashTransition.startColor = startColor;
        this.undergroundLightFlashTransition.endColor = endColor;
        this.undergroundLightFlashTransition.targetIntensity = targetIntensity;
    }
    
    // Update underground light color transition
    updateUndergroundLightTransition() {
        if (!this.undergroundLightFlashTransition.active) return;
        
        const elapsed = performance.now() - this.undergroundLightFlashTransition.startTime;
        const progress = Math.min(elapsed / this.undergroundLightFlashTransition.duration, 1);
        
        // Use easing for smooth transition
        const eased = this.easeInOutCubic(progress);
        
        // Smooth color interpolation
        const startColor = new THREE.Color(this.undergroundLightFlashTransition.startColor);
        const endColor = new THREE.Color(this.undergroundLightFlashTransition.endColor);
        const currentColor = startColor.clone().lerp(endColor, eased);
        
        // Smooth intensity transition back to normal
        const currentIntensity = this.undergroundLightFlashTransition.targetIntensity;
        
        if (this.undergroundLight) {
            this.undergroundLight.color.copy(currentColor);
            this.undergroundLight.intensity = currentIntensity;
        }
        
        // End transition when complete
        if (progress >= 1) {
            this.undergroundLightFlashTransition.active = false;
            log('💜 Underground light flash transition complete - back to purple');
        }
    }
    
    updateAnimatedLights() {
        if (this.isPaused) return;
        
        // Update world light boost (both lights flash on any hit) - sharp triangle curve
        if (this.worldLightBoost > 0) {
            this.overheadLight.intensity = 6.75 + this.worldLightBoost; // Your light base intensity (10% decrease)
            this.overheadLight2.intensity = 23.2 + this.worldLightBoost; // Enemy light base intensity (25% increase)
            
            // Sharp triangle curve: immediate linear decay (no plateau)
            this.worldLightBoost -= 0.8; // Linear decay for sharp triangle effect
            
            if (this.worldLightBoost <= 0) {
                this.worldLightBoost = 0;
                this.overheadLight.intensity = 6.75; // Reset to your light base intensity (10% decrease)
                this.overheadLight2.intensity = 23.2; // Reset to enemy light base intensity (25% increase)
                log('💡 Light intensities reset - Overhead1:', this.overheadLight.intensity, 'Overhead2:', this.overheadLight2.intensity);
            }
        }
        
        // Update player light position to follow player paddle
        if (this.playerLight && this.paddle1) {
            this.playerLight.position.x = this.paddle1.position.x;
            this.playerLight.position.y = 1; // Higher above paddle to avoid blocking
            this.playerLight.position.z = this.paddle1.position.z - 0; // In front of paddle (toward center)
        }
        
        // Update AI light position to follow AI paddle
        if (this.aiLight && this.paddle2) {
            this.aiLight.position.x = this.paddle2.position.x;
            this.aiLight.position.y = 1; // Higher above paddle to avoid blocking
            this.aiLight.position.z = this.paddle2.position.z + 0; // In front of paddle (toward center)
        }
    }
    
    fadePaddleLights(targetIntensity, duration) {
        // Clear any existing light fade intervals to prevent accumulation
        for (const interval of this.activeIntervals) {
            if (interval.type === 'lightFade') {
                clearInterval(interval.id);
            }
        }
        this.activeIntervals = this.activeIntervals.filter(interval => interval.type !== 'lightFade');
        
        // Smooth fade for paddle lights
        const startPlayerIntensity = this.playerLight.intensity;
        const startAiIntensity = this.aiLight.intensity;
        const steps = 30;
        const stepDuration = duration / steps;
        let currentStep = 0;
        
        const fadeInterval = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            
            this.playerLight.intensity = startPlayerIntensity + (targetIntensity - startPlayerIntensity) * progress;
            this.aiLight.intensity = startAiIntensity + (targetIntensity - startAiIntensity) * progress;
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                this.playerLight.intensity = targetIntensity;
                this.aiLight.intensity = targetIntensity;
                // Remove from tracking when complete
                this.activeIntervals = this.activeIntervals.filter(interval => interval.id !== fadeInterval);
            }
        }, stepDuration);
        
        // Track this interval for cleanup
        this.activeIntervals.push({ id: fadeInterval, type: 'lightFade' });
    }
    
    resetBallAfterDeath() {
        // Optimized reset specifically for death scenario - spreads work across frames
        log('🔄 Optimized death reset starting...');
        
        // Phase 1: Immediate cleanup (spread across multiple frames)
        this.deathResetPhase = 1;
        this.deathResetProgress = 0;
        this.startDeathReset();
    }
    
    startDeathReset() {
        // Spread the reset work across multiple frames to prevent performance hiccups
        if (this.deathResetPhase === 1) {
            // Phase 1: Remove balls and basic cleanup
            for (const ball of this.balls) {
                this.scene.remove(ball);
            }
            this.balls = [];
            this.ballVelocities = [];
            
            // Stop and remove all ball sounds
            for (const sound of this.ballSounds) {
                if (sound) {
                    sound.pause();
                    sound.currentTime = 0;
                }
            }
            this.ballSounds = [];
            
            this.deathResetPhase = 2;
            requestAnimationFrame(() => this.startDeathReset());
            return;
        }
        
        if (this.deathResetPhase === 2) {
            // Phase 2: Remove trails and lights
            for (const trail of this.trails) {
                if (trail) {
                    this.scene.remove(trail.mesh);
                    trail.spheres.forEach(sphere => this.scene.remove(sphere));
                }
            }
            this.trails = [];
            
            // Remove extra ball lights (keep first one)
            while (this.ballLights.length > 1) {
                const light = this.ballLights.pop();
                this.scene.remove(light);
            }
            
            // Restore first ball light intensity
            if (this.ballLights.length > 0) {
                this.ballLights[0].intensity = 0.15;
            }
            
            this.deathResetPhase = 3;
            requestAnimationFrame(() => this.startDeathReset());
            return;
        }
        
        if (this.deathResetPhase === 3) {
            // Phase 3: Reset game state and bonus systems
            this.successfulHits = 0;
            this.nextBallThreshold = 4;
            this.playerHits = 0;
            
            // Reset bonus cube system
            if (this.bonusCube) {
                if (this.bonusCube.userData.ambientLight) {
                    this.scene.remove(this.bonusCube.userData.ambientLight);
                }
                this.scene.remove(this.bonusCube);
                this.bonusCube = null;
                this.bonusCubeActive = false;
            }
            
            // Clean up wave lights
            for (let waveLight of this.waveLights) {
                this.scene.remove(waveLight.light);
            }
            this.waveLights = [];
            
            this.deathResetPhase = 4;
            requestAnimationFrame(() => this.startDeathReset());
            return;
        }
        
        if (this.deathResetPhase === 4) {
            // Phase 4: Reset paddles and camera
            if (this.bonusActivePaddle) {
                const cylinder = this.bonusActivePaddle.userData.cylinder;
                const leftCap = this.bonusActivePaddle.userData.leftCap;
                const rightCap = this.bonusActivePaddle.userData.rightCap;
                if (cylinder && leftCap && rightCap) {
                    cylinder.scale.x = 1.0;
                    leftCap.position.x = -2;
                    rightCap.position.x = 2;
                }
                this.bonusActivePaddle = null;
            }
            this.bonusTimer = 0;
            this.paddleWidthTransition = 0;
            
            // Reset paddle positions
            this.paddle1Pushback = 0;
            this.paddle2Pushback = 0;
            this.paddle1Tilt = 0;
            this.paddle2Tilt = 0;
            this.paddle1.position.z = 15;
            this.paddle2.position.z = -15;
            this.paddle1.rotation.z = 0;
            this.paddle2.rotation.z = 0;
            
            this.deathResetPhase = 5;
            requestAnimationFrame(() => this.startDeathReset());
            return;
        }
        
        if (this.deathResetPhase === 5) {
            // Phase 5: Reset camera to default gameplay position and spawn new ball
            // CAMERA DOES NOTHING - stays exactly as it is
            
            // CRITICAL: Reset timeScale to normal speed!
            this.forceNormalSpeed();
            
            // PERFORMANCE: Comprehensive memory cleanse after death
            this.performMemoryCleanse();
            
            // Clear all active timeouts that might interfere
            this.clearAllTimeouts();
            
            // Clear any lingering goal blink effects
            this.goalBlinkTimer = 0;
            this.goalBlinkTarget = null;
            
            // Reset goal colors to original state
            if (this.playerGoal) {
                this.playerGoal.material.uniforms.baseColor.value.copy(this.playerGoal.userData.originalColor);
                this.playerGoal.material.uniforms.emissiveIntensity.value = 7.8125;
                this.playerGoal.material.uniforms.opacity.value = 0.3;
            }
            if (this.aiGoal) {
                this.aiGoal.material.uniforms.baseColor.value.copy(this.aiGoal.userData.originalColor);
                this.aiGoal.material.uniforms.emissiveIntensity.value = 7.8125;
                this.aiGoal.material.uniforms.opacity.value = 0.3;
            }
            
            // Clear any lingering multi-ball zoom effects
            this.multiBallZoom.active = false;
            
            // Restore paddle lights (energy restored!)
            this.fadePaddleLights(1.0, 500);
            
            // Reset stuck ball collision system after death reset
            this.collisionDisabled = false;
            this.collisionDisableTimer = 0;
            this.ballCollisionHistory = [];
            
            // Spawn new ball
            this.spawnBall(0, 0, 0, {
                x: 0,
                y: 0,
                z: -0.15
            });
            
            
            // Reset phase tracking
            this.deathResetPhase = 0;
            this.deathResetProgress = 0;
            
            // Enable camera drift correction after death reset
            this.enableCameraDriftCorrection();
            
            log('✅ Optimized death reset complete!');
        }
    }

    resetBall() {
        // Remove all existing balls
        for (const ball of this.balls) {
            this.scene.remove(ball);
        }
        this.balls = [];
        this.ballVelocities = [];
        
        // Restore paddle lights (energy restored!)
        this.fadePaddleLights(1.0, 500); // Fade back to full over 0.5 seconds
        
        // Stop and remove all ball sounds
        for (const sound of this.ballSounds) {
            if (sound) {
                sound.pause();
                sound.currentTime = 0;
            }
        }
        this.ballSounds = [];
        
        // Remove all trails
        for (const trail of this.trails) {
            if (trail) {
                this.scene.remove(trail.mesh);
                trail.spheres.forEach(sphere => this.scene.remove(sphere));
            }
        }
        this.trails = [];
        
        // Remove extra ball lights (keep first one)
        while (this.ballLights.length > 1) {
            const light = this.ballLights.pop();
            this.scene.remove(light);
        }
        
        // Restore first ball light intensity
        if (this.ballLights.length > 0) {
            this.ballLights[0].intensity = 0.15; // Consistent with other ball lights
        }
        
        // Reset multi-ball system
        this.successfulHits = 0;
        this.nextBallThreshold = 4; // Changed from 2 to 4
        
        // Reset bonus cube system
        this.playerHits = 0;
        if (this.bonusCube) {
            // Remove ambient light
            if (this.bonusCube.userData.ambientLight) {
                this.scene.remove(this.bonusCube.userData.ambientLight);
            }
            this.scene.remove(this.bonusCube);
            this.bonusCube = null;
            this.bonusCubeActive = false;
        }
        
        // Clean up wave lights
        for (let waveLight of this.waveLights) {
            this.scene.remove(waveLight.light);
        }
        this.waveLights = [];
        
        // Reset bonus effect
        if (this.bonusActivePaddle) {
            // Reset paddle parts
            const cylinder = this.bonusActivePaddle.userData.cylinder;
            const leftCap = this.bonusActivePaddle.userData.leftCap;
            const rightCap = this.bonusActivePaddle.userData.rightCap;
            if (cylinder && leftCap && rightCap) {
                cylinder.scale.x = 1.0;
                leftCap.position.x = -2;
                rightCap.position.x = 2;
            }
            this.bonusActivePaddle = null;
        }
        this.bonusTimer = 0;
        this.paddleWidthTransition = 0;
        
        // Reset paddle pushback
        this.paddle1Pushback = 0;
        this.paddle2Pushback = 0;
        this.paddle1Tilt = 0;
        this.paddle2Tilt = 0;
        this.paddle1.position.z = 15;
        this.paddle2.position.z = -15;
        this.paddle1.rotation.z = 0;
        this.paddle2.rotation.z = 0;
        
        // CAMERA DOES NOTHING - stays exactly as it is
        
        // CRITICAL: Reset timeScale to normal speed!
        this.forceNormalSpeed();
        
        // PERFORMANCE: Comprehensive memory cleanse after win
        this.performMemoryCleanse();
        
        // Clear all active timeouts that might interfere
        this.clearAllTimeouts();
        
        // Clear any lingering goal blink effects
        this.goalBlinkTimer = 0;
        this.goalBlinkTarget = null;
        
        // Clear any lingering multi-ball zoom effects
        this.multiBallZoom.active = false;
        
        // Spawn first ball with FIXED, predictable velocity (always toward AI)
        // This ensures consistent, clean restarts with no random jumps
        this.spawnBall(0, 0, 0, {
            x: 0,      // No horizontal movement initially
            y: 0,
            z: -0.15   // Always toward enemy/AI (negative Z)
        });
    }
    
    fullGameReset() {
        log('🔄 Full game reset initiated...');
        log('🔄 Reset called from:', new Error().stack);
        
        this.playSound('menuSelect'); // Play menu sound on reset
        
        // Reset scores
        this.score = { player1: 0, player2: 0 };
        this.updateScore();
        
        // Keep game running - just reset state
        this.isPaused = false;
        
        // Reset combo
        this.combo = 0;
        this.resetCombo();
        
        // Reset obstacles
        this.obstacleTimer = 0;
        if (this.activeObstacle) {
            const cube = this.activeObstacle.cube;
            cube.position.y = cube.userData.originalY;
            cube.scale.y = 1;
            cube.material.color.setHex(cube.userData.originalColor);
            cube.material.emissive.setHex(cube.userData.originalEmissive);
            cube.material.emissiveIntensity = cube.userData.originalEmissiveIntensity;
            this.activeObstacle = null;
        }
        
        // Reset paddles
        this.paddle1.position.set(0, 0, 15);
        this.paddle2.position.set(0, 0, -15);
        this.paddle1Pushback = 0;
        this.paddle2Pushback = 0;
        this.paddle1Tilt = 0;
        this.paddle2Tilt = 0;
        this.paddle1.rotation.z = 0;
        this.paddle2.rotation.z = 0;
        
        // Reset camera
        this.cameraShake = { x: 0, y: 0, intensity: 0 };
        this.cameraZoom = 0;
        this.cameraTilt = 0;
        this.cameraLookOffset = 0;
        
        // Reset mouse controls
        this.mouseTiltVelocity = 0;
        this.keyboardTiltVelocity = 0;
        
        // Clear all balls
        this.resetBall();
        
        // Hide pause menu - stay in game
        this.domElements.pauseMenu.style.display = 'none';
        
        // Restart the game immediately with a new ball
        this.successfulHits = 0;
        this.nextBallThreshold = 4;
        
        // Spawn ball immediately to continue playing
        this.spawnBall(0, 0, 0, {
            x: 0,
            y: 0,
            z: -0.15 // Always toward enemy/AI
        });
        
        // Enable camera drift correction after full game reset
        this.enableCameraDriftCorrection();
        
        // Reset wall wave animation and heights
        this.wallWaveAnimation.active = false;
        this.resetWallHeights();
        
        // Clean up celebration light during reset
        if (this.celebrationLight && this.celebrationLightActive) {
            this.scene.remove(this.celebrationLight);
            this.celebrationLight = null;
            this.celebrationLightActive = false;
            log('✨ Celebration light cleaned up during game reset');
        }
        
        // Reset stuck ball collision system
        this.collisionDisabled = false;
        this.collisionDisableTimer = 0;
        this.ballCollisionHistory = [];
        log('🔄 Stuck ball collision system reset');
        
        // Music keeps playing (don't stop it)
        
        log('✅ Full game reset complete - continuing gameplay!');
    }
    
    superHardReset() {
        log('💥 SUPER HARD RESET - Page reload!');
        
        // Play reset sound
        this.playSound('menuSelect');
        
        // Hide pause menu first
        this.domElements.pauseMenu.style.display = 'none';
        
        // Small delay to let the sound play and UI hide
        setTimeout(() => {
            // Super hard reset = page reload (guaranteed clean slate)
            window.location.reload();
        }, 200); // 200ms delay for smooth transition
    }
    
    destroy() {
        log('💥 Destroying game instance...');
        
        // Stop all animations and intervals
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Clear all timeouts and intervals
        this.activeTimeouts.forEach(timeout => clearTimeout(timeout));
        this.activeIntervals.forEach(interval => clearInterval(interval));
        this.activeTimeouts = [];
        this.activeIntervals = [];
        
        // Dispose of Three.js resources
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Clear scene
        if (this.scene) {
            this.scene.clear();
        }
        
        // Dispose of geometries and materials
        if (this.ballGeometry) this.ballGeometry.dispose();
        if (this.trailGeometry) this.trailGeometry.dispose();
        if (this.particleGeometry) this.particleGeometry.dispose();
        
        // Clear all references
        this.balls = [];
        this.trails = [];
        this.impactParticles = [];
        this.ballLights = [];
        this.waveLights = [];
        
        log('✅ Game instance destroyed');
    }
    
    updateScore() {
        this.domElements.player1Score.textContent = this.score.player1;
        this.domElements.player2Score.textContent = this.score.player2;
        
        // Show score on first score made (blink in)
        if (!this.scoreShown && (this.score.player1 > 0 || this.score.player2 > 0)) {
            const scoreElement = document.getElementById('score');
            if (scoreElement) {
                scoreElement.classList.add('visible');
                this.scoreShown = true;
            }
        }
    }
    
    updateCombo() {
        // Show combo for every 2 hits
        if (this.consecutiveHits % 2 === 0 && this.consecutiveHits > 0) {
            this.currentCombo = this.consecutiveHits / 2;
            this.domElements.combo.textContent = `${this.currentCombo}X COMBO`;
            
            log(`COMBO! ${this.currentCombo}X - consecutiveHits: ${this.consecutiveHits}`);
            
            // Remove and re-add class to retrigger animation
            this.domElements.combo.classList.remove('active');
            void this.domElements.combo.offsetWidth; // Force reflow
            this.domElements.combo.classList.add('active');
            
            // Play combo sound
            this.playSound('combo');
            
            // Hide after 2 seconds
            setTimeout(() => {
                this.domElements.combo.classList.remove('active');
            }, 2000);
        }
    }
    
    resetCombo() {
        this.consecutiveHits = 0;
        this.currentCombo = 0;
        this.domElements.combo.classList.remove('active');
        if (this.comboTimeout) {
            clearTimeout(this.comboTimeout);
            this.comboTimeout = null;
        }
    }
    
    resetComboTimeout() {
        // Clear existing timeout
        if (this.comboTimeout) {
            clearTimeout(this.comboTimeout);
        }
        
        // Reset combo after 3 seconds of no player hits
        this.comboTimeout = setTimeout(() => {
            this.resetCombo();
        }, 3000);
    }
    
    updateGoals(deltaTime) {
        // Animate the laser forcefield goals
        if (!this.playerGoal || !this.aiGoal) return;
        
        this.goalAnimationTime += deltaTime;
        
        // Update shader time uniform for animation
        this.playerGoal.material.uniforms.time.value = this.goalAnimationTime;
        this.aiGoal.material.uniforms.time.value = this.goalAnimationTime;
        
        // Update paddle shaders time (using laser wall shader!)
        if (this.paddle1 && this.paddle1.userData.material && this.paddle1.userData.material.uniforms && this.paddle1.userData.material.uniforms.time) {
            this.paddle1.userData.material.uniforms.time.value = this.goalAnimationTime;
        }
        if (this.paddle2 && this.paddle2.userData.material && this.paddle2.userData.material.uniforms && this.paddle2.userData.material.uniforms.time) {
            this.paddle2.userData.material.uniforms.time.value = this.goalAnimationTime;
        }
        
        // Update ball shaders time
        for (let i = 0; i < this.balls.length; i++) {
            const ball = this.balls[i];
            if (ball && ball.material && ball.material.uniforms && ball.material.uniforms.time) {
                ball.material.uniforms.time.value = this.goalAnimationTime;
            }
        }
        
        // Smooth goal animation: 4 blinks → 100% opacity → fade out → fade in orange default
        if (this.goalBlinkTimer > 0 && this.goalBlinkTarget) {
            // CRITICAL FIX: Use real time for timer, not scaled time!
            const realElapsed = (performance.now() - this.goalBlinkStartTime) / 1000; // Convert to seconds
            this.goalBlinkTimer = Math.max(0, 5.0 - realElapsed); // Count down from 5.0 seconds
            
            const totalDuration = 5.0; // Extended to 5 seconds total to ensure full fade
            const blinkDuration = 0.8; // 4 blinks in 0.8 seconds
            const solidDuration = 1.2; // 100% opacity for 1.2 seconds (was 0.2s + 1s)
            const fadeOutDuration = 3.0; // Extended fade out over 3.0 seconds for smooth transition
            const fadeInDuration = 0.0; // No separate fade in - just fade out to neutral
            
            if (realElapsed < blinkDuration) {
                // Phase 1: 4 fast blinks (like denied bonus)
                const blinkSpeed = 5.0; // 4 blinks in 0.8 seconds
                const blinkPhase = (realElapsed * blinkSpeed) % 1;
                const isOn = blinkPhase < 0.5;
                
                if (isOn) {
                    // ON - full opacity
                    this.goalBlinkTarget.material.uniforms.opacity.value = 0.8;
                    this.goalBlinkTarget.material.uniforms.emissiveIntensity.value = 6.0;
                } else {
                    // OFF - very low opacity
                    this.goalBlinkTarget.material.uniforms.opacity.value = 0.1;
                    this.goalBlinkTarget.material.uniforms.emissiveIntensity.value = 1.0;
                }
            } else if (realElapsed < blinkDuration + solidDuration) {
                // Phase 2: 100% opacity (solid)
                this.goalBlinkTarget.material.uniforms.opacity.value = 1.0;
                this.goalBlinkTarget.material.uniforms.emissiveIntensity.value = 8.0;
            } else if (realElapsed < totalDuration) {
                // Phase 3: Slow fade out from fully lit orange to neutral
                const fadeProgress = Math.min(1.0, (realElapsed - blinkDuration - solidDuration) / fadeOutDuration);
                this.goalBlinkTarget.material.uniforms.baseColor.value.setHex(0xff3300); // Keep orange color
                this.goalBlinkTarget.material.uniforms.opacity.value = 1.0 - (fadeProgress * 0.7); // Fade from 1.0 to 0.3
                this.goalBlinkTarget.material.uniforms.emissiveIntensity.value = 8.0 - (fadeProgress * (8.0 - 7.8125)); // Fade from 8.0 to 7.8125
            }
        } else if (this.goalBlinkTimer <= 0 && this.goalBlinkTarget) {
            // Timer expired - restore normal speed
            this.timeScale = 1.0;
            log('🚀 Speed restored to normal (timer expired)');
            
            // Don't hard reset - let the fade complete naturally
            // The fade should have already reached neutral values
            
            // Stop blinking
            this.goalBlinkTimer = 0;
            this.goalBlinkTarget = null;
        }
    }
    
    flashGoalMagenta(goal) {
        // Flash goal to BRIGHT MAGENTA when enemy scores - player failed!
        if (!goal) return;
        
        // Change to bright magenta with HIGH opacity
        goal.material.uniforms.baseColor.value.setHex(0xff00ff); // Bright magenta
        goal.material.uniforms.emissiveIntensity.value = 2.0; // Very bright!
        goal.material.uniforms.opacity.value = 0.9; // Nearly solid
        
        // Keep overhead lights orange during death flash
        this.overheadLight.color.setHex(0xff6600);
        this.overheadLight2.color.setHex(0xff6600);
        
        // Start fade after death sequence (2 seconds)
        // Fade happens over 0.8 seconds for smooth transition
        setTimeout(() => {
            if (!goal) return;
            
            const fadeSteps = 30; // 30 steps over 0.8 seconds
            const fadeInterval = 800 / fadeSteps;
            let step = 0;
            
            // Clear any existing goal fade intervals to prevent accumulation
            for (const interval of this.activeIntervals) {
                if (interval.type === 'goalFade') {
                    clearInterval(interval.id);
                }
            }
            this.activeIntervals = this.activeIntervals.filter(interval => interval.type !== 'goalFade');
            
            const fadeTimer = setInterval(() => {
                step++;
                const progress = step / fadeSteps;
                
                // Fade emissive intensity from 2.0 to 0.4
                goal.material.uniforms.emissiveIntensity.value = 2.0 - (1.6 * progress);
                
                // Fade opacity from 0.9 to 0.2
                goal.material.uniforms.opacity.value = 0.9 - (0.7 * progress);
                
                // DO NOT modify overhead light intensities - they stay at default values
                
                if (step >= fadeSteps) {
                    clearInterval(fadeTimer);
                    // Ensure final values - RESET TO ORIGINAL COLOR
                    goal.material.uniforms.baseColor.value.copy(goal.userData.originalColor);
                    goal.material.uniforms.emissiveIntensity.value = 7.8125;
                    goal.material.uniforms.opacity.value = 0.2;
                    
                    // Reset lights to orange laser gates (keep orange after wins)
                    this.overheadLight.color.setHex(0xff6600);
                    this.overheadLight2.color.setHex(0xff6600);
                    // DO NOT modify overhead light intensities - they stay at their default values
                    
                    log('🎯 Goal fade complete - overhead lights unchanged');
                    // Remove from tracking when complete
                    this.activeIntervals = this.activeIntervals.filter(interval => interval.id !== fadeTimer);
                }
            }, fadeInterval);
            
            // Track this interval for cleanup
            this.activeIntervals.push({ id: fadeTimer, type: 'goalFade' });
        }, 1800); // Start fade after 1.8 second death sequence (matches updated timing)
    }
    
    flashGoalGreen(goal) {
        // Flash goal to BRIGHT CYAN when player scores - WIN!
        if (!goal) return;
        
        // Change to bright cyan with HIGH opacity
        goal.material.uniforms.baseColor.value.setHex(0x00FEFC); // Bright cyan
        goal.material.uniforms.emissiveIntensity.value = 6.0; // Extra bright!
        goal.material.uniforms.opacity.value = 0.8; // Much more visible!
        
        // Keep overhead lights orange during win flash
        this.overheadLight.color.setHex(0xff6600);
        this.overheadLight2.color.setHex(0xff6600);
        
        // SLOW MOTION on win!
        this.timeScale = 0.3; // Slow down to 30% speed
        log('🐌 Slow motion activated on win');
        
        // Start fast blink animation!
        this.goalBlinkTimer = 2.5; // Blink for 2.5 seconds
        this.goalBlinkTarget = goal; // Track which goal is blinking
        this.goalBlinkStartTime = performance.now(); // Record real start time
        
        // NO camera zoom - keep camera on field
        // this.subtleGoalZoom.active = true;
        // this.subtleGoalZoom.targetZoom = 3; // Move forward 3 units
        
        // Play repeating alarm sound!
        if (this.sounds.goalAlarm) {
            this.sounds.goalAlarm.currentTime = 0;
            this.sounds.goalAlarm.play().catch(e => log('Could not play goal alarm'));
        }
        
        // Ensure music volume stays constant during celebrations
        if (this.sounds.music) {
            this.sounds.music.volume = 0.67;
        }
        
        // Start fade after celebration (2 seconds)
        // Fade happens over 0.8 seconds for smooth transition
        const goalFadeTimeout = setTimeout(() => {
            if (!goal) return;
            
            const fadeSteps = 30; // 30 steps over 0.8 seconds
            const fadeInterval = 800 / fadeSteps;
            let step = 0;
            
            // Clear any existing goal fade intervals to prevent accumulation
            for (const interval of this.activeIntervals) {
                if (interval.type === 'goalFade') {
                    clearInterval(interval.id);
                }
            }
            this.activeIntervals = this.activeIntervals.filter(interval => interval.type !== 'goalFade');
            
            const fadeTimer = setInterval(() => {
                step++;
                const progress = step / fadeSteps;
                
                // Fade emissive intensity from 6.0 to 5.0
                goal.material.uniforms.emissiveIntensity.value = 6.0 - (1.0 * progress);
                
                // Fade opacity from 0.8 to 0.3
                goal.material.uniforms.opacity.value = 0.8 - (0.5 * progress);
                
                if (step >= fadeSteps) {
                    clearInterval(fadeTimer);
                    // Ensure final values
            goal.material.uniforms.baseColor.value.copy(goal.userData.originalColor);
                    goal.material.uniforms.emissiveIntensity.value = 7.8125;
                    goal.material.uniforms.opacity.value = 0.3;
                    // Remove from tracking when complete
                    this.activeIntervals = this.activeIntervals.filter(interval => interval.id !== fadeTimer);
            
            // Return overhead lights to orange laser gates
                    this.overheadLight.color.setHex(0xff6600);
                    this.overheadLight2.color.setHex(0xff6600);
            
            // Return to normal speed
            this.timeScale = 1.0;
            log('🚀 Speed restored to normal');
            
            // Stop blinking
            this.goalBlinkTimer = 0;
            this.goalBlinkTarget = null;
            
            // Stop subtle zoom
            this.subtleGoalZoom.active = false;
            this.subtleGoalZoom.targetZoom = 0;
            
            // Stop alarm sound!
            if (this.sounds.goalAlarm) {
                this.sounds.goalAlarm.pause();
                this.sounds.goalAlarm.currentTime = 0;
            }
                }
            }, fadeInterval);
            
            // Track this interval for cleanup
            this.activeIntervals.push({ id: fadeTimer, type: 'goalFade' });
        }, 2000); // Start fade after 2 second celebration
        this.activeTimeouts.push(goalFadeTimeout);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        // Debug timeScale removed for performance
        
        // NUCLEAR OPTION: Force timeScale to 1.0 at the start of every frame during normal gameplay
        if (this.gameStarted && !this.isPaused) {
            // Only allow slow motion during VERY specific, active effects
            const allowSlowMotion = (this.goalBlinkTimer > 0 && this.goalBlinkTarget) || 
                                   (this.multiBallZoom.active);
            
            // Force normal speed after celebration ends
            if (this.isCelebrating === false && this.timeScale !== 1.0) {
                this.timeScale = 1.0;
                log('🚀 Speed forced to normal after celebration ended');
            }
            
            if (!allowSlowMotion && this.timeScale !== 1.0) {
                this.timeScale = 1.0;
                log('🚀 NUCLEAR: timeScale forced to 1.0 - was:', this.timeScale);
            }
        }
        
        // Start menu camera (before game starts)
        if (!this.gameStarted) {
            this.updateStartMenuCamera(deltaTime);
            this.updateStartMenuGamepad(); // Check for gamepad start button
            this.updatePlayerPaddle(); // Allow paddle movement and tilt during menu
            // Skip other game logic before game starts
        } else if (this.isPaused) {
            // Pause menu - spinning camera + skip game logic
            this.updatePauseCamera(deltaTime);
            this.updateGamepad(); // Still check for unpause
        } else {
            // Normal game logic with frame skipping for performance
            this._frameSkipCounter = (this._frameSkipCounter || 0) + 1;
            
            // Critical systems - update every frame
            this.updateGamepad();
            this.updatePlayerPaddle();
            this.updateAIPaddle();
            this.updateBall();
            this.updateDynamicCamera();
            this.updateCameraShake();
        this.updateCameraDriftCorrection();
        this.updateUndergroundLightFadeIn();
        this.updateUndergroundLightTransition();
        this.updateCRTEffect();
        
        // Music volume is set once and should not be continuously adjusted
        
        
        // Spatial audio removed - was causing issues
            
            // Update logo 3D effects
            if (this.handleLogoGamepad) {
                this.handleLogoGamepad();
            }
            
            // Update world logo rotation (only during start menu)
            if (!this.gameStarted) {
                this.updateWorldLogo(deltaTime);
            }
            
            // Non-critical systems - frame skipping based on performance mode
            const skipFrequency = this.performanceMode ? 3 : 2; // Skip more frames in performance mode
            
            // Critical systems that need smooth updates (every frame)
            this.updateBonusCube(deltaTime); // Move outside frame skip for smooth light blinking
            
            if (this._frameSkipCounter % skipFrequency === 0) {
                this.updateAnimatedLights();
                this.updatePaddleBlinks(deltaTime);
                this.updateBonusEffect(deltaTime);
                this.updateLensFlare(deltaTime); // Lens flare fade
                this.updateRGBSplit(deltaTime); // RGB split effect
                this.updateWallWaveAnimation(deltaTime); // Wall wave animation
                this.updateWaveLights(); // Traveling wave lights (win sequence)
                this.updateCelebration(deltaTime); // Celebration system
                this.updateParticles();
                this.updateParticleOpacity(deltaTime); // Dynamic particle opacity system
                this.updateItemHighlightParticles(deltaTime); // Item highlight particle system
                this.updateStuckBallRecovery(deltaTime); // Stuck ball detection and recovery
                this.updateFloorGlow();
                this.updateObstacles();
            }
        
        // Impact effects can stay every frame (lightweight)
        this.updateImpactEffects();
        
        // PERIODIC RESET DISABLED - only reset after win/death to avoid breaking gameplay
        }
        
        // Always update goals (even during start menu for animation)
        this.updateGoals(deltaTime);
        
        // Update FPS counter
        this.updateFPSCounter();
        
        // DEBUG: Log FPS drops to help identify performance issues (DISABLED FOR PERFORMANCE)
        // if (this.fpsCounter.fps < 40 && this.fpsCounter.fps > 0) {
        //     log(`⚠️ FPS DROP DETECTED: ${this.fpsCounter.fps} FPS - Performance mode: ${this.performanceMode}, TimeScale: ${this.timeScale}, Balls: ${this.balls.length}, Trails: ${this.trails.length}, Impact particles: ${this.impactParticles.length}, Active timeouts: ${this.activeTimeouts.length}, Active intervals: ${this.activeIntervals.length}`);
        // }
        
        // Cleanup math cache periodically
        this.cleanupMathCache();
        
        // FINAL NUCLEAR OPTION: Force timeScale to 1.0 right before rendering
        // This is the absolute last chance to override any lingering slow motion
        if (this.gameStarted && !this.isPaused) {
            const allowSlowMotion = (this.goalBlinkTimer > 0 && this.goalBlinkTarget) || 
                                   (this.multiBallZoom.active);
            
            if (!allowSlowMotion && this.timeScale !== 1.0) {
                this.timeScale = 1.0;
            }
        }
        
        // SAFETY CHECK: Ensure overhead lights are always orange during normal gameplay (TEMPORARILY DISABLED FOR DEBUGGING)
        // if (this.gameStarted && !this.isPaused && this.overheadLight && this.overheadLight2) {
        //     // Only check every 60 frames to avoid performance impact
        //     if (!this._overheadLightCheckFrame) this._overheadLightCheckFrame = 0;
        //     this._overheadLightCheckFrame++;
        //     
        //     if (this._overheadLightCheckFrame % 60 === 0) {
        //         const currentColor1 = this.overheadLight.color.getHex();
        //         const currentColor2 = this.overheadLight2.color.getHex();
        //         const orangeColor = 0xff6600;
        //         
        //         // Force orange if not already orange (unless in special states)
        //         const inSpecialState = (this.goalBlinkTimer > 0 && this.goalBlinkTarget) || 
        //                               (this.multiBallZoom.active) ||
        //                               (this.isCelebrating);
        //         
        //         if (!inSpecialState) {
        //             if (currentColor1 !== orangeColor) {
        //                 this.overheadLight.color.setHex(orangeColor);
        //                 log('🔧 Safety fix: Overhead light 1 forced back to orange');
        //             }
        //             if (currentColor2 !== orangeColor) {
        //                 this.overheadLight2.color.setHex(orangeColor);
        //                 log('🔧 Safety fix: Overhead light 2 forced back to orange');
        //             }
        //         }
        //     }
        // }
        
        // Optimized rendering pipeline with performance mode support
        if (this.performanceMode) {
            // Performance mode: simplified pipeline
            if (this.crtEffect.enabled) {
                // Render to CRT render target
                this.renderer.setRenderTarget(this.renderTarget);
                this.renderer.toneMappingExposure = 2.678;
                this.renderer.clear();
                this.renderer.render(this.scene, this.camera);
                
                // Apply CRT effect
                this.crtMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
                this.renderer.setRenderTarget(null);
                this.renderer.render(this.crtScene, this.crtCamera);
            } else {
                // Direct render without CRT
            this.renderer.setRenderTarget(null);
            this.renderer.toneMappingExposure = 2.678;
            this.renderer.clear();
            this.renderer.render(this.scene, this.camera);
            }
        } else {
            // Quality mode: full post-processing pipeline
            // 1. Render scene to base render target
            this.renderer.setRenderTarget(this.bloomRenderTarget);
            this.renderer.toneMappingExposure = 2.678; // Another 10% darker (was 2.975)
            this.renderer.clear();
            this.renderer.render(this.scene, this.camera);
            
            
            // 2. Apply fisheye distortion (intermediate buffer)
            this.renderer.setRenderTarget(this.fisheyeRenderTarget);
            this.renderer.toneMappingExposure = 3.825; // Another 10% darker (was 4.25)
            this.renderer.clear();
            this.renderer.render(this.scene, this.camera);
            
            
            // 3. Render bloom on top of fisheye target with additive blending
            this.bloomMaterial.uniforms.tDiffuse.value = this.bloomRenderTarget.texture;
            this.renderer.render(this.bloomScene, this.bloomCamera);
            
            // 4. Apply lens flare effect (creates streaks from bright lights)
            this.renderer.setRenderTarget(this.lensFlareRenderTarget);
            this.lensFlareMaterial.uniforms.tDiffuse.value = this.fisheyeRenderTarget.texture;
            this.renderer.clear();
            this.renderer.render(this.lensFlareScene, this.lensFlareCamera);
            
            // 5. Apply CRT effect if enabled
            if (this.crtEffect.enabled) {
                // Render lens flare result to CRT render target
                this.renderer.setRenderTarget(this.renderTarget);
                this.renderer.render(this.lensFlareScene, this.lensFlareCamera);
                
                // Apply CRT effect to final result
                this.crtMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
            this.renderer.setRenderTarget(null);
                this.renderer.render(this.crtScene, this.crtCamera);
            } else {
                // Final render to screen without CRT
                this.renderer.setRenderTarget(null);
                this.renderer.render(this.lensFlareScene, this.lensFlareCamera);
            }
            
            // 8. Apply RGB split as final overlay (always active, intensity varies) - COMMENTED OUT
            // this.renderer.setRenderTarget(this.rgbSplitRenderTarget);
            // this.rgbSplitMaterial.uniforms.tDiffuse.value = this.fisheyeRenderTarget.texture;
            // this.renderer.clear();
            // this.renderer.render(this.rgbSplitScene, this.rgbSplitCamera);
            // 
            // // Render RGB split result to screen
            // this.renderer.setRenderTarget(null);
            // this.renderer.render(this.rgbSplitScene, this.rgbSplitCamera);
        }
    }
}

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    log('🚀 Starting Tron Pong game...');
    game = new TronPong();
    log('✅ Game initialized successfully');
    
    // Debug helpers removed for production cleanliness
});
