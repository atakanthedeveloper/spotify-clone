const clientId = 'b8b490f027174e92bf8371e7f9dfbf01';
const mainUrl = "http://127.0.0.1:3000";
const redirectUri = `${mainUrl}/login/login.html`;

const scope =
  'user-top-read user-follow-read playlist-read-private user-library-read';

const generateRandomString = (length) => {
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));

  return values.reduce((acc, x) => acc + possible[x % possible.length], '')
};

const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);

  return window.crypto.subtle.digest('SHA-256', data)
};

const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
};

const authorizeUser = async () => {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  localStorage.setItem('code_verifier', codeVerifier);

  const authUrl = new URL('https://accounts.spotify.com/authorize');

  const params = {
    response_type: 'code',
    client_id: clientId,
    scope,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  };

  authUrl.search = new URLSearchParams(params).toString();

  window.location.href = authUrl.toString();
}

const getToken = async (code) => {
  const codeVerifier = localStorage.getItem('code_verifier');

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Token alınamadı:', error);
    return null
  }

  const data = await response.json();

  localStorage.setItem('accessToken', data.access_token);
  localStorage.setItem('refreshToken', data.refresh_token);

  const expiresAt = Date.now() + data.expires_in * 1000;
  localStorage.setItem('expires_at', expiresAt.toString());

  return data.access_token
};

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')

  if (code) {
    const accessToken = await getToken(code);

    if (accessToken) {
      window.location.replace(`${mainUrl}/dashboard/dashboard.html`);
    }

    return
  }

  const loginButton = document.getElementById('login-to-spotify');

  if (!loginButton) return

  loginButton.addEventListener('click', authorizeUser);
});