import { useState } from "react";

function HeroSection({ setIsDetailsOpen, setShipmentData }) {
  const [shipmentId, setShipmentId] = useState("");
  const [batchId, setBatchId] = useState("");
  
  const handleTrack = () => {
    if (shipmentId && batchId) {
      setShipmentData({ shipmentId, batchId });
      setIsDetailsOpen(true);
      setShipmentId("");
      setBatchId("");
    }
  };

  return (
    <div className="bg-[#4BAF47] py-9 flex flex-col items-center rounded-[0px_0px_50px_50px]">
      <h4 className="text-base leading-6 font-medium text-[#EEE4E4] mb-[2px]">
        RealTrack
      </h4>
      <h2 className="text-2xl leading-9 font-semibold mb-[22px]">
        Track Your Shipment
      </h2>
      <h6 className="text-sm leading-[21px] mb-[11px]">
        Enter Shipment ID and Batch ID
      </h6>
      <div className="flex gap-3 mb-[22px]">
        <input
          type="text"
          className="w-[380px] py-[14px] bg-white text-[#121212] outline-none border-none rounded-[6px] placeholder:text-[#948F8F] text-center text-sm leading-[18px]"
          placeholder="Shipment ID (e.g., SHIPMENT-001)"
          value={shipmentId}
          onChange={(e) => setShipmentId(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
        />
        <input
          type="text"
          className="w-[380px] py-[14px] bg-white text-[#121212] outline-none border-none rounded-[6px] placeholder:text-[#948F8F] text-center text-sm leading-[18px]"
          placeholder="Batch ID (e.g., BATCH-0001)"
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
        />
      </div>
      <button
        className="font-medium text-lg leading-7 py-[10px] bg-white rounded-[5px] px-[140px] text-[#121212] hover:bg-gray-100 transition-colors"
        onClick={handleTrack}
        disabled={!shipmentId || !batchId}
      >
        Track
      </button>
    </div>
  );
}

export default HeroSection;
