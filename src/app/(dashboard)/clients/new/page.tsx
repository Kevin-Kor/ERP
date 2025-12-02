import { ClientForm } from "@/components/forms/client-form";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">새 클라이언트</h1>
        <p className="text-muted-foreground mt-1">
          새로운 클라이언트 정보를 등록합니다.
        </p>
      </div>

      <ClientForm mode="create" />
    </div>
  );
}


