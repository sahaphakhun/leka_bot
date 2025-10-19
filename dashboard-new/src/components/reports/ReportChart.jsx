// Simple chart component using HTML/CSS (can be replaced with Chart.js later)
export default function ReportChart({ type, data }) {
  if (type === "line" || type === "bar") {
    const labels = Array.isArray(data?.labels) ? data.labels : [];
    const datasets = Array.isArray(data?.datasets) ? data.datasets : [];

    if (labels.length === 0 || datasets.length === 0) {
      return (
        <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded text-sm text-muted-foreground">
          ไม่มีข้อมูลเพียงพอในการสร้างกราฟ
        </div>
      );
    }

    const allValues = datasets.flatMap((dataset) => dataset?.data || []);
    const maxValue = Math.max(0, ...allValues, 0);

    return (
      <div className="w-full h-64 flex items-end justify-around gap-2 p-4 bg-gray-50 rounded">
        {labels.map((label, i) => {
          const value1 = datasets[0]?.data?.[i] || 0;
          const value2 = datasets[1]?.data?.[i] || 0;
          const heightFactor = maxValue > 0 ? (value1 / maxValue) * 100 : 0;
          const heightFactor2 = maxValue > 0 ? (value2 / maxValue) * 100 : 0;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex gap-1 items-end h-48">
                <div
                  className="flex-1 bg-blue-500 rounded-t"
                  style={{ height: `${heightFactor}%` }}
                  title={`${datasets[0]?.label || ""}: ${value1}`}
                />
                {datasets[1] && (
                  <div
                    className="flex-1 bg-green-500 rounded-t"
                    style={{ height: `${heightFactor2}%` }}
                    title={`${datasets[1]?.label || ""}: ${value2}`}
                  />
                )}
              </div>
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded">
      <p className="text-gray-500">Chart type not supported</p>
    </div>
  );
}
