import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Filter } from 'lucide-react';

export default function ReportFilters({ filters, onFilterChange }) {
  const { groupId } = useAuth();
  const [members, setMembers] = useState([]);

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
    onFilterChange({ ...filters, dateRange: value });
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>ช่วงเวลา</Label>
          <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">7 วันล่าสุด</SelectItem>
              <SelectItem value="month">30 วันล่าสุด</SelectItem>
              <SelectItem value="quarter">3 เดือนล่าสุด</SelectItem>
              <SelectItem value="year">1 ปีล่าสุด</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
