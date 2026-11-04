import {createHmac, timingSafeEqual} from 'node:crypto';
/** Signature covers the original bytes, before JSON parsing. */
export function verifyWebhook(raw: Uint8Array, signature: string | null, secret: string): boolean {
 if (!secret || !signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
 const actual=Buffer.from(signature,'base64');
 const expected=createHmac('sha256',secret).update(raw).digest();
 return actual.length===expected.length && timingSafeEqual(actual,expected);
}
