/**
 * Team To-Do List Application
 * - 담당자(세로)별 할일(가로) 관리
 * - Enter 키로 빠른 할일 추가
 * - LocalStorage 자동 저장
 */

class TeamTodoApp {
    constructor() {
        this.data = {
            columns: ['할일 1', '할일 2', '할일 3'],
            members: []
        };
        this.editingColumnIndex = null;
        this.init();
    }

    init() {
        this.loadData();
        this.render();
        this.bindEvents();
    }

    // LocalStorage에서 데이터 로드
    loadData() {
        const saved = localStorage.getItem('teamTodoData');
        if (saved) {
            try {
                this.data = JSON.parse(saved);
            } catch (e) {
                console.error('데이터 로드 실패:', e);
            }
        }
    }

    // LocalStorage에 데이터 저장
    saveData() {
        localStorage.setItem('teamTodoData', JSON.stringify(this.data));
        this.showToast('저장되었습니다');
    }

    // 전체 렌더링
    render() {
        this.renderHeaders();
        this.renderBody();
    }

    // 컬럼 헤더 렌더링
    renderHeaders() {
        const taskHeaders = document.getElementById('taskHeaders');
        taskHeaders.innerHTML = '';
        taskHeaders.style.display = 'flex';

        this.data.columns.forEach((col, index) => {
            const headerItem = document.createElement('div');
            headerItem.className = 'task-header-item';
            headerItem.dataset.columnIndex = index;
            headerItem.innerHTML = `
                <span class="column-name">${this.escapeHtml(col)}</span>
                <i class="fas fa-edit edit-icon"></i>
            `;
            headerItem.addEventListener('click', () => this.openEditColumnModal(index));
            taskHeaders.appendChild(headerItem);
        });
    }

    // 본문 (담당자 행들) 렌더링
    renderBody() {
        const todoBody = document.getElementById('todoBody');
        todoBody.innerHTML = '';

        this.data.members.forEach((member, memberIndex) => {
            const row = this.createMemberRow(member, memberIndex);
            todoBody.appendChild(row);
        });
    }

    // 담당자 행 생성
    createMemberRow(member, memberIndex) {
        const row = document.createElement('tr');
        row.dataset.memberIndex = memberIndex;

        // 담당자 셀
        const memberCell = document.createElement('td');
        memberCell.className = 'member-cell';
        const initial = member.name.charAt(0).toUpperCase();
        memberCell.innerHTML = `
            <div class="member-avatar">${initial}</div>
            <span class="member-name">${this.escapeHtml(member.name)}</span>
            <button class="btn btn-sm btn-outline-danger delete-member-btn" title="담당자 삭제">
                <i class="fas fa-times"></i>
            </button>
        `;
        memberCell.querySelector('.delete-member-btn').addEventListener('click', () => {
            this.deleteMember(memberIndex);
        });
        row.appendChild(memberCell);

        // 할일 셀들
        const taskCellsContainer = document.createElement('td');
        taskCellsContainer.className = 'task-cells';
        taskCellsContainer.style.display = 'flex';

        this.data.columns.forEach((col, colIndex) => {
            const taskCell = this.createTaskCell(memberIndex, colIndex);
            taskCellsContainer.appendChild(taskCell);
        });

        row.appendChild(taskCellsContainer);

        // 빈 셀 (추가 버튼 영역과 맞춤)
        const addCell = document.createElement('td');
        addCell.className = 'add-cell';
        row.appendChild(addCell);

        return row;
    }

    // 할일 셀 생성
    createTaskCell(memberIndex, colIndex) {
        const cell = document.createElement('div');
        cell.className = 'task-cell';
        cell.dataset.memberIndex = memberIndex;
        cell.dataset.colIndex = colIndex;

        const member = this.data.members[memberIndex];
        const tasks = member.tasks[colIndex] || [];

        // 기존 할일들
        tasks.forEach((task, taskIndex) => {
            const taskItem = this.createTaskItem(memberIndex, colIndex, taskIndex, task);
            cell.appendChild(taskItem);
        });

        // 할일 추가 입력창
        const addWrapper = document.createElement('div');
        addWrapper.className = 'add-task-wrapper';
        const addInput = document.createElement('input');
        addInput.type = 'text';
        addInput.className = 'add-task-input';
        addInput.placeholder = '+ 할일 추가 (Enter)';
        addInput.addEventListener('keydown', (e) => this.handleAddTaskKeydown(e, memberIndex, colIndex));
        addWrapper.appendChild(addInput);
        cell.appendChild(addWrapper);

        return cell;
    }

