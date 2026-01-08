import { MotusEngine } from "./engine/MotusEngine";
import { Dashboard, ScienceSector } from "./core/Dashboard";

async function initApp() {
    try {
        const engine = new MotusEngine("renderCanvas");
        await engine.init();

        const dashboard = new Dashboard(engine.getScene());

        // For development/demo purposes, we'll add a simple UI overlay to simulate selecting the Physics module
        const uiLayer = document.getElementById("ui-layer");
        if (uiLayer) {
            // Button styling helper
            const styleButton = (btn: HTMLButtonElement, color: string) => {
                btn.style.padding = "15px 30px";
                btn.style.background = color;
                btn.style.border = "none";
                btn.style.color = "black";
                btn.style.fontFamily = "var(--font-mono)";
                btn.style.fontWeight = "bold";
                btn.style.cursor = "pointer";
                btn.style.fontSize = "14px";
                btn.style.pointerEvents = "auto";
                btn.style.borderRadius = "8px";
                btn.style.transition = "transform 0.2s, box-shadow 0.2s";
                btn.onmouseenter = () => {
                    btn.style.transform = "scale(1.05)";
                    btn.style.boxShadow = "0 0 20px " + color;
                };
                btn.onmouseleave = () => {
                    btn.style.transform = "scale(1)";
                    btn.style.boxShadow = "none";
                };
            };

            // Container for buttons
            const btnContainer = document.createElement("div");
            btnContainer.style.position = "absolute";
            btnContainer.style.bottom = "50px";
            btnContainer.style.left = "50%";
            btnContainer.style.transform = "translateX(-50%)";
            btnContainer.style.display = "flex";
            btnContainer.style.gap = "20px";
            btnContainer.style.flexDirection = "column";
            btnContainer.style.alignItems = "center";

            // Title
            const title = document.createElement("div");
            title.innerHTML = "🎮 SELECT EXPERIENCE";
            title.style.color = "#00f2ff";
            title.style.fontFamily = "var(--font-mono)";
            title.style.fontSize = "18px";
            title.style.marginBottom = "10px";
            title.style.textShadow = "0 0 10px #00f2ff";
            btnContainer.appendChild(title);

            // Button row
            const btnRow = document.createElement("div");
            btnRow.style.display = "flex";
            btnRow.style.gap = "15px";
            
            // Physics Sandbox Button
            const physicsBtn = document.createElement("button");
            physicsBtn.innerText = "🔨 PHYSICS SANDBOX";
            styleButton(physicsBtn, "#4ecdc4");
            
            physicsBtn.onclick = async () => {
                try {
                    physicsBtn.innerText = "LOADING...";
                    await dashboard.loadModule(ScienceSector.PHYSICS);
                    btnContainer.style.display = "none";
                } catch (err) {
                    console.error("Module Load Failed:", err);
                    physicsBtn.innerText = "FAILED";
                }
            };

            // Cut The Rope Button
            const ropeBtn = document.createElement("button");
            ropeBtn.innerText = "🍬 CUT THE ROPE";
            styleButton(ropeBtn, "#ff6b6b");
            
            ropeBtn.onclick = async () => {
                try {
                    ropeBtn.innerText = "LOADING...";
                    await dashboard.loadModule(ScienceSector.CUT_THE_ROPE);
                    btnContainer.style.display = "none";
                } catch (err) {
                    console.error("Module Load Failed:", err);
                    ropeBtn.innerText = "FAILED";
                }
            };

            btnRow.appendChild(physicsBtn);
            btnRow.appendChild(ropeBtn);
            btnContainer.appendChild(btnRow);
            uiLayer.appendChild(btnContainer);
        }

    } catch (error) {
        console.error("Motus99 Initialization Failed:", error);
    }
}

initApp();
