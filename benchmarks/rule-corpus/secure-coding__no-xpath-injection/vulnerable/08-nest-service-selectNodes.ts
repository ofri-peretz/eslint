/**
 * VULNERABLE - A Nest service reading a partner feed. The DTO field is spliced
 * into a location step carrying a predicate - the XPath form that has no `//`
 * in it at all.
 */
import { Injectable } from '@nestjs/common';
import { DOMParser } from '@xmldom/xmldom';

@Injectable()
export class FeedService {
  find(feedXml: string, sku: string): unknown {
    const doc = new DOMParser().parseFromString(feedXml, 'text/xml');
    return (doc as unknown as { selectNodes(e: string): unknown }).selectNodes(
      '/catalog/product[@sku="' + sku + '"]/price',
    );
  }
}
