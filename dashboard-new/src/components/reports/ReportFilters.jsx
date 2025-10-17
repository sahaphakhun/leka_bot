import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

export default function ReportFilters({ filters, onFilterChange }) {
  const { groupId } = useAuth();
  const [members, setMembers] = useState([]);
  const [startDate, setStartDate] = useState(filters.startDate || '');
  const [endDate, setEndDate] = useState(filters.endDate || '');

  useEffect(() => {
    loadMembers();
  }, [groupId]);

  const loadMembers = async () => {
    try {
      const { getGroupMembers } = await import('../../services/api');
      const response = await getGroupMembers(groupId);
      setMembers(response.members || response);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const handleDateRangeChange = (value) => {
    const next = { ...filters, dateRange: value };
    if (value !== 'custom') {
      next.startDate = null;
      next.endDate = null;
      setStartDate('');
      setEndDate('');
    }
    onFilterChange(next);
  };

  const handleMemberChange = (value) => {
    onFilterChange({ ...filters, members: value === 'all' ? [] : [value] });
  };

  const handleCategoryChange = (value) => {
    onFilterChange({ ...filters, categories: value === 'all' ? [] : [value] });
  };

  const applyCustomRange = () => {
    onFilterChange({ ...filters, startDate, endDate });
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>ช่วงเวลา</Label>
          <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกช่วงเวลา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">7 วันล่าสุด</SelectItem>
              <SelectItem value="month">30 วันล่าสุด</SelectItem>
              <SelectItem value="quarter">3 เดือนล่าสุด</SelectItem>
              <SelectItem value="year">1 ปีล่าสุด</SelectItem>
              <SelectItem value="custom">กำหนดเอง</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>สมาชิก</Label>
          <Select
            value={filters.members && filters.members.length > 0 ? filters.members[0] : 'all'}
            onValueChange={handleMemberChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกสมาชิก" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกคน</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.lineUserId || member.id} value={member.lineUserId || member.id}>
                  {member.displayName || member.name || member.lineUserId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>หมวดหมู่งาน</Label>
          <Select
            value={filters.categories && filters.categories.length > 0 ? filters.categories[0] : 'all'}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกหมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
              <SelectItem value="general">ทั่วไป</SelectItem>
              <SelectItem value="meeting">การประชุม</SelectItem>
              <SelectItem value="report">รายงาน</SelectItem>
              <SelectItem value="project">โครงการ</SelectItem>
              <SelectItem value="maintenance">บำรุงรักษา</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>คำสั่ง</Label>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              onFilterChange({
                ...filters,
                dateRange: 'week',
                members: [],
                categories: [],
                startDate: null,
                endDate: null,
              });
            }}
          >
            รีเซ็ตตัวกรอง
          </Button>
        </div>
      </div>

      {filters.dateRange === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="space-y-2">
            <Label>วันที่เริ่มต้น</Label>
            <Input
              type="date"
              value={startDate || ''}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>วันที่สิ้นสุด</Label>
            <Input
              type="date"
              value={endDate || ''}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2 flex items-end">
            <Button type="button" onClick={applyCustomRange} className="w-full">
              ใช้ช่วงวันที่กำหนดเอง
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