    // 할일 아이템 생성
    createTaskItem(memberIndex, colIndex, taskIndex, task) {
        const item = document.createElement('div');
        item.className = 'task-item' + (task.completed ? ' completed' : '');
        item.dataset.taskIndex = taskIndex;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => {
            this.toggleTaskComplete(memberIndex, colIndex, taskIndex);
        });

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'task-text';
        textInput.value = task.text;
        textInput.addEventListener('blur', () => {
            this.updateTaskText(memberIndex, colIndex, taskIndex, textInput.value);
        });
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                textInput.blur();
                // 다음 할일 추가 입력창으로 포커스
                const cell = item.closest('.task-cell');
                const addInput = cell.querySelector('.add-task-input');
                if (addInput) addInput.focus();
            }
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'task-delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', () => {
            this.deleteTask(memberIndex, colIndex, taskIndex);
        });

        item.appendChild(checkbox);
        item.appendChild(textInput);
        item.appendChild(deleteBtn);

        return item;
    }

    // 할일 추가 입력창 키다운 핸들러
    handleAddTaskKeydown(e, memberIndex, colIndex) {
        if (e.key === 'Enter' && e.target.value.trim()) {
            this.addTask(memberIndex, colIndex, e.target.value.trim());
            e.target.value = '';
            // Enter 후에도 같은 입력창에 포커스 유지하여 연속 입력 가능
        }
    }

    // 할일 추가
    addTask(memberIndex, colIndex, text) {
        const member = this.data.members[memberIndex];
        if (!member.tasks[colIndex]) {
            member.tasks[colIndex] = [];
        }
        member.tasks[colIndex].push({ text, completed: false });
        this.saveData();
        this.renderBody();

        // 추가 후 해당 셀의 입력창에 다시 포커스
        setTimeout(() => {
            const cell = document.querySelector(
                `.task-cell[data-member-index="${memberIndex}"][data-col-index="${colIndex}"]`
            );
            if (cell) {
                const addInput = cell.querySelector('.add-task-input');
                if (addInput) addInput.focus();
            }
        }, 10);
    }

    // 할일 완료 토글
    toggleTaskComplete(memberIndex, colIndex, taskIndex) {
        const task = this.data.members[memberIndex].tasks[colIndex][taskIndex];
        task.completed = !task.completed;
        this.saveData();
        this.renderBody();
    }

    // 할일 텍스트 수정
    updateTaskText(memberIndex, colIndex, taskIndex, newText) {
        if (newText.trim()) {
            this.data.members[memberIndex].tasks[colIndex][taskIndex].text = newText.trim();
            this.saveData();
        }
    }

    // 할일 삭제
    deleteTask(memberIndex, colIndex, taskIndex) {
        this.data.members[memberIndex].tasks[colIndex].splice(taskIndex, 1);
        this.saveData();
        this.renderBody();
    }

    // 담당자 추가
    addMember(name) {
        const tasks = {};
        this.data.columns.forEach((_, index) => {
            tasks[index] = [];
        });
        this.data.members.push({ name, tasks });
        this.saveData();
        this.renderBody();
    }

    // 담당자 삭제
    deleteMember(memberIndex) {
        if (confirm(`"${this.data.members[memberIndex].name}" 담당자를 삭제하시겠습니까?`)) {
            this.data.members.splice(memberIndex, 1);
            this.saveData();
            this.renderBody();
        }
    }

    // 컬럼 추가
    addColumn() {
        const newColumnName = `할일 ${this.data.columns.length + 1}`;
        this.data.columns.push(newColumnName);

        // 모든 담당자에게 새 컬럼용 tasks 배열 추가
        this.data.members.forEach(member => {
            member.tasks[this.data.columns.length - 1] = [];
        });

        this.saveData();
        this.render();
    }

    // 컬럼 편집 모달 열기
    openEditColumnModal(columnIndex) {
        this.editingColumnIndex = columnIndex;
        const modal = new bootstrap.Modal(document.getElementById('editColumnModal'));
        document.getElementById('columnNameInput').value = this.data.columns[columnIndex];
        modal.show();
        setTimeout(() => {
            document.getElementById('columnNameInput').focus();
            document.getElementById('columnNameInput').select();
        }, 300);
    }

    // 컬럼 이름 수정
    updateColumnName(newName) {
        if (newName.trim() && this.editingColumnIndex !== null) {
            this.data.columns[this.editingColumnIndex] = newName.trim();
            this.saveData();
            this.render();
        }
    }

    // 컬럼 삭제
    deleteColumn(columnIndex) {
        if (this.data.columns.length <= 1) {
            alert('최소 1개의 컬럼이 필요합니다.');
            return;
        }

        if (confirm(`"${this.data.columns[columnIndex]}" 컬럼을 삭제하시겠습니까? 해당 컬럼의 모든 할일이 삭제됩니다.`)) {
            this.data.columns.splice(columnIndex, 1);

            // 모든 담당자의 tasks에서 해당 컬럼 삭제 및 인덱스 재정렬
            this.data.members.forEach(member => {
                const newTasks = {};
                let newIndex = 0;
                Object.keys(member.tasks).forEach(key => {
                    const idx = parseInt(key);
                    if (idx !== columnIndex) {
                        newTasks[newIndex] = member.tasks[idx];
                        newIndex++;
                    }
                });
                member.tasks = newTasks;
            });

            this.saveData();
            this.render();
        }
    }

    // 데이터 내보내기 (CSV)
    exportData() {
        let csv = '담당자,' + this.data.columns.join(',') + '\n';

        this.data.members.forEach(member => {
            const row = [member.name];
            this.data.columns.forEach((_, colIndex) => {
                const tasks = member.tasks[colIndex] || [];
                const taskTexts = tasks.map(t => (t.completed ? '[완료] ' : '') + t.text).join(' | ');
                row.push(`"${taskTexts}"`);
            });
            csv += row.join(',') + '\n';
        });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `team-todo-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();

        this.showToast('CSV 파일로 내보내기 완료');
    }

    // 토스트 알림 표시
    showToast(message) {
        // 기존 토스트 제거
        const existingToast = document.querySelector('.toast-container');
        if (existingToast) {
            existingToast.remove();
        }

        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.innerHTML = `<div class="toast">${this.escapeHtml(message)}</div>`;
        document.body.appendChild(toastContainer);

        setTimeout(() => {
            toastContainer.remove();
        }, 2000);
    }

    // XSS 방지용 HTML 이스케이프
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 이벤트 바인딩
    bindEvents() {
        // 담당자 추가 버튼
        document.getElementById('addMemberBtn').addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('addMemberModal'));
            document.getElementById('memberNameInput').value = '';
            modal.show();
            setTimeout(() => {
                document.getElementById('memberNameInput').focus();
            }, 300);
        });

        // 담당자 추가 확인
        document.getElementById('confirmAddMember').addEventListener('click', () => {
            const name = document.getElementById('memberNameInput').value.trim();
            if (name) {
                this.addMember(name);
                bootstrap.Modal.getInstance(document.getElementById('addMemberModal')).hide();
            }
        });

        // 담당자 추가 모달에서 Enter 키
        document.getElementById('memberNameInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('confirmAddMember').click();
            }
        });

        // 컬럼 추가 버튼
        document.getElementById('addColumnBtn').addEventListener('click', () => {
            this.addColumn();
        });

        // 컬럼 편집 확인
        document.getElementById('confirmEditColumn').addEventListener('click', () => {
            const name = document.getElementById('columnNameInput').value.trim();
            if (name) {
                this.updateColumnName(name);
                bootstrap.Modal.getInstance(document.getElementById('editColumnModal')).hide();
            }
        });

        // 컬럼 삭제
        document.getElementById('deleteColumnBtn').addEventListener('click', () => {
            bootstrap.Modal.getInstance(document.getElementById('editColumnModal')).hide();
            if (this.editingColumnIndex !== null) {
                this.deleteColumn(this.editingColumnIndex);
            }
        });

        // 컬럼 편집 모달에서 Enter 키
        document.getElementById('columnNameInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('confirmEditColumn').click();
            }
        });

        // 저장 버튼
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveData();
        });

        // 내보내기 버튼
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // 페이지 종료 시 자동 저장
        window.addEventListener('beforeunload', () => {
            localStorage.setItem('teamTodoData', JSON.stringify(this.data));
        });
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.todoApp = new TeamTodoApp();
});
