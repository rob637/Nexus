import {
    Scene, MeshBuilder, StandardMaterial, Color3, Color4, Mesh, Vector3,
    PhysicsAggregate, PhysicsShapeType, Physics6DoFConstraint, PhysicsConstraintAxis,
    Axis, PointerEventTypes, ParticleSystem, Texture, Animation, GlowLayer,
    PBRMaterial, TrailMesh, PointerInfo, ArcRotateCamera
} from "@babylonjs/core";
import { HapticManager } from "../../utils/HapticManager";

interface RopeSegment {
    mesh: Mesh;
    aggregate: PhysicsAggregate;
}

interface Rope {
    segments: RopeSegment[];
    anchorMesh: Mesh;
    anchorAggregate: PhysicsAggregate;
}

interface Bubble {
    mesh: Mesh;
    aggregate: PhysicsAggregate;
    floatForce: number;
    attachedCandy: Mesh | null;
}

interface AirBlower {
    mesh: Mesh;
    direction: Vector3;
    force: number;
    range: number;
}

interface Star {
    mesh: Mesh;
    collected: boolean;
}

export class CutTheRopeGame {
    private scene: Scene;
    private rootMesh: Mesh;
    private glowLayer: GlowLayer;
    
    // Game objects
    private candy!: Mesh;
    private candyAggregate!: PhysicsAggregate;
    private ropes: Rope[] = [];
    private bubbles: Bubble[] = [];
    private airBlowers: AirBlower[] = [];
    private stars: Star[] = [];
    private goal!: Mesh;
    
    // Game state
    private gameWon = false;
    private starsCollected = 0;
    private totalStars = 3;
    
    // Visual effects
    private candyTrail!: TrailMesh;
    private goalParticles!: ParticleSystem;

    constructor(scene: Scene) {
        this.scene = scene;
        this.rootMesh = new Mesh("CutTheRopeRoot", scene);
        
        // Setup glow layer for magical effects
        this.glowLayer = new GlowLayer("glow", scene);
        this.glowLayer.intensity = 0.8;
    }

    public load() {
        console.log("🍬 Cut The Rope: Loading Level");
        
        // Setup camera for 2.5D view
        this.setupCamera();
        
        // Create environment
        this.createBackground();
        
        // Create the candy (main physics object)
        this.createCandy(new Vector3(0, 8, 0));
        
        // Create multiple ropes attached to candy
        this.createRope(new Vector3(-4, 12, 0), this.candy, 8);
        this.createRope(new Vector3(4, 14, 0), this.candy, 10);
        this.createRope(new Vector3(0, 16, 0), this.candy, 12);
        
        // Create floating bubbles
        this.createBubble(new Vector3(-3, 4, 0));
        this.createBubble(new Vector3(3, 2, 0));
        
        // Create air blowers
        this.createAirBlower(new Vector3(-8, 0, 0), new Vector3(1, 0.5, 0), 15, 8);
        this.createAirBlower(new Vector3(8, -2, 0), new Vector3(-1, 0.3, 0), 12, 6);
        
        // Create collectible stars
        this.createStar(new Vector3(-2, 6, 0));
        this.createStar(new Vector3(2, 3, 0));
        this.createStar(new Vector3(0, -2, 0));
        
        // Create the goal (Om Nom's mouth!)
        this.createGoal(new Vector3(0, -8, 0));
        
        // Setup interactions
        this.setupInteraction();
        
        // Game loop for physics effects
        this.setupGameLoop();
        
        // Show instructions
        this.showInstructions();
        
        HapticManager.triggerSnap();
    }

    private setupCamera() {
        const camera = this.scene.activeCamera as ArcRotateCamera;
        if (camera) {
            camera.setPosition(new Vector3(0, 5, -25));
            camera.setTarget(new Vector3(0, 2, 0));
            camera.lowerRadiusLimit = 15;
            camera.upperRadiusLimit = 40;
        }
    }

    private createBackground() {
        // Gradient background wall
        const bg = MeshBuilder.CreatePlane("background", { width: 60, height: 40 }, this.scene);
        bg.position.z = 10;
        const bgMat = new StandardMaterial("bgMat", this.scene);
        bgMat.diffuseColor = Color3.FromHexString("#1a1a2e");
        bgMat.emissiveColor = Color3.FromHexString("#0a0a15");
        bgMat.backFaceCulling = false;
        bg.material = bgMat;
        
        // Invisible walls to keep candy in play area
        this.createInvisibleWall(new Vector3(-12, 0, 0), new Vector3(1, 30, 5));
        this.createInvisibleWall(new Vector3(12, 0, 0), new Vector3(1, 30, 5));
        this.createInvisibleWall(new Vector3(0, -15, 0), new Vector3(30, 1, 5));
    }

    private createInvisibleWall(pos: Vector3, size: Vector3) {
        const wall = MeshBuilder.CreateBox("wall", { width: size.x, height: size.y, depth: size.z }, this.scene);
        wall.position = pos;
        wall.isVisible = false;
        new PhysicsAggregate(wall, PhysicsShapeType.BOX, { mass: 0, restitution: 0.8 }, this.scene);
    }

