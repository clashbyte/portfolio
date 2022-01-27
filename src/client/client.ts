import {Renderer} from "./modules/Renderer";
import {SceneManager} from "./modules/SceneManager";
import {Shadows} from "./modules/Shadows";
let currentCascade = 0;

async function load() {
    Renderer.init();
    Shadows.init();
    await SceneManager.loadResources();
    SceneManager.init();
}
function render() {
    let stamp = performance.now();
    const renderFunc = (time: number) => {
        requestAnimationFrame(renderFunc);
        const frameTime = time - stamp;
        stamp = time;

        // Updating logics
        SceneManager.update(frameTime / 16.0);

        // Making shadow pass
        const cascades = [0, currentCascade + 1];
        for (let cascade of cascades) {
            SceneManager.shadowPass(Shadows.getCascadePrescaler(cascade));
            Shadows.render(cascade);
        }
        currentCascade = (currentCascade + 1) % (Shadows.getCascades() - 1);

        // Making default pass
        SceneManager.defaultPass();
        Renderer.render();
    }
    renderFunc(stamp);
}
load().then(() => {
    render();
})
