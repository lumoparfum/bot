// Google Play Developer API (Android Publisher) kucuk yardimci script -
// servis hesabi JSON anahtariyla dogrudan Play Console verilerini okuyup
// guncellemek icin.
// Kullanim: node scripts/play-api.js <method> <path> [jsonBody]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const KEY_PATH = path.join(__dirname, '..', 'google-play-service-account.json');
const PACKAGE_NAME = 'com.stop82.app';

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function httpsPost(hostname, urlPath, formBody) {
  return new Promise((resolve, reject) => {
    const data = formBody;
    const req = https.request(
      {
        hostname,
        path: urlPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getAccessToken() {
  const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), key.private_key);
  const jwt = `${signingInput}.${base64url(signature)}`;

  const body = `grant_type=${encodeURIComponent(
    'urn:ietf:params:oauth:grant-type:jwt-bearer'
  )}&assertion=${encodeURIComponent(jwt)}`;
  const res = await httpsPost('oauth2.googleapis.com', '/token', body);
  const parsed = JSON.parse(res.body);
  if (!parsed.access_token) {
    throw new Error('Token alinamadi: ' + res.body);
  }
  return parsed.access_token;
}

function request(method, apiPath, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: 'androidpublisher.googleapis.com',
        path: apiPath,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const [method, apiPath, jsonBody] = process.argv.slice(2);
  const token = await getAccessToken();
  const body = jsonBody ? JSON.parse(jsonBody) : undefined;
  const res = await request(method, apiPath, token, body);
  console.log('STATUS', res.status);
  console.log(res.body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
