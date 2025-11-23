'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { computeMerkleRoot } from '../lib/merkle';

interface MerkleVerifyProps {
  cid?: string;
  onChainRoot?: string;
  onResult?: (ok: boolean) => void;
}

export default function MerkleVerify({ cid, onChainRoot, onResult }: MerkleVerifyProps) {
  const [inputCid, setInputCid] = useState(cid || '');
  const [inputOnChainRoot, setInputOnChainRoot] = useState(onChainRoot || '');
  const [status, setStatus] = useState<string | null>(null);
  const [computedRoot, setComputedRoot] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);

  async function verify(cidParam?: string, onChainRootParam?: string) {
    const _cid = cidParam || inputCid;
    const _onChainRoot = onChainRootParam || inputOnChainRoot;

    if (!_cid) {
      setStatus('Error: No CID provided');
      return;
    }

    setIsVerifying(true);
    setStatus('Fetching payload from IPFS...');
    setComputedRoot(null);
    setVerificationResult(null);

    try {
      // Fetch from IPFS
      const url = `https://ipfs.io/ipfs/${_cid}`;
      const response = await axios.get(url, { timeout: 15000 });
      const samples = response.data;

      if (!Array.isArray(samples)) {
        throw new Error('IPFS payload is not an array');
      }

      setStatus(`Computing Merkle root from ${samples.length} samples...`);

      // Compute Merkle root
      const root = computeMerkleRoot(samples);
      setComputedRoot(root);
      setStatus(`Computed root: ${root}`);

      // Compare with on-chain root if provided
      if (_onChainRoot) {
        const matches = root.toLowerCase() === _onChainRoot.toLowerCase();
        setVerificationResult(matches);
        
        if (matches) {
          setStatus('✅ Verification successful! Computed root matches on-chain root.');
        } else {
          setStatus('❌ Verification failed! Computed root does not match on-chain root.');
        }

        if (onResult) {
          onResult(matches);
        }
      } else {
        setStatus(`Computed root: ${root} (no on-chain root provided for comparison)`);
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setStatus(`Error: ${err.message || 'Failed to fetch or compute root'}`);
      setVerificationResult(false);
      if (onResult) {
        onResult(false);
      }
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Merkle Root Verifier</h2>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              IPFS CID
            </label>
            <input
              value={inputCid}
              onChange={(e) => setInputCid(e.target.value)}
              placeholder="e.g., bafybeievvmbackupcidexample..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              On-Chain Merkle Root (optional, for comparison)
            </label>
            <input
              value={inputOnChainRoot}
              onChange={(e) => setInputOnChainRoot(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
            />
          </div>
        </div>

        <button
          onClick={() => verify()}
          disabled={isVerifying || !inputCid}
          className="w-full md:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? 'Verifying...' : 'Verify Merkle Root'}
        </button>

        {status && (
          <div
            className={`mt-6 p-4 rounded-lg border ${
              verificationResult === true
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : verificationResult === false
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
            }`}
          >
            <p
              className={
                verificationResult === true
                  ? 'text-green-800 dark:text-green-200'
                  : verificationResult === false
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-gray-800 dark:text-gray-200'
              }
            >
              {status}
            </p>
          </div>
        )}

        {computedRoot && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Computed Root:</p>
            <p className="font-mono text-sm text-gray-900 dark:text-white break-all">{computedRoot}</p>
          </div>
        )}

        {verificationResult !== null && (
          <div className="mt-4">
            <div
              className={`p-4 rounded-lg ${
                verificationResult
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}
            >
              <p
                className={`font-semibold ${
                  verificationResult
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}
              >
                {verificationResult
                  ? '✅ Root matches on-chain data'
                  : '❌ Root does not match on-chain data'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

