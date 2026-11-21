import { activate } from '../lib/activate';
import { mount } from '../ui/mount';
import type { Mounted } from '../ui/mount';

// Design decision 8, REQ-BC-8, REQ-BA-10: every load that calls activate also re-reads the page
// and mounts the UI again, so a handed-off view or a changed query collects anew.
function start(): Mounted {
  activate(document, location);
  return mount(document, window);
}

export default defineContentScript({
  registration: 'runtime',
  matches: [],
  main() {
    let wired: Mounted = start();
    const restarted = () => {
      wired.dispose();
      wired = start();
    };
    window.addEventListener('turbo:load', restarted);
    window.addEventListener('popstate', restarted);
  },
});
