import React, { useState, useEffect } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

/**
 * CustomRecurrenceUI Component
 *
 * UI สำหรับตั้งค่า custom recurrence pattern
 * รองรับ: daily, weekly, monthly
 */
const CustomRecurrenceUI = ({ value, onChange }) => {
  const [type, setType] = useState(value?.type || "daily");
  const [interval, setInterval] = useState(value?.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState(value?.daysOfWeek || []);
  const [dayOfMonth, setDayOfMonth] = useState(value?.dayOfMonth || 1);

  // Update parent when values change
  useEffect(() => {
    onChange({
      type,
      interval,
      daysOfWeek: type === "weekly" ? daysOfWeek : [],
      dayOfMonth: type === "monthly" ? dayOfMonth : null,
    });
  }, [type, interval, daysOfWeek, dayOfMonth, onChange]);

  const handleTypeChange = (newType) => {
    setType(newType);
    // Reset dependent fields
    if (newType !== "weekly") setDaysOfWeek([]);
    if (newType !== "monthly") setDayOfMonth(1);
  };

  const handleIntervalChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    setInterval(Math.max(1, value)); // Minimum 1
  };

  const toggleDayOfWeek = (dayIndex) => {
    if (daysOfWeek.includes(dayIndex)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== dayIndex));
    } else {
      setDaysOfWeek([...daysOfWeek, dayIndex].sort());
    }
  };

  const handleDayOfMonthChange = (value) => {
    setDayOfMonth(parseInt(value));
  };

  // Get recurrence description for preview
  const getRecurrenceDescription = () => {
    if (type === "daily") {
      return interval === 1 ? "ทุกวัน" : `ทุก ${interval} วัน`;
    }

    if (type === "weekly") {
      const dayNames = [
        "อาทิตย์",
        "จันทร์",
        "อังคาร",
        "พุธ",
        "พฤหัสบดี",
        "ศุกร์",
        "เสาร์",
      ];
      const selectedDays = daysOfWeek.map((d) => dayNames[d]).join(", ");

      if (daysOfWeek.length === 0) {
        return `ทุก ${interval} สัปดาห์ (ยังไม่ได้เลือกวัน)`;
      }

      if (interval === 1) {
        return `ทุกสัปดาห์ในวัน ${selectedDays}`;
      }

      return `ทุก ${interval} สัปดาห์ ในวัน ${selectedDays}`;
    }

    if (type === "monthly") {
      if (interval === 1) {
        return `ทุกเดือน วันที่ ${dayOfMonth}`;
      }
      return `ทุก ${interval} เดือน วันที่ ${dayOfMonth}`;
    }

    return "";
  };

  // Get interval unit text
  const getIntervalUnit = () => {
    if (type === "daily") return "วัน";
    if (type === "weekly") return "สัปดาห์";
    if (type === "monthly") return "เดือน";
    return "";
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
        <h4 className="font-medium text-sm">ตั้งค่าความถี่แบบกำหนดเอง</h4>
      </div>

      {/* Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="recurrence-type">ประเภท</Label>
        <Select value={type} onValueChange={handleTypeChange}>
          <SelectTrigger id="recurrence-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">รายวัน</SelectItem>
            <SelectItem value="weekly">รายสัปดาห์</SelectItem>
            <SelectItem value="monthly">รายเดือน</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Interval */}
      <div className="space-y-2">
        <Label htmlFor="recurrence-interval">ทุก</Label>
        <div className="flex items-center gap-2">
          <Input
            id="recurrence-interval"
            type="number"
            min="1"
            max="365"
            value={interval}
            onChange={handleIntervalChange}
            className="w-20"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {getIntervalUnit()}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          ตัวเลขต้องมากกว่า 0
        </p>
      </div>

      {/* Days of Week (for weekly) */}
      {type === "weekly" && (
        <div className="space-y-2">
          <Label>วันที่ทำ</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "อา", index: 0 },
              { label: "จ", index: 1 },
              { label: "อ", index: 2 },
              { label: "พ", index: 3 },
              { label: "พฤ", index: 4 },
              { label: "ศ", index: 5 },
              { label: "ส", index: 6 },
            ].map(({ label, index }) => (
              <Button
                key={index}
                type="button"
                variant={daysOfWeek.includes(index) ? "default" : "outline"}
                size="sm"
                className="w-12 h-10 p-0"
                onClick={() => toggleDayOfWeek(index)}
              >
                {label}
              </Button>
            ))}
          </div>
          {daysOfWeek.length === 0 && (
            <p className="text-sm text-red-500">
              ⚠️ กรุณาเลือกอย่างน้อย 1 วัน
            </p>
          )}
          {daysOfWeek.length > 0 && (
            <p className="text-xs text-green-600 dark:text-green-400">
              ✓ เลือก {daysOfWeek.length} วัน
            </p>
          )}
        </div>
      )}

      {/* Day of Month (for monthly) */}
      {type === "monthly" && (
        <div className="space-y-2">
          <Label htmlFor="day-of-month">วันที่ของเดือน</Label>
          <Select
            value={dayOfMonth.toString()}
            onValueChange={handleDayOfMonthChange}
          >
            <SelectTrigger id="day-of-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  วันที่ {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            เดือนที่มีวันน้อยกว่าจะใช้วันสุดท้ายของเดือน
          </p>
        </div>
      )}

      {/* Preview */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <div className="text-blue-600 dark:text-blue-400 mt-0.5">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
              ตัวอย่าง
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {getRecurrenceDescription()}
            </p>
          </div>
        </div>
      </div>

      {/* Validation Warning */}
      {type === "weekly" && daysOfWeek.length === 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-2">
            <div className="text-yellow-600 dark:text-yellow-400 mt-0.5">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              ต้องเลือกอย่างน้อย 1 วันสำหรับงานประจำรายสัปดาห์
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomRecurrenceUI;
