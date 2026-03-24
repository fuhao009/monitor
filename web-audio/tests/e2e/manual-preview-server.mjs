#!/usr/bin/env node

import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webAudioRoot = path.resolve(__dirname, '..', '..');
const distDir = path.join(webAudioRoot, 'dist');
const host = process.env.MANUAL_PREVIEW_HOST || '0.0.0.0';
const port = Number.parseInt(process.env.MANUAL_PREVIEW_PORT || '8012', 10);
const apiOrigin = String(process.env.MANUAL_API_ORIGIN || 'http://127.0.0.1:7001').replace(/\/+$/, '');

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.css':
      return 'text/css; charset=utf-8';
    case '.html':
      return 'text/html; charset=utf-8';
    case '.ico':
      return 'image/x-icon';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.js':
    case '.mjs':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml; charset=utf-8';
    case '.txt':
      return 'text/plain; charset=utf-8';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

async function resolveStaticFile(rootDir, pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const candidatePath = path.resolve(rootDir, `.${decodedPath}`);

  if (!candidatePath.startsWith(rootDir)) {
    return null;
  }

  const candidateStat = await fsPromises.stat(candidatePath).catch(() => null);
  if (candidateStat?.isFile()) {
    return candidatePath;
  }

  if (candidateStat?.isDirectory()) {
    const indexFile = path.join(candidatePath, 'index.html');
    const indexStat = await fsPromises.stat(indexFile).catch(() => null);
    if (indexStat?.isFile()) {
      return indexFile;
    }
  }

  const fallbackFile = path.join(rootDir, 'index.html');
  const fallbackStat = await fsPromises.stat(fallbackFile).catch(() => null);
  return fallbackStat?.isFile() ? fallbackFile : null;
}

async function proxyApiRequest(request, response) {
  const upstreamUrl = new URL(request.url || '/', apiOrigin);
  const headers = new Headers();

  Object.entries(request.headers).forEach(([key, value]) => {
    if (typeof value === 'undefined') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item));
      return;
    }

    headers.set(key, value);
  });

  headers.delete('host');

  const init = {
    method: request.method,
    headers,
  };

  if (request.method && !['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    init.body = request;
    init.duplex = 'half';
  }

  const upstreamResponse = await fetch(upstreamUrl, init);

  response.statusCode = upstreamResponse.status;
  upstreamResponse.headers.forEach((value, key) => {
    response.setHeader(key, value);
  });

  if (!upstreamResponse.body) {
    response.end();
    return;
  }

  const reader = upstreamResponse.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      response.end();
      return;
    }
    response.write(Buffer.from(value));
  }
}

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  throw new Error(`Build output not found at ${distDir}. Run "npm run build" before starting preview.`);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');

  if (requestUrl.pathname.startsWith('/api/')) {
    try {
      await proxyApiRequest(request, response);
    } catch (error) {
      response.statusCode = 502;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(
        JSON.stringify({
          success: false,
          message: `Preview API proxy failed: ${error.message}`,
        }),
      );
    }
    return;
  }

  const filePath = await resolveStaticFile(distDir, requestUrl.pathname);
  if (!filePath) {
    response.statusCode = 404;
    response.end('Not Found');
    return;
  }

  response.setHeader('Content-Type', getContentType(filePath));
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`[manual-preview] serving ${distDir}`);
  console.log(`[manual-preview] api proxy -> ${apiOrigin}`);
  console.log(`[manual-preview] listening on http://${host}:${port}`);
});
