const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let value = "";
  bytes.forEach((byte) => { value += String.fromCharCode(byte); });
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signature(payload: string) {
  const secret = process.env.PIN_SESSION_SECRET;
  if (!secret) return null;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signed));
}

export async function createPinSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const payload = `v1.${expiresAt}`;
  const signed = await signature(payload);
  return signed ? `${payload}.${signed}` : null;
}

export async function validPinSession(value?: string) {
  if (!value) return false;
  const [version, expiresAt, signed] = value.split(".");
  if (version !== "v1" || !expiresAt || !signed || Number(expiresAt) < Math.floor(Date.now() / 1000)) return false;
  const payload = `${version}.${expiresAt}`;
  const expected = await signature(payload);
  return Boolean(expected && expected.length === signed.length && expected === signed);
}
