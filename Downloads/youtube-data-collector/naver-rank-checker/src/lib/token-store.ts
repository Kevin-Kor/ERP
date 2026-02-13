import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { NaverAuthToken } from '@/types/naver';
import type { CafeProfile, PostHistoryEntry, StoreData } from '@/types/cafe';

const STORE_DIR = join(process.cwd(), 'data');
const STORE_PATH = join(STORE_DIR, 'store.json');
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY 환경변수가 설정되지 않았거나 유효하지 않습니다. 64자 hex 문자열이 필요합니다.'
    );
  }
  return Buffer.from(key, 'hex');
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Simple mutex for file operations
let writeLock = false;

async function acquireLock(): Promise<void> {
  while (writeLock) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  writeLock = true;
}

function releaseLock(): void {
  writeLock = false;
}

async function ensureStoreDir(): Promise<void> {
  if (!existsSync(STORE_DIR)) {
    await mkdir(STORE_DIR, { recursive: true });
  }
}

async function readStore(): Promise<StoreData> {
  try {
    await ensureStoreDir();
    if (!existsSync(STORE_PATH)) {
      return { naverAuth: null, cafeProfile: null, postHistory: [] };
    }
    const raw = await readFile(STORE_PATH, 'utf-8');
    return JSON.parse(raw) as StoreData;
  } catch {
    return { naverAuth: null, cafeProfile: null, postHistory: [] };
  }
}

async function writeStore(data: StoreData): Promise<void> {
  await ensureStoreDir();
  await writeFile(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Public API

export async function getNaverAuth(): Promise<NaverAuthToken | null> {
  const store = await readStore();
  if (!store.naverAuth) return null;

  try {
    return {
      ...store.naverAuth,
      accessToken: decrypt(store.naverAuth.accessToken),
      refreshToken: decrypt(store.naverAuth.refreshToken),
    };
  } catch {
    return null;
  }
}

export async function setNaverAuth(token: NaverAuthToken): Promise<void> {
  await acquireLock();
  try {
    const store = await readStore();
    store.naverAuth = {
      ...token,
      accessToken: encrypt(token.accessToken),
      refreshToken: encrypt(token.refreshToken),
    };
    await writeStore(store);
  } finally {
    releaseLock();
  }
}

export async function clearNaverAuth(): Promise<void> {
  await acquireLock();
  try {
    const store = await readStore();
    store.naverAuth = null;
    await writeStore(store);
  } finally {
    releaseLock();
  }
}

export async function getCafeProfile(): Promise<CafeProfile | null> {
  const store = await readStore();
  return store.cafeProfile;
}

export async function setCafeProfile(profile: CafeProfile): Promise<void> {
  await acquireLock();
  try {
    const store = await readStore();
    store.cafeProfile = profile;
    await writeStore(store);
  } finally {
    releaseLock();
  }
}

export async function addPostHistory(entry: PostHistoryEntry): Promise<void> {
  await acquireLock();
  try {
    const store = await readStore();
    store.postHistory.unshift(entry);
    // Keep only latest 100 entries
    if (store.postHistory.length > 100) {
      store.postHistory = store.postHistory.slice(0, 100);
    }
    await writeStore(store);
  } finally {
    releaseLock();
  }
}

export async function getPostHistory(limit = 20): Promise<PostHistoryEntry[]> {
  const store = await readStore();
  return store.postHistory.slice(0, limit);
}

export async function getDailyPostCount(): Promise<number> {
  const store = await readStore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  return store.postHistory.filter(
    entry =>
      entry.status === 'published' &&
      entry.publishedAt >= todayStr
  ).length;
}
