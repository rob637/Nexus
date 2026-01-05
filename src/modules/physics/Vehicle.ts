import { Scene, MeshBuilder, Vector3, StandardMaterial, Color3, Mesh, PhysicsAggregate, PhysicsShapeType, PhysicsMotionType, Physics6DoFConstraint, Axis, TransformNode, ActionManager, ExecuteCodeAction } from "@babylonjs/core";

export class Vehicle {
    private scene: Scene;
    private chassis: Mesh;
    private wheels: Mesh[] = [];
    private wheelAggregates: PhysicsAggregate[] = [];
    private chassisAggregate: PhysicsAggregate | null = null;

    // Vehicle Constants (The "Physics" variables users will eventually tweak)
    private vehicleMass = 200;
    private wheelMass = 20;
    
    // Input State
    private inputMap: { [key: string]: boolean } = {};

    constructor(scene: Scene) {
        this.scene = scene;
        // Create a root node for the vehicle
        this.chassis = MeshBuilder.CreateBox("chassis", { width: 2, height: 0.5, depth: 4 }, this.scene);
        this.chassis.position.y = 3;
        
        const chassisMat = new StandardMaterial("chassisMat", this.scene);
        chassisMat.diffuseColor = Color3.FromHexString("#708090"); // Brushed Metal
        this.chassis.material = chassisMat;
    }

    public build() {
        // 1. Physics Body for Chassis
        this.chassisAggregate = new PhysicsAggregate(
            this.chassis, 
            PhysicsShapeType.BOX, 
            { mass: this.vehicleMass, restitution: 0.1, friction: 0.5 }, 
            this.scene
        );

        // 2. Create Wheels
        this.createWheel(new Vector3(-1.2, -0.5, 1.5), "wheel_FL"); // Front Left
        this.createWheel(new Vector3(1.2, -0.5, 1.5), "wheel_FR");  // Front Right
        this.createWheel(new Vector3(-1.2, -0.5, -1.5), "wheel_RL"); // Rear Left
        this.createWheel(new Vector3(1.2, -0.5, -1.5), "wheel_RR");  // Rear Right

        // 3. Setup Input Handling
        this.setupInputs();
    }

    private createWheel(position: Vector3, name: string) {
        // Visual Wheel
        const wheel = MeshBuilder.CreateCylinder(name, { diameter: 1, height: 0.5, tessellation: 24 }, this.scene);
        wheel.rotation.z = Math.PI / 2; // Rotate to face correct way
        wheel.material = this.getWheelMaterial();
        
        wheel.position = this.chassis.position.add(position);
        this.wheels.push(wheel);

        // Physics Body for Wheel
        const wheelAgg = new PhysicsAggregate(
            wheel,
            PhysicsShapeType.CYLINDER,
            { mass: this.wheelMass, friction: 2.0, restitution: 0 }, // High friction for grip
            this.scene
        );
        
        // Fix rotation for physics shape if needed (Cylinder shape orientation matches mesh)
        this.wheelAggregates.push(wheelAgg);

        // Simple Hinge Joint for now (Wheel spins around X axis relative to chassis)
        // In a full simulation we use 6DoF for suspension, but let's start with a rigid axle to ensure stability first.
        // Actually, let's use a Hinge Joint which allows rotation on one axis.
        
        // NOTE: For a proper car we need suspension. Let's stick to the "Magic Force" method for the MVP
        // where we push the chassis, but let the wheels roll freely.
        // We will attach wheels with a Hinge Joint to the chassis.
        
        const joint = new Physics6DoFConstraint(
            {
                pivotA: position,
                pivotB: Vector3.Zero(),
                axisA: Axis.X,
                axisB: Axis.X,
                perpAxisA: Axis.Y,
                perpAxisB: Axis.Y,
            },
            [
                // Lock Translation (Rigid Axle for MVP)
                { axis: Physics6DoFConstraint.TRANSLATION_X, minLimit: 0, maxLimit: 0 },
                { axis: Physics6DoFConstraint.TRANSLATION_Y, minLimit: 0, maxLimit: 0 },
                { axis: Physics6DoFConstraint.TRANSLATION_Z, minLimit: 0, maxLimit: 0 },
                // Free Rotation on X (Rolling)
                { axis: Physics6DoFConstraint.ROTATION_X, minLimit: 0, maxLimit: 0 }, // 0,0 means free? No, usually null or specific setting. 
                // In Babylon Havok, limits are tricky. Let's try a simpler approach:
                // Just lock everything EXCEPT Rotation X.
            ],
            this.scene
        );
        // Actually, let's just use a simple Hinge for now.
        // Re-writing constraint logic in next step if this is too complex.
        
        // For this MVP, let's just weld them so they don't fall off, and slide the car.
        // We will upgrade to real wheels in the next prompt.
        
        const weld = new Physics6DoFConstraint(
            {
                pivotA: position,
                pivotB: Vector3.Zero(),
                axisA: Axis.X,
                axisB: Axis.X,
                perpAxisA: Axis.Y,
                perpAxisB: Axis.Y,
            },
            [
                { axis: Physics6DoFConstraint.TRANSLATION_X, minLimit: 0, maxLimit: 0 },
                { axis: Physics6DoFConstraint.TRANSLATION_Y, minLimit: 0, maxLimit: 0 },
                { axis: Physics6DoFConstraint.TRANSLATION_Z, minLimit: 0, maxLimit: 0 },
                { axis: Physics6DoFConstraint.ROTATION_Y, minLimit: 0, maxLimit: 0 },
                { axis: Physics6DoFConstraint.ROTATION_Z, minLimit: 0, maxLimit: 0 },
            ],
            this.scene
        );
        
        this.chassisAggregate!.body.addConstraint(wheelAgg.body, weld);
    }

    private getWheelMaterial(): StandardMaterial {
        const mat = new StandardMaterial("wheelMat", this.scene);
        mat.diffuseColor = Color3.Black();
        mat.specularColor = new Color3(0.1, 0.1, 0.1); // Rubber isn't very shiny
        return mat;
    }

    private setupInputs() {
        this.scene.onKeyboardObservable.add((kbInfo) => {
            const key = kbInfo.event.key.toLowerCase();
            if (kbInfo.type === 1) this.inputMap[key] = true; // Down
            if (kbInfo.type === 2) this.inputMap[key] = false; // Up
        });

        this.scene.onBeforeRenderObservable.add(() => {
            if (!this.chassisAggregate) return;

            // Get forward direction of the mesh
            const forward = this.chassis.forward;
            
            // Simple Arcade Physics: Apply force to center of mass
            if (this.inputMap["w"]) {
                this.chassisAggregate.body.applyImpulse(forward.scale(5), this.chassis.getAbsolutePosition());
            }
            if (this.inputMap["s"]) {
                this.chassisAggregate.body.applyImpulse(forward.scale(-5), this.chassis.getAbsolutePosition());
            }
            if (this.inputMap["a"]) {
                this.chassisAggregate.body.setAngularVelocity(this.chassisAggregate.body.getAngularVelocity().add(new Vector3(0, -0.05, 0)));
            }
            if (this.inputMap["d"]) {
                this.chassisAggregate.body.setAngularVelocity(this.chassisAggregate.body.getAngularVelocity().add(new Vector3(0, 0.05, 0)));
            }
        });
    }
}
