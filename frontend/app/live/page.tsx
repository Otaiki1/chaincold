'use client';

import { useProvider } from '../../lib/provider';
import LiveTelemetry from '../../components/LiveTelemetry';

export default function LivePage() {
  const provider = useProvider();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <LiveTelemetry provider={provider} />
    </div>
  );
}

