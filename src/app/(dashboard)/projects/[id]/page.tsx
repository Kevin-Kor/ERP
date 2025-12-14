import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Calendar,
    Building2,
    Users,
    DollarSign,
    FileText,
    Edit,
    ArrowLeft,
    Video,
    Play,
    Instagram,
    Youtube,
    Film,
} from "lucide-react";
import { formatCurrency, formatDate, STATUS_LABELS, PLATFORM_OPTIONS, CONTENT_TYPE_OPTIONS, VIDEO_STYLE_OPTIONS } from "@/lib/utils";
import { DeleteProjectButton } from "./delete-project-button";
import { ProjectCollaborators } from "./project-collaborators";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
    const { id } = await params;

    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            Client: true,
            User: true,
            ProjectInfluencer: {
                include: {
                    Influencer: true,
                },
            },
            Document: {
                orderBy: { issueDate: "desc" },
            },
            Transaction: {
                orderBy: { date: "desc" },
            },
        },
    });

    if (!project) {
        notFound();
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, "success" | "warning" | "info" | "destructive" | "secondary"> = {
            QUOTING: "info",
            IN_PROGRESS: "warning",
            COMPLETED: "success",
            CANCELLED: "destructive",
        };
        return (
            <Badge variant={variants[status] || "secondary"} className="ml-2">
                {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
            </Badge>
        );
    };

    const getPlatformLabel = (value: string) => {
        const found = PLATFORM_OPTIONS.find((p) => p.value === value);
        return found?.label || value;
    };

    const getContentTypeLabel = (value: string) => {
        const found = CONTENT_TYPE_OPTIONS.find((t) => t.value === value);
        return found?.label || value;
    };

    const getVideoStyleLabel = (value: string | null) => {
        if (!value) return null;
        const found = VIDEO_STYLE_OPTIONS.find((s) => s.value === value);
        return found?.label || value;
    };

    const getPlatformIcon = (platform: string) => {
        if (platform.includes("INSTAGRAM")) return <Instagram className="h-4 w-4" />;
        if (platform.includes("YOUTUBE")) return <Youtube className="h-4 w-4" />;
        if (platform === "TIKTOK") return <Play className="h-4 w-4" />;
        return <Video className="h-4 w-4" />;
    };

    const platforms = project.platforms?.split(",").filter(Boolean) || [];
    const contentTypes = project.contentTypes?.split(",").filter(Boolean) || [];
    const videoStyle = (project as any).videoStyle;
    const videoCount = (project as any).videoCount || 1;

    const totalInfluencerCost = project.ProjectInfluencer.reduce((sum, pi) => sum + pi.fee, 0);
    const paidAmount = project.ProjectInfluencer
        .filter(pi => (pi.paymentStatus || "").toLowerCase() === "completed")
        .reduce((sum, pi) => sum + pi.fee, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/projects">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center">
                            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                            {getStatusBadge(project.status)}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <Link href={`/clients/${project.Client.id}`} className="hover:underline">
                                {project.Client.name}
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline">
                        <Link href={`/projects/${project.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            수정
                        </Link>
                    </Button>
                    <DeleteProjectButton projectId={project.id} projectName={project.name} />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">계약금액</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">
                            {formatCurrency(project.contractAmount)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">영상 수량</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            <Video className="h-5 w-5 text-muted-foreground" />
                            {videoCount}편
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">인플루언서 비용</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {formatCurrency(totalInfluencerCost)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            정산완료: {formatCurrency(paidAmount)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">예상 마진</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${project.contractAmount - totalInfluencerCost >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(project.contractAmount - totalInfluencerCost)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            마진율: {project.contractAmount > 0 ? ((project.contractAmount - totalInfluencerCost) / project.contractAmount * 100).toFixed(1) : 0}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="info" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="info">프로젝트 정보</TabsTrigger>
                    <TabsTrigger value="influencers">
                        인플루언서 ({project.ProjectInfluencer.length})
                    </TabsTrigger>
                    <TabsTrigger value="documents">
                        문서 ({project.Document.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* 기본 정보 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>기본 정보</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">기간</p>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">
                                                {formatDate(project.startDate)} ~ {formatDate(project.endDate)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">담당자</p>
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">{project.User?.name || "미지정"}</span>
                                        </div>
                                    </div>
                                </div>
                                {project.memo && (
                                    <div className="space-y-1 pt-2 border-t">
                                        <p className="text-sm text-muted-foreground">메모</p>
                                        <p className="whitespace-pre-wrap text-sm">{project.memo}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 콘텐츠 정보 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Film className="h-5 w-5" />
                                    콘텐츠 정보
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* 플랫폼 */}
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">업로드 플랫폼</p>
                                    {platforms.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {platforms.map((platform) => (
                                                <Badge key={platform} variant="secondary" className="flex items-center gap-1">
                                                    {getPlatformIcon(platform)}
                                                    {getPlatformLabel(platform)}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm">-</p>
                                    )}
                                </div>

                                {/* 콘텐츠 유형 */}
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">콘텐츠 유형</p>
                                    {contentTypes.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {contentTypes.map((type) => (
                                                <Badge key={type} variant="outline">
                                                    {getContentTypeLabel(type)}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm">-</p>
                                    )}
                                </div>

                                {/* 영상 스타일 */}
                                {getVideoStyleLabel(videoStyle) && (
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">영상 스타일</p>
                                        <Badge>{getVideoStyleLabel(videoStyle)}</Badge>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="influencers">
                    <ProjectCollaborators
                        projectId={project.id}
                        initialCollaborators={project.ProjectInfluencer.map((pi) => ({
                            ...pi,
                            influencer: pi.Influencer,
                        }))}
                    />
                </TabsContent>

                <TabsContent value="documents">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    관련 문서
                                </CardTitle>
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/documents/new">문서 추가</Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {project.Document.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">관련 문서가 없습니다.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>문서 유형</TableHead>
                                            <TableHead>문서번호</TableHead>
                                            <TableHead>발행일</TableHead>
                                            <TableHead>금액</TableHead>
                                            <TableHead>상태</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {project.Document.map((doc) => (
                                            <TableRow key={doc.id}>
                                                <TableCell>
                                                    <Badge variant={
                                                        doc.type === "TAX_INVOICE" ? "default" :
                                                        doc.type === "QUOTE" ? "secondary" : "outline"
                                                    }>
                                                        {doc.type === "TAX_INVOICE" ? "세금계산서" :
                                                         doc.type === "QUOTE" ? "견적서" :
                                                         doc.type === "CONTRACT" ? "계약서" : "기타"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {doc.docNumber}
                                                </TableCell>
                                                <TableCell>{formatDate(doc.issueDate)}</TableCell>
                                                <TableCell className="font-medium">
                                                    {formatCurrency(doc.amount)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {doc.status === "ISSUED" ? "발행" :
                                                         doc.status === "DELIVERED" ? "전달" :
                                                         doc.status === "ACCEPTED" ? "수락" : doc.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
