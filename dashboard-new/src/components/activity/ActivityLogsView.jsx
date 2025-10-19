import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { SmartPagination } from '../ui/pagination';
import { RefreshCw, Search, Download, TrendingUp } from 'lucide-react';
import ActivityLogFilters from './ActivityLogFilters';
import ActivityLogList from './ActivityLogList';
import ActivityStatsWidget from './ActivityStatsWidget';
import { getActivityLogs, getActivityStats, getUniqueActions, getUniqueResourceTypes } from '../../services/api';
import { showError, showSuccess } from '../../lib/toast';

const ITEMS_PER_PAGE = 50;

export default function ActivityLogsView({ refreshKey = 0 }) {
  const { groupId } = useAuth();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resourceType: '',
    startDate: '',
    endDate: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [showStats, setShowStats] = useState(true);
  const [availableActions, setAvailableActions] = useState([]);
  const [availableResourceTypes, setAvailableResourceTypes] = useState([]);

  // Load initial data
  useEffect(() => {
    if (groupId) {
      loadData();
      loadFilterOptions();
    }
  }, [groupId, refreshKey]);

  // Reload logs when filters or pagination changes
  useEffect(() => {
    if (groupId) {
      loadLogs();
    }
  }, [groupId, filters, currentPage, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadLogs(),
        loadStats(),
      ]);
    } catch (err) {
      console.error('❌ Failed to load activity logs:', err);
      setError(err.message || 'ไม่สามารถโหลดข้อมูลได้');
      showError('ไม่สามารถโหลดข้อมูล Activity Logs ได้', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const params = {
        ...filters,
        search: searchTerm,
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
      };

      const { logs: fetchedLogs, total } = await getActivityLogs(groupId, params);
      setLogs(fetchedLogs);
      setTotalLogs(total);
    } catch (err) {
      console.error('❌ Failed to load logs:', err);
      throw err;
    }
  };

  const loadStats = async () => {
    try {
      const fetchedStats = await getActivityStats(groupId, 30);
      setStats(fetchedStats);
    } catch (err) {
      console.error('❌ Failed to load stats:', err);
      // Don't throw - stats are optional
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [actions, resourceTypes] = await Promise.all([
        getUniqueActions(groupId),
        getUniqueResourceTypes(groupId),
      ]);
      setAvailableActions(actions);
      setAvailableResourceTypes(resourceTypes);
    } catch (err) {
      console.error('❌ Failed to load filter options:', err);
      // Don't throw - filter options are optional
    }
  };

  const handleRefresh = useCallback(async () => {
    await loadData();
    showSuccess('รีเฟรชข้อมูลสำเร็จ');
  }, [groupId]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page
  }, []);

  const handleExport = useCallback(() => {
    // Export logs to CSV
    try {
      const headers = ['วันที่', 'ผู้ใช้', 'การกระทำ', 'ประเภท', 'รายละเอียด'];
      const rows = logs.map(log => [
        new Date(log.createdAt).toLocaleString('th-TH'),
        log.user?.displayName || '-',
        log.action,
        log.resourceType,
        JSON.stringify(log.details || {}),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      showSuccess('ส่งออกข้อมูลสำเร็จ');
    } catch (err) {
      console.error('❌ Export failed:', err);
      showError('ไม่สามารถส่งออกข้อมูลได้', err);
    }
  }, [logs]);

  const totalPages = Math.ceil(totalLogs / ITEMS_PER_PAGE);

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleRefresh}>ลองอีกครั้ง</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📊 Activity Logs</h1>
          <p className="text-gray-600">ประวัติการใช้งานในกลุ่ม</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            {showStats ? 'ซ่อนสถิติ' : 'แสดงสถิติ'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={logs.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            ส่งออก CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* Stats Widget */}
      {showStats && stats && (
        <ActivityStatsWidget stats={stats} />
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="ค้นหา activity logs..."
              value={searchTerm}
              onChange={handleSearchChange}
              icon={<Search className="w-4 h-4 text-gray-400" />}
            />
          </div>
        </div>

        <ActivityLogFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          availableActions={availableActions}
          availableResourceTypes={availableResourceTypes}
        />
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-600">
        แสดง {logs.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, totalLogs)} จาก {totalLogs} รายการ
      </div>

      {/* Logs List */}
      <ActivityLogList logs={logs} loading={loading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <SmartPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
