'use client';

import { useProvider } from '../../lib/provider';
import LiveTelemetry from '../../components/LiveTelemetry';

export default function LivePage() {
  const provider = useProvider();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <LiveTelemetry provider={provider} />
    </div>
  );
}

