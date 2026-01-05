import { Scene, MeshBuilder, StandardMaterial, Color3, Mesh, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";
import { HapticManager } from "../../utils/HapticManager";

export class PhysicsModule {
    private scene: Scene;
    private rootMesh: Mesh;

    constructor(scene: Scene) {
        this.scene = scene;
        this.rootMesh = new Mesh("PhysicsModuleRoot", scene);
    }

    public load() {
        console.log("Motus99: Loading Physics Module (The Workshop)");
        
        // Create the "Floor" (The Hangar)
        const ground = MeshBuilder.CreateGround("ground", {width: 50, height: 50}, this.scene);
        const groundMat = new StandardMaterial("groundMat", this.scene);
        groundMat.diffuseColor = Color3.FromHexString("#1a1a1a"); // Dark industrial floor
        ground.material = groundMat;
        
        // V2 Physics: Aggregate for Static Ground
        new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, restitution: 0.9 }, this.scene);

        // Create a basic "Crawler" chassis placeholder
        this.createCrawlerChassis();
    }

    private createCrawlerChassis() {
        const chassis = MeshBuilder.CreateBox("crawlerChassis", {height: 0.5, width: 2, depth: 4}, this.scene);
        chassis.position.y = 5; // Drop from higher up
        const chassisMat = new StandardMaterial("chassisMat", this.scene);
        chassisMat.diffuseColor = Color3.FromHexString("#708090"); // Brushed Metal
        chassis.material = chassisMat;

        // Simulate a "Snap" when loaded (Juice)
        HapticManager.triggerSnap();
        
        // V2 Physics: Aggregate for Dynamic Body
        new PhysicsAggregate(chassis, PhysicsShapeType.BOX, { mass: 100, friction: 0.5, restitution: 0.2 }, this.scene);
    }

    public unload() {
        this.rootMesh.dispose();
        // Clean up meshes
    }
}
