import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const documentId = formData.get("documentId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!documentId) {
      return NextResponse.json({ error: "No document ID provided" }, { status: 400 });
    }

    // Verify document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "documents");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = path.extname(file.name);
    const safeDocNumber = document.docNumber.replace(/[^a-zA-Z0-9-]/g, "_");
    const filename = `${safeDocNumber}_${timestamp}${extension}`;
    const filePath = path.join(uploadsDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Update document with file path
    const publicPath = `/uploads/documents/${filename}`;
    await prisma.document.update({
      where: { id: documentId },
      data: { filePath: publicPath },
    });

    return NextResponse.json({ 
      success: true, 
      filePath: publicPath,
    });
  } catch (error) {
    console.error("POST /api/documents/upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

