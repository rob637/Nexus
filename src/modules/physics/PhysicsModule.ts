import { Scene, MeshBuilder, StandardMaterial, Color3, Mesh, PhysicsAggregate, PhysicsShapeType, Vector3, Physics6DoFConstraint, PhysicsConstraintAxis, Axis, PointerEventTypes } from "@babylonjs/core";
import { HapticManager } from "../../utils/HapticManager";

export class PhysicsModule {
    private scene: Scene;
    private rootMesh: Mesh;

    constructor(scene: Scene) {
        this.scene = scene;
        this.rootMesh = new Mesh("PhysicsModuleRoot", scene);
    }

    public load() {
        console.log("Motus99: Loading Physics Playground");
        
        // 1. The Floor
        const ground = MeshBuilder.CreateGround("ground", {width: 100, height: 100}, this.scene);
        const groundMat = new StandardMaterial("groundMat", this.scene);
        groundMat.diffuseColor = Color3.FromHexString("#2a2a35");
        ground.material = groundMat;
        new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, restitution: 0.5, friction: 0.8 }, this.scene);

        // 2. The Wrecking Ball Setup
        this.createPendulum(new Vector3(0, 15, 0));

        // 3. The Target (Tower of Boxes)
        this.createTower(new Vector3(0, 0.5, 0));

        // 4. Interaction (Cut the Rope / Push the Ball)
        this.setupInteraction();

        HapticManager.triggerSnap();
    }

    private createPendulum(anchorPos: Vector3) {
        // Static Anchor Point
        const anchor = MeshBuilder.CreateBox("anchor", {size: 1}, this.scene);
        anchor.position = anchorPos;
        const anchorMat = new StandardMaterial("anchorMat", this.scene);
        anchorMat.diffuseColor = Color3.Yellow();
        anchor.material = anchorMat;
        
        const anchorAgg = new PhysicsAggregate(anchor, PhysicsShapeType.BOX, { mass: 0 }, this.scene);

        // Create Chain Links
        let previousAgg = anchorAgg;
        const linkCount = 10;
        const linkSize = 0.5;
        const linkDist = 0.8;

        for(let i=0; i<linkCount; i++) {
            const link = MeshBuilder.CreateSphere("link_" + i, {diameter: linkSize}, this.scene);
            link.position = anchorPos.add(new Vector3(0, -(i+1)*linkDist, 0));
            const linkMat = new StandardMaterial("linkMat", this.scene);
            linkMat.diffuseColor = Color3.FromHexString("#FFD700"); // Gold
            link.material = linkMat;

            const linkAgg = new PhysicsAggregate(link, PhysicsShapeType.SPHERE, { mass: 1, friction: 0.5 }, this.scene);
            
            // Store aggregate on mesh for interaction later
            link.metadata = { aggregate: linkAgg };

            // Connect to previous
            this.createJoint(previousAgg, linkAgg, new Vector3(0, -linkDist/2, 0), new Vector3(0, linkDist/2, 0));
            previousAgg = linkAgg;
        }

        // The Heavy Wrecking Ball
        const ball = MeshBuilder.CreateSphere("wreckingBall", {diameter: 2.5}, this.scene);
        ball.position = previousAgg.body.transformNode.position.add(new Vector3(0, -2, 0));
        const ballMat = new StandardMaterial("ballMat", this.scene);
        ballMat.diffuseColor = Color3.Red();
        ball.material = ballMat;
        
        const ballAgg = new PhysicsAggregate(ball, PhysicsShapeType.SPHERE, { mass: 50, restitution: 0.8 }, this.scene);
        ball.metadata = { aggregate: ballAgg };

        // Connect ball to last link
        this.createJoint(previousAgg, ballAgg, new Vector3(0, -linkDist/2, 0), new Vector3(0, 1.5, 0));
    }

    private createJoint(aggA: PhysicsAggregate, aggB: PhysicsAggregate, pivotA: Vector3, pivotB: Vector3) {
        const joint = new Physics6DoFConstraint(
            {
                pivotA: pivotA,
                pivotB: pivotB,
                axisA: Axis.Y,
                axisB: Axis.Y,
                perpAxisA: Axis.X,
                perpAxisB: Axis.X,
            },
            [
                { axis: PhysicsConstraintAxis.LINEAR_X, minLimit: 0, maxLimit: 0 },
                { axis: PhysicsConstraintAxis.LINEAR_Y, minLimit: 0, maxLimit: 0 },
                { axis: PhysicsConstraintAxis.LINEAR_Z, minLimit: 0, maxLimit: 0 },
                // Angular limits free for rotation
            ],
            this.scene
        );
        aggA.body.addConstraint(aggB.body, joint);
    }

    private createTower(pos: Vector3) {
        const boxSize = 1.5;
        for (let y = 0; y < 6; y++) {
            for (let x = -1; x <= 1; x++) {
                const box = MeshBuilder.CreateBox("box", { size: boxSize }, this.scene);
                box.position = pos.add(new Vector3(x * boxSize, y * boxSize + boxSize/2, 0));
                
                const boxMat = new StandardMaterial("boxMat", this.scene);
                boxMat.diffuseColor = Color3.FromHexString("#4682B4"); // Steel Blue
                box.material = boxMat;

                new PhysicsAggregate(box, PhysicsShapeType.BOX, { mass: 2, friction: 0.6, restitution: 0.2 }, this.scene);
            }
        }
    }

    private setupInteraction() {
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                if (pointerInfo.pickInfo?.hit && pointerInfo.pickInfo.pickedMesh) {
                    const mesh = pointerInfo.pickInfo.pickedMesh;
                    
                    // 1. Cut the Rope (Click a link)
                    if (mesh.name.startsWith("link_")) {
                        console.log("Cutting link:", mesh.name);
                        mesh.dispose(); // Disposing the mesh destroys the physics body and breaks the chain
                        HapticManager.triggerSnap();
                    }

                    // 2. Push the Ball (Click the ball)
                    if (mesh.name === "wreckingBall") {
                        console.log("Pushing ball");
                        const agg = mesh.metadata?.aggregate as PhysicsAggregate;
                        if (agg) {
                            // Push away from camera
                            const forward = this.scene.activeCamera!.getForwardRay().direction;
                            agg.body.applyImpulse(forward.scale(500), mesh.getAbsolutePosition());
                        }
                    }
                }
            }
        });
    }

    public unload() {
        this.rootMesh.dispose();
    }
}
