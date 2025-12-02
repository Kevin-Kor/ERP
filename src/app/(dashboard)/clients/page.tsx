"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  MoreHorizontal,
  Building2,
  Phone,
  Mail,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { STATUS_LABELS, INDUSTRY_OPTIONS } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string | null;
  industry: string | null;
  status: string;
  createdAt: string;
  _count: {
    projects: number;
    documents: number;
    transactions: number;
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [statusFilter]);

  async function fetchClients() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/clients?${params}`);
      const data = await res.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchClients();
  }

  async function confirmDelete() {
    if (!deleteId) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/clients/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setClients(clients.filter((c) => c.id !== deleteId));
        setDeleteId(null);
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to delete client:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "secondary"> = {
      ACTIVE: "success",
      DORMANT: "warning",
      TERMINATED: "secondary",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
      </Badge>
    );
  };

  const getIndustryLabel = (industry: string | null) => {
    if (!industry) return "-";
    const found = INDUSTRY_OPTIONS.find((opt) => opt.value === industry);
    return found?.label || industry;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">클라이언트</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            광고주 정보를 관리합니다.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/clients/new">
            <Plus className="h-4 w-4 mr-2" />
            새 클라이언트
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="회사명, 담당자로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="ACTIVE">활성</SelectItem>
                  <SelectItem value="DORMANT">휴면</SelectItem>
                  <SelectItem value="TERMINATED">종료</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" variant="secondary">
                검색
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Client List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">클라이언트 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">클라이언트가 없습니다</h3>
              <p className="text-muted-foreground mt-1">
                새 클라이언트를 추가하여 시작하세요.
              </p>
              <Button asChild className="mt-4">
                <Link href="/clients/new">
                  <Plus className="h-4 w-4 mr-2" />
                  새 클라이언트 추가
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {clients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="block"
                  >
                    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors active:bg-muted">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{client.name}</h3>
                            {getStatusBadge(client.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {client.contactName}
                          </p>
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {client.phone}
                            </span>
                            {client.email && (
                              <span className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                <span className="truncate">{client.email}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Briefcase className="h-3.5 w-3.5" />
                            {client._count.projects}건
                          </div>
                        </div>
                      </div>
                      {client.industry && (
                        <div className="mt-2 pt-2 border-t">
                          <Badge variant="outline" className="text-xs">
                            {getIndustryLabel(client.industry)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>회사명</TableHead>
                      <TableHead>담당자</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>업종</TableHead>
                      <TableHead>프로젝트</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id} className="group">
                        <TableCell>
                          <Link
                            href={`/clients/${client.id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {client.name}
                          </Link>
                        </TableCell>
                        <TableCell>{client.contactName}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {client.phone}
                            </span>
                            {client.email && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {client.email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getIndustryLabel(client.industry)}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {client._count.projects}건
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(client.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/clients/${client.id}`}>상세 보기</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/clients/${client.id}/edit`}>
                                  수정
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/projects/new?clientId=${client.id}`}>
                                  프로젝트 추가
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <span
                                  className="w-full cursor-pointer"
                                  onClick={() => setDeleteId(client.id)}
                                >
                                  삭제
                                </span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>클라이언트 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 클라이언트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
