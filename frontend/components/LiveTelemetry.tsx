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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Live Telemetry</h2>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isListening ? 'Listening...' : 'Disconnected'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {events.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {isListening ? 'Waiting for telemetry events...' : 'No events yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, index) => (
            <div
              key={`${event.shipmentKey}-${event.blockNumber}-${index}`}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Shipment Key</p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                    {event.shipmentKey}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gateway</p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                    {event.gateway}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">CID</p>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://ipfs.io/ipfs/${event.cid}`}
                    className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {event.cid}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Temperature</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {event.temperature} °C
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Humidity</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {event.humidity} %
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Timestamp</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatTimestamp(event.timestamp)}
                  </p>
                </div>
                {event.rfidTag && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">RFID Tag</p>
                    <p className="text-sm text-gray-900 dark:text-white">{event.rfidTag}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Merkle Root</p>
                  <p className="font-mono text-xs text-gray-900 dark:text-white break-all">
                    {event.merkleRoot}
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

