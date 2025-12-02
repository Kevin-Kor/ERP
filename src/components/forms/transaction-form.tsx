"use client";

import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { REVENUE_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/utils";

const transactionSchema = z.object({
    date: z.string().min(1, "날짜는 필수입니다"),
    type: z.enum(["REVENUE", "EXPENSE"]),
    category: z.string().min(1, "카테고리는 필수입니다"),
    amount: z.number().min(1, "금액은 0보다 커야 합니다"),
    paymentStatus: z.enum(["PENDING", "COMPLETED"]),
    paymentDate: z.string().optional(),
    clientId: z.string().optional(),
    projectId: z.string().optional(),
    influencerId: z.string().optional(),
    memo: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
    initialData?: TransactionFormData & { id: string };
    mode: "create" | "edit";
}

export function TransactionForm({ initialData, mode }: TransactionFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const [influencers, setInfluencers] = useState<{ id: string; name: string }[]>([]);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<TransactionFormData>({
        resolver: zodResolver(transactionSchema) as Resolver<TransactionFormData>,
        defaultValues: initialData || {
            date: new Date().toISOString().split("T")[0],
            type: "REVENUE",
            category: "",
            amount: 0,
            paymentStatus: "PENDING",
            paymentDate: "",
            clientId: "",
            projectId: "",
            influencerId: "",
            memo: "",
        },
    });

    const type = watch("type");
    const category = watch("category");
    const paymentStatus = watch("paymentStatus");
    const selectedClientId = watch("clientId");
    const selectedProjectId = watch("projectId");
    const selectedInfluencerId = watch("influencerId");

    useEffect(() => {
        async function fetchData() {
            try {
                const [clientsRes, projectsRes, influencersRes] = await Promise.all([
                    fetch("/api/clients?limit=100"),
                    fetch("/api/projects?limit=100"),
                    fetch("/api/influencers?limit=100"),
                ]);

                const clientsData = await clientsRes.json();
                const projectsData = await projectsRes.json();
                // Influencers API might not exist yet, handle gracefully
                const influencersData = influencersRes.ok ? await influencersRes.json() : { influencers: [] };

                setClients(clientsData.clients || []);
                setProjects(projectsData.projects || []);
                setInfluencers(influencersData.influencers || []);
            } catch (error) {
                console.error("Failed to fetch form data:", error);
            }
        }
        fetchData();
    }, []);

    async function onSubmit(data: TransactionFormData) {
        setIsSubmitting(true);
        try {
            const url = mode === "create" ? "/api/transactions" : `/api/transactions/${initialData?.id}`;
            const method = mode === "create" ? "POST" : "PATCH";

            // Clean up optional fields
            const payload = { ...data };
            if (!payload.paymentDate) delete payload.paymentDate;
            if (!payload.clientId) delete payload.clientId;
            if (!payload.projectId) delete payload.projectId;
            if (!payload.influencerId) delete payload.influencerId;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                router.push("/finance");
                router.refresh();
            } else {
                const error = await res.json();
                alert(error.error || "저장에 실패했습니다.");
            }
        } catch (error) {
            console.error("Submit error:", error);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const categories = type === "REVENUE" ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>거래 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">거래일자 *</Label>
                            <Input
                                id="date"
                                type="date"
                                {...register("date")}
                            />
                            {errors.date && (
                                <p className="text-sm text-destructive">{errors.date.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">유형 *</Label>
                            <Select
                                value={type}
                                onValueChange={(value: "REVENUE" | "EXPENSE") => {
                                    setValue("type", value);
                                    setValue("category", ""); // Reset category when type changes
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="REVENUE">수익</SelectItem>
                                    <SelectItem value="EXPENSE">비용</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">카테고리 *</Label>
                            <Select
                                value={category}
                                onValueChange={(value) => setValue("category", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="카테고리 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.category && (
                                <p className="text-sm text-destructive">{errors.category.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">금액 *</Label>
                            <Input
                                id="amount"
                                type="number"
                                {...register("amount", { valueAsNumber: true })}
                                placeholder="0"
                            />
                            {errors.amount && (
                                <p className="text-sm text-destructive">{errors.amount.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="paymentStatus">결제 상태 *</Label>
                            <Select
                                value={paymentStatus}
                                onValueChange={(value: "PENDING" | "COMPLETED") => setValue("paymentStatus", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PENDING">대기</SelectItem>
                                    <SelectItem value="COMPLETED">완료</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {paymentStatus === "COMPLETED" && (
                            <div className="space-y-2">
                                <Label htmlFor="paymentDate">결제일</Label>
                                <Input
                                    id="paymentDate"
                                    type="date"
                                    {...register("paymentDate")}
                                />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>관련 정보 (선택)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="clientId">클라이언트</Label>
                            <Select
                                value={selectedClientId || "none"}
                                onValueChange={(value) => setValue("clientId", value === "none" ? "" : value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="선택 안함" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">선택 안함</SelectItem>
                                    {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="projectId">프로젝트</Label>
                            <Select
                                value={selectedProjectId || "none"}
                                onValueChange={(value) => setValue("projectId", value === "none" ? "" : value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="선택 안함" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">선택 안함</SelectItem>
                                    {projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="influencerId">인플루언서</Label>
                            <Select
                                value={selectedInfluencerId || "none"}
                                onValueChange={(value) => setValue("influencerId", value === "none" ? "" : value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="선택 안함" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">선택 안함</SelectItem>
                                    {influencers.map((influencer) => (
                                        <SelectItem key={influencer.id} value={influencer.id}>
                                            {influencer.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2 mt-4">
                        <Label htmlFor="memo">메모</Label>
                        <Textarea
                            {...register("memo")}
                            placeholder="거래 관련 메모를 입력하세요"
                            rows={3}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                >
                    취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mode === "create" ? "등록" : "저장"}
                </Button>
            </div>
        </form>
    );
}
