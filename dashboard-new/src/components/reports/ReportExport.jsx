import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';

export default function ReportExport({ reportData, filters, onClose }) {
  const [format, setFormat] = useState('pdf');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { exportReport } = await import('../../services/exportService');
      await exportReport(reportData, filters, format);
      onClose();
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('ไม่สามารถส่งออกรายงานได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ส่งออกรายงาน</DialogTitle>
          <DialogDescription>
            เลือกรูปแบบไฟล์ที่ต้องการส่งออก
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={format} onValueChange={setFormat}>
            <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="pdf" id="pdf" />
              <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileText className="w-5 h-5 text-red-500" />
                <div>
                  <p className="font-medium">PDF</p>
                  <p className="text-sm text-gray-500">เหมาะสำหรับการพิมพ์และแชร์</p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="excel" id="excel" />
              <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileSpreadsheet className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium">Excel</p>
                  <p className="text-sm text-gray-500">เหมาะสำหรับการวิเคราะห์ข้อมูล</p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="csv" id="csv" />
              <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileText className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium">CSV</p>
                  <p className="text-sm text-gray-500">ข้อมูลดิบสำหรับนำเข้าระบบอื่น</p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              ยกเลิก
            </Button>
            <Button onClick={handleExport} disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  กำลังส่งออก...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  ส่งออก
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
