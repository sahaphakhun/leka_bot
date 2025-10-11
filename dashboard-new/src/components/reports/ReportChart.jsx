// Simple chart component using HTML/CSS (can be replaced with Chart.js later)
export default function ReportChart({ type, data }) {
  if (type === 'line' || type === 'bar') {
    return (
      <div className="w-full h-64 flex items-end justify-around gap-2 p-4 bg-gray-50 rounded">
        {data.labels.map((label, i) => {
          const value1 = data.datasets[0]?.data[i] || 0;
          const value2 = data.datasets[1]?.data[i] || 0;
          const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
          
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex gap-1 items-end h-48">
                <div
                  className="flex-1 bg-blue-500 rounded-t"
                  style={{ height: `${(value1 / maxValue) * 100}%` }}
                  title={`${data.datasets[0]?.label}: ${value1}`}
                />
                {data.datasets[1] && (
                  <div
                    className="flex-1 bg-green-500 rounded-t"
                    style={{ height: `${(value2 / maxValue) * 100}%` }}
                    title={`${data.datasets[1]?.label}: ${value2}`}
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
