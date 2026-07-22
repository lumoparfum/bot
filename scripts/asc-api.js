// App Store Connect API kucuk yardimci script - App Store Connect'te tek tek
// tiklamak yerine mevcut .p8 API anahtariyla dogrudan metadata guncellemek icin.
// Kullanim: node scripts/asc-api.js <method> <path> [jsonBody]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const KEY_ID = '3VFZ9MAAL3';
const ISSUER_ID = 'a3ff93d8-751a-463b-8012-e7d4fdedfc22';
const KEY_PATH = path.join(__dirname, '..', 'AuthKey_3VFZ9MAAL3.p8');

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeToken() {
  const privateKey = fs.readFileSync(KEY_PATH, 'utf8');
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 1190,
    aud: 'appstoreconnect-v1',
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.sign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });
  return `${signingInput}.${base64url(signature)}`;
}

function request(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const token = makeToken();
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: 'api.appstoreconnect.apple.com',
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
        res.on('end', () => {
          resolve({ status: res.statusCode, body: chunks });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const [method, apiPath, jsonBody] = process.argv.slice(2);
  const body = jsonBody ? JSON.parse(jsonBody) : undefined;
  const res = await request(method, apiPath, body);
  console.log('STATUS', res.status);
  console.log(res.body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
