export async function exportReport(reportData, filters, format) {
  // This would typically call an API endpoint
  // For now, we'll implement client-side export

  switch (format) {
    case "pdf":
      return exportToPDF(reportData, filters);
    case "excel":
      return exportToExcel(reportData, filters);
    case "csv":
      return exportToCSV(reportData, filters);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function exportToPDF(reportData, filters) {
  // Implement PDF export
  // Could use jsPDF or call backend API
  console.log("Exporting to PDF...", reportData);

  // Simulate download
  const blob = new Blob(["PDF content"], { type: "application/pdf" });
  downloadBlob(blob, "report.pdf");
}

function exportToExcel(reportData, filters) {
  // Implement Excel export
  // Could use xlsx library or call backend API
  console.log("Exporting to Excel...", reportData);

  // Simulate download
  const blob = new Blob(["Excel content"], {
    type: "application/vnd.ms-excel",
  });
  downloadBlob(blob, "report.xlsx");
}

function exportToCSV(reportData, filters) {
  // Implement CSV export
  const { byMember } = reportData;

  // Create CSV content
  const headers = ["ชื่อ", "งานที่ได้รับ", "งานที่เสร็จ", "อัตราความสำเร็จ"];
  const rows = byMember.map((m) => [
    m.name,
    m.assigned,
    m.completed,
    `${m.rate}%`,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  // Download
  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, "report.csv");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportTasks(tasks, format) {
  if (format === "csv") {
    const headers = [
      "ชื่องาน",
      "สถานะ",
      "ผู้รับผิดชอบ",
      "วันครบกำหนด",
      "ความสำคัญ",
    ];
    const rows = tasks.map((t) => [
      t.title,
      t.status,
      t.assignee || "-",
      t.dueDate || "-",
      t.priority || "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    downloadBlob(blob, "tasks.csv");
  }
}

// Export Members Functions
export async function exportMembers(members, format = "csv") {
  switch (format) {
    case "csv":
      return exportMembersToCSV(members);
    case "excel":
      return exportMembersToExcel(members);
    case "json":
      return exportMembersToJSON(members);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function exportMembersToCSV(members) {
  const headers = [
    "ชื่อผู้ใช้",
    "LINE User ID",
    "บทบาท",
    "สถานะ",
    "วันที่เข้าร่วม",
    "งานที่เสร็จ",
    "งานทั้งหมด",
  ];

  const roleLabels = {
    admin: "ผู้ดูแล",
    moderator: "ผู้ควบคุม",
    member: "สมาชิก",
  };

  const statusLabels = {
    active: "ใช้งานอยู่",
    inactive: "ไม่ใช้งาน",
    banned: "ถูกระงับ",
  };

  const rows = members.map((member) => [
    `"${(member.displayName || member.name || "ไม่ระบุ").replace(/"/g, '""')}"`,
    member.lineUserId || "-",
    roleLabels[member.role] || member.role || "สมาชิก",
    statusLabels[member.status] || member.status || "ใช้งานอยู่",
    member.joinedAt
      ? new Date(member.joinedAt).toLocaleDateString("th-TH")
      : "-",
    member.completedTasks || 0,
    member.totalTasks || 0,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `members_${timestamp}.csv`);
}

function exportMembersToExcel(members) {
  // For now, export as CSV with .xlsx extension
  // In production, you might want to use a library like xlsx
  const headers = [
    "ชื่อผู้ใช้",
    "LINE User ID",
    "บทบาท",
    "สถานะ",
    "วันที่เข้าร่วม",
    "งานที่เสร็จ",
    "งานทั้งหมด",
  ];

  const roleLabels = {
    admin: "ผู้ดูแล",
    moderator: "ผู้ควบคุม",
    member: "สมาชิก",
  };

  const statusLabels = {
    active: "ใช้งานอยู่",
    inactive: "ไม่ใช้งาน",
    banned: "ถูกระงับ",
  };

  const rows = members.map((member) => [
    (member.displayName || member.name || "ไม่ระบุ").replace(/"/g, '""'),
    member.lineUserId || "-",
    roleLabels[member.role] || member.role || "สมาชิก",
    statusLabels[member.status] || member.status || "ใช้งานอยู่",
    member.joinedAt
      ? new Date(member.joinedAt).toLocaleDateString("th-TH")
      : "-",
    member.completedTasks || 0,
    member.totalTasks || 0,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `members_${timestamp}.xlsx`);
}

function exportMembersToJSON(members) {
  const jsonData = JSON.stringify(members, null, 2);
  const blob = new Blob([jsonData], {
    type: "application/json;charset=utf-8;",
  });
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `members_${timestamp}.json`);
}

// Export Dashboard Data
export async function exportDashboardData(tasks, stats, format = "csv") {
  if (format === "csv") {
    const headers = ["รายการ", "จำนวน"];
    const rows = [
      ["งานทั้งหมด", stats.totalTasks || 0],
      ["งานที่เสร็จแล้ว", stats.completedTasks || 0],
      ["งานที่กำลังดำเนินการ", stats.inProgressTasks || 0],
      ["งานที่เกินกำหนด", stats.overdueTasks || 0],
      ["งานใหม่", stats.newTasks || 0],
    ];

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
      "",
      "--- รายละเอียดงาน ---",
      "ชื่องาน,สถานะ,วันครบกำหนด",
      ...tasks.map((t) =>
        [
          `"${(t.title || "").replace(/"/g, '""')}"`,
          t.status || "-",
          t.dueDate || t.deadline || "-",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `dashboard_${timestamp}.csv`);
  }
}