    private createCandy(position: Vector3) {
        // Main candy sphere with beautiful materials
        this.candy = MeshBuilder.CreateSphere("candy", { diameter: 1.5, segments: 32 }, this.scene);
        this.candy.position = position;
        
        // Shiny candy material
        const candyMat = new PBRMaterial("candyMat", this.scene);
        candyMat.albedoColor = Color3.FromHexString("#ff6b6b");
        candyMat.metallic = 0.3;
        candyMat.roughness = 0.2;
        candyMat.emissiveColor = Color3.FromHexString("#ff3333").scale(0.3);
        this.candy.material = candyMat;
        
        // Add to glow layer
        this.glowLayer.addIncludedOnlyMesh(this.candy);
        
        // Candy wrapper stripes (decorative rings)
        const stripe1 = MeshBuilder.CreateTorus("stripe1", { diameter: 1.6, thickness: 0.1, tessellation: 32 }, this.scene);
        stripe1.parent = this.candy;
        stripe1.rotation.x = Math.PI / 2;
        const stripeMat = new StandardMaterial("stripeMat", this.scene);
        stripeMat.diffuseColor = Color3.White();
        stripeMat.emissiveColor = Color3.White().scale(0.5);
        stripe1.material = stripeMat;
        
        // Physics
        this.candyAggregate = new PhysicsAggregate(
            this.candy, 
            PhysicsShapeType.SPHERE, 
            { mass: 5, restitution: 0.6, friction: 0.3 }, 
            this.scene
        );
        
        // Trail effect
        this.candyTrail = new TrailMesh("candyTrail", this.candy, this.scene, 0.3, 30, true);
        const trailMat = new StandardMaterial("trailMat", this.scene);
        trailMat.emissiveColor = Color3.FromHexString("#ff6b6b");
        trailMat.alpha = 0.4;
        this.candyTrail.material = trailMat;
    }

    private createRope(anchorPos: Vector3, targetMesh: Mesh, segmentCount: number) {
        const rope: Rope = {
            segments: [],
            anchorMesh: null!,
            anchorAggregate: null!
        };
        
        // Anchor point (static)
        const anchor = MeshBuilder.CreateSphere("ropeAnchor", { diameter: 0.8 }, this.scene);
        anchor.position = anchorPos;
        const anchorMat = new PBRMaterial("anchorMat", this.scene);
        anchorMat.albedoColor = Color3.FromHexString("#4ecdc4");
        anchorMat.metallic = 0.8;
        anchorMat.roughness = 0.2;
        anchorMat.emissiveColor = Color3.FromHexString("#4ecdc4").scale(0.4);
        anchor.material = anchorMat;
        this.glowLayer.addIncludedOnlyMesh(anchor);
        
        rope.anchorMesh = anchor;
        rope.anchorAggregate = new PhysicsAggregate(anchor, PhysicsShapeType.SPHERE, { mass: 0 }, this.scene);
        
        // Calculate rope direction
        const direction = targetMesh.position.subtract(anchorPos).normalize();
        const totalLength = Vector3.Distance(anchorPos, targetMesh.position);
        const segmentLength = totalLength / segmentCount;
        
        let previousAggregate = rope.anchorAggregate;
        
        // Create rope segments
        for (let i = 0; i < segmentCount; i++) {
            const segPos = anchorPos.add(direction.scale((i + 1) * segmentLength));
            
            // Rope segment (small sphere for smooth look)
            const segment = MeshBuilder.CreateSphere(`ropeSegment_${this.ropes.length}_${i}`, { diameter: 0.25 }, this.scene);
            segment.position = segPos;
            
            const segMat = new StandardMaterial("segMat", this.scene);
            segMat.diffuseColor = Color3.FromHexString("#ffe66d");
            segMat.emissiveColor = Color3.FromHexString("#ffe66d").scale(0.2);
            segment.material = segMat;
            
            const segAggregate = new PhysicsAggregate(
                segment, 
                PhysicsShapeType.SPHERE, 
                { mass: 0.5, friction: 0.2 }, 
                this.scene
            );
            
            // Store reference for cutting
            segment.metadata = { 
                ropeIndex: this.ropes.length, 
                segmentIndex: i, 
                aggregate: segAggregate,
                isCuttable: true
            };
            
            // Connect to previous segment
            this.createRopeJoint(previousAggregate, segAggregate, segmentLength);
            
            rope.segments.push({ mesh: segment, aggregate: segAggregate });
            previousAggregate = segAggregate;
        }
        
        // Connect last segment to candy
        this.createRopeJoint(previousAggregate, this.candyAggregate, segmentLength);
        
        this.ropes.push(rope);
    }

