import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';

export default function SubmitTaskRow({ task, index, onUpdate, onRemove, canRemove }) {
  return (
    <div className="flex gap-2 items-start p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center justify-center w-8 h-10 bg-gray-100 rounded font-semibold text-sm">
        {index + 1}
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2">
        <Input
          placeholder="ชื่องาน *"
          value={task.title}
          onChange={(e) => onUpdate(task.id, 'title', e.target.value)}
          className="md:col-span-2"
        />

        <Input
          placeholder="ผู้รับผิดชอบ"
          value={task.assignee}
          onChange={(e) => onUpdate(task.id, 'assignee', e.target.value)}
        />

        <Input
          type="date"
          value={task.dueDate}
          onChange={(e) => onUpdate(task.id, 'dueDate', e.target.value)}
        />

        <div className="flex gap-2">
          <Select value={task.priority} onValueChange={(value) => onUpdate(task.id, 'priority', value)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">ต่ำ</SelectItem>
              <SelectItem value="medium">ปานกลาง</SelectItem>
              <SelectItem value="high">สูง</SelectItem>
              <SelectItem value="urgent">ด่วนมาก</SelectItem>
            </SelectContent>
          </Select>

          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(task.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
