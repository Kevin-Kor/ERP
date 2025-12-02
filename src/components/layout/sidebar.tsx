"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  UserCircle,
  Receipt,
  FileText,
  Calendar,
  Settings,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const navigation = [
  {
    name: "대시보드",
    href: "/",
    icon: LayoutDashboard,
    description: "핵심 지표 요약",
  },
  {
    name: "클라이언트",
    href: "/clients",
    icon: Users,
    description: "클라이언트 관리",
  },
  {
    name: "프로젝트",
    href: "/projects",
    icon: Briefcase,
    description: "캠페인 관리",
  },
  {
    name: "인플루언서",
    href: "/influencers",
    icon: UserCircle,
    description: "인플루언서 DB",
  },
  {
    name: "정산 관리",
    href: "/settlements",
    icon: Receipt,
    description: "정산 현황",
  },
  {
    name: "재무",
    href: "/finance",
    icon: TrendingUp,
    description: "수익/비용 관리",
  },
  {
    name: "문서",
    href: "/documents",
    icon: FileText,
    description: "견적서/세금계산서",
  },
  {
    name: "캘린더",
    href: "/calendar",
    icon: Calendar,
    description: "일정 관리",
  },
];

const bottomNavigation = [
  {
    name: "설정",
    href: "/settings",
    icon: Settings,
    description: "시스템 설정",
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ isOpen, onClose, collapsed = false, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();

  const handleNavClick = () => {
    // Close mobile sidebar when navigating
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r bg-card transition-all duration-300",
          // Mobile: slide in from left
          "max-lg:-translate-x-full max-lg:w-[280px]",
          isOpen && "max-lg:translate-x-0",
          // Desktop: collapsible
          "lg:translate-x-0",
          collapsed ? "lg:w-[70px]" : "lg:w-[260px]"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {(!collapsed || isOpen) && (
            <Link href="/" className="flex items-center gap-2" onClick={handleNavClick}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shrink-0">
                <span className="text-lg font-bold text-primary-foreground">A</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight">Agency ERP</span>
                <span className="text-[10px] text-muted-foreground">마케팅 에이전시 관리</span>
              </div>
            </Link>
          )}
          {collapsed && !isOpen && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary mx-auto">
              <span className="text-lg font-bold text-primary-foreground">A</span>
            </div>
          )}
          
          {/* Mobile Close Button */}
          {isOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/" && pathname.startsWith(item.href));
              
              return (
                <Link key={item.href} href={item.href} onClick={handleNavClick}>
                  <div
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      collapsed && !isOpen && "lg:justify-center lg:px-2"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-transform duration-200",
                        !isActive && "group-hover:scale-110"
                      )}
                    />
                    {(!collapsed || isOpen) && (
                      <div className="flex flex-col">
                        <span>{item.name}</span>
                        {isActive && (
                          <span className="text-[10px] opacity-80">
                            {item.description}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Bottom Navigation */}
        <div className="border-t px-3 py-4">
          <nav className="flex flex-col gap-1">
            {bottomNavigation.map((item) => {
              const isActive = pathname === item.href;
              
              return (
                <Link key={item.href} href={item.href} onClick={handleNavClick}>
                  <div
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      collapsed && !isOpen && "lg:justify-center lg:px-2"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {(!collapsed || isOpen) && <span>{item.name}</span>}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Collapse Button - Desktop only */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "mt-2 w-full hidden lg:flex",
              collapsed && "px-2"
            )}
            onClick={() => onCollapsedChange?.(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2">접기</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}
