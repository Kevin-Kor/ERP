"use client";

import { useState, useEffect } from "react";
import { Bell, Search, Plus, LogOut, User, Zap, Receipt, FileSpreadsheet, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { QuickTransactionModal } from "@/components/modals/quick-transaction-modal";
import { formatCurrencyCompact } from "@/lib/utils";

interface HeaderProps {
  onMenuClick?: () => void;
}

interface Notification {
  id: string;
  type: "settlement" | "unpaid" | "deadline";
  title: string;
  description: string;
  link: string;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const [quickTransactionOpen, setQuickTransactionOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();

      if (data.error) return;

      const newNotifications: Notification[] = [];

      // 미수금 알림
      if (data.actions?.unpaidCount > 0) {
        newNotifications.push({
          id: "unpaid",
          type: "unpaid",
          title: `미수금 ${data.actions.unpaidCount}건`,
          description: `총 ${formatCurrencyCompact(data.actions.unpaidAmount)} 미수금`,
          link: "/finance?filter=unpaid",
        });
      }

      // 인플루언서 정산 알림
      if (data.actions?.pendingSettlementsCount > 0) {
        newNotifications.push({
          id: "settlement",
          type: "settlement",
          title: `인플루언서 정산 ${data.actions.pendingSettlementsCount}건`,
          description: `총 ${formatCurrencyCompact(data.actions.pendingSettlementsAmount)} 미정산`,
          link: "/settlements",
        });
      }

      // 프로젝트 마감 알림
      if (data.projects?.endingTodayCount > 0) {
        newNotifications.push({
          id: "deadline-today",
          type: "deadline",
          title: `오늘 마감 ${data.projects.endingTodayCount}건`,
          description: "오늘 종료 예정인 프로젝트",
          link: "/projects",
        });
      }

      if (data.projects?.endingThisWeekCount > 0) {
        newNotifications.push({
          id: "deadline-week",
          type: "deadline",
          title: `이번 주 마감 ${data.projects.endingThisWeekCount}건`,
          description: "이번 주 종료 예정 프로젝트",
          link: "/projects",
        });
      }

      setNotifications(newNotifications);
      setNotificationCount(newNotifications.length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case "unpaid":
        return <Badge variant="destructive" className="text-[10px]">미수금</Badge>;
      case "settlement":
        return <Badge variant="warning" className="text-[10px]">정산</Badge>;
      case "deadline":
        return <Badge variant="info" className="text-[10px]">마감</Badge>;
      default:
        return <Badge className="text-[10px]">알림</Badge>;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search - Hidden on mobile */}
        <div className="relative hidden md:block md:w-[280px] lg:w-[320px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="클라이언트, 프로젝트, 인플루언서 검색..."
            className="pl-10"
          />
        </div>

        {/* Mobile Search Button */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="h-5 w-5" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick Add */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">빠른 추가</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              지출/수익 추가
            </DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => setQuickTransactionOpen(true)}
              className="gap-2 cursor-pointer"
            >
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="font-medium">빠른 거래 추가</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/finance/bulk" className="gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                <span>여러 건 한번에 입력</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/finance/new" className="gap-2">
                <Receipt className="h-4 w-4" />
                <span>상세 거래 추가</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              데이터 추가
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/clients/new">새 클라이언트</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/projects/new">새 프로젝트</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/influencers/new">새 인플루언서</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/documents/new">문서 등록</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Transaction Modal */}
        <QuickTransactionModal 
          open={quickTransactionOpen} 
          onOpenChange={setQuickTransactionOpen} 
        />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center"
                >
                  {notificationCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>알림</span>
              {notificationCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {notificationCount}개
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  🎉 새로운 알림이 없습니다
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} asChild>
                    <Link
                      href={notification.link}
                      className="flex flex-col items-start gap-1 py-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {getNotificationBadge(notification.type)}
                        <span className="text-sm font-medium">{notification.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {notification.description}
                      </p>
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            {notifications.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/" className="justify-center text-primary cursor-pointer">
                    대시보드에서 전체 보기
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-2 md:pr-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {session?.user?.name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left md:flex">
                <span className="text-sm font-medium">
                  {session?.user?.name || "사용자"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {session?.user?.email || "관리자"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>내 계정</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                프로필 설정
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
