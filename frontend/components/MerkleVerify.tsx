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
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-light mb-12 text-gray-900 dark:text-white tracking-tight">Merkle Root Verifier</h1>
      
      <div className="mb-12">
        <div className="space-y-8 mb-8">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
              IPFS CID
            </label>
            <input
              value={inputCid}
              onChange={(e) => setInputCid(e.target.value)}
              placeholder="bafybeievvmbackupcidexample..."
              className="w-full px-0 py-3 border-0 border-b border-gray-200 dark:border-gray-900 focus:border-gray-900 dark:focus:border-gray-100 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-colors font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
              On-Chain Merkle Root (optional)
            </label>
            <input
              value={inputOnChainRoot}
              onChange={(e) => setInputOnChainRoot(e.target.value)}
              placeholder="0x..."
              className="w-full px-0 py-3 border-0 border-b border-gray-200 dark:border-gray-900 focus:border-gray-900 dark:focus:border-gray-100 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-colors font-mono text-sm"
            />
          </div>
        </div>

        <button
          onClick={() => verify()}
          disabled={isVerifying || !inputCid}
          className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isVerifying ? 'Verifying...' : 'Verify'}
        </button>

        {status && (
          <div className={`mt-12 py-3 border-b ${
            verificationResult === true
              ? 'border-green-200 dark:border-green-900'
              : verificationResult === false
              ? 'border-red-200 dark:border-red-900'
              : 'border-gray-100 dark:border-gray-900'
          }`}>
            <p
              className={`text-sm ${
                verificationResult === true
                  ? 'text-green-600 dark:text-green-400'
                  : verificationResult === false
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {status.replace('✅ ', '').replace('❌ ', '')}
            </p>
          </div>
        )}

        {computedRoot && (
          <div className="mt-8 py-4 border-b border-gray-100 dark:border-gray-900">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Computed Root</p>
            <p className="font-mono text-sm text-gray-900 dark:text-white break-all">{computedRoot}</p>
          </div>
        )}

        {verificationResult !== null && (
          <div className="mt-8 py-4 border-b border-gray-100 dark:border-gray-900">
            <p
              className={`text-sm ${
                verificationResult
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {verificationResult
                ? 'Root matches on-chain data'
                : 'Root does not match on-chain data'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

