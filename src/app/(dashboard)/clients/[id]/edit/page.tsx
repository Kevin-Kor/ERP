import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientForm } from "@/components/forms/client-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClientPage({ params }: PageProps) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
  });

  if (!client) {
    notFound();
  }

  // Transform data to match form schema if necessary
  // The form expects strings for optional fields, so we ensure nulls become empty strings or undefined
  const initialData = {
    id: client.id,
    name: client.name,
    contactName: client.contactName,
    phone: client.phone,
    email: client.email || "",
    businessNo: client.businessNo || "",
    address: client.address || "",
    industry: client.industry || "",
    status: client.status as "ACTIVE" | "DORMANT" | "TERMINATED",
    memo: client.memo || "",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">클라이언트 수정</h1>
        <p className="text-muted-foreground mt-1">
          클라이언트 정보를 수정합니다.
        </p>
      </div>

      <ClientForm mode="edit" initialData={initialData} />
    </div>
  );
}