    private createRopeJoint(aggA: PhysicsAggregate, aggB: PhysicsAggregate, distance: number) {
        const joint = new Physics6DoFConstraint(
            {
                pivotA: new Vector3(0, -distance / 2, 0),
                pivotB: new Vector3(0, distance / 2, 0),
                axisA: Axis.Y,
                axisB: Axis.Y,
                perpAxisA: Axis.X,
                perpAxisB: Axis.X,
            },
            [
                { axis: PhysicsConstraintAxis.LINEAR_X, minLimit: -0.1, maxLimit: 0.1 },
                { axis: PhysicsConstraintAxis.LINEAR_Y, minLimit: -0.1, maxLimit: 0.1 },
                { axis: PhysicsConstraintAxis.LINEAR_Z, minLimit: -0.1, maxLimit: 0.1 },
            ],
            this.scene
        );
        aggA.body.addConstraint(aggB.body, joint);
    }

    private createBubble(position: Vector3) {
        const bubble = MeshBuilder.CreateSphere("bubble", { diameter: 2, segments: 32 }, this.scene);
        bubble.position = position;
        
        // Iridescent bubble material
        const bubbleMat = new PBRMaterial("bubbleMat", this.scene);
        bubbleMat.albedoColor = Color3.FromHexString("#87ceeb");
        bubbleMat.metallic = 0.1;
        bubbleMat.roughness = 0.1;
        bubbleMat.alpha = 0.4;
        bubbleMat.emissiveColor = Color3.FromHexString("#00bfff").scale(0.3);
        bubble.material = bubbleMat;
        
        this.glowLayer.addIncludedOnlyMesh(bubble);
        
        // Highlight ring
        const ring = MeshBuilder.CreateTorus("bubbleRing", { diameter: 1.8, thickness: 0.05 }, this.scene);
        ring.parent = bubble;
        const ringMat = new StandardMaterial("ringMat", this.scene);
        ringMat.emissiveColor = Color3.White();
        ringMat.alpha = 0.6;
        ring.material = ringMat;
        
        // Physics - sensor only, very light
        const bubbleAgg = new PhysicsAggregate(bubble, PhysicsShapeType.SPHERE, { mass: 0.1, restitution: 0.9 }, this.scene);
        
        bubble.metadata = { 
            type: 'bubble', 
            aggregate: bubbleAgg,
            isPopped: false
        };
        
        // Gentle floating animation
        const floatAnim = new Animation("bubbleFloat", "position.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        floatAnim.setKeys([
            { frame: 0, value: position.y },
            { frame: 30, value: position.y + 0.3 },
            { frame: 60, value: position.y }
        ]);
        bubble.animations.push(floatAnim);
        this.scene.beginAnimation(bubble, 0, 60, true);
        
