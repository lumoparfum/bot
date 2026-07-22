// Google Play Developer API'ye ham (binary) resim yuklemek icin -
// play-api.js sadece JSON body destekliyordu, bu ayri script PNG/JPEG
// dosyasini oldugu gibi upload endpoint'ine gonderiyor.
// Kullanim: node scripts/play-upload-image.js <editId> <language> <imageType> <method> <filePath>
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const KEY_PATH = path.join(__dirname, '..', 'google-play-service-account.json');
const PACKAGE_NAME = 'com.stop82.app';

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function httpsPost(hostname, urlPath, formBody) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path: urlPath, method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(formBody) } },
      (res) => { let c = ''; res.on('data', (d) => (c += d)); res.on('end', () => resolve({ status: res.statusCode, body: c })); }
    );
    req.on('error', reject);
    req.write(formBody);
    req.end();
  });
}

async function getAccessToken() {
  const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: key.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), key.private_key);
  const jwt = `${signingInput}.${base64url(signature)}`;
  const body = `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(jwt)}`;
  const res = await httpsPost('oauth2.googleapis.com', '/token', body);
  return JSON.parse(res.body).access_token;
}

function rawRequest(method, apiPath, token, buffer, contentType) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'androidpublisher.googleapis.com',
        path: apiPath,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(buffer ? { 'Content-Type': contentType, 'Content-Length': buffer.length } : {}),
        },
      },
      (res) => { let chunks = []; res.on('data', (d) => chunks.push(d)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() })); }
    );
    req.on('error', reject);
    if (buffer) req.write(buffer);
    req.end();
  });
}

async function main() {
  const [editId, language, imageType, method, filePath] = process.argv.slice(2);
  const token = await getAccessToken();
  let apiPath;
  let buffer = null;
  let contentType = null;
  if (method === 'DELETEALL') {
    apiPath = `/androidpublisher/v3/applications/${PACKAGE_NAME}/edits/${editId}/listings/${language}/${imageType}`;
    const res = await rawRequest('DELETE', apiPath, token, null, null);
    console.log('STATUS', res.status, res.body);
    return;
  }
  if (method === 'UPLOAD') {
    apiPath = `/upload/androidpublisher/v3/applications/${PACKAGE_NAME}/edits/${editId}/listings/${language}/${imageType}`;
    buffer = fs.readFileSync(filePath);
    contentType = 'image/png';
    const res = await rawRequest('POST', apiPath, token, buffer, contentType);
    console.log('STATUS', res.status, res.body);
    return;
  }
  console.error('Unknown method', method);
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
