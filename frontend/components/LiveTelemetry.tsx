'use client';

import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { getRegistryContract, SHIPMENT_REGISTRY_ADDRESS } from '../lib/contracts';
import { formatTimestamp } from '../lib/helpers';

interface TelemetryEvent {
  shipmentKey: string;
  gateway: string;
  merkleRoot: string;
  cid: string;
  timestamp: number;
  temperature: string;
  humidity: string;
  rfidTag: string;
  blockNumber: number;
}

interface LiveTelemetryProps {
  provider: ethers.Provider | null;
}

export default function LiveTelemetry({ provider }: LiveTelemetryProps) {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!provider) {
      setError('Provider not connected');
      return;
    }

    const contract = getRegistryContract(provider);
    let mounted = true;

    // Handler for new events
    const handler = (
      shipmentKey: string,
      gateway: string,
      merkleRoot: string,
      cid: string,
      timestamp: bigint,
      temperature: bigint,
      humidity: bigint,
      rfidTag: string,
      event: ethers.Log
    ) => {
      if (!mounted) return;

      const newEvent: TelemetryEvent = {
        shipmentKey,
        gateway,
        merkleRoot,
        cid,
        timestamp: Number(timestamp),
        temperature: (Number(temperature) / 100).toFixed(2),
        humidity: (Number(humidity) / 100).toFixed(2),
        rfidTag,
        blockNumber: event.blockNumber,
      };

      setEvents((prev) => {
        // Add new event at the beginning, keep only last 50
        const updated = [newEvent, ...prev].slice(0, 50);
        return updated;
      });

      // Optional: trigger a notification or animation
      // You can add a toast notification here
    };

    // Start listening
    contract.on('TelemetryRecorded', handler);
    setIsListening(true);
    setError(null);

    // Also fetch recent events from the last 1000 blocks
    const fetchRecentEvents = async () => {
      try {
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 1000);
        
        const filter = contract.filters.TelemetryRecorded();
        const logs = await contract.queryFilter(filter, fromBlock, currentBlock);
        
        const recentEvents: TelemetryEvent[] = logs.map((log) => {
          // Parse the log using the contract interface
          const parsed = contract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (!parsed) {
            throw new Error('Failed to parse log');
          }
          // Extract args - ethers v6 returns args as an array
          const args = parsed.args as any[];
          return {
            shipmentKey: String(args[0]),
            gateway: String(args[1]),
            merkleRoot: String(args[2]),
            cid: String(args[3]),
            timestamp: Number(args[4]),
            temperature: (Number(args[5]) / 100).toFixed(2),
            humidity: (Number(args[6]) / 100).toFixed(2),
            rfidTag: String(args[7]),
            blockNumber: log.blockNumber,
          };
        });

        // Sort by timestamp descending
        recentEvents.sort((a, b) => b.timestamp - a.timestamp);
        setEvents(recentEvents.slice(0, 50));
      } catch (err) {
        console.error('Error fetching recent events:', err);
      }
    };

    fetchRecentEvents();

    // Cleanup
    return () => {
      mounted = false;
      contract.off('TelemetryRecorded', handler);
      setIsListening(false);
    };
  }, [provider]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-12">
        <h1 className="text-2xl font-light text-gray-900 dark:text-white tracking-tight">Live Telemetry</h1>
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${isListening ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'}`}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {isListening ? 'Listening' : 'Disconnected'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-8 py-3 border-b border-red-200 dark:border-red-900">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {events.length === 0 ? (
        <div className="py-16 text-center border-b border-gray-100 dark:border-gray-900">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {isListening ? 'Waiting for telemetry events...' : 'No events yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {events.map((event, index) => (
            <div
              key={`${event.shipmentKey}-${event.blockNumber}-${index}`}
              className="py-6 border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Shipment</p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                    {event.shipmentKey.slice(0, 20)}...
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Gateway</p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                    {event.gateway.slice(0, 20)}...
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">CID</p>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://ipfs.io/ipfs/${event.cid}`}
                    className="font-mono text-sm text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 break-all transition-colors"
                  >
                    {event.cid.slice(0, 20)}...
                  </a>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Timestamp</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatTimestamp(event.timestamp)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Temperature</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {event.temperature}°C
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Humidity</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {event.humidity}%
                  </p>
                </div>
                {event.rfidTag && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">RFID</p>
                    <p className="text-sm text-gray-900 dark:text-white">{event.rfidTag}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Merkle Root</p>
                  <p className="font-mono text-xs text-gray-900 dark:text-white break-all">
                    {event.merkleRoot.slice(0, 20)}...
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

