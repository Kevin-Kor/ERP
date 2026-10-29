import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import {
  createDocumentSignedUrl,
  getFileExtension,
  toStoragePath,
} from "@/lib/document-storage";

// GET - 첨부 파일 열람/다운로드. 로그인 사용자에게만 60초짜리 서명 URL로 리다이렉트한다.
// ?download=1 이면 첨부파일로 내려받는다.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const document = await prisma.document.findUnique({
      where: { id },
      select: { docNumber: true, filePath: true },
    });

    const storagePath = toStoragePath(document?.filePath);
    if (!document || !storagePath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const download = request.nextUrl.searchParams.get("download") === "1";
    const extension = getFileExtension(storagePath);
    const downloadName = download
      ? `${document.docNumber}${extension ? `.${extension}` : ""}`
      : undefined;

    const signedUrl = await createDocumentSignedUrl(storagePath, downloadName);
    const response = NextResponse.redirect(signedUrl);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("GET /api/documents/[id]/file error:", error);
    return NextResponse.json(
      { error: "Failed to open file" },
      { status: 500 }
    );
  }
}
