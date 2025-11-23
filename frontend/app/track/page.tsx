'use client';

import { useProvider } from '../../lib/provider';
import TrackShipment from '../../components/TrackShipment';

export default function TrackPage() {
  const provider = useProvider();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TrackShipment provider={provider} />
    </div>
  );
}

