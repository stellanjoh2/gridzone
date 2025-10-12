// Tron-style 3D Pong Game with Enhanced Trail & Background
// OPTIMIZED VERSION - Performance improvements:
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
            emissiveIntensity: 0.04       // Emissive strength
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
        this.nextBallThreshold = 2; // Add ball after this many hits
        this.maxBalls = 2; // Maximum 2 balls on screen (multi-ball only)
        
        // Cache DOM elements for better performance
        this.domElements = {
            player1Score: null,
            player2Score: null,
            lifeScoreValue: null,
            combo: null,
            ui: null,
            deathScreen: null,
            pauseMenu: null,
            awesomeText: null,
            multiBallText: null
        };
        
        // Game state
        this.paddleSpeed = 0.5;
        this.aiSpeed = 0.4;
        this.aiDifficulty = 0.8;
        this.score = { player1: 0, player2: 0 };
        this.gameStarted = false;
        this.isPaused = false;
        this.timeScale = 1.0; // For slow motion effects (1.0 = normal, 0.3 = slow mo)
        
        // Combo system
        this.consecutiveHits = 0;
        this.currentCombo = 0;
        this.comboTimeout = null;
        
        // Life score (based on ball active time)
        this.lifeScore = 0;
        this.lifeScoreAccumulator = 0;
        
        // Camera system - reduced follow sensitivity
        this.cameraShake = { 
            intensity: 0, 
            decay: 0.98, // Slower decay for longer shake
            rotation: 0, 
            rotationDecay: 0.92,
            pullback: 0,
            pullbackDecay: 0.94,
            horizontalShift: 0,
            horizontalShiftDecay: 0.9
        };
        this.cameraTarget = { x: 0, z: 0, zoom: 20 };
        this.cameraSmooth = 0.02; // Reduced from 0.05 for smoother movement
        
        // Start menu camera (cinematic rotation)
        this.startMenuCamera = {
            active: true,
            angle: 0, // Current rotation angle
            radius: 25, // Distance from center
            height: 3, // Height above ground (lower than gameplay camera)
            speed: 0.15, // Rotation speed (radians per second)
            lookAtHeight: 2 // What height to look at
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
        
        // Camera transition (from start menu to gameplay)
        this.cameraTransition = {
            active: false,
            startTime: 0,
            duration: 2000, // 2 second smooth transition
            startPos: { x: 0, y: 0, z: 0 },
            startRot: { x: 0, y: 0, z: 0 },
            targetPos: { x: 0, y: 20, z: 22 }, // z=22 matches camera system default
            targetLookAt: { x: 0, y: 1, z: 0 }
        };
        
        // Paddle tilt and look effect
        this.paddlePreviousX = 0;
        this.cameraTilt = 0;
        this.cameraTiltSmooth = 0.15;
        this.cameraLookOffset = 0; // Horizontal look offset
        this.cameraLookSmooth = 0.08; // How fast camera follows paddle
        
        // Camera system
        this.cameraTarget = { x: 0, y: 0, z: 0, zoom: 22 };
        this.cameraSmooth = 0.05; // Smooth lerp factor for camera movement
        
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
        
        // Environment map for reflections
        this.envMap = null;
        
        // Laser forcefield goals
        this.playerGoal = null;
        this.aiGoal = null;
        this.goalAnimationTime = 0;
        this.goalBlinkTimer = 0; // Timer for fast green blink effect
        this.goalBlinkTarget = null; // Which goal is blinking
        
        // Impact effects - object pooling
        this.impactParticles = [];
        this.impactLights = [];
        this.particlePool = [];
        this.particlePoolSize = 100;
        
        // Trail system - enhanced (supports multiple balls)
        this.trails = []; // Array of trail objects, one per ball
        this.maxTrailLength = 50; // Longer trail
        this.currentBallOwner = null; // Track who last hit the ball
        
        // Audio
        this.sounds = {
            paddleHit: null,
            wallHit: null,
            death: null,
            music: null,
            combo: null,
            score: null,
            multiBall: null,
            goalAlarm: null
        };
        
        this.cacheDOMElements(); // Cache DOM first!
        this.init();
        this.loadSounds();
    }
    
    cacheDOMElements() {
        // Cache DOM queries to avoid repeated lookups
        this.domElements.player1Score = document.getElementById('player1Score');
        this.domElements.player2Score = document.getElementById('player2Score');
        this.domElements.lifeScoreValue = document.getElementById('lifeScoreValue');
        this.domElements.combo = document.getElementById('combo');
        this.domElements.ui = document.getElementById('ui');
        this.domElements.deathScreen = document.getElementById('deathScreen');
        this.domElements.pauseMenu = document.getElementById('pauseMenu');
        this.domElements.awesomeText = document.getElementById('awesomeText');
        this.domElements.multiBallText = document.getElementById('multiBallText');
    }
    
    loadSounds() {
        // Load sound files
        try {
            this.sounds.paddleHit = new Audio('Laser_9_converted.wav');
            this.sounds.wallHit = new Audio('Bounce_Deep_converted.wav');
            this.sounds.death = new Audio('816043__etheraudio__crunchy-retro-pitch-down-echo-thing.wav');
            this.sounds.music = new Audio('ethereal-ambient-music-55115.mp3');
            this.sounds.combo = new Audio('video-game-bonus-323603.mp3');
            this.sounds.score = new Audio('arcade-ui-18-229517.mp3');
            this.sounds.multiBall = new Audio('213149__complex_waveform__8bit-style-bonus-effect.wav');
            this.sounds.goalAlarm = new Audio('sounds/Classic Arcade SFX Complete/Alarms and sirens/Alarm_repeating.wav');
            this.sounds.ballBase = new Audio('ball_sound_converted.wav'); // Base sound for cloning
            this.sounds.menuSelect = new Audio('Coin_22_converted.wav'); // Menu sound
            
            // Set volumes
            this.sounds.paddleHit.volume = 1.0; // Increased volume for laser sound
            this.sounds.wallHit.volume = 0.7; // Bounce_Deep sound
            this.sounds.death.volume = 0.5;
            this.sounds.music.volume = 0.67; // +7dB from 0.3 (was 0.3)
            this.sounds.combo.volume = 0.6;
            this.sounds.score.volume = 0.7;
            this.sounds.multiBall.volume = 0.7;
            this.sounds.menuSelect.volume = 0.6;
            this.sounds.goalAlarm.volume = 0.8; // Loud alarm for goal flash!
            
            // Music settings
            this.sounds.music.loop = true;
            this.sounds.goalAlarm.loop = true; // Loop the alarm while green wall is flashing
            
            console.log('Sounds loaded successfully!');
        } catch (e) {
            console.log('Could not load sounds:', e);
        }
    }
    
    playSound(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log(`Could not play ${soundName}`));
        }
    }
    
    triggerRumble(intensity = 0.3, duration = 100) {
        if (this.gamepad && this.gamepad.vibrationActuator) {
            this.gamepad.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration: duration,
                weakMagnitude: intensity * 0.5,
                strongMagnitude: intensity
            }).catch(e => console.log('Rumble not supported'));
        }
    }
    
    getParticleFromPool() {
        // Reuse particles from pool for better performance
        for (let i = 0; i < this.particlePool.length; i++) {
            if (!this.particlePool[i].visible) {
                return this.particlePool[i];
            }
        }
        // Create new particle if pool is empty
            const geometry = new THREE.SphereGeometry(0.1, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                transparent: true,
                blending: THREE.AdditiveBlending
            });
            const particle = new THREE.Mesh(geometry, material);
        this.scene.add(particle);
        this.particlePool.push(particle);
        return particle;
    }
    
    createImpactEffect(position, color) {
        // Create particle burst using object pooling
        const particleCount = 15; // Reduced from 20
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
        const impactLight = new THREE.PointLight(color, 6.4, 12, 2); // 20% reduced (was 8)
        impactLight.position.copy(position);
        impactLight.castShadow = false; // Disabled for performance
        impactLight.life = 1.0;
        impactLight.decay = 0.04;
        impactLight.maxIntensity = 6.4; // 20% reduced (was 8)
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
        this.scene.fog = new THREE.Fog(0x0a2828, 25, 110); // Dark cyan/teal fog
        
        // Camera setup - tilted down more
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 18, 22);
        this.camera.lookAt(0, -4, 0);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x0a2828); // Dark cyan/teal background (matches fog)
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
        this.createBackground();
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
        
        // Main render target (lower resolution for better performance)
        this.bloomRenderTarget = new THREE.WebGLRenderTarget(
            width / 4,
            height / 4,
            renderTargetParameters
        );
        
        // Fisheye distortion render target (full resolution)
        this.fisheyeRenderTarget = new THREE.WebGLRenderTarget(width, height, renderTargetParameters);
        
        // Depth of Field render targets
        this.dofRenderTarget = new THREE.WebGLRenderTarget(width, height, renderTargetParameters);
        this.depthRenderTarget = new THREE.WebGLRenderTarget(width, height, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat
        });
        
        // Bloom quad mesh with additive blending shader
        const bloomShader = {
            uniforms: {
                tDiffuse: { value: null },
                bloomStrength: { value: 0.4 }, // Lower intensity (was 0.8)
                bloomRadius: { value: 7 } // Wider spread (was 4.375)
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
                    
                    // Optimized blur with fewer samples
                    vec4 sum = vec4(0.0);
                    float blurSize = 0.004 * bloomRadius;
                    float totalWeight = 0.0;
                    
                    // Smaller kernel for better performance
                    for(float x = -4.0; x <= 4.0; x += 2.0) {
                        for(float y = -4.0; y <= 4.0; y += 2.0) {
                            float distance = length(vec2(x, y));
                            float weight = exp(-distance * distance / 20.0); // Gaussian falloff
                            vec2 offset = vec2(x, y) * blurSize;
                            sum += texture2D(tDiffuse, vUv + offset) * weight;
                            totalWeight += weight;
                        }
                    }
                    
                    sum /= totalWeight;
                    
                    // Only bright areas bloom with softer threshold
                    float brightness = dot(sum.rgb, vec3(0.2126, 0.7152, 0.0722));
                    float bloomAmount = smoothstep(0.3, 0.8, brightness); // Smooth transition
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
        
        this.dofMaterial = new THREE.ShaderMaterial({
            uniforms: dofShader.uniforms,
            vertexShader: dofShader.vertexShader,
            fragmentShader: dofShader.fragmentShader,
            depthTest: false
        });
        
        this.dofQuad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), this.dofMaterial);
        this.dofScene = new THREE.Scene();
        this.dofScene.add(this.dofQuad);
        
        console.log('✓ Custom bloom & DoF effects enabled!');
    }
    
    setupEnvironmentMap() {
        // Load the actual cubemap image
        const textureLoader = new THREE.TextureLoader();
        
        textureLoader.load(
            'industrialfix1.jpg',
            (texture) => {
                // Success callback
                texture.mapping = THREE.EquirectangularReflectionMapping;
                texture.encoding = THREE.sRGBEncoding;
                this.envMap = texture;
                
                // Apply to all materials that need it
                this.updateMaterialsWithEnvMap();
                
                console.log('✓ Environment map loaded successfully!', texture);
            },
            (progress) => {
                // Progress callback
                console.log('Loading cubemap...', (progress.loaded / progress.total * 100).toFixed(0) + '%');
            },
            (error) => {
                // Error callback
                console.error('Error loading cubemap:', error);
                console.log('Creating fallback procedural cubemap...');
                this.createFallbackEnvMap();
            }
        );
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
        console.log('✓ Fallback environment map created');
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
        
        console.log(`✓ Materials updated with environment map! (${updatedCount} materials updated)`);
    }
    
    createBackground() {
        // Background removed - using pure scene color
        console.log('Background textures disabled');
    }
    
    createLighting() {
        // Ambient light - teal tinted
        const ambientLight = new THREE.AmbientLight(0x1a5566, 0.3);
        this.scene.add(ambientLight);
        
        // Soft LIME GREEN omni light positioned very high and closer to camera
        this.overheadLight = new THREE.PointLight(0x88ff00, 4, 120);
        this.overheadLight.position.set(0, 60, 20);
        this.overheadLight.castShadow = false; // Disabled for performance - use ball light for shadows
        this.scene.add(this.overheadLight);
        
        // Magenta light way behind enemy at same height
        this.overheadLight2 = new THREE.PointLight(0xff00ff, 4, 120);
        this.overheadLight2.position.set(0, 60, -120);
        this.overheadLight2.castShadow = false; // Disabled for performance
        this.scene.add(this.overheadLight2);
        
        // LIME GREEN light above player paddle - subtle neutral intensity
        // Positioned slightly in front so shadow falls BEHIND paddle
        this.playerLight = new THREE.PointLight(0x88ff00, 1.5, 200); // Increased intensity for better shadows
        this.playerLight.position.set(0, 3, 13); // z=13 (2 units in front) for shadow behind paddle
        this.playerLight.castShadow = true;
        this.playerLight.shadow.mapSize.width = 1024; // Higher resolution shadows
        this.playerLight.shadow.mapSize.height = 1024;
        this.playerLight.shadow.camera.near = 0.1;
        this.playerLight.shadow.camera.far = 25;
        this.playerLight.shadow.bias = -0.005;
        this.scene.add(this.playerLight);
        
        // Magenta light above AI paddle - subtle neutral intensity
        // Positioned slightly in front so shadow falls BEHIND paddle
        this.aiLight = new THREE.PointLight(0xff00ff, 1.5, 200); // Increased intensity for better shadows
        this.aiLight.position.set(0, 3, -13); // z=-13 (2 units in front) for shadow behind paddle
        this.aiLight.castShadow = true;
        this.aiLight.shadow.mapSize.width = 1024; // Higher resolution shadows
        this.aiLight.shadow.mapSize.height = 1024;
        this.aiLight.shadow.camera.near = 0.1;
        this.aiLight.shadow.camera.far = 25;
        this.aiLight.shadow.bias = -0.005;
        this.scene.add(this.aiLight);
        
        // Ball lights with shadows - one per ball (max 2)
        this.ballLights = [];
        
        // Create first ball light - LIME GREEN
        const ballLight = new THREE.PointLight(0x88ff00, 3, 45);
        ballLight.castShadow = true;
        ballLight.shadow.mapSize.width = 512;
        ballLight.shadow.mapSize.height = 512;
        ballLight.shadow.bias = -0.001;
        this.scene.add(ballLight);
        this.ballLights.push(ballLight);
        
        // Keep reference to first light for compatibility
        this.ballLight = ballLight;
        
        // Animated circulating lights removed
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
                    const height = 0.2 + Math.random() * 2;
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
                }
            }
        }
        
        // Create grid of cubes at the back - optimized shadows
        const backGridRows = 8;
        const backGridCols = 20;
        
        for (let row = 0; row < backGridRows; row++) {
            for (let col = 0; col < backGridCols; col++) {
                const width = 1 + Math.random() * 3;
                const height = 0.2 + Math.random() * 2;
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
        
        // Create grid of cubes at the front (behind player) - optimized shadows
        const frontGridRows = 6;
        const frontGridCols = 20;
        
        for (let row = 0; row < frontGridRows; row++) {
            for (let col = 0; col < frontGridCols; col++) {
                const width = 1 + Math.random() * 3;
                const height = 0.2 + Math.random() * 2;
                const depth = 1 + Math.random() * 3;
                
                const geometry = new THREE.BoxGeometry(width, height, depth);
                const cube = new THREE.Mesh(geometry, material.clone());
                
                const x = (col - frontGridCols / 2) * spacing;
                const z = (playAreaDepth / 2 + clearance + row * spacing);
                const y = height / 2 - 2;
                
                cube.position.set(x, y, z);
                
                // Randomly make some cubes 2x larger
                if (Math.random() < 0.3) {
                    cube.scale.set(2, 2, 2);
                }
                
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
        
        // Far front - larger boxes
        for (let i = 0; i < 12; i++) {
            for (let j = 0; j < 3; j++) {
                const width = 3 + Math.random() * 5;
                const height = 0.5 + Math.random() * 4;
                const depth = 3 + Math.random() * 5;
                
                const geometry = new THREE.BoxGeometry(width, height, depth);
                const cube = new THREE.Mesh(geometry, material.clone());
                
                const x = (i - 6) * 8;
                const z = (playAreaDepth / 2 + clearance + frontGridRows * spacing + 8 + j * 8);
                const y = height / 2 - 2;
                
                cube.position.set(x, y, z);
                cube.castShadow = true;
                cube.receiveShadow = true;
                
                this.scene.add(cube);
            }
        }
        
        // Extra distant boxes - even further into the background
        // Very far sides
        for (let side of [-1, 1]) {
            for (let i = 0; i < 15; i++) {
                for (let j = 0; j < 4; j++) {
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
                }
            }
        }
        
        // Very far back
        for (let i = 0; i < 20; i++) {
            for (let j = 0; j < 4; j++) {
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
                
                const cube = new THREE.Mesh(cubeGeometry, cubeMaterial.clone());
                
                cube.position.set(posX, -2, posZ);
                
                // OPTIMIZATION: Only enable shadows for cubes in/near the play area
                // Play area is roughly -12 to +12 in X (between walls) and -15 to +15 in Z (paddle range)
                const isInPlayArea = Math.abs(posX) < 13 && Math.abs(posZ) < 16;
                cube.receiveShadow = isInPlayArea;
                cube.castShadow = isInPlayArea;
                
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
        
        console.log(`Floor created with ${this.floorCubes.length} cubes (confined within laser walls)`);
    }
    
    
    createBall() {
        // Create first ball
        this.spawnBall(0, 0, 0, { x: 0.15, y: 0, z: -0.15 });
    }
    
    spawnBall(x, y, z, velocity) {
        const ballGeometry = new THREE.SphereGeometry(0.5, 24, 24);
        const ballMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x88ff00,            // Vibrant lime green
            emissive: 0x88ff00,         // Vibrant lime green emissive
            emissiveIntensity: 0.5,
            metalness: 0.9,
            roughness: 0.05,
            clearcoat: 1.0
        });
        
        const ball = new THREE.Mesh(ballGeometry, ballMaterial);
        ball.position.set(x, y, z);
        ball.castShadow = true;
        this.scene.add(ball);
        
        const ballIndex = this.balls.length;
        this.balls.push(ball);
        this.ballVelocities.push({ ...velocity });
        
        // Create trail for this ball
        this.createTrailForBall(ballIndex);
        
        // Create light for this ball (if we don't have one yet)
        if (ballIndex >= this.ballLights.length) {
            const ballLight = new THREE.PointLight(0x88ff00, 3, 45); // Lime green
            ballLight.castShadow = true;
            ballLight.shadow.mapSize.width = 512;
            ballLight.shadow.mapSize.height = 512;
            ballLight.shadow.bias = -0.001;
            this.scene.add(ballLight);
            this.ballLights.push(ballLight);
            console.log(`Created light for ball ${ballIndex + 1}`);
        }
        
        // Create spatial audio for this ball
        const ballSound = new Audio('ball_sound_converted.wav');
        ballSound.loop = true;
        ballSound.volume = 0; // Start at 0, will be updated based on distance
        ballSound.play().catch(e => console.log('Ball sound autoplay blocked'));
        this.ballSounds.push(ballSound);
        
        console.log(`Ball spawned! Total balls: ${this.balls.length}`);
        return ball;
    }
    
    setBallColor(ballIndex, owner) {
        const ball = this.balls[ballIndex];
        if (!ball) return;
        
        const trail = this.trails[ballIndex];
        
        if (owner === 'player') {
            // LIME GREEN for player
            ball.material.color.setHex(0x88ff00);
            ball.material.emissive.setHex(0x88ff00);
            
            // Update trail color
            if (trail) {
                trail.mesh.material.color.setHex(0x88ff00);
                trail.spheres.forEach(sphere => {
                sphere.material.color.setHex(0x88ff00);
            });
            }
            
            // Update ball light color
            if (this.ballLights[ballIndex]) {
                this.ballLights[ballIndex].color.setHex(0x88ff00);
            }
        } else if (owner === 'ai') {
            // Magenta for AI
            ball.material.color.setHex(0xff00ff);
            ball.material.emissive.setHex(0xff00ff);
            
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
        
        if (ballIndex === 0) {
        this.currentBallOwner = owner;
        }
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
        
        // Soft glowing material
        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0x88ff00,        // Lime green
            transparent: true,
            opacity: 0.6,
            linewidth: 8,
            blending: THREE.AdditiveBlending
        });
        
        const trailMesh = new THREE.Line(trailGeometry, trailMaterial);
        this.scene.add(trailMesh);
        
        // Add glow spheres for softer trail
        const trailSpheres = [];
        for (let i = 0; i < 12; i++) {
            const sphereGeometry = new THREE.SphereGeometry(0.3, 6, 6);
            const sphereMaterial = new THREE.MeshBasicMaterial({
                color: 0x88ff00,        // Lime green
                transparent: true,
                opacity: 0.3 * (1 - i / 12),
                blending: THREE.AdditiveBlending
            });
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
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
        
        for (let ballIndex = 0; ballIndex < this.balls.length; ballIndex++) {
            if (!this.trails[ballIndex]) continue;
            
            const ball = this.balls[ballIndex];
            const trail = this.trails[ballIndex];
            
        // Add current ball position to trail
            trail.positions.unshift({
                x: ball.position.x,
                y: ball.position.y,
                z: ball.position.z
        });
        
        // Keep trail at max length
            if (trail.positions.length > this.maxTrailLength) {
                trail.positions.pop();
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
        const paddle1Material = new THREE.MeshPhysicalMaterial({
            color: 0x88ff00,        // Vibrant lime green
            emissive: 0x000000,     // Black emissive in neutral state - no glow!
            emissiveIntensity: 0.0, // No intensity
            metalness: 0.9,
            roughness: 0.1,
            clearcoat: 1.0
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
        this.paddle1.userData.originalColor = 0x88ff00; // Lime green
        this.paddle1.userData.originalEmissive = 0x000000; // Black emissive for neutral
        this.paddle1.userData.originalEmissiveIntensity = 0.0; // Store neutral intensity (no glow)
        // Store material reference for blink animations
        this.paddle1.userData.material = paddle1Material;
        this.scene.add(this.paddle1);
        
        // AI paddle (MAGENTA) - at top
        // PILL SHAPE - Create using cylinder + 2 hemispheres
        const paddle2Material = new THREE.MeshPhysicalMaterial({
            color: 0xff00ff,
            emissive: 0x000000, // Black emissive in neutral state - no glow!
            emissiveIntensity: 0.0, // No intensity
            metalness: 0.9,
            roughness: 0.1,
            clearcoat: 1.0
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
        this.paddle2.userData.originalEmissive = 0x000000; // Black emissive for neutral
        this.paddle2.userData.originalEmissiveIntensity = 0.0; // Store neutral intensity (no glow)
        // Store material reference for blink animations
        this.paddle2.userData.material = paddle2Material;
        this.scene.add(this.paddle2);
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
        
        console.log(`Walls created: Left ${this.leftWallCubes.length} pillars, Right ${this.rightWallCubes.length} pillars - CONFINED WITHIN LASER WALLS!`);
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
                emissiveIntensity: { value: 3.0 },
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
        
        console.log('✨ Laser forcefield goals created!');
    }
    
    createParticles() {
        // Create floating neon dust particles - doubled for more atmosphere!
        const particleCount = 800; // Doubled from 400 (100% more!)
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            // Random position in much larger area - many closer to camera
            const x = (Math.random() - 0.5) * 60; // Expanded from 50
            const y = Math.random() * 15 - 2; // Increased height from 12
            const z = (Math.random() - 0.5) * 80; // Expanded from 60 - much closer to camera!
            
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
            
            // Random sizes with variation - some much bigger
            const sizeVariation = Math.random();
            if (sizeVariation < 0.1) {
                // 10% chance of large particles
                sizes[i] = 0.15 + Math.random() * 0.15; // 0.15 to 0.3
            } else if (sizeVariation < 0.3) {
                // 20% chance of medium particles
                sizes[i] = 0.08 + Math.random() * 0.07; // 0.08 to 0.15
            } else {
                // 70% chance of small particles
                sizes[i] = 0.025 + Math.random() * 0.05; // 0.025 to 0.075
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
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.particles);
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
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Gamepad support
        this.lastStartPress = false; // Debounce for start button
        
        window.addEventListener('gamepadconnected', (e) => {
            console.log('🎮 Gamepad connected:', e.gamepad.id);
            this.gamepad = e.gamepad;
        });
        
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('🎮 Gamepad disconnected');
            this.gamepad = null;
        });
        
        // Window resize (consolidated single listener)
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            
            // Resize bloom render target
            if (this.bloomRenderTarget) {
                this.bloomRenderTarget.setSize(window.innerWidth / 4, window.innerHeight / 4);
            }
            
            // Resize fisheye render target
            if (this.fisheyeRenderTarget) {
                this.fisheyeRenderTarget.setSize(window.innerWidth, window.innerHeight);
            }
            
            // Update fisheye aspect ratio
            if (this.fisheyeMaterial) {
                this.fisheyeMaterial.uniforms.aspectRatio.value = window.innerWidth / window.innerHeight;
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
                this.fullGameReset();
            });
        }
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
                console.log('🎮 Start button pressed!');
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
        
        console.log('🚀 Starting game...');
        
            this.gameStarted = true;
            this.domElements.ui.style.display = 'none';
        document.getElementById('logo').style.display = 'none';
        
        // Spawn ball IMMEDIATELY with fixed, predictable velocity
        // Ball always starts toward enemy (AI) for clean, consistent start
        console.log('⚽ Ball spawning - clean start!');
        this.spawnBall(0, 0, 0, {
            x: 0,      // No horizontal movement initially
            y: 0,
            z: -0.15   // Always toward enemy/AI (negative Z)
        });
        
        // Reset game state
        this.successfulHits = 0;
        this.nextBallThreshold = 2;
        this.paddle1Pushback = 0;
        this.paddle2Pushback = 0;
        this.paddle1.position.z = 15;
        this.paddle2.position.z = -15;
        
        // Start cinematic camera transition!
        this.startCameraTransition();
        
        this.playSound('menuSelect');
            
            // Start music
            if (this.sounds.music) {
                this.sounds.music.play().catch(e => console.log('Could not play music'));
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
        
        if (Math.abs(leftStickX) > deadzone) {
            const speed = this.paddleSpeed * Math.abs(leftStickX) * this.timeScale; // Apply timeScale for slow motion
            if (leftStickX < 0 && this.paddle1.position.x > -10) {
                this.paddle1.position.x -= speed;
            } else if (leftStickX > 0 && this.paddle1.position.x < 10) {
                this.paddle1.position.x += speed;
            }
        }
        
        // Options button (button 9) to pause
        if (this.gamepad.buttons[9] && this.gamepad.buttons[9].pressed) {
            if (!this.lastPausePress) {
                this.togglePause();
                this.lastPausePress = true;
            }
        } else {
            this.lastPausePress = false;
        }
        
        // Square button (button 2) to reset game when paused
        if (this.isPaused && this.gamepad.buttons[2] && this.gamepad.buttons[2].pressed) {
            if (!this.lastResetPress) {
                this.fullGameReset();
                this.lastResetPress = true;
            }
        } else {
            this.lastResetPress = false;
        }
    }
    
    togglePause() {
        if (!this.gameStarted) return;
        
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.domElements.pauseMenu.style.display = 'block';
            this.playSound('menuSelect'); // Play menu sound when opening pause menu
            
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
            
            // Mute music when paused
            if (this.sounds.music) {
                this.sounds.music.pause();
            }
        } else {
            this.domElements.pauseMenu.style.display = 'none';
            this.playSound('menuSelect'); // Play menu sound when closing pause menu
            
            // Deactivate pause camera
            this.pauseCamera.active = false;
            
            // Resume music when unpaused
            if (this.sounds.music) {
                this.sounds.music.play().catch(e => console.log('Could not resume music'));
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
        const x = Math.cos(totalAngle) * this.pauseCamera.radius;
        const z = Math.sin(totalAngle) * this.pauseCamera.radius;
        const y = this.pauseCamera.height;
        
        // Set camera position
        this.camera.position.set(x, y, z);
        
        // Look at center of arena
        this.camera.lookAt(0, this.pauseCamera.lookAtHeight, 0);
    }
    
    startMultiBallZoom() {
        // Quick dramatic zoom on NEW ball (enemy ball) + super slow-mo
        console.log('🎬 MULTI-BALL CAMERA ZOOM STARTING!');
        
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
        setTimeout(() => {
            this.multiBallZoom.active = false;
            this.timeScale = 1.0; // Back to normal speed
            
            // Ensure FOV is back to normal
            this.camera.fov = this.multiBallZoom.originalFOV;
            this.camera.updateProjectionMatrix();
            
            console.log('✅ Multi-ball sequence complete!');
        }, this.multiBallZoom.duration);
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
            const offsetX = Math.sin(angle) * radius * 0.5;
            const offsetZ = Math.cos(angle) * radius * 0.3;
            
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
            
            // Default gameplay camera position
            const finalPos = { x: 0, y: 20, z: 20 };
            const finalLookAt = { x: 0, y: 1, z: 0 };
            
            // Interpolate back to gameplay position
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
        // Flash paddle to white (paddle is now a Group, access material via userData)
        const material = paddle.userData.material;
        material.color.setHex(0xffffff);
        material.emissive.setHex(0xffffff);
        material.emissiveIntensity = 2.0;
        
        // Boost the paddle's point light intensity when hit
        if (paddleName === 'paddle1' && this.playerLight) {
            this.playerLight.intensity = 8.0; // Bright flash!
        } else if (paddleName === 'paddle2' && this.aiLight) {
            this.aiLight.intensity = 8.0; // Bright flash!
        }
        
        // Set timer for emissive fade (1 second - shorter than pushback)
        this.paddleBlinkTimers[paddleName] = 1.0;
    }
    
    updatePaddleBlinks(deltaTime) {
        // Paddle 1 blink - fade out gradually
        if (this.paddleBlinkTimers.paddle1 > 0) {
            this.paddleBlinkTimers.paddle1 -= deltaTime;
            
            // Calculate fade progress (0 = fully faded, 1 = full white) - 1 second duration
            const fadeProgress = Math.max(0, this.paddleBlinkTimers.paddle1 / 1.0);
            
            // Interpolate between white and original color
            const originalColor = this.paddle1.userData.originalColor;
            const originalEmissive = this.paddle1.userData.originalEmissive;
            const originalIntensity = this.paddle1.userData.originalEmissiveIntensity || 0.0;
            
            // Lerp colors
            const r = Math.floor(255 * fadeProgress + ((originalColor >> 16) & 255) * (1 - fadeProgress));
            const g = Math.floor(255 * fadeProgress + ((originalColor >> 8) & 255) * (1 - fadeProgress));
            const b = Math.floor(255 * fadeProgress + (originalColor & 255) * (1 - fadeProgress));
            
            const er = Math.floor(255 * fadeProgress + ((originalEmissive >> 16) & 255) * (1 - fadeProgress));
            const eg = Math.floor(255 * fadeProgress + ((originalEmissive >> 8) & 255) * (1 - fadeProgress));
            const eb = Math.floor(255 * fadeProgress + (originalEmissive & 255) * (1 - fadeProgress));
            
            // Access material via userData (paddle is now a Group)
            const material = this.paddle1.userData.material;
            material.color.setRGB(r / 255, g / 255, b / 255);
            material.emissive.setRGB(er / 255, eg / 255, eb / 255);
            material.emissiveIntensity = 2.0 * fadeProgress + originalIntensity * (1 - fadeProgress);
            
            // Also fade the light intensity
            if (this.playerLight) {
                this.playerLight.intensity = 8.0 * fadeProgress + 1.5 * (1 - fadeProgress);
            }
        }
        
        // Paddle 2 blink - fade out gradually
        if (this.paddleBlinkTimers.paddle2 > 0) {
            this.paddleBlinkTimers.paddle2 -= deltaTime;
            
            // Calculate fade progress (0 = fully faded, 1 = full white) - 1 second duration
            const fadeProgress = Math.max(0, this.paddleBlinkTimers.paddle2 / 1.0);
            
            // Interpolate between white and original color
            const originalColor = this.paddle2.userData.originalColor;
            const originalEmissive = this.paddle2.userData.originalEmissive;
            const originalIntensity = this.paddle2.userData.originalEmissiveIntensity || 0.0;
            
            // Lerp colors
            const r = Math.floor(255 * fadeProgress + ((originalColor >> 16) & 255) * (1 - fadeProgress));
            const g = Math.floor(255 * fadeProgress + ((originalColor >> 8) & 255) * (1 - fadeProgress));
            const b = Math.floor(255 * fadeProgress + (originalColor & 255) * (1 - fadeProgress));
            
            const er = Math.floor(255 * fadeProgress + ((originalEmissive >> 16) & 255) * (1 - fadeProgress));
            const eg = Math.floor(255 * fadeProgress + ((originalEmissive >> 8) & 255) * (1 - fadeProgress));
            const eb = Math.floor(255 * fadeProgress + (originalEmissive & 255) * (1 - fadeProgress));
            
            // Access material via userData (paddle is now a Group)
            const material = this.paddle2.userData.material;
            material.color.setRGB(r / 255, g / 255, b / 255);
            material.emissive.setRGB(er / 255, eg / 255, eb / 255);
            material.emissiveIntensity = 2.0 * fadeProgress + originalIntensity * (1 - fadeProgress);
            
            // Also fade the light intensity
            if (this.aiLight) {
                this.aiLight.intensity = 8.0 * fadeProgress + 1.5 * (1 - fadeProgress);
            }
        }
        
        // Update individual pillar blinks for left wall with wave propagation
        for (let pillar of this.leftWallCubes) {
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
    
    triggerWallBlink(wallPillars, ballZ) {
        // Create shockwave effect - impact center sends wave outward to nearby pillars
        // Energy dissipates as wave travels: weaker light + slower fadeout at distance
        const shockwaveRadius = 7.0; // Wider radius to affect 1-2 more pillars
        const waveSpeed = 0.04; // Time delay per unit distance (slower = more visible wave)
        
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
                // Close: 0.8s (slow, smooth)
                // Far: 1.4s (very long, gentle fade)
                pillar.userData.blinkDuration = 0.8 + ((1.0 - intensity) * 0.6);
                
                // PHYSICAL DISPLACEMENT: Push pillar inward MUCH more based on intensity
                // Maximum push at center (1.875 units), minimal at edge (0.25 units) - 25% stronger!
                pillar.userData.targetDisplacement = 0.25 + (intensity * 1.625);
            }
        }
    }
    
    updateParticles() {
        if (!this.particles || this.isPaused || !this.ball) return;
        
        const positions = this.particles.geometry.attributes.position.array;
        const time = this.clock.getElapsedTime();
        const ballPos = this.ball.position;
        
        // Physics constants
        const avoidanceRadius = 3.5;
        const avoidanceRadiusSq = avoidanceRadius * avoidanceRadius;
        const avoidanceStrength = 0.15;
        const returnStrength = 0.015;
        const damping = 0.97;
        
        // Cache ball position
        const bx = ballPos.x;
        const by = ballPos.y;
        const bz = ballPos.z;
        
        // Only update every other frame for performance
        if (!this._particleUpdateFrame) this._particleUpdateFrame = 0;
        this._particleUpdateFrame++;
        const skipFrame = this._particleUpdateFrame % 2 === 0;
        
        for (let i = 0; i < this.particleOriginalPositions.length; i++) {
            // Skip every other particle each frame for 2x performance
            if (skipFrame && i % 2 === 0) continue;
            const idx = i * 3;
            
            // Current particle position
            const px = positions[idx];
            const py = positions[idx + 1];
            const pz = positions[idx + 2];
            
            // Calculate distance to ball (squared to avoid sqrt)
            const dx = px - bx;
            const dy = py - by;
            const dz = pz - bz;
            const distanceSq = dx * dx + dy * dy + dz * dz;
            
            // Ball avoidance force (air drag effect)
            if (distanceSq < avoidanceRadiusSq && distanceSq > 0.01) {
                const distance = Math.sqrt(distanceSq); // Only sqrt when needed
                const force = (1 - distance / avoidanceRadius) * avoidanceStrength;
                
                // Normalize direction and apply force (using cached distance)
                const invDist = 1 / distance;
                this.particleVelocities[i].x += dx * invDist * force;
                this.particleVelocities[i].y += dy * invDist * force;
                this.particleVelocities[i].z += dz * invDist * force;
            }
            
            // Return to original position force
            const original = this.particleOriginalPositions[i];
            this.particleVelocities[i].x += (original.x - px) * returnStrength;
            this.particleVelocities[i].y += (original.y - py) * returnStrength;
            this.particleVelocities[i].z += (original.z - pz) * returnStrength;
            
            // Apply damping
            this.particleVelocities[i].x *= damping;
            this.particleVelocities[i].y *= damping;
            this.particleVelocities[i].z *= damping;
            
            // Add gentle floating motion
            const floatOffset = Math.sin(time + i * 0.1) * 0.002;
            
            // Update position
            positions[idx] += this.particleVelocities[i].x;
            positions[idx + 1] += this.particleVelocities[i].y + floatOffset;
            positions[idx + 2] += this.particleVelocities[i].z;
            
            // Keep particles within bounds
            const py_new = positions[idx + 1];
            if (py_new > 6) {
                positions[idx + 1] = 6;
                this.particleVelocities[i].y *= -0.5;
            } else if (py_new < -2) {
                positions[idx + 1] = -2;
                this.particleVelocities[i].y *= -0.5;
            }
        }
        
        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.rotation.y += 0.0005;
    }
    
    updateFloorGlow() {
        // Update floor cube reactions to balls passing over them
        // NO LIGHTING - just pure elevation based on magnetic force
        // OPTIMIZED: Only check cubes near ball positions (spatial optimization)
        if (!this.floorCubes || this.floorCubes.length === 0) return;
        
        const maxElevation = 1.8; // DRAMATIC elevation! (was 0.8)
        const activationRadius = 4.5; // LARGER magnetic field (was 2.5)
        const activationRadiusSq = activationRadius * activationRadius; // Cache squared radius
        const easeSpeed = 0.06; // Slightly slower return for smoother feel
        
        // Mark all cubes as not active this frame
        for (let j = 0; j < this.floorCubes.length; j++) {
            this.floorCubes[j].userData.activeThisFrame = false;
        }
        
        // Check each ball
        for (let i = 0; i < this.balls.length; i++) {
            const ball = this.balls[i];
            const bx = ball.position.x;
            const bz = ball.position.z;
            
            // OPTIMIZATION: Only check cubes within bounding box around ball
            // This reduces checks from O(all cubes) to O(nearby cubes only)
            for (let j = 0; j < this.floorCubes.length; j++) {
                const cube = this.floorCubes[j];
                const cx = cube.position.x;
                const cz = cube.position.z;
                
                // Quick bounding box test first (cheaper than distance)
                const dx = bx - cx;
                const dz = bz - cz;
                if (Math.abs(dx) > activationRadius || Math.abs(dz) > activationRadius) continue;
                
                // Calculate distance squared (avoid sqrt when possible)
                const distanceSq = dx * dx + dz * dz;
                
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
        
        console.log('🔴 RED OBSTACLE SPAWNED at:', randomCube.position.x, randomCube.position.z);
    }
    
    updatePlayerPaddle() {
        if (this.isPaused) return;
        
        // Store previous position for tilt calculation
        const previousX = this.paddle1.position.x;
        
        // Player controls (A/D or Arrow keys) - apply timeScale for slow motion
        if ((this.keys['a'] || this.keys['arrowleft']) && this.paddle1.position.x > -10) {
            this.paddle1.position.x -= this.paddleSpeed * this.timeScale;
        }
        if ((this.keys['d'] || this.keys['arrowright']) && this.paddle1.position.x < 10) {
            this.paddle1.position.x += this.paddleSpeed * this.timeScale;
        }
        
        // Calculate paddle velocity for camera tilt
        const paddleVelocity = this.paddle1.position.x - previousX;
        
        // Target tilt based on paddle movement (increased for more noticeable effect)
        const targetTilt = paddleVelocity * -0.3; // Doubled intensity (was -0.15)
        
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
        if (!this.gameStarted || this.isPaused || this.balls.length === 0) return;
        
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
        
        // Move towards target (apply timeScale for slow motion)
            if (currentX < targetWithError - 0.5 && this.paddle2.position.x < 10) {
                this.paddle2.position.x += this.aiSpeed * this.timeScale;
            } else if (currentX > targetWithError + 0.5 && this.paddle2.position.x > -10) {
                this.paddle2.position.x -= this.aiSpeed * this.timeScale;
            }
        
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
        if (!this.gameStarted || this.isPaused) return;
        
        // Update trail for all balls
        this.updateTrail();
        
        // Update ball lights to follow their respective balls
        for (let i = 0; i < this.balls.length && i < this.ballLights.length; i++) {
            this.ballLights[i].position.copy(this.balls[i].position);
            this.ballLights[i].position.y += 2;
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
        
        // Update each ball
        for (let i = 0; i < this.balls.length; i++) {
            const ball = this.balls[i];
            const velocity = this.ballVelocities[i];
            
            // Move ball (apply timeScale for slow motion effects!)
            ball.position.x += velocity.x * this.timeScale;
            ball.position.z += velocity.z * this.timeScale;
        
        // Wall collisions - Simple boundary-based detection (NOT checking individual cubes)
            // This prevents ball from getting stuck in/between wall pillars
            // Position correction ensures ball is always pushed back outside wall boundary
            if (ball.position.x <= -11.5) {
                velocity.x = Math.abs(velocity.x); // Force positive (bounce right)
                ball.position.x = -11.5; // Push ball back to exact wall boundary
                
                // ANTI-STUCK: Add slight randomness to break shallow angle traps
                velocity.z += (Math.random() - 0.5) * 0.04;
                
                // ANTI-STUCK: Enforce minimum Z velocity (prevent too-horizontal movement)
                const minZVelocity = 0.08;
                if (Math.abs(velocity.z) < minZVelocity) {
                    velocity.z = velocity.z > 0 ? minZVelocity : -minZVelocity;
                }
                
                this.triggerCameraShake(0.4, false, false, -1);
                this.triggerWallBlink(this.leftWallCubes, ball.position.z);
                this.triggerRumble(0.2, 80);
                this.createImpactEffect(ball.position.clone(), 0x88ff00);
                this.worldLightBoost = 12.0;
            this.playSound('wallHit');
        }
        
            if (ball.position.x >= 11.5) {
                velocity.x = -Math.abs(velocity.x); // Force negative (bounce left)
                ball.position.x = 11.5; // Push ball back to wall boundary
                
                // ANTI-STUCK: Add slight randomness to break shallow angle traps
                velocity.z += (Math.random() - 0.5) * 0.04;
                
                // ANTI-STUCK: Enforce minimum Z velocity (prevent too-horizontal movement)
                const minZVelocity = 0.08;
                if (Math.abs(velocity.z) < minZVelocity) {
                    velocity.z = velocity.z > 0 ? minZVelocity : -minZVelocity;
                }
                
                this.triggerCameraShake(0.4, false, false, 1);
                this.triggerWallBlink(this.rightWallCubes, ball.position.z);
                this.triggerRumble(0.2, 80);
                this.createImpactEffect(ball.position.clone(), 0x88ff00);
                this.worldLightBoost = 12.0;
            this.playSound('wallHit');
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
                    this.playSound('wallHit');
                    
                    // Flash the obstacle BRIGHT RED
                    obstacleCube.material.emissiveIntensity = 1.2;
                }
        }
        
        // Player paddle collision (bottom)
            if (ball.position.z >= 14.5 && 
                Math.abs(ball.position.x - paddle1X) < 2.5) {
                velocity.z *= -1.05;
                velocity.x += (ball.position.x - paddle1X) * 0.1;
                this.triggerCameraShake(0.5, true, true);
            this.triggerPaddleBlink(this.paddle1, 'paddle1');
                this.triggerRumble(0.4, 120);
                this.createImpactEffect(ball.position.clone(), 0x88ff00); // Lime green
                
                // Paddle pushback!
                this.paddle1Pushback = 1.5; // Push back 1.5 units (increased from 0.8)
                
                // Track successful hits for multi-ball
                this.successfulHits++;
                
                // Spawn additional ball every 2 hits (max 2 balls)
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
                    this.playSound('multiBall'); // Play sound
                    multiBallSpawnedThisFrame = true; // Prevent duplicate spawns this frame
                    
                    // NO CAMERA ZOOM, NO SLOW-MO - keep it simple!
                }
                
                // Combo system
                if (i === 0 && this.currentBallOwner === 'ai') {
                this.consecutiveHits++;
                this.updateCombo();
                this.resetComboTimeout();
            }
            
                this.setBallColor(i, 'player');
                this.worldLightBoost = 12.0;
            this.playSound('paddleHit');
        }
        
        // AI paddle collision (top)
            if (ball.position.z <= -14.5 && 
                Math.abs(ball.position.x - paddle2X) < 2.5) {
                velocity.z *= -1.05;
                velocity.x += (ball.position.x - paddle2X) * 0.1;
                this.triggerCameraShake(0.3, true);
            this.triggerPaddleBlink(this.paddle2, 'paddle2');
                this.triggerRumble(0.3, 100);
                this.createImpactEffect(ball.position.clone(), 0xff00ff);
                this.setBallColor(i, 'ai');
                this.worldLightBoost = 12.0;
            this.playSound('paddleHit');
            
                // Paddle pushback!
                this.paddle2Pushback = 1.5; // Push back 1.5 units (increased from 0.8)
            
                if (i === 0) {
            this.resetCombo();
                }
            }
            
            // Scoring - mark balls for removal (match goal positions)
            if (ball.position.z > 19) {
                ballsToRemove.push({ index: i, scorer: 'player2' });
            }
            
            if (ball.position.z < -19) {
                ballsToRemove.push({ index: i, scorer: 'player1' });
            }
        }
        
        // Remove scored balls (in reverse order to maintain indices)
        ballsToRemove.sort((a, b) => b.index - a.index);
        
        // Check if ANY ball died (player failed)
        const playerDied = ballsToRemove.some(removal => removal.scorer === 'player2');
        
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
            
            // Remove ball light for this ball
            if (this.ballLights[removal.index]) {
                // Don't remove, just turn off (will be cleaned up in reset)
                if (this.ballLights[removal.index]) {
                    this.ballLights[removal.index].intensity = 0;
                }
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
                // Flash player goal GREEN (ball went past player)
                this.flashGoalGreen(this.playerGoal);
            } else {
                this.score.player1++;
                // Flash AI goal GREEN (ball went past AI) - WIN!
                this.flashGoalGreen(this.aiGoal);
                this.playSound('score');
                this.showAwesomeText();
            this.updateScore();
            }
        }
        
        // If ANY ball died, it's GAME OVER
        if (playerDied) {
            this.showDeathScreen();
            this.playSound('death');
            this.resetCombo();
            this.updateScore();
            this.resetBall(); // Reset entire game
        }
        
        // Update life score
        if (this.gameStarted && !this.isPaused) {
            const baseScore = 10;
            const comboMultiplier = this.currentCombo || 1;
            this.lifeScoreAccumulator += baseScore * comboMultiplier;
            this.lifeScore = Math.floor(this.lifeScoreAccumulator);
            this.updateLifeScore();
        }
    }
    
    showDeathScreen() {
        this.domElements.deathScreen.style.display = 'block';
        this.domElements.deathScreen.classList.add('active');
        
        // Trigger dramatic camera zoom on player
        this.deathCameraZoom = {
            active: true,
            startTime: performance.now(),
            duration: 2000, // 2 seconds
            startPos: { ...this.camera.position },
            targetPos: {
                x: this.paddle1.position.x,
                y: 15,
                z: this.paddle1.position.z + 5
            }
        };
        
        // Hide after animation completes
        setTimeout(() => {
            this.domElements.deathScreen.style.display = 'none';
            this.domElements.deathScreen.classList.remove('active');
            this.deathCameraZoom.active = false;
        }, 2000);
    }
    
    showAwesomeText() {
        // Reset classes
        this.domElements.awesomeText.classList.remove('active', 'exit');
        void this.domElements.awesomeText.offsetWidth; // Force reflow
        
        // Enter with 3 hard blinks
        this.domElements.awesomeText.classList.add('active');
        
        // Start exit animation after display time
        setTimeout(() => {
            this.domElements.awesomeText.classList.remove('active');
            this.domElements.awesomeText.classList.add('exit');
            
            // Fully hide after exit animation
            setTimeout(() => {
                this.domElements.awesomeText.classList.remove('exit');
            }, 600);
        }, 1400); // Show for 1.4s before starting exit
    }
    
    showMultiBallText() {
        // Reset classes
        this.domElements.multiBallText.classList.remove('active', 'exit');
        void this.domElements.multiBallText.offsetWidth; // Force reflow
        
        // Enter with 3 hard blinks
        this.domElements.multiBallText.classList.add('active');
        
        // Start exit animation after display time
        setTimeout(() => {
            this.domElements.multiBallText.classList.remove('active');
            this.domElements.multiBallText.classList.add('exit');
            
            // Fully hide after exit animation
            setTimeout(() => {
                this.domElements.multiBallText.classList.remove('exit');
            }, 600);
        }, 1400); // Show for 1.4s before starting exit
    }
    
    updateStartMenuCamera(deltaTime) {
        // Cinematic rotating camera around the arena (before game starts)
        if (!this.startMenuCamera.active) return;
        
        // Increment rotation angle
        this.startMenuCamera.angle += this.startMenuCamera.speed * deltaTime;
        
        // Calculate camera position in a circle
        const x = Math.cos(this.startMenuCamera.angle) * this.startMenuCamera.radius;
        const z = Math.sin(this.startMenuCamera.angle) * this.startMenuCamera.radius;
        const y = this.startMenuCamera.height;
        
        // Set camera position
        this.camera.position.set(x, y, z);
        
        // Look at the center of the arena, slightly above ground
        this.camera.lookAt(0, this.startMenuCamera.lookAtHeight, 0);
    }
    
    updateCameraTransition() {
        // Smooth transition from start menu camera to gameplay camera
        if (!this.cameraTransition.active) return;
        
        const elapsed = performance.now() - this.cameraTransition.startTime;
        const progress = Math.min(elapsed / this.cameraTransition.duration, 1);
        
        // Use easing for smooth, cinematic feel
        const eased = this.easeInOutCubic(progress);
        
        // Interpolate position
        this.camera.position.x = this.cameraTransition.startPos.x + 
            (this.cameraTransition.targetPos.x - this.cameraTransition.startPos.x) * eased;
        this.camera.position.y = this.cameraTransition.startPos.y + 
            (this.cameraTransition.targetPos.y - this.cameraTransition.startPos.y) * eased;
        this.camera.position.z = this.cameraTransition.startPos.z + 
            (this.cameraTransition.targetPos.z - this.cameraTransition.startPos.z) * eased;
        
        // Smooth look-at transition
        const lookX = this.cameraTransition.targetLookAt.x * eased;
        const lookY = this.cameraTransition.targetLookAt.y;
        const lookZ = this.cameraTransition.targetLookAt.z * eased;
        this.camera.lookAt(lookX, lookY, lookZ);
        
        // End transition
        if (progress >= 1) {
            this.cameraTransition.active = false;
            console.log('✅ Camera transition complete - gameplay started!');
        }
    }
    
    startCameraTransition() {
        // Begin smooth transition from start menu to gameplay
        console.log('🎬 Starting camera transition...');
        
        // Deactivate start menu camera
        this.startMenuCamera.active = false;
        
        // Record current camera state
        this.cameraTransition.startPos = {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
        };
        
        // Target is the normal gameplay camera position
        // z=22 matches the default zoom value in updateDynamicCamera
        this.cameraTransition.targetPos = { x: 0, y: 20, z: 22 };
        this.cameraTransition.targetLookAt = { x: 0, y: 1, z: 0 };
        
        // Activate transition
        this.cameraTransition.active = true;
        this.cameraTransition.startTime = performance.now();
    }
    
    updateDynamicCamera() {
        if (this.isPaused) return;
        
        // Camera transition override (start menu → gameplay)
        if (this.cameraTransition.active) {
            this.updateCameraTransition();
            return;
        }
        
        // Multi-ball camera zoom override (dramatic zoom on new balls!)
        if (this.multiBallZoom.active) {
            this.updateMultiBallZoom();
            return;
        }
        
        // Subtle goal zoom - just push camera forward slightly
        if (this.subtleGoalZoom.active) {
            // Smoothly interpolate camera z position forward
            const targetZ = 20 - this.subtleGoalZoom.targetZoom; // Default is 20, zoom to 17
            this.camera.position.z += (targetZ - this.camera.position.z) * 0.05;
        } else {
            // Return to normal z position
            this.camera.position.z += (20 - this.camera.position.z) * 0.05;
        }
        
        // Win camera zoom override (zoom in on enemy goal!)
        if (this.winCameraZoom && this.winCameraZoom.active) {
            const elapsed = performance.now() - this.winCameraZoom.startTime;
            const progress = Math.min(elapsed / this.winCameraZoom.duration, 1);
            const eased = this.easeInOutCubic(progress);
            
            this.camera.position.x = this.winCameraZoom.startPos.x + 
                (this.winCameraZoom.targetPos.x - this.winCameraZoom.startPos.x) * eased;
            this.camera.position.y = this.winCameraZoom.startPos.y + 
                (this.winCameraZoom.targetPos.y - this.winCameraZoom.startPos.y) * eased;
            this.camera.position.z = this.winCameraZoom.startPos.z + 
                (this.winCameraZoom.targetPos.z - this.winCameraZoom.startPos.z) * eased;
            
            // Look at the AI goal during win celebration
            this.camera.lookAt(0, 1, -19);
            return;
        }
        
        // Death camera zoom override
        if (this.deathCameraZoom && this.deathCameraZoom.active) {
            const elapsed = performance.now() - this.deathCameraZoom.startTime;
            const progress = Math.min(elapsed / this.deathCameraZoom.duration, 1);
            const eased = this.easeInOutCubic(progress);
            
            this.camera.position.x = this.deathCameraZoom.startPos.x + 
                (this.deathCameraZoom.targetPos.x - this.deathCameraZoom.startPos.x) * eased;
            this.camera.position.y = this.deathCameraZoom.startPos.y + 
                (this.deathCameraZoom.targetPos.y - this.deathCameraZoom.startPos.y) * eased;
            this.camera.position.z = this.deathCameraZoom.startPos.z + 
                (this.deathCameraZoom.targetPos.z - this.deathCameraZoom.startPos.z) * eased;
            
            this.camera.lookAt(this.paddle1.position.x, 0, this.paddle1.position.z);
            return;
        }
        
        // Camera follow system - track first ball
        if (this.balls.length > 0) {
            this.cameraTarget.x = this.balls[0].position.x * 0.15; // Reduced from 0.3
            this.cameraTarget.z = this.balls[0].position.z * 0.1;  // Reduced from 0.2
        
        // Dynamic zoom based on ball speed - less extreme
            const ballSpeed = Math.sqrt(this.ballVelocities[0].x ** 2 + this.ballVelocities[0].z ** 2);
        this.cameraTarget.zoom = 22 + ballSpeed * 2; // Reduced from 5
        }
        
        // Additional zoom based on paddle horizontal position (centered = default, sides = zoom in slightly)
        const paddleOffsetFromCenter = Math.abs(this.paddle1.position.x); // 0 at center, 10 at edge
        const paddleZoom = (paddleOffsetFromCenter / 10) * 1.5; // 0 to 1.5 units of zoom
        this.cameraTarget.zoom += paddleZoom;
        
        // Smooth camera movement
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
            this.cameraShake.horizontalShift = horizontalDirection * 2; // Shift camera left (-) or right (+)
        }
    }
    
    updateCameraShake() {
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
        
        // Handle camera pullback (moves camera backwards then returns)
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
    
    updateAnimatedLights() {
        if (this.isPaused) return;
        
        // Update world light boost (both lights flash on any hit)
        if (this.worldLightBoost > 0) {
            this.overheadLight.intensity = 4 + this.worldLightBoost;
            this.overheadLight2.intensity = 4 + this.worldLightBoost;
            this.worldLightBoost *= 0.92; // Smooth decay
            
            if (this.worldLightBoost < 0.01) {
                this.worldLightBoost = 0;
                this.overheadLight.intensity = 4; // Reset to base intensity
                this.overheadLight2.intensity = 4; // Reset to base intensity
            }
        }
        
        // Update player light position to follow player paddle
        if (this.playerLight && this.paddle1) {
            this.playerLight.position.x = this.paddle1.position.x;
            this.playerLight.position.y = 3; // Above paddle
            this.playerLight.position.z = this.paddle1.position.z;
        }
        
        // Update AI light position to follow AI paddle
        if (this.aiLight && this.paddle2) {
            this.aiLight.position.x = this.paddle2.position.x;
            this.aiLight.position.y = 3; // Above paddle
            this.aiLight.position.z = this.paddle2.position.z;
        }
    }
    
    resetBall() {
        // Remove all existing balls
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
            this.ballLights[0].intensity = 3;
        }
        
        // Reset multi-ball system
        this.successfulHits = 0;
        this.nextBallThreshold = 2;
        
        // Reset paddle pushback
        this.paddle1Pushback = 0;
        this.paddle2Pushback = 0;
        this.paddle1.position.z = 15;
        this.paddle2.position.z = -15;
        
        // Spawn first ball with FIXED, predictable velocity (always toward AI)
        // This ensures consistent, clean restarts with no random jumps
        this.spawnBall(0, 0, 0, {
            x: 0,      // No horizontal movement initially
            y: 0,
            z: -0.15   // Always toward enemy/AI (negative Z)
        });
    }
    
    fullGameReset() {
        console.log('🔄 Full game reset initiated...');
        
        this.playSound('menuSelect'); // Play menu sound on reset
        
        // Reset scores
        this.score = { player1: 0, player2: 0 };
        this.updateScore();
        
        // Reset game state
        this.gameStarted = false;
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
        
        // Reset camera
        this.cameraShake = { x: 0, y: 0, intensity: 0 };
        this.cameraZoom = 0;
        this.cameraTilt = 0;
        this.cameraLookOffset = 0;
        
        // Reset ball
        this.resetBall();
        
        // Hide pause menu and show start UI
        this.domElements.pauseMenu.style.display = 'none';
        this.domElements.ui.style.display = 'block';
        
        // Stop and reset music
        if (this.sounds.music) {
            this.sounds.music.pause();
            this.sounds.music.currentTime = 0;
        }
        
        console.log('✅ Full game reset complete!');
    }
    
    updateScore() {
        this.domElements.player1Score.textContent = this.score.player1;
        this.domElements.player2Score.textContent = this.score.player2;
    }
    
    updateCombo() {
        // Show combo for every 2 hits
        if (this.consecutiveHits % 2 === 0 && this.consecutiveHits > 0) {
            this.currentCombo = this.consecutiveHits / 2;
            this.domElements.combo.textContent = `${this.currentCombo}X COMBO`;
            
            console.log(`COMBO! ${this.currentCombo}X - consecutiveHits: ${this.consecutiveHits}`);
            
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
    
    updateLifeScore() {
        this.domElements.lifeScoreValue.textContent = this.lifeScore.toLocaleString();
    }
    
    updateGoals(deltaTime) {
        // Animate the laser forcefield goals
        if (!this.playerGoal || !this.aiGoal) return;
        
        this.goalAnimationTime += deltaTime;
        
        // Update shader time uniform for animation
        this.playerGoal.material.uniforms.time.value = this.goalAnimationTime;
        this.aiGoal.material.uniforms.time.value = this.goalAnimationTime;
        
        // Fast blink animation when green (goal scored!)
        if (this.goalBlinkTimer > 0 && this.goalBlinkTarget) {
            this.goalBlinkTimer -= deltaTime;
            
            // Very fast blink - 10 Hz (10 times per second)
            const blinkFrequency = 10;
            const blinkPhase = (this.goalAnimationTime * blinkFrequency) % 1;
            
            // Hard on/off - no fade
            if (blinkPhase < 0.5) {
                // ON - full opacity
                this.goalBlinkTarget.material.uniforms.opacity.value = 0.8;
                this.goalBlinkTarget.material.uniforms.emissiveIntensity.value = 6.0;
            } else {
                // OFF - very low opacity
                this.goalBlinkTarget.material.uniforms.opacity.value = 0.1;
                this.goalBlinkTarget.material.uniforms.emissiveIntensity.value = 1.0;
            }
        }
    }
    
    flashGoalGreen(goal) {
        // Flash goal to BRIGHT GREEN when scored - MUCH more visible!
        if (!goal) return;
        
        // Change to bright green with HIGH opacity
        goal.material.uniforms.baseColor.value.setHex(0x00ff00); // Bright green
        goal.material.uniforms.emissiveIntensity.value = 6.0; // Extra bright!
        goal.material.uniforms.opacity.value = 0.8; // Much more visible!
        
        // SLOW MOTION on win!
        this.timeScale = 0.3; // Slow down to 30% speed
        
        // Start fast blink animation!
        this.goalBlinkTimer = 2.5; // Blink for 2.5 seconds
        this.goalBlinkTarget = goal; // Track which goal is blinking
        
        // Subtle camera zoom - just push camera forward slightly
        this.subtleGoalZoom.active = true;
        this.subtleGoalZoom.targetZoom = 3; // Move forward 3 units
        
        // Play repeating alarm sound!
        if (this.sounds.goalAlarm) {
            this.sounds.goalAlarm.currentTime = 0;
            this.sounds.goalAlarm.play().catch(e => console.log('Could not play goal alarm'));
        }
        
        // Return to red/orange after 2.5 seconds (longer duration)
        setTimeout(() => {
            goal.material.uniforms.baseColor.value.copy(goal.userData.originalColor);
            goal.material.uniforms.emissiveIntensity.value = 3.0;
            goal.material.uniforms.opacity.value = 0.3; // Back to subtle
            
            // Return to normal speed
            this.timeScale = 1.0;
            
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
        }, 2500);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        // Start menu camera (before game starts)
        if (!this.gameStarted) {
            this.updateStartMenuCamera(deltaTime);
            this.updateStartMenuGamepad(); // Check for gamepad start button
            // Skip game logic before game starts
        } else if (this.isPaused) {
            // Pause menu - spinning camera + skip game logic
            this.updatePauseCamera(deltaTime);
            this.updateGamepad(); // Still check for unpause
        } else {
            // Normal game logic
        this.updateGamepad();
        this.updatePlayerPaddle();
        this.updateAIPaddle();
        this.updateBall();
        this.updateDynamicCamera();
        this.updateCameraShake();
        this.updateAnimatedLights();
        this.updatePaddleBlinks(deltaTime);
        this.updateParticles();
        this.updateFloorGlow();
        this.updateObstacles();
        this.updateImpactEffects();
        }
        
        // Always update goals (even during start menu for animation)
        this.updateGoals(deltaTime);
        
        // Custom bloom + fisheye rendering pipeline
        // 1. Render scene to bloom render target with moderate exposure
        this.renderer.setRenderTarget(this.bloomRenderTarget);
        this.renderer.toneMappingExposure = 2.678; // Another 10% darker (was 2.975)
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
        
        // 2. Render scene to fisheye render target (intermediate buffer)
        this.renderer.setRenderTarget(this.fisheyeRenderTarget);
        this.renderer.toneMappingExposure = 3.825; // Another 10% darker (was 4.25)
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
        
        // 3. Render bloom on top of fisheye target with additive blending
        this.bloomMaterial.uniforms.tDiffuse.value = this.bloomRenderTarget.texture;
        this.renderer.render(this.bloomScene, this.bloomCamera);
        
        // 4. Apply fisheye distortion + optional blur
        if (this.isPaused) {
            // When paused: Apply fisheye to blur target, then blur to screen
            this.renderer.setRenderTarget(this.blurRenderTarget);
            this.fisheyeMaterial.uniforms.tDiffuse.value = this.fisheyeRenderTarget.texture;
            this.renderer.clear();
            this.renderer.render(this.fisheyeScene, this.fisheyeCamera);
            
            // Apply heavy Gaussian blur to focus player on menu
            this.renderer.setRenderTarget(null);
            this.blurMaterial.uniforms.tDiffuse.value = this.blurRenderTarget.texture;
            this.renderer.clear();
            this.renderer.render(this.blurScene, this.blurCamera);
        } else {
            // Normal: Apply fisheye directly to screen
            this.renderer.setRenderTarget(null);
            this.fisheyeMaterial.uniforms.tDiffuse.value = this.fisheyeRenderTarget.texture;
            this.renderer.clear();
            this.renderer.render(this.fisheyeScene, this.fisheyeCamera);
        }
    }
}

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    game = new TronPong();
    
    // Debug function - call from console: forceUpdateEnvMap()
    window.forceUpdateEnvMap = () => {
        console.log('🔧 Forcing environment map update...');
        console.log('EnvMap exists:', !!game.envMap);
        if (game.envMap) {
            console.log('EnvMap details:', game.envMap);
        }
        game.updateMaterialsWithEnvMap();
    };
    
    window.testEnvMap = () => {
        console.log('🧪 Testing environment map setup...');
        console.log('Game instance:', game);
        console.log('EnvMap:', game.envMap);
        console.log('Scene children:', game.scene.children.length);
        
        // Find and log materials
        let metalMaterials = 0;
        game.scene.traverse((object) => {
            if (object.isMesh && object.material && object.material.isMeshStandardMaterial) {
                if (object.material.metalness > 0.5) {
                    metalMaterials++;
                    console.log('Metallic material found:', {
                        metalness: object.material.metalness,
                        roughness: object.material.roughness,
                        hasEnvMap: !!object.material.envMap,
                        envMapIntensity: object.material.envMapIntensity
                    });
                }
            }
        });
        console.log(`Total metallic materials: ${metalMaterials}`);
    };
});
