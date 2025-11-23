'use client';

import { useProvider } from '../../lib/provider';
import TrackShipment from '../../components/TrackShipment';

export default function TrackPage() {
  const provider = useProvider();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <TrackShipment provider={provider} />
    </div>
  );
}

