import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "@/components/forms/project-form";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: PageProps) {
    const { id } = await params;

    const project = await prisma.project.findUnique({
        where: { id },
    });

    if (!project) {
        notFound();
    }

    // Transform data to match form schema
    const initialData = {
        id: project.id,
        name: project.name,
        clientId: project.clientId,
        managerId: project.managerId || "",
        status: project.status as "QUOTING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
        startDate: project.startDate.toISOString().split("T")[0],
        endDate: project.endDate.toISOString().split("T")[0],
        contractAmount: project.contractAmount,
        platforms: project.platforms || "",
        contentTypes: project.contentTypes || "",
        memo: project.memo || "",
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">프로젝트 수정</h1>
                <p className="text-muted-foreground mt-1">
                    프로젝트 정보를 수정합니다.
                </p>
            </div>

            <ProjectForm mode="edit" initialData={initialData} />
        </div>
    );
}
