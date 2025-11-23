import { useState, useEffect } from "react";
import closeIcon from "../../assets/closeIcon.svg";
import TrackShipment from "../../components/TrackShipment";

function DetailsModal({ setIsDetailsOpen, shipmentData, provider }) {
  const [shipmentId, setShipmentId] = useState(shipmentData?.shipmentId || "");
  const [batchId, setBatchId] = useState(shipmentData?.batchId || "");

  useEffect(() => {
    if (shipmentData) {
      setShipmentId(shipmentData.shipmentId);
      setBatchId(shipmentData.batchId);
    }
  }, [shipmentData]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[20px] max-w-6xl w-full max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={() => setIsDetailsOpen(false)}
          className="absolute top-6 right-6 z-10"
        >
          <img src={closeIcon} alt="Close" className="w-6 h-6" />
        </button>
        
        <div className="p-8">
          <h2 className="text-2xl font-semibold text-[#121212] mb-6">
            Shipment Details
          </h2>
          
          {shipmentId && batchId ? (
            <TrackShipment 
              provider={provider}
              initialShipmentId={shipmentId}
              initialBatchId={batchId}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No shipment data provided</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DetailsModal;
