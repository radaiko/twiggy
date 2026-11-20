import { reconcile, type RegistryApi } from '../lib/host-registry';

export default defineBackground(() => {
  // Serialise reconciles so overlapping events cannot read the same state and double-register.
  let queue = Promise.resolve();
  const run = () => {
    queue = queue
      .then(() => reconcile(browser as unknown as RegistryApi))
      .catch((error) => console.error('twiggy: reconcile failed', error));
  };

  browser.runtime.onInstalled.addListener(run);
  browser.runtime.onStartup.addListener(run);
  browser.permissions.onAdded.addListener(run);
  browser.permissions.onRemoved.addListener(run);
});
