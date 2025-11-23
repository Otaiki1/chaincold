import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section with Cover Image */}
      <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/cover-img.png"
            alt="ChainCold Cold Chain Monitoring"
            fill
            className="object-cover opacity-40 dark:opacity-20"
            priority
            quality={90}
          />
        </div>
        <div className="relative z-10 container mx-auto px-6 h-full flex flex-col items-center justify-center text-center">
          <h1 className="text-5xl md:text-7xl font-light text-gray-900 dark:text-white mb-6 tracking-tight">
            ChainCold
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            Trustless IoT Cold-Chain Monitoring
          </p>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-500 max-w-xl mx-auto mt-4 font-light">
            Filecoin • Symbiotic Relay • EVVM
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-24">
        <div className="text-center mb-20">
          <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-3 tracking-tight">
            Features
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Track shipments, monitor live telemetry, and verify Merkle roots on-chain
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto mb-24">
          <Link
            href="/track"
            className="group border-b border-gray-200 dark:border-gray-900 pb-8 hover:border-gray-300 dark:hover:border-gray-800 transition-colors"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              Track Shipment
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Look up a shipment by ID and view on-chain telemetry data including temperature,
              humidity, and IPFS CID
            </p>
            <span className="text-xs text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
              View →
            </span>
          </Link>

          <Link
            href="/live"
            className="group border-b border-gray-200 dark:border-gray-900 pb-8 hover:border-gray-300 dark:hover:border-gray-800 transition-colors"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              Live Telemetry
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Real-time monitoring of telemetry events as they're recorded on-chain
            </p>
            <span className="text-xs text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
              View →
            </span>
          </Link>

          <Link
            href="/verify"
            className="group border-b border-gray-200 dark:border-gray-900 pb-8 hover:border-gray-300 dark:hover:border-gray-800 transition-colors"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              Merkle Verifier
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Fetch IPFS payload, recompute Merkle root, and compare with on-chain data
            </p>
            <span className="text-xs text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
              View →
            </span>
          </Link>
        </div>

        <div className="max-w-2xl mx-auto border-t border-gray-100 dark:border-gray-900 pt-12">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-8 tracking-wide uppercase">
            Contract Information
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-900">
              <span className="text-gray-500 dark:text-gray-400">Network</span>
              <span className="text-gray-900 dark:text-white font-mono text-xs">Arbitrum Sepolia</span>
            </div>
            <div className="flex justify-between items-start py-2 border-b border-gray-50 dark:border-gray-900">
              <span className="text-gray-500 dark:text-gray-400">Contract</span>
              <a
                href="https://sepolia.arbiscan.io/address/0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C"
                target="_blank"
                rel="noreferrer"
                className="text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 font-mono text-xs break-all text-right transition-colors"
              >
                0x8DfD8F3b766085ea072FB4C5EE60669e25CC915C
              </a>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 dark:text-gray-400">Chain ID</span>
              <span className="text-gray-900 dark:text-white font-mono text-xs">421614</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
