import { revalidatePath } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * GitHub Webhook handler for cache invalidation
 * 
 * Configure in GitHub repo settings:
 * - URL: https://your-domain.vercel.app/api/revalidate
 * - Content type: application/json
 * - Secret: GITHUB_WEBHOOK_SECRET
 * - Events: push, release
 */

// Plugin slug to package name mapping
const PLUGIN_MAPPINGS: Record<string, string> = {
  'browser-security': 'eslint-plugin-browser-security',
  'crypto': 'eslint-plugin-crypto',
  'express-security': 'eslint-plugin-express-security',
  'jwt': 'eslint-plugin-jwt',
  'lambda-security': 'eslint-plugin-lambda-security',
  'mongodb-security': 'eslint-plugin-mongodb-security',
  'nestjs-security': 'eslint-plugin-nestjs-security',
  'pg': 'eslint-plugin-pg',
  'secure-coding': 'eslint-plugin-secure-coding',
  'vercel-ai-security': 'eslint-plugin-vercel-ai-security',
  'import-next': 'eslint-plugin-import-next',
};

function verifySignature(payload: string, signature: string | null): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  
  if (!secret) {
    console.warn('GITHUB_WEBHOOK_SECRET not configured');
    return false;
  }
  
  if (!signature) {
    return false;
  }
  
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

function getAffectedPlugins(commits: Array<{ modified?: string[]; added?: string[]; removed?: string[] }>): string[] {
  const affectedPlugins = new Set<string>();
  
  for (const commit of commits) {
    const allFiles = [
      ...(commit.modified || []),
      ...(commit.added || []),
      ...(commit.removed || []),
    ];
    
    for (const file of allFiles) {
      // Check if file is a README in a plugin package
      const match = file.match(/^packages\/(eslint-plugin-[^/]+)\/README\.md$/);
      if (match) {
        // Find the plugin slug from package name
        const packageName = match[1];
        const pluginSlug = Object.entries(PLUGIN_MAPPINGS).find(
          ([, pkg]) => pkg === packageName
        )?.[0];
        
        if (pluginSlug) {
          affectedPlugins.add(pluginSlug);
        }
      }
    }
  }
  
  return Array.from(affectedPlugins);
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    
    // Verify webhook signature (skip in development)
    if (process.env.NODE_ENV === 'production') {
      if (!verifySignature(payload, signature)) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }
    
    const body = JSON.parse(payload);
    const event = request.headers.get('x-github-event');
    
    // Handle release events - revalidate all plugins
    if (event === 'release') {
      console.log('Release event detected, revalidating all plugins');
      
      for (const pluginSlug of Object.keys(PLUGIN_MAPPINGS)) {
        revalidatePath(`/docs/${pluginSlug}`);
      }
      
      return NextResponse.json({
        message: 'Revalidated all plugins',
        plugins: Object.keys(PLUGIN_MAPPINGS),
      });
    }
    
    // Handle push events - revalidate only affected plugins
    if (event === 'push' && body.commits) {
      const affectedPlugins = getAffectedPlugins(body.commits);
      
      if (affectedPlugins.length === 0) {
        return NextResponse.json({
          message: 'No plugin READMEs affected',
          plugins: [],
        });
      }
      
      console.log('Push event detected, revalidating:', affectedPlugins);
      
      for (const pluginSlug of affectedPlugins) {
        revalidatePath(`/docs/${pluginSlug}`);
      }
      
      return NextResponse.json({
        message: 'Revalidated affected plugins',
        plugins: affectedPlugins,
      });
    }
    
    return NextResponse.json({
      message: 'Event type not handled',
      event,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'GitHub Webhook Revalidation',
    plugins: Object.keys(PLUGIN_MAPPINGS).length,
  });
}
