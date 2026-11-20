import { activate } from '../lib/activate';

export default defineContentScript({
  registration: 'runtime',
  matches: [],
  main() {
    activate(document, location);
    window.addEventListener('turbo:load', () => activate(document, location));
    window.addEventListener('popstate', () => activate(document, location));
  },
});
