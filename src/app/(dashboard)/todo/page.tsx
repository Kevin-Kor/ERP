"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  UserPlus,
  Download,
  RefreshCw,
  Pencil,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface Member {
  id: string;
  name: string;
  tasks: { [columnIndex: number]: Task[] };
}

interface TodoData {
  columns: string[];
  members: Member[];
}

export default function TodoPage() {
  const { toast } = useToast();
  const [data, setData] = useState<TodoData>({
    columns: [],
    members: [],
  });
  const [loading, setLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditColumnOpen, setIsEditColumnOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");

  // Refs for input navigation
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Load data from API
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/team-todo");
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "데이터를 불러오는데 실패했습니다", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get input ref key
  const getInputRefKey = (memberId: string, colIndex: number) => `${memberId}-${colIndex}`;

  // Focus next input (horizontal navigation)
  const focusNextInput = useCallback(async (memberId: string, currentColIndex: number) => {
    const nextColIndex = currentColIndex + 1;

    // If there's a next column, focus it
    if (nextColIndex < data.columns.length) {
      const nextKey = getInputRefKey(memberId, nextColIndex);
      setTimeout(() => {
        inputRefs.current[nextKey]?.focus();
      }, 10);
    } else {
      // Last column - add 3 more columns
      try {
        const newColumnNames = [
          `할일 ${data.columns.length + 1}`,
          `할일 ${data.columns.length + 2}`,
          `할일 ${data.columns.length + 3}`,
        ];

        const res = await fetch("/api/team-todo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "columns-bulk",
            names: newColumnNames,
          }),
        });

        if (res.ok) {
          const result = await res.json();
          setData((prev) => ({
            ...prev,
            columns: result.columns,
            members: prev.members.map((m) => {
              const newTasks = { ...m.tasks };
              for (let i = 0; i < 3; i++) {
                newTasks[data.columns.length + i] = [];
              }
              return { ...m, tasks: newTasks };
            }),
          }));

          // Focus the first new column after state update
          setTimeout(() => {
            const nextKey = getInputRefKey(memberId, data.columns.length);
            inputRefs.current[nextKey]?.focus();
          }, 50);
        }
      } catch (error) {
        console.error("Failed to add columns:", error);
      }
    }
  }, [data.columns.length]);

  // Add member
  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;

    try {
      const res = await fetch("/api/team-todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "member",
          name: newMemberName.trim(),
        }),
      });

      if (res.ok) {
        const newMember = await res.json();
        // 컬럼 수에 맞게 빈 태스크 객체 생성
        const tasks: { [key: number]: Task[] } = {};
        data.columns.forEach((_, index) => {
          tasks[index] = [];
        });
        newMember.tasks = tasks;

        setData((prev) => ({
          ...prev,
          members: [...prev.members, newMember],
        }));

        setNewMemberName("");
        setIsAddMemberOpen(false);
        toast({ title: "담당자가 추가되었습니다" });
      }
    } catch (error) {
      console.error("Failed to add member:", error);
      toast({ title: "담당자 추가에 실패했습니다", variant: "destructive" });
    }
  };

  // Delete member
  const handleDeleteMember = async (memberId: string) => {
    const member = data.members.find((m) => m.id === memberId);
    if (!member) return;

    if (confirm(`"${member.name}" 담당자를 삭제하시겠습니까?`)) {
      try {
        const res = await fetch(`/api/team-todo?type=member&id=${memberId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          setData((prev) => ({
            ...prev,
            members: prev.members.filter((m) => m.id !== memberId),
          }));
          toast({ title: "담당자가 삭제되었습니다" });
        }
      } catch (error) {
        console.error("Failed to delete member:", error);
        toast({ title: "담당자 삭제에 실패했습니다", variant: "destructive" });
      }
    }
  };

  // Add column manually
  const handleAddColumn = async () => {
    try {
      const res = await fetch("/api/team-todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "column",
          name: `할일 ${data.columns.length + 1}`,
        }),
      });

      if (res.ok) {
        setData((prev) => ({
          ...prev,
          columns: [...prev.columns, `할일 ${prev.columns.length + 1}`],
          members: prev.members.map((m) => ({
            ...m,
            tasks: {
              ...m.tasks,
              [prev.columns.length]: [],
            },
          })),
        }));
      }
    } catch (error) {
      console.error("Failed to add column:", error);
    }
  };

  // Edit column
  const openEditColumn = (index: number) => {
    setEditingColumnIndex(index);
    setEditingColumnName(data.columns[index]);
    setIsEditColumnOpen(true);
  };

  const handleEditColumn = async () => {
    if (!editingColumnName.trim() || editingColumnIndex === null) return;

    try {
      const res = await fetch("/api/team-todo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "column",
          index: editingColumnIndex,
          name: editingColumnName.trim(),
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setData((prev) => ({
          ...prev,
          columns: result.columns,
        }));
        setIsEditColumnOpen(false);
        toast({ title: "컬럼이 수정되었습니다" });
      }
    } catch (error) {
      console.error("Failed to edit column:", error);
    }
  };

  // Delete column
  const handleDeleteColumn = async () => {
    if (editingColumnIndex === null) return;
    if (data.columns.length <= 1) {
      toast({ title: "최소 1개의 컬럼이 필요합니다", variant: "destructive" });
      return;
    }

    if (confirm(`"${data.columns[editingColumnIndex]}" 컬럼을 삭제하시겠습니까?`)) {
      try {
        const res = await fetch(`/api/team-todo?type=column&index=${editingColumnIndex}`, {
          method: "DELETE",
        });

        if (res.ok) {
          const result = await res.json();

          // 멤버들의 태스크 인덱스 재조정
          setData((prev) => ({
            columns: result.columns,
            members: prev.members.map((member) => {
              const newTasks: { [key: number]: Task[] } = {};
              let newIndex = 0;
              Object.keys(member.tasks).forEach((key) => {
                const idx = parseInt(key);
                if (idx !== editingColumnIndex) {
                  newTasks[newIndex] = member.tasks[idx];
                  newIndex++;
                }
              });
              return { ...member, tasks: newTasks };
            }),
          }));

          setIsEditColumnOpen(false);
          toast({ title: "컬럼이 삭제되었습니다" });
        }
      } catch (error) {
        console.error("Failed to delete column:", error);
      }
    }
  };

  // Add task
  const handleAddTask = async (memberId: string, columnIndex: number, text: string) => {
    if (!text.trim()) return;

    try {
      const res = await fetch("/api/team-todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "task",
          memberId,
          columnIndex,
          text: text.trim(),
        }),
      });

      if (res.ok) {
        const newTask = await res.json();

        setData((prev) => ({
          ...prev,
          members: prev.members.map((member) => {
            if (member.id !== memberId) return member;

            const currentTasks = member.tasks[columnIndex] || [];
            return {
              ...member,
              tasks: {
                ...member.tasks,
                [columnIndex]: [...currentTasks, newTask],
              },
            };
          }),
        }));
      }
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  // Toggle task complete
  const handleToggleTask = async (memberId: string, columnIndex: number, taskId: string) => {
    // 로컬 상태 먼저 업데이트
    setData((prev) => ({
      ...prev,
      members: prev.members.map((member) => {
        if (member.id !== memberId) return member;

        return {
          ...member,
          tasks: {
            ...member.tasks,
            [columnIndex]: member.tasks[columnIndex].map((task) =>
              task.id === taskId ? { ...task, completed: !task.completed } : task
            ),
          },
        };
      }),
    }));

    try {
      await fetch("/api/team-todo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "task-toggle",
          id: taskId,
        }),
      });
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  };

  // Update task text
  const handleUpdateTaskText = async (
    memberId: string,
    columnIndex: number,
    taskId: string,
    newText: string
  ) => {
    // 로컬 상태 먼저 업데이트
    setData((prev) => ({
      ...prev,
      members: prev.members.map((member) => {
        if (member.id !== memberId) return member;

        return {
          ...member,
          tasks: {
            ...member.tasks,
            [columnIndex]: member.tasks[columnIndex].map((task) =>
              task.id === taskId ? { ...task, text: newText } : task
            ),
          },
        };
      }),
    }));

    // Debounced API call would be better here
    try {
      await fetch("/api/team-todo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "task",
          id: taskId,
          text: newText,
        }),
      });
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  // Delete task
  const handleDeleteTask = async (memberId: string, columnIndex: number, taskId: string) => {
    try {
      const res = await fetch(`/api/team-todo?type=task&id=${taskId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setData((prev) => ({
          ...prev,
          members: prev.members.map((member) => {
            if (member.id !== memberId) return member;

            return {
              ...member,
              tasks: {
                ...member.tasks,
                [columnIndex]: member.tasks[columnIndex].filter((task) => task.id !== taskId),
              },
            };
          }),
        }));
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  // Export to CSV
  const handleExport = () => {
    let csv = "담당자," + data.columns.join(",") + "\n";

    data.members.forEach((member) => {
      const row = [member.name];
      data.columns.forEach((_, colIndex) => {
        const tasks = member.tasks[colIndex] || [];
        const taskTexts = tasks
          .map((t) => (t.completed ? "[완료] " : "") + t.text)
          .join(" | ");
        row.push(`"${taskTexts}"`);
      });
      csv += row.join(",") + "\n";
    });

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `team-todo-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    toast({ title: "CSV 파일로 내보내기 완료" });
  };

  // Refresh data
  const handleRefresh = () => {
    setLoading(true);
    fetchData();
    toast({ title: "데이터를 새로고침했습니다" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">팀 To-Do</h1>
          <p className="text-muted-foreground mt-1">
            담당자별 할일을 관리합니다. Enter로 다음 칸 이동, 마지막 칸에서 Enter시 새 컬럼 추가
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* Todo Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div className="flex border-b bg-muted/50">
                <div className="w-[180px] shrink-0 p-4 font-semibold border-r">
                  담당자
                </div>
                {data.columns.map((column, index) => (
                  <div
                    key={index}
                    className="flex-1 min-w-[200px] p-4 font-semibold border-r cursor-pointer hover:bg-muted/80 transition-colors group"
                    onClick={() => openEditColumn(index)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{column}</span>
                      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                    </div>
                  </div>
                ))}
                <div className="w-[60px] shrink-0 p-4 flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={handleAddColumn}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Member Rows */}
              {data.members.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>담당자를 추가하여 시작하세요</p>
                </div>
              ) : (
                data.members.map((member) => (
                  <div key={member.id} className="flex border-b last:border-b-0 hover:bg-muted/30">
                    {/* Member Cell */}
                    <div className="w-[180px] shrink-0 p-4 border-r bg-muted/20 group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium truncate flex-1">{member.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={() => handleDeleteMember(member.id)}
                        >
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Task Cells */}
                    {data.columns.map((_, colIndex) => (
                      <TaskCell
                        key={colIndex}
                        memberId={member.id}
                        columnIndex={colIndex}
                        tasks={member.tasks[colIndex] || []}
                        onAddTask={handleAddTask}
                        onToggleTask={handleToggleTask}
                        onUpdateTask={handleUpdateTaskText}
                        onDeleteTask={handleDeleteTask}
                        onEnterPress={() => focusNextInput(member.id, colIndex)}
                        inputRef={(el) => {
                          inputRefs.current[getInputRefKey(member.id, colIndex)] = el;
                        }}
                      />
                    ))}

                    {/* Empty cell for add column button alignment */}
                    <div className="w-[60px] shrink-0" />
                  </div>
                ))
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add Member Button */}
      <Button onClick={() => setIsAddMemberOpen(true)}>
        <UserPlus className="h-4 w-4 mr-2" />
        담당자 추가
      </Button>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>담당자 추가</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="이름 입력"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddMember}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Column Dialog */}
      <Dialog open={isEditColumnOpen} onOpenChange={setIsEditColumnOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>컬럼 수정</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="컬럼 이름"
              value={editingColumnName}
              onChange={(e) => setEditingColumnName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEditColumn()}
              autoFocus
            />
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="destructive" onClick={handleDeleteColumn}>
              <Trash2 className="h-4 w-4 mr-2" />
              삭제
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditColumnOpen(false)}>
                취소
              </Button>
              <Button onClick={handleEditColumn}>저장</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Task Cell Component
interface TaskCellProps {
  memberId: string;
  columnIndex: number;
  tasks: Task[];
  onAddTask: (memberId: string, columnIndex: number, text: string) => void;
  onToggleTask: (memberId: string, columnIndex: number, taskId: string) => void;
  onUpdateTask: (memberId: string, columnIndex: number, taskId: string, text: string) => void;
  onDeleteTask: (memberId: string, columnIndex: number, taskId: string) => void;
  onEnterPress: () => void;
  inputRef: (el: HTMLInputElement | null) => void;
}

function TaskCell({
  memberId,
  columnIndex,
  tasks,
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  onEnterPress,
  inputRef,
}: TaskCellProps) {
  const [newTaskText, setNewTaskText] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ignore Enter during IME composition (Korean, Japanese, etc.)
    if (isComposing) return;

    if (e.key === "Enter") {
      e.preventDefault();

      // Add task if there's text
      if (newTaskText.trim()) {
        onAddTask(memberId, columnIndex, newTaskText.trim());
        setNewTaskText("");
      }

      // Move to next column
      onEnterPress();
    }
  };

  return (
    <div className="flex-1 min-w-[200px] p-3 border-r space-y-2">
      {/* Existing Tasks */}
      {tasks.map((task) => (
        <div
          key={task.id}
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg border bg-background group transition-all",
            task.completed && "bg-muted/50 border-muted"
          )}
        >
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => onToggleTask(memberId, columnIndex, task.id)}
          />
          <input
            type="text"
            value={task.text}
            onChange={(e) => onUpdateTask(memberId, columnIndex, task.id, e.target.value)}
            className={cn(
              "flex-1 bg-transparent text-sm outline-none",
              task.completed && "line-through text-muted-foreground"
            )}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
            onClick={() => onDeleteTask(memberId, columnIndex, task.id)}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      ))}

      {/* Add Task Input */}
      <input
        ref={inputRef}
        type="text"
        placeholder="+ 할일 입력 (Enter)"
        value={newTaskText}
        onChange={(e) => setNewTaskText(e.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        className="w-full h-9 px-3 text-sm border border-dashed rounded-lg bg-background outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
      />
    </div>
  );
}
