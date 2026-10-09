/**
 * @file b2StorageDispatcher.js
 * Authoritative Backblaze B2 Dispatcher for Vercel Serverless and Vite Dev Servers.
 */

let cachedB2Auth = null;

export async function getB2AuthTokens(env = process.env, forceRefresh = false) {
  if (!forceRefresh && cachedB2Auth && cachedB2Auth.expiresAt > Date.now() + 300000) {
    return cachedB2Auth;
  }

  const keyId = env.VITE_B2_KEY_ID || env.B2_KEY_ID || '00504e4d4912f750000000001';
  const appKey = env.VITE_B2_APPLICATION_KEY || env.B2_APPLICATION_KEY || 'K005IgcedfJWsbGIXMn6tQlFhUchfNo';
  const bucketId = env.VITE_B2_BUCKET_ID || env.B2_BUCKET_ID || '50149e04ad14c911a20f0715';
  const bucketName = env.VITE_B2_BUCKET_NAME || env.B2_BUCKET_NAME || 'nacos-resources';

  const creds = Buffer.from(`${keyId}:${appKey}`).toString('base64');
  const res = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: { Authorization: `Basic ${creds}` }
  });

  if (!res.ok) {
    throw new Error(`Failed to authorize with B2: ${res.status}`);
  }

  const data = await res.json();
  cachedB2Auth = {
    apiUrl: data.apiInfo?.storageApi?.apiUrl || 'https://api005.backblazeb2.com',
    downloadUrl: data.apiInfo?.storageApi?.downloadUrl || 'https://f005.backblazeb2.com',
    bucketName: data.apiInfo?.storageApi?.bucketName || bucketName,
    bucketId: bucketId,
    authorizationToken: data.authorizationToken,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000
  };

  return cachedB2Auth;
}

