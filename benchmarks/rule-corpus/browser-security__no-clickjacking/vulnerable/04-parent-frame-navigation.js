/** VULNERABLE - the page rewrites its PARENT's location with no frame check
 *  first. An embedded widget that can navigate its host is a redirect
 *  primitive for whoever framed it. */
export function returnToHost(destination) {
  top.location = destination;
}
