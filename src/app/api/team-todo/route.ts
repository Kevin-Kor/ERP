import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - 전체 팀 To-Do 데이터 조회
export async function GET() {
  try {
    const [columns, members] = await Promise.all([
      prisma.teamTodoColumn.findMany({
        orderBy: { order: "asc" },
      }),
      prisma.teamTodoMember.findMany({
        include: {
          tasks: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // 컬럼이 없으면 기본 컬럼 생성
    if (columns.length === 0) {
      const defaultColumns = ["할일 1", "할일 2", "할일 3"];
      await prisma.teamTodoColumn.createMany({
        data: defaultColumns.map((name, index) => ({
          name,
          order: index,
        })),
      });

      const newColumns = await prisma.teamTodoColumn.findMany({
        orderBy: { order: "asc" },
      });

      return NextResponse.json({
        columns: newColumns.map((c) => c.name),
        members: [],
      });
    }

    // 멤버의 태스크를 columnIndex 기준으로 그룹화
    const formattedMembers = members.map((member) => {
      const tasks: { [key: number]: { id: string; text: string; completed: boolean }[] } = {};

      columns.forEach((_, index) => {
        tasks[index] = [];
      });

      member.tasks.forEach((task) => {
        if (tasks[task.columnIndex]) {
          tasks[task.columnIndex].push({
            id: task.id,
            text: task.text,
            completed: task.completed,
          });
        }
      });

      return {
        id: member.id,
        name: member.name,
        tasks,
      };
    });

    return NextResponse.json({
      columns: columns.map((c) => c.name),
      members: formattedMembers,
    });
  } catch (error) {
    console.error("Failed to fetch team todo:", error);
    return NextResponse.json(
      { error: "Failed to fetch team todo" },
      { status: 500 }
    );
  }
}

// POST - 새 항목 추가 (멤버, 컬럼, 태스크)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    if (type === "member") {
      const member = await prisma.teamTodoMember.create({
        data: {
          name: data.name,
        },
      });
      return NextResponse.json({
        id: member.id,
        name: member.name,
        tasks: {},
      });
    }

    if (type === "column") {
      const lastColumn = await prisma.teamTodoColumn.findFirst({
        orderBy: { order: "desc" },
      });

      const column = await prisma.teamTodoColumn.create({
        data: {
          name: data.name,
          order: (lastColumn?.order ?? -1) + 1,
        },
      });
      return NextResponse.json({ id: column.id, name: column.name });
    }

    if (type === "task") {
      const lastTask = await prisma.teamTodoTask.findFirst({
        where: {
          memberId: data.memberId,
          columnIndex: data.columnIndex,
        },
        orderBy: { order: "desc" },
      });

      const task = await prisma.teamTodoTask.create({
        data: {
          memberId: data.memberId,
          columnIndex: data.columnIndex,
          text: data.text,
          completed: false,
          order: (lastTask?.order ?? -1) + 1,
        },
      });
      return NextResponse.json({
        id: task.id,
        text: task.text,
        completed: task.completed,
      });
    }

    if (type === "columns-bulk") {
      // 여러 컬럼 한번에 추가
      const lastColumn = await prisma.teamTodoColumn.findFirst({
        orderBy: { order: "desc" },
      });
      const startOrder = (lastColumn?.order ?? -1) + 1;

      await prisma.teamTodoColumn.createMany({
        data: data.names.map((name: string, index: number) => ({
          name,
          order: startOrder + index,
        })),
      });

      const columns = await prisma.teamTodoColumn.findMany({
        orderBy: { order: "asc" },
      });

      return NextResponse.json({
        columns: columns.map((c) => c.name),
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Failed to create:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

// PATCH - 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    if (type === "column") {
      const columns = await prisma.teamTodoColumn.findMany({
        orderBy: { order: "asc" },
      });

      const column = columns[data.index];
      if (column) {
        await prisma.teamTodoColumn.update({
          where: { id: column.id },
          data: { name: data.name },
        });
      }

      const updatedColumns = await prisma.teamTodoColumn.findMany({
        orderBy: { order: "asc" },
      });

      return NextResponse.json({
        columns: updatedColumns.map((c) => c.name),
      });
    }

    if (type === "task") {
      const task = await prisma.teamTodoTask.update({
        where: { id: data.id },
        data: {
          text: data.text,
          completed: data.completed,
        },
      });
      return NextResponse.json({
        id: task.id,
        text: task.text,
        completed: task.completed,
      });
    }

    if (type === "task-toggle") {
      const task = await prisma.teamTodoTask.findUnique({
        where: { id: data.id },
      });

      if (task) {
        const updated = await prisma.teamTodoTask.update({
          where: { id: data.id },
          data: { completed: !task.completed },
        });
        return NextResponse.json({
          id: updated.id,
          text: updated.text,
          completed: updated.completed,
        });
      }
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE - 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    const index = searchParams.get("index");

    if (type === "member" && id) {
      await prisma.teamTodoMember.delete({
        where: { id },
      });
      return NextResponse.json({ success: true });
    }

    if (type === "column" && index !== null) {
      const columns = await prisma.teamTodoColumn.findMany({
        orderBy: { order: "asc" },
      });

      const columnIndex = parseInt(index);
      const column = columns[columnIndex];

      if (column) {
        // 해당 컬럼의 태스크 삭제
        await prisma.teamTodoTask.deleteMany({
          where: { columnIndex: columnIndex },
        });

        // 컬럼 삭제
        await prisma.teamTodoColumn.delete({
          where: { id: column.id },
        });

        // 이후 컬럼의 태스크들의 columnIndex 조정
        await prisma.teamTodoTask.updateMany({
          where: {
            columnIndex: { gt: columnIndex },
          },
          data: {
            columnIndex: { decrement: 1 },
          },
        });

        // 이후 컬럼들의 order 조정
        const remainingColumns = columns.filter((_, i) => i !== columnIndex);
        for (let i = 0; i < remainingColumns.length; i++) {
          await prisma.teamTodoColumn.update({
            where: { id: remainingColumns[i].id },
            data: { order: i },
          });
        }
      }

      const updatedColumns = await prisma.teamTodoColumn.findMany({
        orderBy: { order: "asc" },
      });

      return NextResponse.json({
        columns: updatedColumns.map((c) => c.name),
      });
    }

    if (type === "task" && id) {
      await prisma.teamTodoTask.delete({
        where: { id },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  } catch (error) {
    console.error("Failed to delete:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
