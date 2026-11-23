import { Component, type ReactNode } from 'react';
import { toast } from '@/components/ui/toast';

type Props = { children: ReactNode; onError: () => void };

/**
 * Catches a lazy overlay (help, tour, sync) that fails to load, typically a first visit while
 * offline before the service worker has cached it, so the rest of the app keeps working.
 */
export class OverlayBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(): void {
    toast.error('Couldn’t open that. Check your connection and try again.');
    this.props.onError();
    this.setState({ failed: false });
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
