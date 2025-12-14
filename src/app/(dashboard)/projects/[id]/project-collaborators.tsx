"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Instagram, Loader2, PlusCircle, Save, Trash2 } from "lucide-react";

interface ProjectInfluencerEntry {
    id: string;
    influencer: {
        id: string;
        name: string;
        instagramId: string | null;
    };
    fee: number;
    paymentStatus: string;
    paymentDueDate: string | null;
}

interface InfluencerOption {
    id: string;
    name: string;
    instagramId: string | null;
}

interface CollaboratorsProps {
    projectId: string;
    initialCollaborators: ProjectInfluencerEntry[];
}

type SettlementStatus = "pending" | "in_progress" | "completed";

type CollaboratorRow = {
    influencerId: string;
    fee: number;
    paymentStatus: SettlementStatus;
    paymentDueDate: string;
    influencer?: InfluencerOption;
};

const normalizeStatus = (status?: string): SettlementStatus => {
    const value = (status || "").toLowerCase();
    if (value === "completed") return "completed";
    if (value === "in_progress" || value === "requested") return "in_progress";
    return "pending";
};

export function ProjectCollaborators({ projectId, initialCollaborators }: CollaboratorsProps) {
    const [collaborators, setCollaborators] = useState<CollaboratorRow[]>(
        initialCollaborators.map((collaborator) => ({
            influencerId: collaborator.influencer.id,
            fee: collaborator.fee,
            paymentStatus: normalizeStatus(collaborator.paymentStatus),
            paymentDueDate: collaborator.paymentDueDate?.split("T")[0] || "",
            influencer: collaborator.influencer,
        }))
    );
    const [availableInfluencers, setAvailableInfluencers] = useState<InfluencerOption[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        async function loadInfluencers() {
            try {
                const res = await fetch("/api/influencers");
                const data = await res.json();
                setAvailableInfluencers(
                    (data.influencers || []).map((inf: any) => ({
                        id: inf.id,
                        name: inf.name,
                        instagramId: inf.instagramId,
                    }))
                );
            } catch (error) {
                console.error("Failed to load influencers", error);
            }
        }

        loadInfluencers();
    }, []);

    const statusOptions: { value: SettlementStatus; label: string }[] = [
        { value: "pending", label: "예정" },
        { value: "in_progress", label: "진행 중" },
        { value: "completed", label: "완료" },
    ];

    const totals = useMemo(() => {
        const pendingCount = collaborators.filter((c) => c.paymentStatus === "pending").length;
        const inProgressCount = collaborators.filter((c) => c.paymentStatus === "in_progress").length;
        const completedCount = collaborators.filter((c) => c.paymentStatus === "completed").length;
        const totalFee = collaborators.reduce((sum, c) => sum + (Number(c.fee) || 0), 0);
        const completedFee = collaborators
            .filter((c) => c.paymentStatus === "completed")
            .reduce((sum, c) => sum + (Number(c.fee) || 0), 0);
        return { pendingCount, inProgressCount, completedCount, totalFee, completedFee };
    }, [collaborators]);

    const addRow = () => {
        setCollaborators((prev) => [
            ...prev,
            { influencerId: "", fee: 0, paymentStatus: "pending" as SettlementStatus, paymentDueDate: "" },
        ]);
    };

    const removeRow = (index: number) => {
        setCollaborators((prev) => prev.filter((_, i) => i !== index));
    };

    const updateRow = (index: number, field: string, value: any) => {
        setCollaborators((prev) =>
            prev.map((row, i) =>
                i === index
                    ? {
                          ...row,
                          [field]: value,
                          influencer:
                              field === "influencerId"
                                  ? availableInfluencers.find((inf) => inf.id === value) || row.influencer
                                  : row.influencer,
                      }
                    : row
            )
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                collaborators: collaborators
                    .filter((c) => c.influencerId)
                    .map((c) => ({
                        influencerId: c.influencerId,
                        fee: Number(c.fee) || 0,
                        paymentStatus: c.paymentStatus,
                        paymentDueDate: c.paymentDueDate || null,
                    })),
            };

            const res = await fetch(`/api/projects/${projectId}/influencers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw new Error("Failed to save collaborators");
            }

            const data = await res.json();
            setCollaborators(
                (data.projectInfluencers || []).map((pi: any) => ({
                    influencerId: pi.influencer.id,
                    fee: pi.fee,
                    paymentStatus: normalizeStatus(pi.paymentStatus),
                    paymentDueDate: pi.paymentDueDate ? new Date(pi.paymentDueDate).toISOString().split("T")[0] : "",
                    influencer: pi.influencer,
                }))
            );
        } catch (error) {
            console.error(error);
            alert("협업 인플루언서를 저장하는 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>협업 인플루언서</CardTitle>
                        <CardDescription>
                            프로젝트에 참여한 인플루언서를 선택하고 정산 금액 및 상태를 관리하세요.
                        </CardDescription>
                        <div className="flex gap-2 pt-3">
                            <Badge variant="secondary">예정 {totals.pendingCount}명</Badge>
                            <Badge variant="info">진행 {totals.inProgressCount}명</Badge>
                            <Badge variant="success">완료 {totals.completedCount}명</Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={addRow} size="sm">
                            <PlusCircle className="h-4 w-4 mr-2" /> 추가
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} size="sm">
                            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} 저장
                        </Button>
                    </div>
                </div>
                <div className="text-sm text-muted-foreground pt-2">
                    총 정산액 {formatCurrency(totals.totalFee)} • 완료 {formatCurrency(totals.completedFee)}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>인플루언서</TableHead>
                            <TableHead>정산 금액</TableHead>
                            <TableHead>정산 상태</TableHead>
                            <TableHead>정산 예정일</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {collaborators.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                                    협업 인플루언서를 추가해 주세요.
                                </TableCell>
                            </TableRow>
                        ) : (
                            collaborators.map((collaborator, index) => (
                                <TableRow key={`${collaborator.influencerId}-${index}`}>
                                    <TableCell>
                                        <Select
                                            value={collaborator.influencerId}
                                            onValueChange={(value) => updateRow(index, "influencerId", value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="인플루언서 선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableInfluencers.map((inf) => (
                                                    <SelectItem key={inf.id} value={inf.id}>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{inf.name}</span>
                                                            {inf.instagramId && (
                                                                <span className="text-xs text-muted-foreground">@{inf.instagramId}</span>
                                                            )}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {collaborator.influencer && (
                                            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                                                <Instagram className="h-3 w-3" />
                                                {collaborator.influencer.instagramId || "-"}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            value={collaborator.fee}
                                            onChange={(e) => updateRow(index, "fee", Number(e.target.value))}
                                            min={0}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={collaborator.paymentStatus}
                                            onValueChange={(value) => updateRow(index, "paymentStatus", value as SettlementStatus)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {statusOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="date"
                                            value={collaborator.paymentDueDate || ""}
                                            onChange={(e) => updateRow(index, "paymentDueDate", e.target.value)}
                                        />
                                        {collaborator.paymentDueDate && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatDate(collaborator.paymentDueDate)} 예정
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive"
                                            onClick={() => removeRow(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
