/**
 * VULNERABLE - Handed to a provider as a prop. The constructor is inside the
 * library, in another file entirely.
 */
import { SocketProvider } from './socket-provider';

export function App({ children }) {
  return <SocketProvider url="ws://live.acme-corp.io/feed">{children}</SocketProvider>;
}
