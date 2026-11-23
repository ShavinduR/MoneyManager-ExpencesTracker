import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * React.lazy remembers a failed import forever. This keeps a fresh lazy component available after a
 * failure (e.g. opened offline before the service worker cached the chunk), so a later try can load.
 */
export const resettableLazy = <P extends object>(load: () => Promise<{ default: ComponentType<P> }>) => {
  let current: LazyExoticComponent<ComponentType<P>> = lazy(load);
  return {
    get: (): LazyExoticComponent<ComponentType<P>> => current,
    reset: (): void => {
      current = lazy(load);
    },
  };
};
