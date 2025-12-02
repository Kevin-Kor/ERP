"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Video, Film, X } from "lucide-react";
import { useState, useEffect } from "react";
import { PLATFORM_OPTIONS, CONTENT_TYPE_OPTIONS, VIDEO_STYLE_OPTIONS } from "@/lib/utils";

const projectSchema = z.object({
    name: z.string().min(1, "프로젝트명은 필수입니다"),
    clientId: z.string().min(1, "클라이언트는 필수입니다"),
    managerId: z.string().optional(),
    status: z.enum(["QUOTING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
    startDate: z.string().min(1, "시작일은 필수입니다"),
    endDate: z.string().min(1, "종료일은 필수입니다"),
    contractAmount: z.coerce.number().min(0, "계약금액은 0 이상이어야 합니다"),
    platforms: z.string().optional(),
    contentTypes: z.string().optional(),
    videoCount: z.coerce.number().min(0).optional(),
    videoStyle: z.string().optional(),
    memo: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
    initialData?: ProjectFormData & { id: string };
    mode: "create" | "edit";
    clientId?: string;
}

export function ProjectForm({ initialData, mode, clientId }: ProjectFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
    const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
        initialData?.platforms?.split(",").filter(Boolean) || []
    );
    const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>(
        initialData?.contentTypes?.split(",").filter(Boolean) || []
    );

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<ProjectFormData>({
        resolver: zodResolver(projectSchema),
        defaultValues: initialData || {
            name: "",
            clientId: clientId || "",
            managerId: "",
            status: "QUOTING",
            startDate: new Date().toISOString().split("T")[0],
            endDate: "",
            contractAmount: 0,
            platforms: "",
            contentTypes: "",
            videoCount: 1,
            videoStyle: "",
            memo: "",
        },
    });

    const status = watch("status");
    const selectedClientId = watch("clientId");
    const selectedManagerId = watch("managerId");
    const videoStyle = watch("videoStyle");

    useEffect(() => {
        async function fetchData() {
            try {
                const [clientsRes, usersRes] = await Promise.all([
                    fetch("/api/clients?limit=100"),
                    fetch("/api/users"),
                ]);

                const clientsData = await clientsRes.json();
                const usersData = await usersRes.json();

                setClients(clientsData.clients || []);
                setUsers(usersData.users || []);
            } catch (error) {
                console.error("Failed to fetch form data:", error);
            }
        }
        fetchData();
    }, []);

    // Update form value when platforms change
    useEffect(() => {
        setValue("platforms", selectedPlatforms.join(","));
    }, [selectedPlatforms, setValue]);

    // Update form value when content types change
    useEffect(() => {
        setValue("contentTypes", selectedContentTypes.join(","));
    }, [selectedContentTypes, setValue]);

    const togglePlatform = (platform: string) => {
        setSelectedPlatforms((prev) =>
            prev.includes(platform)
                ? prev.filter((p) => p !== platform)
                : [...prev, platform]
        );
    };

    const toggleContentType = (type: string) => {
        setSelectedContentTypes((prev) =>
            prev.includes(type)
                ? prev.filter((t) => t !== type)
                : [...prev, type]
        );
    };

    async function onSubmit(data: ProjectFormData) {
        setIsSubmitting(true);
        try {
            const url = mode === "create" ? "/api/projects" : `/api/projects/${initialData?.id}`;
            const method = mode === "create" ? "POST" : "PATCH";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                router.push("/projects");
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

    // 숏폼 플랫폼 (릴스, 쇼츠, 틱톡)
    const shortformPlatforms = PLATFORM_OPTIONS.filter(p => 
        ["INSTAGRAM_REELS", "YOUTUBE_SHORTS", "TIKTOK"].includes(p.value)
    );
    const otherPlatforms = PLATFORM_OPTIONS.filter(p => 
        !["INSTAGRAM_REELS", "YOUTUBE_SHORTS", "TIKTOK"].includes(p.value)
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5" />
                        기본 정보
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">프로젝트명 *</Label>
                            <Input
                                id="name"
                                {...register("name")}
                                placeholder="예: [브랜드명] 12월 숏폼 3편"
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="clientId">클라이언트 *</Label>
                            <Select
                                value={selectedClientId}
                                onValueChange={(value) => setValue("clientId", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="클라이언트 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.clientId && (
                                <p className="text-sm text-destructive">{errors.clientId.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="managerId">담당자</Label>
                            <Select
                                value={selectedManagerId || "unassigned"}
                                onValueChange={(value) => setValue("managerId", value === "unassigned" ? "" : value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="담당자 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">미지정</SelectItem>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">상태 *</Label>
                            <Select
                                value={status}
                                onValueChange={(value: "QUOTING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") => setValue("status", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="QUOTING">견적중</SelectItem>
                                    <SelectItem value="IN_PROGRESS">진행중</SelectItem>
                                    <SelectItem value="COMPLETED">완료</SelectItem>
                                    <SelectItem value="CANCELLED">취소</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="startDate">시작일 *</Label>
                            <Input
                                id="startDate"
                                type="date"
                                {...register("startDate")}
                            />
                            {errors.startDate && (
                                <p className="text-sm text-destructive">{errors.startDate.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="endDate">종료일 *</Label>
                            <Input
                                id="endDate"
                                type="date"
                                {...register("endDate")}
                            />
                            {errors.endDate && (
                                <p className="text-sm text-destructive">{errors.endDate.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contractAmount">계약금액 (원)</Label>
                            <Input
                                id="contractAmount"
                                type="number"
                                {...register("contractAmount")}
                                placeholder="0"
                            />
                            {errors.contractAmount && (
                                <p className="text-sm text-destructive">{errors.contractAmount.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="videoCount">영상 수량</Label>
                            <Input
                                id="videoCount"
                                type="number"
                                {...register("videoCount")}
                                placeholder="1"
                                min={1}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Film className="h-5 w-5" />
                        콘텐츠 정보
                    </CardTitle>
                    <CardDescription>
                        제작할 콘텐츠의 플랫폼과 형식을 선택하세요
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 숏폼 플랫폼 */}
                    <div className="space-y-3">
                        <Label>숏폼 플랫폼</Label>
                        <div className="flex flex-wrap gap-2">
                            {shortformPlatforms.map((platform) => (
                                <Badge
                                    key={platform.value}
                                    variant={selectedPlatforms.includes(platform.value) ? "default" : "outline"}
                                    className="cursor-pointer text-sm py-1.5 px-3"
                                    onClick={() => togglePlatform(platform.value)}
                                >
                                    {selectedPlatforms.includes(platform.value) && (
                                        <X className="h-3 w-3 mr-1" />
                                    )}
                                    {platform.label}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* 기타 플랫폼 */}
                    <div className="space-y-3">
                        <Label>기타 플랫폼</Label>
                        <div className="flex flex-wrap gap-2">
                            {otherPlatforms.map((platform) => (
                                <Badge
                                    key={platform.value}
                                    variant={selectedPlatforms.includes(platform.value) ? "secondary" : "outline"}
                                    className="cursor-pointer text-sm py-1.5 px-3"
                                    onClick={() => togglePlatform(platform.value)}
                                >
                                    {selectedPlatforms.includes(platform.value) && (
                                        <X className="h-3 w-3 mr-1" />
                                    )}
                                    {platform.label}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* 콘텐츠 유형 */}
                    <div className="space-y-3">
                        <Label>콘텐츠 유형</Label>
                        <div className="flex flex-wrap gap-2">
                            {CONTENT_TYPE_OPTIONS.map((type) => (
                                <Badge
                                    key={type.value}
                                    variant={selectedContentTypes.includes(type.value) ? "default" : "outline"}
                                    className="cursor-pointer text-sm py-1.5 px-3"
                                    onClick={() => toggleContentType(type.value)}
                                >
                                    {selectedContentTypes.includes(type.value) && (
                                        <X className="h-3 w-3 mr-1" />
                                    )}
                                    {type.label}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* 영상 스타일 */}
                    <div className="space-y-2">
                        <Label>영상 스타일</Label>
                        <Select
                            value={videoStyle || "none"}
                            onValueChange={(value) => setValue("videoStyle", value === "none" ? "" : value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="스타일 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">선택 안함</SelectItem>
                                {VIDEO_STYLE_OPTIONS.map((style) => (
                                    <SelectItem key={style.value} value={style.value}>
                                        {style.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>메모</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        {...register("memo")}
                        placeholder="프로젝트 관련 메모, 클라이언트 요청사항, 참고 영상 링크 등을 입력하세요"
                        rows={4}
                    />
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
                    {mode === "create" ? "프로젝트 등록" : "저장"}
                </Button>
            </div>
        </form>
    );
}
