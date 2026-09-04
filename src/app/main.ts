import { App } from './App.js';

const root = document.getElementById('root');
if (!root) throw new Error('Application root missing.');

const app = new App(root);
void app.start();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./service-worker.js').catch(() => undefined);
  });
}
