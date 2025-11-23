import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Cold Chain Dashboard
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Track shipments, monitor live telemetry, and verify Merkle roots on-chain
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Link
            href="/track"
            className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="text-4xl mb-4">📦</div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Track Shipment
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Look up a shipment by ID and view on-chain telemetry data including temperature,
              humidity, and IPFS CID
            </p>
            <div className="mt-4 text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
              Go to Track →
            </div>
          </Link>

          <Link
            href="/live"
            className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="text-4xl mb-4">📡</div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Live Telemetry
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time monitoring of telemetry events as they're recorded on-chain with push
              notifications
            </p>
            <div className="mt-4 text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
              View Live →
            </div>
          </Link>

          <Link
            href="/verify"
            className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Merkle Verifier
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Fetch IPFS payload, recompute Merkle root, and compare with on-chain data for
              verification
            </p>
            <div className="mt-4 text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
              Verify Now →
            </div>
          </Link>
        </div>

        <div className="mt-16 max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Contract Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Network:</span>
              <span className="text-gray-900 dark:text-white font-mono">Arbitrum Sepolia</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Contract Address:</span>
              <a
                href="https://sepolia.arbiscan.io/address/0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-mono break-all"
              >
                0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Chain ID:</span>
              <span className="text-gray-900 dark:text-white font-mono">421614</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
