import { useState } from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { X, Filter } from 'lucide-react';

export default function ActivityLogFilters({
  filters,
  onFilterChange,
  availableActions = [],
  availableResourceTypes = [],
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterUpdate = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      userId: '',
      action: '',
      resourceType: '',
      startDate: '',
      endDate: '',
    };
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(localFilters).some(v => v !== '');

  // Format action name for display
  const formatActionName = (action) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\./g, ' › ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format resource type for display
  const formatResourceType = (type) => {
    const typeNames = {
      task: 'งาน',
      file: 'ไฟล์',
      member: 'สมาชิก',
      user: 'ผู้ใช้',
      group: 'กลุ่ม',
      recurring_task: 'งานซ้ำ',
      report: 'รายงาน',
    };
    return typeNames[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* Toggle Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          {showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
              {Object.values(localFilters).filter(v => v !== '').length}
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
          >
            <X className="w-4 h-4 mr-1" />
            ล้างตัวกรอง
          </Button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          {/* Action Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">การกระทำ</label>
            <Select
              value={localFilters.action}
              onValueChange={(value) => handleFilterUpdate('action', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">ทั้งหมด</SelectItem>
                {availableActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {formatActionName(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resource Type Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">ประเภทข้อมูล</label>
            <Select
              value={localFilters.resourceType}
              onValueChange={(value) => handleFilterUpdate('resourceType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">ทั้งหมด</SelectItem>
                {availableResourceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatResourceType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* User ID Filter (hidden for now, can be enhanced with user dropdown) */}
          {/* <div>
            <label className="block text-sm font-medium mb-2">ผู้ใช้</label>
            <Input
              type="text"
              placeholder="User ID"
              value={localFilters.userId}
              onChange={(e) => handleFilterUpdate('userId', e.target.value)}
            />
          </div> */}

          {/* Start Date Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">วันที่เริ่มต้น</label>
            <Input
              type="date"
              value={localFilters.startDate}
              onChange={(e) => handleFilterUpdate('startDate', e.target.value)}
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">วันที่สิ้นสุด</label>
            <Input
              type="date"
              value={localFilters.endDate}
              onChange={(e) => handleFilterUpdate('endDate', e.target.value)}
            />
          </div>

          {/* Apply Button */}
          <div className="flex items-end">
            <Button
              onClick={handleApplyFilters}
              className="w-full"
            >
              ค้นหา
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
