import { ProjectForm } from "@/components/forms/project-form";

interface PageProps {
    searchParams: Promise<{ clientId?: string }>;
}

export default async function NewProjectPage({ searchParams }: PageProps) {
    const { clientId } = await searchParams;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">새 프로젝트</h1>
                <p className="text-muted-foreground mt-1">
                    새로운 프로젝트(캠페인)를 등록합니다.
                </p>
            </div>

            <ProjectForm mode="create" clientId={clientId} />
        </div>
    );
}
