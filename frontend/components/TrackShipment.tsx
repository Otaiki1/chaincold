import React, { useState, useEffect } from 'react';
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
  initialShipmentId?: string;
  initialBatchId?: string;
}

export default function TrackShipment({ provider, initialShipmentId = '', initialBatchId = '' }: TrackShipmentProps) {
  const [shipmentId, setShipmentId] = useState(initialShipmentId);
  const [batchId, setBatchId] = useState(initialBatchId);
  const [record, setRecord] = useState<TelemetryRecord | null>(null);
  const [batchData, setBatchData] = useState<BatchSample[] | null>(null);
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-fetch if initial values are provided
  useEffect(() => {
    if (initialShipmentId && initialBatchId && provider) {
      setShipmentId(initialShipmentId);
      setBatchId(initialBatchId);
      // Fetch after state is set
      const timer = setTimeout(() => {
        fetchRecord(initialShipmentId, initialBatchId);
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialShipmentId, initialBatchId]);

  async function fetchRecord(overrideShipmentId?: string, overrideBatchId?: string) {
    const currentShipmentId = overrideShipmentId || shipmentId;
    const currentBatchId = overrideBatchId || batchId;
    
    if (!currentShipmentId || !currentBatchId) {
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
      const key = computeShipmentKey(currentShipmentId, currentBatchId);
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
      const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3001';
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
      const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3001';
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

  const showForm = !initialShipmentId || !initialBatchId;

  return (
    <div className="w-full">
      {showForm && (
        <>
          <h1 className="text-2xl font-light mb-12 text-gray-900 tracking-tight">Track Shipment</h1>
          
          <div className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">
                  Shipment ID
                </label>
                <input
                  value={shipmentId}
                  onChange={(e) => setShipmentId(e.target.value)}
                  placeholder="SHIPMENT-EVVM-001"
                  className="w-full px-0 py-3 border-0 border-b border-gray-200 focus:border-gray-900 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none transition-colors"
                  onKeyPress={(e) => e.key === 'Enter' && fetchRecord()}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">
                  Batch ID
                </label>
                <input
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  placeholder="BATCH-0001"
                  className="w-full px-0 py-3 border-0 border-b border-gray-200 focus:border-gray-900 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none transition-colors"
                  onKeyPress={(e) => e.key === 'Enter' && fetchRecord()}
                />
              </div>
            </div>

            <button
              onClick={() => fetchRecord()}
              disabled={loading || !provider}
              className="px-8 py-3 bg-[#4BAF47] text-white text-sm font-medium hover:bg-[#3d8f3a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-[5px]"
            >
              {loading ? 'Loading...' : 'Lookup'}
            </button>

            {error && (
              <div className="mt-8 py-3 border-b border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </>
      )}

      {loading && !showForm && (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading shipment data...</p>
        </div>
      )}

      {error && !showForm && (
        <div className="py-3 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {record && (
        <div className={`${showForm ? 'mt-16' : 'mt-0'} space-y-8`}>
          {/* On-Chain Summary */}
          <div>
            <h2 className="text-sm font-medium text-gray-900 mb-6 uppercase tracking-wide">On-Chain Summary</h2>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-gray-100">
                <span className="text-xs text-gray-500 w-32 mb-1 sm:mb-0">Gateway</span>
                <span className="text-sm text-gray-900 font-mono break-all">{record.gateway}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-gray-100">
                <span className="text-xs text-gray-500 w-32 mb-1 sm:mb-0">Merkle Root</span>
                <span className="text-sm text-gray-900 font-mono break-all">{record.merkleRoot}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-gray-100">
                <span className="text-xs text-gray-500 w-32 mb-1 sm:mb-0">CID</span>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://ipfs.io/ipfs/${record.cid}`}
                  className="text-sm text-gray-900 hover:text-gray-600 font-mono break-all transition-colors"
                >
                  {record.cid}
                </a>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-gray-100">
                <span className="text-xs text-gray-500 w-32 mb-1 sm:mb-0">Timestamp</span>
                <span className="text-sm text-gray-900">{record.timestamp}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-gray-100">
                <span className="text-xs text-gray-500 w-32 mb-1 sm:mb-0">Temperature</span>
                <span className="text-sm text-gray-900">
                  {record.temperature ? `${record.temperature} °C` : '—'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-gray-100">
                <span className="text-xs text-gray-500 w-32 mb-1 sm:mb-0">Humidity</span>
                <span className="text-sm text-gray-900">
                  {record.humidity ? `${record.humidity} %` : '—'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start py-3">
                <span className="text-xs text-gray-500 w-32 mb-1 sm:mb-0">RFID Tag</span>
                <span className="text-sm text-gray-900">{record.rfidTag || '—'}</span>
              </div>
            </div>

            {/* Verify on Filecoin Button */}
            {batchData && batchData.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <button
                  onClick={verifyOnFilecoin}
                  disabled={verifying}
                  className="px-6 py-2 bg-[#4BAF47] text-white text-sm font-medium hover:bg-[#3d8f3a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-[5px]"
                >
                  {verifying ? 'Verifying...' : 'Verify on Filecoin'}
                </button>
                {verificationResult && (
                  <div className={`mt-4 py-2 border-b ${
                    verificationResult.valid
                      ? 'border-green-200'
                      : 'border-red-200'
                  }`}>
                    <p className={`text-sm ${
                      verificationResult.valid 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {verificationResult.message.replace('✅ ', '').replace('❌ ', '')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Batch Data Table */}
          {batchData && batchData.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-900 mb-6 uppercase tracking-wide">
                Batch Data ({batchData.length} samples)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-xs text-gray-500 uppercase tracking-wide font-medium">Time</th>
                      <th className="text-left py-3 text-xs text-gray-500 uppercase tracking-wide font-medium">Temp</th>
                      <th className="text-left py-3 text-xs text-gray-500 uppercase tracking-wide font-medium">Humidity</th>
                      <th className="text-left py-3 text-xs text-gray-500 uppercase tracking-wide font-medium">RFID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchData.map((sample, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-3 text-gray-900">
                          {new Date(sample.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 text-gray-900">
                          {(sample.temperature / 100).toFixed(2)}°C
                        </td>
                        <td className="py-3 text-gray-900">
                          {(sample.humidity / 100).toFixed(2)}%
                        </td>
                        <td className="py-3 text-gray-900">
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
            <div>
              <h2 className="text-sm font-medium text-gray-900 mb-6 uppercase tracking-wide">
                Attestations
              </h2>
              <div className="space-y-3">
                {attestations.map((att, idx) => (
                  <div
                    key={idx}
                    className="py-3 border-b border-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-900">
                          {att.attestationType}
                        </span>
                        <span className="ml-3 text-xs text-gray-400 font-mono">
                          {att.taskId.slice(0, 16)}...
                        </span>
                      </div>
                      <span className={`text-xs ${
                        att.status === 'completed'
                          ? 'text-green-600'
                          : 'text-gray-400'
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
  );
}

