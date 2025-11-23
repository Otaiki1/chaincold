'use client';

import React, { useState } from 'react';
import { ethers } from 'ethers';
import { getRegistryContract } from '../lib/contracts';
import { computeShipmentKey, formatTemperature, formatHumidity, formatTimestamp } from '../lib/helpers';

interface TelemetryRecord {
  gateway: string;
  merkleRoot: string;
  cid: string;
  timestamp: string;
  temperature: string | null;
  humidity: string | null;
  rfidTag: string | null;
}

interface TrackShipmentProps {
  provider: ethers.Provider | null;
}

export default function TrackShipment({ provider }: TrackShipmentProps) {
  const [shipmentId, setShipmentId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [record, setRecord] = useState<TelemetryRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchRecord() {
    if (!shipmentId || !batchId) {
      setError('Please enter both Shipment ID and Batch ID');
      return;
    }

    if (!provider) {
      setError('Provider not connected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const key = computeShipmentKey(shipmentId, batchId);
      const contract = getRegistryContract(provider);

      // Call records function
      const r = await contract.records(key);

      // Check if record exists (gateway will be zero address if not found)
      if (r.gateway === ethers.ZeroAddress) {
        setError('No record found for this shipment');
        setRecord(null);
        setLoading(false);
        return;
      }

      // Format results
      const formatted: TelemetryRecord = {
        gateway: r.gateway,
        merkleRoot: r.merkleRoot,
        cid: r.cid,
        timestamp: formatTimestamp(r.timestamp),
        temperature: r.temperature ? formatTemperature(r.temperature) : null,
        humidity: r.humidity ? formatHumidity(r.humidity) : null,
        rfidTag: r.rfidTag || null,
      };

      setRecord(formatted);
    } catch (err: any) {
      console.error('Error fetching record:', err);
      setError(err.message || 'Failed to fetch record');
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Track a Shipment</h2>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Shipment ID
            </label>
            <input
              value={shipmentId}
              onChange={(e) => setShipmentId(e.target.value)}
              placeholder="e.g., SHIPMENT-EVVM-001"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              onKeyPress={(e) => e.key === 'Enter' && fetchRecord()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Batch ID
            </label>
            <input
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="e.g., BATCH-0001"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              onKeyPress={(e) => e.key === 'Enter' && fetchRecord()}
            />
          </div>
        </div>

        <button
          onClick={fetchRecord}
          disabled={loading || !provider}
          className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Lookup Shipment'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {record && (
          <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Shipment Record</h3>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300 w-32">Gateway:</span>
                <span className="text-gray-900 dark:text-white font-mono text-sm">{record.gateway}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300 w-32">Merkle Root:</span>
                <span className="text-gray-900 dark:text-white font-mono text-sm break-all">{record.merkleRoot}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300 w-32">CID:</span>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://ipfs.io/ipfs/${record.cid}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-sm break-all"
                >
                  {record.cid}
                </a>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300 w-32">Timestamp:</span>
                <span className="text-gray-900 dark:text-white">{record.timestamp}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300 w-32">Temperature:</span>
                <span className="text-gray-900 dark:text-white">
                  {record.temperature ? `${record.temperature} °C` : '—'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300 w-32">Humidity:</span>
                <span className="text-gray-900 dark:text-white">
                  {record.humidity ? `${record.humidity} %` : '—'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300 w-32">RFID Tag:</span>
                <span className="text-gray-900 dark:text-white">{record.rfidTag || '—'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

