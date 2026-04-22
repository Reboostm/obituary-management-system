/**
 * Server-side helper to load Notification Settings from Firestore.
 * Used by spam alerts AND flower order emails — single shared config.
 *
 * Falls back to env vars and sane defaults so things work even if the
 * dashboard doc has not been saved yet.
 */

import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

const DEFAULT_FROM_EMAIL = 'noreply@didericksenmemorialfuneralservices.com';
const DEFAULT_DIRECTOR_EMAIL = 'marketingreboost@gmail.com';

export async function loadNotificationSettings() {
  let saved = {};
  try {
    const snap = await getDoc(doc(db, 'systemSettings', 'notifications'));
    if (snap.exists()) saved = snap.data() || {};
  } catch (err) {
    console.warn('⚠️ Could not load notification settings, using defaults:', err.message);
  }

  const directorEmails = parseEmails(
    saved.directorEmails || process.env.DIRECTOR_EMAILS || DEFAULT_DIRECTOR_EMAIL
  );

  const fromEmail =
    cleanEmail(saved.fromEmail) ||
    process.env.RESEND_FROM_EMAIL ||
    DEFAULT_FROM_EMAIL;

  const resendApiKey =
    (saved.resendApiKey && saved.resendApiKey.trim()) ||
    process.env.RESEND_API_KEY ||
    '';

  return {
    resendApiKey,
    directorEmails,
    fromEmail,
    notificationsEnabled: saved.notificationsEnabled !== false,
    customBadWords: saved.customBadWords || '',
  };
}

function parseEmails(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter((s) => s && s.includes('@'));
}

function cleanEmail(raw) {
  if (!raw) return '';
  const v = String(raw).trim();
  // Reject the placeholder
  if (!v || v === 'noreply@yourdomain.com' || !v.includes('@')) return '';
  return v;
}
