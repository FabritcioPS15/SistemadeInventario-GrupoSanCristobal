

interface DonutChartProps {
    size?: number;
    strokeWidth?: number;
    percentage: number;
    color?: string;
    label?: string;
    subLabel?: string;
}

export default function DonutChart({
    size = 100,
    strokeWidth = 10,
    percentage,
    color = 'text-orange-600',
    label,
    subLabel
}: DonutChartProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative flex flex-col items-center justify-center">
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90"
            >
                {/* Background Circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-gray-100"
                />
                {/* Progress Circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={`${color} transition-all duration-1000 ease-out`}
                />
            </svg>
            {(label || subLabel) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    {label && <span className="text-2xl font-bold text-gray-900">{label}</span>}
                    {subLabel && <span className="text-xs text-gray-500">{subLabel}</span>}
                </div>
            )}
        </div>
    );
}