export async function handleStorageRequest(req, res, env = process.env) {
  const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
  const pathname = urlObj.pathname;
  const method = req.method;

  try {
    let auth = await getB2AuthTokens(env);

    // 1. Download Token
    if ((pathname === '/api/b2-download-token' || pathname === '/api/resource-storage') && method === 'GET') {
      const dlRes = await fetch(`${auth.apiUrl}/b2api/v3/b2_get_download_authorization`, {
        method: 'POST',
        headers: { Authorization: auth.authorizationToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucketId: auth.bucketId, fileNamePrefix: '', validDurationInSeconds: 86400 })
      });
      const dlData = await dlRes.json();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        authorizationToken: dlData.authorizationToken,
        downloadUrl: auth.downloadUrl,
        bucketName: auth.bucketName,
        expiresAt: Date.now() + 23 * 60 * 60 * 1000
      }));
      return true;
    }

    // 2. Download Proxy
    if (pathname === '/api/download' && method === 'GET') {
      const storageKey = urlObj.searchParams.get('key') || urlObj.searchParams.get('storageKey');
      const fileName = urlObj.searchParams.get('name') || urlObj.searchParams.get('fileName') || 'document.pdf';
      if (!storageKey) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing storage key' }));
        return true;
      }

      const cleanKey = String(storageKey).replace(/^\/+/, '');
      const b2FileUrl = `${auth.downloadUrl}/file/${auth.bucketName}/${cleanKey}`;
      let b2Res = await fetch(b2FileUrl, { headers: { Authorization: auth.authorizationToken } });
      if (!b2Res.ok && b2Res.status === 401) {
        auth = await getB2AuthTokens(env, true);
        b2Res = await fetch(b2FileUrl, { headers: { Authorization: auth.authorizationToken } });
      }
      if (!b2Res.ok) {
        res.statusCode = b2Res.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: `Storage provider status ${b2Res.status}` }));
        return true;
      }

      const contentType = b2Res.headers.get('content-type') || 'application/octet-stream';
      const contentLength = b2Res.headers.get('content-length');
      const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');

      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      res.setHeader('Cache-Control', 'public, max-age=86400');

      const arrayBuffer = await b2Res.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
      return true;
    }

    // 3. Preview Proxy
    if (pathname === '/api/preview' && method === 'GET') {
      const storageKey = urlObj.searchParams.get('key') || urlObj.searchParams.get('storageKey');
      if (!storageKey) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing storage key' }));
        return true;
      }

      const cleanKey = String(storageKey).replace(/^\/+/, '');
      const b2FileUrl = `${auth.downloadUrl}/file/${auth.bucketName}/${cleanKey}`;
      let b2Res = await fetch(b2FileUrl, { headers: { Authorization: auth.authorizationToken } });
      if (!b2Res.ok && b2Res.status === 401) {
        auth = await getB2AuthTokens(env, true);
        b2Res = await fetch(b2FileUrl, { headers: { Authorization: auth.authorizationToken } });
      }
      if (!b2Res.ok) {
        res.statusCode = b2Res.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: `Storage provider status ${b2Res.status}` }));
        return true;
      }

      const contentType = b2Res.headers.get('content-type') || 'application/pdf';
      const contentLength = b2Res.headers.get('content-length');

      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      const arrayBuffer = await b2Res.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
      return true;
    }

    // 4. Resource Storage POST actions (get-upload-url, upload-file, delete)
    if (pathname === '/api/resource-storage' && method === 'POST') {
      let body = '';
      if (req.body && typeof req.body === 'object') {
        body = req.body;
      } else {
        body = await new Promise((resolve) => {
          let b = '';
          req.on('data', c => { b += c; });
          req.on('end', () => {
            try { resolve(JSON.parse(b || '{}')); } catch (_) { resolve({}); }
          });
        });
      }

      const { action, storageKey } = body;

      if (action === 'get-upload-url' || action === 'presign-upload') {
        const upRes = await fetch(`${auth.apiUrl}/b2api/v3/b2_get_upload_url`, {
          method: 'POST',
          headers: {
            Authorization: auth.authorizationToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ bucketId: auth.bucketId })
        });

        if (!upRes.ok) {
          const errData = await upRes.json().catch(() => ({}));
          res.statusCode = upRes.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to obtain B2 upload target', details: errData }));
          return true;
        }

        const upTarget = await upRes.json();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: true,
          uploadUrl: upTarget.uploadUrl,
          authorizationToken: upTarget.authorizationToken,
          storageKey,
          bucket: auth.bucketName
        }));
        return true;
      }

      if (action === 'upload-file' || action === 'direct-upload') {
        const { fileBase64, mimeType = 'application/octet-stream' } = body;
        if (!fileBase64 || !storageKey) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing fileBase64 or storageKey' }));
          return true;
        }

        // Get fresh B2 upload target
        const upRes = await fetch(`${auth.apiUrl}/b2api/v3/b2_get_upload_url`, {
          method: 'POST',
          headers: {
            Authorization: auth.authorizationToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ bucketId: auth.bucketId })
        });

        if (!upRes.ok) {
          throw new Error('Failed to obtain B2 upload target for direct upload');
        }

        const upTarget = await upRes.json();
        const buffer = Buffer.from(fileBase64, 'base64');

        const b2UploadRes = await fetch(upTarget.uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: upTarget.authorizationToken,
            'X-Bz-File-Name': encodeURIComponent(storageKey),
            'Content-Type': mimeType,
            'Content-Length': buffer.length.toString(),
            'X-Bz-Content-Sha1': 'do_not_verify'
          },
          body: buffer
        });

        if (!b2UploadRes.ok) {
          const errData = await b2UploadRes.json().catch(() => ({}));
          throw new Error(errData.message || 'B2 direct upload failed');
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: true,
          storageKey,
          storageProvider: 'backblaze_b2',
          storageBucket: auth.bucketName,
          publicUrl: `${auth.downloadUrl}/file/${auth.bucketName}/${storageKey}`,
          fileSize: buffer.length
        }));
        return true;
      }

      if (action === 'delete') {
        const cleanKey = String(storageKey || '').replace(/^\/+/, '');
        if (!cleanKey) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing storageKey' }));
          return true;
        }

        const listRes = await fetch(`${auth.apiUrl}/b2api/v3/b2_list_file_names`, {
          method: 'POST',
          headers: {
            Authorization: auth.authorizationToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            bucketId: auth.bucketId,
            startFileName: cleanKey,
            maxFileCount: 10
          })
        });

        if (listRes.ok) {
          const listData = await listRes.json();
          const matches = (listData.files || []).filter(f => f.fileName === cleanKey);
          for (const f of matches) {
            await fetch(`${auth.apiUrl}/b2api/v3/b2_delete_file_version`, {
              method: 'POST',
              headers: {
                Authorization: auth.authorizationToken,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ fileId: f.fileId, fileName: f.fileName })
            });
          }
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, message: 'Backblaze B2 object deleted successfully' }));
        return true;
      }

      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Unsupported storage action: ${action}` }));
      return true;
    }

    return false;
  } catch (err) {
    console.error('[B2 Storage Dispatcher Error]:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Internal Storage Error' }));
    return true;
  }
}
