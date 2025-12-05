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
  Save,
  Pencil,
  X,
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

const generateId = () => Math.random().toString(36).substring(2, 9);

const STORAGE_KEY = "erp-team-todo-data";

export default function TodoPage() {
  const { toast } = useToast();
  const [data, setData] = useState<TodoData>({
    columns: ["할일 1", "할일 2", "할일 3"],
    members: [],
  });
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditColumnOpen, setIsEditColumnOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");

  // Refs for input navigation
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Load data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load data:", e);
      }
    }
  }, []);

  // Save data to localStorage
  const saveData = useCallback((newData: TodoData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  }, []);

  // Get input ref key
  const getInputRefKey = (memberId: string, colIndex: number) => `${memberId}-${colIndex}`;

  // Focus next input (horizontal navigation)
  const focusNextInput = useCallback((memberId: string, currentColIndex: number) => {
    const nextColIndex = currentColIndex + 1;

    // If there's a next column, focus it
    if (nextColIndex < data.columns.length) {
      const nextKey = getInputRefKey(memberId, nextColIndex);
      setTimeout(() => {
        inputRefs.current[nextKey]?.focus();
      }, 10);
    } else {
      // Last column - add 3 more columns and focus the first new one
      const newColumns = [...data.columns];
      const startIndex = newColumns.length;

      for (let i = 0; i < 3; i++) {
        newColumns.push(`할일 ${startIndex + i + 1}`);
      }

      const newMembers = data.members.map((member) => {
        const newTasks = { ...member.tasks };
        for (let i = 0; i < 3; i++) {
          newTasks[startIndex + i] = [];
        }
        return { ...member, tasks: newTasks };
      });

      saveData({
        columns: newColumns,
        members: newMembers,
      });

      // Focus the first new column after state update
      setTimeout(() => {
        const nextKey = getInputRefKey(memberId, startIndex);
        inputRefs.current[nextKey]?.focus();
      }, 50);
    }
  }, [data.columns, data.members, saveData]);

  // Add member
  const handleAddMember = () => {
    if (!newMemberName.trim()) return;

    const newMember: Member = {
      id: generateId(),
      name: newMemberName.trim(),
      tasks: {},
    };

    data.columns.forEach((_, index) => {
      newMember.tasks[index] = [];
    });

    saveData({
      ...data,
      members: [...data.members, newMember],
    });

    setNewMemberName("");
    setIsAddMemberOpen(false);
    toast({ title: "담당자가 추가되었습니다" });
  };

  // Delete member
  const handleDeleteMember = (memberId: string) => {
    const member = data.members.find((m) => m.id === memberId);
    if (!member) return;

    if (confirm(`"${member.name}" 담당자를 삭제하시겠습니까?`)) {
      saveData({
        ...data,
        members: data.members.filter((m) => m.id !== memberId),
      });
      toast({ title: "담당자가 삭제되었습니다" });
    }
  };

  // Add column manually
  const handleAddColumn = () => {
    const newColumnName = `할일 ${data.columns.length + 1}`;
    const newColumns = [...data.columns, newColumnName];
    const newMembers = data.members.map((member) => ({
      ...member,
      tasks: {
        ...member.tasks,
        [newColumns.length - 1]: [],
      },
    }));

    saveData({
      columns: newColumns,
      members: newMembers,
    });
  };

  // Edit column
  const openEditColumn = (index: number) => {
    setEditingColumnIndex(index);
    setEditingColumnName(data.columns[index]);
    setIsEditColumnOpen(true);
  };

  const handleEditColumn = () => {
    if (!editingColumnName.trim() || editingColumnIndex === null) return;

    const newColumns = [...data.columns];
    newColumns[editingColumnIndex] = editingColumnName.trim();

    saveData({
      ...data,
      columns: newColumns,
    });

    setIsEditColumnOpen(false);
    toast({ title: "컬럼이 수정되었습니다" });
  };

  // Delete column
  const handleDeleteColumn = () => {
    if (editingColumnIndex === null) return;
    if (data.columns.length <= 1) {
      toast({ title: "최소 1개의 컬럼이 필요합니다", variant: "destructive" });
      return;
    }

    if (confirm(`"${data.columns[editingColumnIndex]}" 컬럼을 삭제하시겠습니까?`)) {
      const newColumns = data.columns.filter((_, i) => i !== editingColumnIndex);
      const newMembers = data.members.map((member) => {
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
      });

      saveData({
        columns: newColumns,
        members: newMembers,
      });

      setIsEditColumnOpen(false);
      toast({ title: "컬럼이 삭제되었습니다" });
    }
  };

  // Add task
  const handleAddTask = (memberId: string, columnIndex: number, text: string) => {
    if (!text.trim()) return;

    const newMembers = data.members.map((member) => {
      if (member.id !== memberId) return member;

      const currentTasks = member.tasks[columnIndex] || [];
      return {
        ...member,
        tasks: {
          ...member.tasks,
          [columnIndex]: [
            ...currentTasks,
            { id: generateId(), text: text.trim(), completed: false },
          ],
        },
      };
    });

    saveData({ ...data, members: newMembers });
  };

  // Toggle task complete
  const handleToggleTask = (memberId: string, columnIndex: number, taskId: string) => {
    const newMembers = data.members.map((member) => {
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
    });

    saveData({ ...data, members: newMembers });
  };

  // Update task text
  const handleUpdateTaskText = (
    memberId: string,
    columnIndex: number,
    taskId: string,
    newText: string
  ) => {
    const newMembers = data.members.map((member) => {
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
    });

    saveData({ ...data, members: newMembers });
  };

  // Delete task
  const handleDeleteTask = (memberId: string, columnIndex: number, taskId: string) => {
    const newMembers = data.members.map((member) => {
      if (member.id !== memberId) return member;

      return {
        ...member,
        tasks: {
          ...member.tasks,
          [columnIndex]: member.tasks[columnIndex].filter((task) => task.id !== taskId),
        },
      };
    });

    saveData({ ...data, members: newMembers });
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

  // Manual save
  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    toast({ title: "저장되었습니다" });
  };

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
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            저장
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
