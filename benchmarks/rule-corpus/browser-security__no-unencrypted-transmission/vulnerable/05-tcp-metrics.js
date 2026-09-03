/**
 * VULNERABLE - A raw TCP metrics sink. Whatever is shipped there is readable in
 * transit.
 */
export const STATSD = 'tcp://metrics.acme-corp.io:2003';
