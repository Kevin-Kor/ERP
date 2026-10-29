import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export async function GET() {
    const auth = await requireSession();
    if (auth.response) return auth.response;

    // 담당자 선택(프로젝트 폼)에는 id/name만 필요하다. 이메일·권한은 관리자에게만 내려준다.
    const isAdmin = auth.session.user.role === "ADMIN";

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: isAdmin,
                role: isAdmin,
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error("GET /api/users error:", error);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}
