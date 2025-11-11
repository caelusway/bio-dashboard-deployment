import { useRef, useEffect } from 'preact/hooks';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartConfiguration,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartCardProps {
  title: string;
  description?: string;
  chartConfig: ChartConfiguration;
  height?: string;
  loading?: boolean;
  onDownload?: () => void;
}

export function ChartCard({
  title,
  description,
  chartConfig,
  height = '400px',
  loading = false,
}: ChartCardProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || loading) return;

    // Destroy existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Enhanced chart config with animations
    const enhancedConfig: ChartConfiguration = {
      ...chartConfig,
      options: {
        ...chartConfig.options,
        animation: {
          duration: 750,
          easing: 'easeInOutQuart',
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    };

    chartInstanceRef.current = new ChartJS(ctx, enhancedConfig);

    // Cleanup
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [chartConfig, loading]);

  const downloadChart = () => {
    if (!chartRef.current) return;

    // Create a temporary canvas with white background
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Set canvas dimensions
    tempCanvas.width = chartRef.current.width;
    tempCanvas.height = chartRef.current.height;

    // Fill with white background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw the chart on top
    tempCtx.drawImage(chartRef.current, 0, 0);

    // Download
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-800 shadow-lg overflow-hidden hover:border-gray-700 transition-all"
    >
      {/* Header */}
      <div class="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h3 class="text-xl font-bold text-white">{title}</h3>
          {description && <p class="text-sm text-gray-400 mt-1">{description}</p>}
        </div>
        <div class="flex items-center gap-2">
          {/* Download Button */}
          <button
            onClick={downloadChart}
            class="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-all border border-gray-700 hover:border-gray-600"
            title="Download as PNG"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            class="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-all border border-gray-700 hover:border-gray-600"
            title="Toggle Fullscreen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div class="p-6">
        {loading ? (
          <div class="flex items-center justify-center" style={{ height }}>
            <div class="flex flex-col items-center gap-3">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              <p class="text-gray-500 text-sm">Loading chart...</p>
            </div>
          </div>
        ) : (
          <div style={{ height }}>
            <canvas ref={chartRef}></canvas>
          </div>
        )}
      </div>
    </div>
  );
}
