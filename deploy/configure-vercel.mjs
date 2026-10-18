import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function vercelConfig(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error('Supply the public HTTPS Render backend origin.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      !['', '/'].includes(url.pathname) || url.port ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.onrender\.com$/.test(url.hostname)) {
    throw new Error('Use https://YOUR-SERVICE.onrender.com without credentials, paths, ports or query parameters.');
  }
  const prefixes = ['/api', '/oauth2', '/login/oauth2', '/actuator/health'];
  return {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    framework: 'vite',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    rewrites: [
      ...prefixes.map((prefix) => ({ source: `${prefix}/:path*`, destination: `${url.origin}${prefix}/:path*` })),
      { source: '/:path*', destination: '/index.html' },
    ],
    headers: prefixes.map((prefix) => ({
      source: `${prefix}/:path*`,
      headers: [
        { key: 'Cache-Control', value: 'private, no-store' },
        { key: 'CDN-Cache-Control', value: 'no-store' },
        { key: 'x-vercel-enable-rewrite-caching', value: '0' },
      ],
    })),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = vercelConfig(process.argv[2]);
    const destination = new URL('../frontend/vercel.json', import.meta.url);
    await writeFile(destination, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    console.log(`Configured ${fileURLToPath(destination)} for ${new URL(process.argv[2]).origin}`);
    console.log('Commit this public routing file, then redeploy Vercel. No credentials belong in this file.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
