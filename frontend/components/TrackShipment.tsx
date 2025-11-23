'use client';

import React, { useState } from 'react';
import { ethers } from 'ethers';
import { getRegistryContract } from '../lib/contracts';
import { computeShipmentKey, formatTemperature, formatHumidity, formatTimestamp } from '../lib/helpers';
import { computeMerkleRoot } from '../lib/merkle';

interface TelemetryRecord {
  gateway: string;
  merkleRoot: string;
  cid: string;
  timestamp: string;
  temperature: string | null;
  humidity: string | null;
  rfidTag: string | null;
}

interface BatchSample {
  shipmentId: string;
  batchId: string;
  temperature: number;
  humidity: number;
  rfidTag?: string;
  metadata?: any;
  timestamp: number;
}

interface GatewayResponse {
  shipmentKey: string;
  onChain: TelemetryRecord;
  batchData: BatchSample[] | null;
}

interface Attestation {
  taskId: string;
  attestationType: string;
  status: string;
  createdAt?: number;
}

interface TrackShipmentProps {
  provider: ethers.Provider | null;
}

export default function TrackShipment({ provider }: TrackShipmentProps) {
  const [shipmentId, setShipmentId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [record, setRecord] = useState<TelemetryRecord | null>(null);
  const [batchData, setBatchData] = useState<BatchSample[] | null>(null);
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; message: string } | null>(null);
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
    setBatchData(null);
    setAttestations([]);
    setVerificationResult(null);

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

      // Fetch batch data from Gateway API
      await fetchBatchData(key);
      
      // Fetch attestations
      await fetchAttestations(key);
    } catch (err: any) {
      console.error('Error fetching record:', err);
      setError(err.message || 'Failed to fetch record');
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBatchData(shipmentKey: string) {
    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const response = await fetch(`${gatewayUrl}/shipment/${shipmentKey}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('Batch data not found in gateway');
          return;
        }
        throw new Error(`Gateway API error: ${response.statusText}`);
      }

      const data: GatewayResponse = await response.json();
      setBatchData(data.batchData || null);
    } catch (err: any) {
      console.error('Error fetching batch data:', err);
      // Don't fail the whole request if gateway fetch fails
    }
  }

  async function fetchAttestations(shipmentKey: string) {
    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const response = await fetch(`${gatewayUrl}/shipment/${shipmentKey}/attestations`);
      
      if (!response.ok) {
        // Attestations endpoint might not be fully implemented yet
        return;
      }

      const data = await response.json();
      if (data.tasks && Array.isArray(data.tasks)) {
        setAttestations(data.tasks);
      }
    } catch (err: any) {
      console.error('Error fetching attestations:', err);
      // Don't fail if attestations aren't available
    }
  }

  async function verifyOnFilecoin() {
    if (!batchData || !record) {
      setError('No batch data available for verification');
      return;
    }

    setVerifying(true);
    setVerificationResult(null);
    setError(null);

    try {
      // Recompute Merkle root from batch data
      const computedRoot = computeMerkleRoot(batchData);
      const expectedRoot = record.merkleRoot.toLowerCase();
      const computedRootLower = computedRoot.toLowerCase();

      const valid = computedRootLower === expectedRoot;

      setVerificationResult({
        valid,
        message: valid
          ? '✅ Merkle root matches! Batch data is verified.'
          : `❌ Merkle root mismatch. Expected: ${expectedRoot}, Computed: ${computedRootLower}`,
      });
    } catch (err: any) {
      setVerificationResult({
        valid: false,
        message: `Verification error: ${err.message}`,
      });
    } finally {
      setVerifying(false);
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
          <div className="mt-6 space-y-6">
            {/* On-Chain Summary */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">On-Chain Summary</h3>
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

              {/* Verify on Filecoin Button */}
              {batchData && batchData.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={verifyOnFilecoin}
                    disabled={verifying}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifying ? 'Verifying...' : 'Verify on Filecoin'}
                  </button>
                  {verificationResult && (
                    <div className={`mt-3 p-3 rounded-lg ${
                      verificationResult.valid
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}>
                      <p className={verificationResult.valid ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
                        {verificationResult.message}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Batch Data Table */}
            {batchData && batchData.length > 0 && (
              <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Batch Data ({batchData.length} samples)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300 dark:border-gray-600">
                        <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">Time</th>
                        <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">Temp (°C)</th>
                        <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">Humidity (%)</th>
                        <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">RFID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchData.map((sample, idx) => (
                        <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                          <td className="py-2 px-3 text-gray-900 dark:text-white">
                            {new Date(sample.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-gray-900 dark:text-white">
                            {(sample.temperature / 100).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-gray-900 dark:text-white">
                            {(sample.humidity / 100).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-gray-900 dark:text-white">
                            {sample.rfidTag || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Attestations Section */}
            {attestations.length > 0 && (
              <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Symbiotic Relay Attestations
                </h3>
                <div className="space-y-2">
                  {attestations.map((att, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {att.attestationType}
                          </span>
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {att.taskId.slice(0, 16)}...
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          att.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                        }`}>
                          {att.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