        this.bubbles.push({
            mesh: bubble,
            aggregate: bubbleAgg,
            floatForce: 25,
            attachedCandy: null
        });
    }

    private createAirBlower(position: Vector3, direction: Vector3, force: number, range: number) {
        // Blower base
        const blower = MeshBuilder.CreateCylinder("airBlower", { 
            height: 1.5, 
            diameterTop: 1.2, 
            diameterBottom: 0.8 
        }, this.scene);
        blower.position = position;
        
        // Point blower in direction
        const angle = Math.atan2(direction.y, direction.x);
        blower.rotation.z = angle - Math.PI / 2;
        
        const blowerMat = new PBRMaterial("blowerMat", this.scene);
        blowerMat.albedoColor = Color3.FromHexString("#ff7f50");
        blowerMat.metallic = 0.7;
        blowerMat.roughness = 0.3;
        blowerMat.emissiveColor = Color3.FromHexString("#ff4500").scale(0.3);
        blower.material = blowerMat;
        
        this.glowLayer.addIncludedOnlyMesh(blower);
        
        // Air stream particles
        this.createAirParticles(blower, direction, range);
        
        // Pulsing animation
        const pulseAnim = new Animation("blowerPulse", "scaling", 30, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
        pulseAnim.setKeys([
            { frame: 0, value: new Vector3(1, 1, 1) },
            { frame: 15, value: new Vector3(1.1, 1.05, 1.1) },
            { frame: 30, value: new Vector3(1, 1, 1) }
        ]);
        blower.animations.push(pulseAnim);
        this.scene.beginAnimation(blower, 0, 30, true);
        
        blower.metadata = { type: 'airBlower' };
        
        this.airBlowers.push({
            mesh: blower,
            direction: direction.normalize(),
            force: force,
            range: range
        });
    }

    private createAirParticles(emitter: Mesh, direction: Vector3, range: number) {
        const particles = new ParticleSystem("airParticles", 200, this.scene);
        
        // Texture (create procedural)
        particles.particleTexture = new Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGtSURBVFiF7ZY9TsNAEIW/2RgTJOgouQGUFNTcgI6Sm9BR0lFwBCpuQMcR6Cjp6JAokMj+KTxrWTixnThAQYGf5Cjend35dnZm1xBCCOF/x/J7QL8H9HtAvwf0e0C/B/R7AEAYPWVe+qIZOvdQ3wLnNMNf1AifAVbRaLrZfAaR2TRvAC/LHjIHZsDJ8uqmQ4XRK4ymlPAD8BLgLnAtJuCEGXBmAo4KQz0lzKGEp8A58ARwx+g+4IbXuHUvMA1H+Bo4BHaAE+AKeAROgCPgmGVpGGiHBPAGBMBGNJou1yEMA28At4zuYQ4AEcZQwqf1CBHGYgJ+0xAaEYM9gE3g2BQ4BrbXIfwtTIB3gO0wOiuNkFJWbv4t3EcA71LClPWF/Kq+jHOpcGu6ZiKXCncBrgLu10Kv+pLeRR0CvAgJM6BX+8MwukEJT9Y3gkngOsCoNJJSPl9H2y5gCOiE0Z2JEuasY1TCO+A0JcxZxxDwMOBR1iN8AHLWMQR8CXiUwlnAC/UIAZ8A7qRwFvBaGPAI4E4dQsArgPspYQ5clMIZ6xgE3K2HEPAN4GUJnAa8CrjDhAMYQgin1ADHNVwAAAAASUVORK5CYII=", this.scene);
        
        particles.emitter = emitter;
        particles.minEmitBox = new Vector3(-0.3, 0.7, -0.3);
        particles.maxEmitBox = new Vector3(0.3, 0.7, 0.3);
        
        particles.color1 = new Color4(0.7, 0.9, 1.0, 0.8);
        particles.color2 = new Color4(0.5, 0.8, 1.0, 0.6);
        particles.colorDead = new Color4(0.3, 0.6, 0.9, 0);
        
        particles.minSize = 0.1;
        particles.maxSize = 0.3;
        
        particles.minLifeTime = 0.3;
        particles.maxLifeTime = 0.8;
        
        particles.emitRate = 100;
        
        particles.direction1 = direction.scale(range * 2);
        particles.direction2 = direction.scale(range * 2.5);
        
        particles.minEmitPower = 3;
        particles.maxEmitPower = 5;
        
        particles.updateSpeed = 0.01;
        
        particles.start();
    }

    private createStar(position: Vector3) {
        // Create 3D star shape using merged boxes
        const star = this.create3DStar(position);
        
        // Shiny gold material
        const starMat = new PBRMaterial("starMat", this.scene);
        starMat.albedoColor = Color3.FromHexString("#ffd700");
        starMat.metallic = 0.9;
        starMat.roughness = 0.1;
        starMat.emissiveColor = Color3.FromHexString("#ffff00").scale(0.5);
        star.material = starMat;
        
        this.glowLayer.addIncludedOnlyMesh(star);
        
        // Rotation animation
        const rotAnim = new Animation("starRotate", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        rotAnim.setKeys([
            { frame: 0, value: 0 },
            { frame: 60, value: Math.PI * 2 }
        ]);
        star.animations.push(rotAnim);
        
        // Pulse animation
        const pulseAnim = new Animation("starPulse", "scaling", 30, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
        pulseAnim.setKeys([
            { frame: 0, value: new Vector3(1, 1, 1) },
            { frame: 30, value: new Vector3(1.2, 1.2, 1.2) },
            { frame: 60, value: new Vector3(1, 1, 1) }
        ]);
        star.animations.push(pulseAnim);
        
        this.scene.beginAnimation(star, 0, 60, true);
        
        star.metadata = { type: 'star', starIndex: this.stars.length };
        
        this.stars.push({
            mesh: star,
            collected: false
        });
    }

    private create3DStar(position: Vector3): Mesh {
        // Create a simple 3D star using a disc with points
        const star = MeshBuilder.CreateDisc("star", { radius: 0.6, tessellation: 5 }, this.scene);
        star.position = position;
        star.rotation.x = Math.PI / 2;
        
        // Add depth by creating a second disc
        const starBack = MeshBuilder.CreateDisc("starBack", { radius: 0.6, tessellation: 5 }, this.scene);
        starBack.parent = star;
        starBack.position.y = -0.1;
        
        return star;
    }

    private createGoal(position: Vector3) {
        // Goal zone (Om Nom style mouth)
        this.goal = MeshBuilder.CreateSphere("goal", { diameter: 3, segments: 32 }, this.scene);
        this.goal.position = position;
        this.goal.scaling = new Vector3(1.5, 1, 1);
        
        const goalMat = new PBRMaterial("goalMat", this.scene);
        goalMat.albedoColor = Color3.FromHexString("#32cd32");
        goalMat.metallic = 0.2;
        goalMat.roughness = 0.4;
        goalMat.emissiveColor = Color3.FromHexString("#00ff00").scale(0.3);
        this.goal.material = goalMat;
        
        this.glowLayer.addIncludedOnlyMesh(this.goal);
        
        // Eyes
        const eye1 = MeshBuilder.CreateSphere("eye1", { diameter: 0.6 }, this.scene);
        eye1.parent = this.goal;
        eye1.position = new Vector3(-0.4, 0.5, -0.6);
        const eyeMat = new StandardMaterial("eyeMat", this.scene);
        eyeMat.diffuseColor = Color3.White();
        eye1.material = eyeMat;
        
        const pupil1 = MeshBuilder.CreateSphere("pupil1", { diameter: 0.3 }, this.scene);
        pupil1.parent = eye1;
        pupil1.position.z = -0.2;
        const pupilMat = new StandardMaterial("pupilMat", this.scene);
        pupilMat.diffuseColor = Color3.Black();
        pupil1.material = pupilMat;
        
        const eye2 = eye1.clone("eye2");
        eye2.position.x = 0.4;
        
        // Chomping animation
        const chompAnim = new Animation("goalChomp", "scaling.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        chompAnim.setKeys([
            { frame: 0, value: 1 },
            { frame: 15, value: 0.7 },
            { frame: 30, value: 1 }
        ]);
        this.goal.animations.push(chompAnim);
        this.scene.beginAnimation(this.goal, 0, 30, true);
        
        // Goal particles
        this.goalParticles = new ParticleSystem("goalParticles", 50, this.scene);
        this.goalParticles.particleTexture = new Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGtSURBVFiF7ZY9TsNAEIW/2RgTJOgouQGUFNTcgI6Sm9BR0lFwBCpuQMcR6Cjp6JAokMj+KTxrWTixnThAQYGf5Cjend35dnZm1xBCCOF/x/J7QL8H9HtAvwf0e0C/B/R7AEAYPWVe+qIZOvdQ3wLnNMNf1AifAVbRaLrZfAaR2TRvAC/LHjIHZsDJ8uqmQ4XRK4ymlPAD8BLgLnAtJuCEGXBmAo4KQz0lzKGEp8A58ARwx+g+4IbXuHUvMA1H+Bo4BHaAE+AKeAROgCPgmGVpGGiHBPAGBMBGNJou1yEMA28At4zuYQ4AEcZQwqf1CBHGYgJ+0xAaEYM9gE3g2BQ4BrbXIfwtTIB3gO0wOiuNkFJWbv4t3EcA71LClPWF/Kq+jHOpcGu6ZiKXCncBrgLu10Kv+pLeRR0CvAgJM6BX+8MwukEJT9Y3gkngOsCoNJJSPl9H2y5gCOiE0Z2JEuasY1TCO+A0JcxZxxDwMOBR1iN8AHLWMQR8CXiUwlnAC/UIAZ8A7qRwFvBaGPAI4E4dQsArgPspYQ5clMIZ6xgE3K2HEPAN4GUJnAa8CrjDhAMYQgin1ADHNVwAAAAASUVORK5CYII=", this.scene);
        this.goalParticles.emitter = this.goal;
        this.goalParticles.color1 = new Color4(0.2, 1, 0.2, 1);
        this.goalParticles.color2 = new Color4(1, 1, 0, 1);
        this.goalParticles.minSize = 0.1;
        this.goalParticles.maxSize = 0.3;
        this.goalParticles.minLifeTime = 0.5;
        this.goalParticles.maxLifeTime = 1;
        this.goalParticles.emitRate = 20;
        this.goalParticles.start();
        
        this.goal.metadata = { type: 'goal' };
    }

    private setupInteraction() {
        // Cut rope by clicking
        this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                if (pointerInfo.pickInfo?.hit && pointerInfo.pickInfo.pickedMesh) {
                    const mesh = pointerInfo.pickInfo.pickedMesh as Mesh;
                    
                    // Cut rope segment
                    if (mesh.metadata?.isCuttable) {
                        this.cutRope(mesh);
                    }
                    
                    // Pop bubble
                    if (mesh.metadata?.type === 'bubble' && !mesh.metadata.isPopped) {
                        this.popBubble(mesh);
                    }
                }
            }
        });
    }

    private cutRope(segmentMesh: Mesh) {
        console.log("✂️ Cutting rope!");
        
        // Visual cut effect
        this.createCutParticles(segmentMesh.position.clone());
        
        // Dispose the segment (breaks physics chain)
        segmentMesh.dispose();
        
        HapticManager.triggerSnap();
    }

    private createCutParticles(position: Vector3) {
        const particles = new ParticleSystem("cutParticles", 30, this.scene);
        particles.particleTexture = new Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGtSURBVFiF7ZY9TsNAEIW/2RgTJOgouQGUFNTcgI6Sm9BR0lFwBCpuQMcR6Cjp6JAokMj+KTxrWTixnThAQYGf5Cjend35dnZm1xBCCOF/x/J7QL8H9HtAvwf0e0C/B/R7AEAYPWVe+qIZOvdQ3wLnNMNf1AifAVbRaLrZfAaR2TRvAC/LHjIHZsDJ8uqmQ4XRK4ymlPAD8BLgLnAtJuCEGXBmAo4KQz0lzKGEp8A58ARwx+g+4IbXuHUvMA1H+Bo4BHaAE+AKeAROgCPgmGVpGGiHBPAGBMBGNJou1yEMA28At4zuYQ4AEcZQwqf1CBHGYgJ+0xAaEYM9gE3g2BQ4BrbXIfwtTIB3gO0wOiuNkFJWbv4t3EcA71LClPWF/Kq+jHOpcGu6ZiKXCncBrgLu10Kv+pLeRR0CvAgJM6BX+8MwukEJT9Y3gkngOsCoNJJSPl9H2y5gCOiE0Z2JEuasY1TCO+A0JcxZxxDwMOBR1iN8AHLWMQR8CXiUwlnAC/UIAZ8A7qRwFvBaGPAI4E4dQsArgPspYQ5clMIZ6xgE3K2HEPAN4GUJnAa8CrjDhAMYQgin1ADHNVwAAAAASUVORK5CYII=", this.scene);
        
        particles.emitter = position;
        particles.minEmitBox = Vector3.Zero();
        particles.maxEmitBox = Vector3.Zero();
        
        particles.color1 = new Color4(1, 0.9, 0, 1);
        particles.color2 = new Color4(1, 0.5, 0, 1);
        particles.colorDead = new Color4(1, 0.2, 0, 0);
        
        particles.minSize = 0.1;
        particles.maxSize = 0.2;
        
        particles.minLifeTime = 0.2;
        particles.maxLifeTime = 0.4;
        
        particles.emitRate = 1000;
        particles.manualEmitCount = 30;
        
        particles.direction1 = new Vector3(-2, -2, -2);
        particles.direction2 = new Vector3(2, 2, 2);
        
        particles.minEmitPower = 2;
        particles.maxEmitPower = 4;
        
        particles.start();
        
        // Auto dispose after burst
        setTimeout(() => particles.dispose(), 500);
    }

    private popBubble(bubbleMesh: Mesh) {
        console.log("💨 Pop!");
        
        bubbleMesh.metadata.isPopped = true;
        
        // Pop particles
        const particles = new ParticleSystem("popParticles", 20, this.scene);
        particles.particleTexture = new Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGtSURBVFiF7ZY9TsNAEIW/2RgTJOgouQGUFNTcgI6Sm9BR0lFwBCpuQMcR6Cjp6JAokMj+KTxrWTixnThAQYGf5Cjend35dnZm1xBCCOF/x/J7QL8H9HtAvwf0e0C/B/R7AEAYPWVe+qIZOvdQ3wLnNMNf1AifAVbRaLrZfAaR2TRvAC/LHjIHZsDJ8uqmQ4XRK4ymlPAD8BLgLnAtJuCEGXBmAo4KQz0lzKGEp8A58ARwx+g+4IbXuHUvMA1H+Bo4BHaAE+AKeAROgCPgmGVpGGiHBPAGBMBGNJou1yEMA28At4zuYQ4AEcZQwqf1CBHGYgJ+0xAaEYM9gE3g2BQ4BrbXIfwtTIB3gO0wOiuNkFJWbv4t3EcA71LClPWF/Kq+jHOpcGu6ZiKXCncBrgLu10Kv+pLeRR0CvAgJM6BX+8MwukEJT9Y3gkngOsCoNJJSPl9H2y5gCOiE0Z2JEuasY1TCO+A0JcxZxxDwMOBR1iN8AHLWMQR8CXiUwlnAC/UIAZ8A7qRwFvBaGPAI4E4dQsArgPspYQ5clMIZ6xgE3K2HEPAN4GUJnAa8CrjDhAMYQgin1ADHNVwAAAAASUVORK5CYII=", this.scene);
        
        particles.emitter = bubbleMesh.position.clone();
        particles.color1 = new Color4(0.5, 0.8, 1, 0.8);
        particles.color2 = new Color4(0.3, 0.6, 1, 0.6);
        particles.minSize = 0.1;
        particles.maxSize = 0.3;
        particles.minLifeTime = 0.3;
        particles.maxLifeTime = 0.6;
        particles.emitRate = 1000;
        particles.manualEmitCount = 20;
        particles.direction1 = new Vector3(-3, -3, -3);
        particles.direction2 = new Vector3(3, 3, 3);
        particles.start();
        
        setTimeout(() => particles.dispose(), 600);
        
        // Dispose bubble
        bubbleMesh.dispose();
        
        HapticManager.triggerSnap();
    }

    private setupGameLoop() {
        this.scene.registerBeforeRender(() => {
            if (this.gameWon) return;
            
            // Apply air blower forces
            this.applyAirBlowerForces();
            
            // Apply bubble float forces
            this.applyBubbleForces();
            
            // Check star collection
            this.checkStarCollection();
            
            // Check win condition
            this.checkWinCondition();
        });
    }

    private applyAirBlowerForces() {
        for (const blower of this.airBlowers) {
            const candyPos = this.candy.getAbsolutePosition();
            const blowerPos = blower.mesh.getAbsolutePosition();
            const distance = Vector3.Distance(candyPos, blowerPos);
            
            if (distance < blower.range) {
                // Force falloff with distance
                const falloff = 1 - (distance / blower.range);
                const force = blower.direction.scale(blower.force * falloff);
                this.candyAggregate.body.applyForce(force, candyPos);
            }
        }
    }

    private applyBubbleForces() {
        for (const bubble of this.bubbles) {
            if (bubble.mesh.isDisposed()) continue;
            
            const candyPos = this.candy.getAbsolutePosition();
            const bubblePos = bubble.mesh.getAbsolutePosition();
            const distance = Vector3.Distance(candyPos, bubblePos);
            
            // If candy is inside bubble, apply upward force
            if (distance < 1.2) {
                const floatForce = new Vector3(0, bubble.floatForce, 0);
                this.candyAggregate.body.applyForce(floatForce, candyPos);
                
                // Dampen horizontal velocity for more control
                const vel = this.candyAggregate.body.getLinearVelocity();
                vel.x *= 0.98;
                vel.z *= 0.98;
                this.candyAggregate.body.setLinearVelocity(vel);
            }
        }
    }

    private checkStarCollection() {
        const candyPos = this.candy.getAbsolutePosition();
        
        for (const star of this.stars) {
            if (star.collected || star.mesh.isDisposed()) continue;
            
            const starPos = star.mesh.getAbsolutePosition();
            const distance = Vector3.Distance(candyPos, starPos);
            
            if (distance < 1.2) {
                this.collectStar(star);
            }
        }
    }

    private collectStar(star: Star) {
        star.collected = true;
        this.starsCollected++;
        
        console.log(`⭐ Star collected! ${this.starsCollected}/${this.totalStars}`);
        
        // Collection animation
        const scaleAnim = new Animation("collectScale", "scaling", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
        scaleAnim.setKeys([
            { frame: 0, value: star.mesh.scaling.clone() },
            { frame: 10, value: new Vector3(1.5, 1.5, 1.5) },
            { frame: 20, value: new Vector3(0, 0, 0) }
        ]);
        
        this.scene.beginDirectAnimation(star.mesh, [scaleAnim], 0, 20, false, 1, () => {
            star.mesh.dispose();
        });
        
        // Celebration particles
        this.createStarParticles(star.mesh.position.clone());
        
        HapticManager.triggerSnap();
    }

    private createStarParticles(position: Vector3) {
        const particles = new ParticleSystem("starParticles", 50, this.scene);
        particles.particleTexture = new Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGtSURBVFiF7ZY9TsNAEIW/2RgTJOgouQGUFNTcgI6Sm9BR0lFwBCpuQMcR6Cjp6JAokMj+KTxrWTixnThAQYGf5Cjend35dnZm1xBCCOF/x/J7QL8H9HtAvwf0e0C/B/R7AEAYPWVe+qIZOvdQ3wLnNMNf1AifAVbRaLrZfAaR2TRvAC/LHjIHZsDJ8uqmQ4XRK4ymlPAD8BLgLnAtJuCEGXBmAo4KQz0lzKGEp8A58ARwx+g+4IbXuHUvMA1H+Bo4BHaAE+AKeAROgCPgmGVpGGiHBPAGBMBGNJou1yEMA28At4zuYQ4AEcZQwqf1CBHGYgJ+0xAaEYM9gE3g2BQ4BrbXIfwtTIB3gO0wOiuNkFJWbv4t3EcA71LClPWF/Kq+jHOpcGu6ZiKXCncBrgLu10Kv+pLeRR0CvAgJM6BX+8MwukEJT9Y3gkngOsCoNJJSPl9H2y5gCOiE0Z2JEuasY1TCO+A0JcxZxxDwMOBR1iN8AHLWMQR8CXiUwlnAC/UIAZ8A7qRwFvBaGPAI4E4dQsArgPspYQ5clMIZ6xgE3K2HEPAN4GUJnAa8CrjDhAMYQgin1ADHNVwAAAAASUVORK5CYII=", this.scene);
        
        particles.emitter = position;
        particles.color1 = new Color4(1, 0.85, 0, 1);
        particles.color2 = new Color4(1, 1, 0.5, 1);
        particles.minSize = 0.15;
        particles.maxSize = 0.3;
        particles.minLifeTime = 0.4;
        particles.maxLifeTime = 0.8;
        particles.emitRate = 1000;
        particles.manualEmitCount = 50;
        particles.direction1 = new Vector3(-4, 4, -4);
        particles.direction2 = new Vector3(4, 6, 4);
        particles.minEmitPower = 3;
        particles.maxEmitPower = 6;
        particles.start();
        
        setTimeout(() => particles.dispose(), 1000);
    }

    private checkWinCondition() {
        const candyPos = this.candy.getAbsolutePosition();
        const goalPos = this.goal.getAbsolutePosition();
        const distance = Vector3.Distance(candyPos, goalPos);
        
        if (distance < 2) {
            this.winGame();
        }
    }

    private winGame() {
        this.gameWon = true;
        console.log(`🎉 YOU WIN! Stars: ${this.starsCollected}/${this.totalStars}`);
        
        // Stop candy
        this.candyAggregate.body.setLinearVelocity(Vector3.Zero());
        this.candyAggregate.body.setAngularVelocity(Vector3.Zero());
        
        // Candy enters goal animation
        const enterAnim = new Animation("enterGoal", "position", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
        const goalPos = this.goal.getAbsolutePosition();
        enterAnim.setKeys([
            { frame: 0, value: this.candy.position.clone() },
            { frame: 30, value: goalPos }
        ]);
        
        const scaleAnim = new Animation("shrinkCandy", "scaling", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
        scaleAnim.setKeys([
            { frame: 0, value: this.candy.scaling.clone() },
            { frame: 30, value: new Vector3(0, 0, 0) }
        ]);
        
        this.scene.beginDirectAnimation(this.candy, [enterAnim, scaleAnim], 0, 30, false, 1, () => {
            this.candy.dispose();
            this.celebrateWin();
        });
        
        HapticManager.triggerSnap();
    }

    private celebrateWin() {
        // Massive particle celebration
        const celebration = new ParticleSystem("celebration", 500, this.scene);
        celebration.particleTexture = new Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGtSURBVFiF7ZY9TsNAEIW/2RgTJOgouQGUFNTcgI6Sm9BR0lFwBCpuQMcR6Cjp6JAokMj+KTxrWTixnThAQYGf5Cjend35dnZm1xBCCOF/x/J7QL8H9HtAvwf0e0C/B/R7AEAYPWVe+qIZOvdQ3wLnNMNf1AifAVbRaLrZfAaR2TRvAC/LHjIHZsDJ8uqmQ4XRK4ymlPAD8BLgLnAtJuCEGXBmAo4KQz0lzKGEp8A58ARwx+g+4IbXuHUvMA1H+Bo4BHaAE+AKeAROgCPgmGVpGGiHBPAGBMBGNJou1yEMA28At4zuYQ4AEcZQwqf1CBHGYgJ+0xAaEYM9gE3g2BQ4BrbXIfwtTIB3gO0wOiuNkFJWbv4t3EcA71LClPWF/Kq+jHOpcGu6ZiKXCncBrgLu10Kv+pLeRR0CvAgJM6BX+8MwukEJT9Y3gkngOsCoNJJSPl9H2y5gCOiE0Z2JEuasY1TCO+A0JcxZxxDwMOBR1iN8AHLWMQR8CXiUwlnAC/UIAZ8A7qRwFvBaGPAI4E4dQsArgPspYQ5clMIZ6xgE3K2HEPAN4GUJnAa8CrjDhAMYQgin1ADHNVwAAAAASUVORK5CYII=", this.scene);
        
        celebration.emitter = this.goal;
        celebration.minEmitBox = new Vector3(-2, -1, -2);
        celebration.maxEmitBox = new Vector3(2, 1, 2);
        
        celebration.color1 = new Color4(1, 0.2, 0.5, 1);
        celebration.color2 = new Color4(0.2, 1, 0.5, 1);
        celebration.colorDead = new Color4(1, 1, 0, 0);
        
        celebration.minSize = 0.2;
        celebration.maxSize = 0.5;
        
        celebration.minLifeTime = 1;
        celebration.maxLifeTime = 2;
        
        celebration.emitRate = 200;
        
        celebration.direction1 = new Vector3(-5, 10, -5);
        celebration.direction2 = new Vector3(5, 15, 5);
        
        celebration.gravity = new Vector3(0, -5, 0);
        
        celebration.start();
        
        // Show victory message
        this.showVictoryUI();
        
        setTimeout(() => celebration.stop(), 3000);
    }

    private showVictoryUI() {
        // Create victory plane
        const victoryPlane = MeshBuilder.CreatePlane("victoryPlane", { width: 8, height: 4 }, this.scene);
        victoryPlane.position = new Vector3(0, 2, -5);
        victoryPlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
        
        const victoryMat = new StandardMaterial("victoryMat", this.scene);
        victoryMat.emissiveColor = Color3.FromHexString("#00ff00");
        victoryMat.alpha = 0.9;
        victoryPlane.material = victoryMat;
        
        // Scale in animation
        victoryPlane.scaling = Vector3.Zero();
        const scaleIn = new Animation("scaleIn", "scaling", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
        scaleIn.setKeys([
            { frame: 0, value: Vector3.Zero() },
            { frame: 20, value: new Vector3(1.2, 1.2, 1) },
            { frame: 30, value: new Vector3(1, 1, 1) }
        ]);
        this.scene.beginDirectAnimation(victoryPlane, [scaleIn], 0, 30, false);
        
        // Show star count in console for now
        console.log(`
        ╔═══════════════════════════════╗
        ║        🎉 LEVEL COMPLETE! 🎉   ║
        ║                               ║
        ║     Stars: ${'⭐'.repeat(this.starsCollected)}${'☆'.repeat(this.totalStars - this.starsCollected)}        ║
        ║                               ║
        ║     ${this.starsCollected}/${this.totalStars} Stars Collected     ║
        ╚═══════════════════════════════╝
        `);
    }

    private showInstructions() {
        console.log(`
        ╔═══════════════════════════════════════╗
        ║      🍬 CUT THE ROPE 🍬              ║
        ╠═══════════════════════════════════════╣
        ║                                       ║
        ║  🎯 Goal: Feed the candy to Om Nom!   ║
        ║                                       ║
        ║  ✂️  Click rope segments to CUT       ║
        ║  💨 Click bubbles to POP them         ║
        ║  ⭐ Collect stars for bonus points    ║
        ║  🌬️  Air blowers push the candy       ║
        ║  🫧 Bubbles make candy float up       ║
        ║                                       ║
        ║  Tip: Time your cuts carefully!       ║
        ║                                       ║
        ╚═══════════════════════════════════════╝
        `);
    }

    public unload() {
        this.glowLayer.dispose();
        this.rootMesh.dispose();
    }
}
