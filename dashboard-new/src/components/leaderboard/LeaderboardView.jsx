import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { 
  Medal, 
  RefreshCw, 
  Crown, 
  TrendingUp, 
  AlertCircle 
} from 'lucide-react';
import { getLeaderboard, syncLeaderboard } from '../../services/api';

const PERIOD_OPTIONS = [
  { value: 'weekly', label: 'รายสัปดาห์' },
  { value: 'monthly', label: 'รายเดือน' },
  { value: 'quarterly', label: 'รายไตรมาส' },
  { value: 'yearly', label: 'รายปี' },
];

const normalizeLeaderboard = (entries = []) => {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry, index) => {
    const name = entry.displayName || entry.name || entry.realName || entry.nickName || 'ไม่ทราบชื่อ';
    const score = Number(
      entry.totalScore ??
      entry.weeklyPoints ??
      entry.monthlyPoints ??
      entry.points ??
      entry.score ??
      0
    );
    const completed = Number(
      entry.completedTasks ??
      entry.tasksCompleted ??
      entry.totalCompleted ??
      entry.totalTasks ??
      0
    );
    const onTimeRateRaw = entry.onTimeRate ?? entry.onTimePercentage ?? entry.punctuality ?? entry.onTime ?? 0;
    const onTimeRate = Number.isFinite(onTimeRateRaw) ? Math.round(onTimeRateRaw) : 0;

    return {
      id: entry.lineUserId || entry.userId || entry.id || `rank-${index}`,
      rank: entry.rank || index + 1,
      name,
      pictureUrl: entry.pictureUrl || entry.avatar,
      score,
      completed,
      onTimeRate,
      role: entry.role || 'member',
      streak: entry.streak || entry.currentStreak || 0,
      bestStreak: entry.bestStreak || 0,
    };
  });
};

const rankEmojis = ['🥇', '🥈', '🥉'];

export default function LeaderboardView() {
  const { groupId } = useAuth();
  const [period, setPeriod] = useState('weekly');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const loadLeaderboard = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);

    try {
      const response = await getLeaderboard(groupId, { period });
      const list = response?.items || response?.data || response?.leaderboard || response;
      setLeaderboard(normalizeLeaderboard(list));
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError(err.message || 'ไม่สามารถโหลดข้อมูลอันดับได้');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, [groupId, period]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const handleSync = async () => {
    if (!groupId) return;
    setSyncing(true);
    try {
      await syncLeaderboard(groupId);
      await loadLeaderboard();
    } catch (err) {
      console.error('Failed to sync leaderboard:', err);
      alert('ไม่สามารถซิงก์ข้อมูลอันดับได้');
    } finally {
      setSyncing(false);
    }
  };

  const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const others = useMemo(() => leaderboard.slice(3), [leaderboard]);

  const renderTopCard = (entry, index) => (
    <Card key={entry.id} className={index === 0 ? 'border-yellow-400 shadow-lg' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
        {index === 0 ? (
          <Crown className="w-5 h-5 text-yellow-500" />
        ) : (
          <Medal className="w-5 h-5 text-blue-500" />
        )}
          <CardTitle className="text-sm font-medium">
            อันดับ {entry.rank}
          </CardTitle>
        </div>
        <Badge variant="outline" className="text-xs">
          {rankEmojis[index] || `#${entry.rank}`}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={entry.pictureUrl} alt={entry.name} />
            <AvatarFallback>
              {entry.name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-base">{entry.name}</p>
            <p className="text-xs text-muted-foreground">
              เสร็จ {entry.completed} งาน • ตรงเวลา {entry.onTimeRate}%
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">คะแนนรวม</p>
            <p className="text-lg font-semibold text-blue-600">{entry.score.toFixed(1)}</p>
          </div>
          {entry.streak > 0 && (
            <Badge variant="secondary">
              🔥 ต่อเนื่อง {entry.streak} วัน
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลดข้อมูลอันดับ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">อันดับผลงาน</h1>
          <p className="text-muted-foreground">
            ดูอันดับสมาชิกในกลุ่มตามช่วงเวลาที่เลือก
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadLeaderboard}>
            <RefreshCw className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                กำลังซิงก์...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                ซิงก์ข้อมูล
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={period === option.value ? 'default' : 'outline'}
            onClick={() => setPeriod(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-md bg-red-50 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-semibold">เกิดข้อผิดพลาด</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topThree.length === 0 ? (
          <Card className="md:col-span-3">
            <CardContent className="py-12 text-center text-muted-foreground">
              ยังไม่มีข้อมูลอันดับสำหรับช่วงเวลานี้
            </CardContent>
          </Card>
        ) : (
          topThree.map((entry, index) => renderTopCard(entry, index))
        )}
      </div>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>ตารางอันดับสมาชิก</CardTitle>
          <CardDescription>
            เรียงจากคะแนนรวมสูงสุด • กด "ซิงก์ข้อมูล" เพื่ออัปเดตคะแนนล่าสุด
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                <th className="py-3 pr-4 w-16">อันดับ</th>
                <th className="py-3 pr-4">สมาชิก</th>
                <th className="py-3 pr-4">คะแนนรวม</th>
                <th className="py-3 pr-4">งานที่เสร็จ</th>
                <th className="py-3 pr-4">ตรงเวลา</th>
                <th className="py-3 pr-4">สถิติเด่น</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-muted-foreground">
                    ยังไม่มีข้อมูลอันดับสำหรับช่วงเวลานี้
                  </td>
                </tr>
              ) : (
                leaderboard.map((entry, index) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 font-semibold">
                      {rankEmojis[index] || `#${entry.rank}`}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={entry.pictureUrl} alt={entry.name} />
                          <AvatarFallback>
                            {entry.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{entry.name}</p>
                          <p className="text-xs text-muted-foreground">
                            รับผิดชอบ {entry.completed} งาน • ตรงเวลา {entry.onTimeRate}%
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-blue-600">
                      {entry.score.toFixed(1)}
                    </td>
                    <td className="py-3 pr-4">{entry.completed}</td>
                    <td className="py-3 pr-4">{entry.onTimeRate}%</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {entry.streak > 0 && (
                          <Badge variant="outline">🔥 ต่อเนื่อง {entry.streak} วัน</Badge>
                        )}
                        {entry.bestStreak > 0 && (
                          <Badge variant="outline">🏅 สถิติสูงสุด {entry.bestStreak} วัน</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
