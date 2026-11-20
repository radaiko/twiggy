import { reconcile, type RegistryApi } from '../lib/host-registry';

export default defineBackground(() => {
  const run = () => {
    void reconcile(browser as unknown as RegistryApi);
  };

  browser.runtime.onInstalled.addListener(run);
  browser.runtime.onStartup.addListener(run);
  browser.permissions.onAdded.addListener(run);
  browser.permissions.onRemoved.addListener(run);
});
