import { getSupabaseAdmin } from "./supabase";

export const DOCUMENT_BUCKET = "erp-files";
const DOCUMENT_PREFIX = "documents/";
const SIGNED_URL_TTL_SECONDS = 60;

// 허용 확장자와 저장 시 사용할 Content-Type (클라이언트가 보낸 MIME은 신뢰하지 않는다)
export const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
};

export function getFileExtension(filename: string): string | null {
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
  return match ? match[1].toLowerCase() : null;
}

// Document.filePath → 버킷 내부 경로.
// 새 업로드는 "documents/..." 경로를 저장하고, 예전 데이터는 공개 URL
// (https://<project>.supabase.co/storage/v1/object/public/erp-files/documents/...)이 들어 있다.
// 그 외 값(외부 URL, 상대경로 조작 등)은 null을 돌려 무시한다.
export function toStoragePath(filePath: string | null | undefined): string | null {
  if (!filePath) return null;

  let path = filePath;
  if (/^https?:\/\//i.test(filePath)) {
    let url: URL;
    try {
      url = new URL(filePath);
    } catch {
      return null;
    }
    const marker = `/storage/v1/object/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    // <public|sign|authenticated>/<bucket>/<path>
    const [, bucket, ...rest] = url.pathname.slice(index + marker.length).split("/");
    if (bucket !== DOCUMENT_BUCKET) return null;
    path = decodeURIComponent(rest.join("/"));
  }

  if (!path.startsWith(DOCUMENT_PREFIX) || path.includes("..") || path.includes("\\")) {
    return null;
  }
  return path;
}

export function buildStoragePath(docNumber: string, extension: string): string {
  const safeDocNumber = docNumber.replace(/[^a-zA-Z0-9-]/g, "_");
  return `${DOCUMENT_PREFIX}${safeDocNumber}_${Date.now()}.${extension}`;
}

export async function uploadDocumentFile(path: string, body: Buffer, contentType: string) {
  const { error } = await getSupabaseAdmin()
    .storage.from(DOCUMENT_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (error) throw error;
}

// 짧게 만료되는 서명 URL. 버킷을 비공개로 바꿔도 동작한다.
export async function createDocumentSignedUrl(path: string, downloadName?: string) {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(DOCUMENT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, downloadName ? { download: downloadName } : undefined);
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Failed to create signed URL");
  }
  return data.signedUrl;
}

export async function removeDocumentFile(filePath: string | null | undefined) {
  const path = toStoragePath(filePath);
  if (!path) return;
  const { error } = await getSupabaseAdmin().storage.from(DOCUMENT_BUCKET).remove([path]);
  if (error) throw error;
}
