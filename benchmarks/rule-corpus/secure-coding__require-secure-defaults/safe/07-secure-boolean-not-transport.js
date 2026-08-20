/**
 * SAFE - NOMINAL CONTROL. `secure` is a UI affordance on a document-viewer
 * component: it decides whether a watermark and a download lock are drawn. It
 * has nothing to do with transport, cookies or TLS, and `false` is the ordinary
 * value for a public document.
 */
import { renderViewer } from '../lib/viewer';

export function publicPreview(document) {
  return renderViewer(document, { secure: false, watermark: null, allowPrint: true });
}
