import './shell.css';
import './animation-canvas.css';

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode') === 'animation' ? 'animation' : 'scene';
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app');

const nav = document.createElement('nav');
nav.className = 'mode-nav';
nav.innerHTML = `<a class="${mode === 'animation' ? 'active' : ''}" href="?mode=animation">Animation Editor</a><a class="${mode === 'scene' ? 'active' : ''}" href="?mode=scene">Scene Preview</a>`;
document.body.insertBefore(nav, app);

if (mode === 'scene') {
  void import('./scene-main')
    .then(() => import('./default-sample'))
    .then(({ loadDefaultSampleThroughUi }) => loadDefaultSampleThroughUi())
    .catch((error) => console.error('Failed to load the default SpriteForge sample.', error));
} else {
  void import('./main');
}
