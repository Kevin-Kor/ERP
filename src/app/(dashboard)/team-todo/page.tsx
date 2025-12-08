"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  ListTodo,
  User,
  Loader2,
  Edit2,
  Check,
  X,
} from "lucide-react";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface Member {
  id: string;
  name: string;
  tasks: { [key: number]: Task[] };
}

interface TodoData {
  columns: string[];
  members: Member[];
}

export default function TeamTodoPage() {
  const [data, setData] = useState<TodoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMemberName, setNewMemberName] = useState("");
  const [newTaskText, setNewTaskText] = useState<{ [key: string]: string }>({});
  const [editingColumn, setEditingColumn] = useState<number | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/team-todo");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch team todo:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 멤버 추가
  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;

    setIsProcessing(true);
    try {
      const res = await fetch("/api/team-todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "member", name: newMemberName.trim() }),
      });

      if (res.ok) {
        const newMember = await res.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                members: [...prev.members, { ...newMember, tasks: {} }],
              }
            : prev
        );
        setNewMemberName("");
      }
    } catch (error) {
      console.error("Failed to add member:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // 멤버 삭제
  const handleDeleteMember = async () => {
    if (!deletingMemberId) return;

    setIsProcessing(true);
    try {
      const res = await fetch(
        `/api/team-todo?type=member&id=${deletingMemberId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                members: prev.members.filter((m) => m.id !== deletingMemberId),
              }
            : prev
        );
        setDeletingMemberId(null);
      }
    } catch (error) {
      console.error("Failed to delete member:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // 태스크 추가
  const handleAddTask = async (memberId: string, columnIndex: number) => {
    const key = `${memberId}-${columnIndex}`;
    const text = newTaskText[key]?.trim();
    if (!text) return;

    try {
      const res = await fetch("/api/team-todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "task",
          memberId,
          columnIndex,
          text,
        }),
      });

      if (res.ok) {
        const newTask = await res.json();
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            members: prev.members.map((m) => {
              if (m.id !== memberId) return m;
              const tasks = { ...m.tasks };
              if (!tasks[columnIndex]) tasks[columnIndex] = [];
              tasks[columnIndex] = [...tasks[columnIndex], newTask];
              return { ...m, tasks };
            }),
          };
        });
        setNewTaskText((prev) => ({ ...prev, [key]: "" }));
      }
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  // 태스크 체크 토글
  const handleToggleTask = async (taskId: string, memberId: string, columnIndex: number) => {
    try {
      const res = await fetch("/api/team-todo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "task-toggle", id: taskId }),
      });

      if (res.ok) {
        const updatedTask = await res.json();
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            members: prev.members.map((m) => {
              if (m.id !== memberId) return m;
              const tasks = { ...m.tasks };
              if (tasks[columnIndex]) {
                tasks[columnIndex] = tasks[columnIndex].map((t) =>
                  t.id === taskId ? updatedTask : t
                );
              }
              return { ...m, tasks };
            }),
          };
        });
      }
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  };

  // 태스크 삭제
  const handleDeleteTask = async (taskId: string, memberId: string, columnIndex: number) => {
    try {
      const res = await fetch(`/api/team-todo?type=task&id=${taskId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            members: prev.members.map((m) => {
              if (m.id !== memberId) return m;
              const tasks = { ...m.tasks };
              if (tasks[columnIndex]) {
                tasks[columnIndex] = tasks[columnIndex].filter((t) => t.id !== taskId);
              }
              return { ...m, tasks };
            }),
          };
        });
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  // 컬럼명 수정
  const handleUpdateColumn = async (index: number) => {
    if (!editingColumnName.trim()) {
      setEditingColumn(null);
      return;
    }

    try {
      const res = await fetch("/api/team-todo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "column",
          index,
          name: editingColumnName.trim(),
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setData((prev) => (prev ? { ...prev, columns: result.columns } : prev));
      }
    } catch (error) {
      console.error("Failed to update column:", error);
    } finally {
      setEditingColumn(null);
      setEditingColumnName("");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ListTodo className="h-7 w-7" />
            팀 To-Do
          </h1>
          <p className="text-muted-foreground mt-1">팀원별 할 일을 관리합니다.</p>
        </div>
      </div>

      {/* Add Member */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="새 팀원 이름..."
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
            />
            <Button onClick={handleAddMember} disabled={isProcessing || !newMemberName.trim()}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              팀원 추가
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Column Headers */}
      {data.members.length > 0 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${data.columns.length}, 1fr)` }}>
          <div></div>
          {data.columns.map((col, index) => (
            <div key={index} className="font-semibold text-center p-2 bg-muted rounded-lg">
              {editingColumn === index ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editingColumnName}
                    onChange={(e) => setEditingColumnName(e.target.value)}
                    className="h-8 text-center"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateColumn(index);
                      if (e.key === "Escape") setEditingColumn(null);
                    }}
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleUpdateColumn(index)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setEditingColumn(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted-foreground/10 rounded px-2 py-1"
                  onClick={() => {
                    setEditingColumn(index);
                    setEditingColumnName(col);
                  }}
                >
                  {col}
                  <Edit2 className="h-3 w-3 opacity-50" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Members and Tasks */}
      {data.members.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">팀원이 없습니다</h3>
            <p className="text-muted-foreground mt-1">위에서 팀원을 추가해주세요.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.members.map((member) => (
            <div
              key={member.id}
              className="grid gap-4"
              style={{ gridTemplateColumns: `200px repeat(${data.columns.length}, 1fr)` }}
            >
              {/* Member Name */}
              <Card className="h-fit">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {member.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => setDeletingMemberId(member.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* Tasks per Column */}
              {data.columns.map((_, colIndex) => (
                <Card key={colIndex} className="h-fit min-h-[100px]">
                  <CardContent className="py-3 px-4 space-y-2">
                    {/* Existing Tasks */}
                    {(member.tasks[colIndex] || []).map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border ${
                          task.completed ? "bg-muted/50 opacity-60" : "bg-white dark:bg-slate-900"
                        }`}
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() =>
                            handleToggleTask(task.id, member.id, colIndex)
                          }
                        />
                        <span
                          className={`flex-1 text-sm ${
                            task.completed ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {task.text}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteTask(task.id, member.id, colIndex)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    {/* Add Task Input */}
                    <div className="flex gap-1">
                      <Input
                        placeholder="할 일 추가..."
                        value={newTaskText[`${member.id}-${colIndex}`] || ""}
                        onChange={(e) =>
                          setNewTaskText((prev) => ({
                            ...prev,
                            [`${member.id}-${colIndex}`]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddTask(member.id, colIndex);
                        }}
                        className="h-8 text-sm"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleAddTask(member.id, colIndex)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Delete Member Dialog */}
      <AlertDialog
        open={!!deletingMemberId}
        onOpenChange={(open) => !open && setDeletingMemberId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>팀원 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 팀원과 모든 할 일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
