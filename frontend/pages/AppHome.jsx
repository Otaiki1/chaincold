import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useAccount, usePublicClient } from "wagmi";
import { ethers } from "ethers";
import Navbar from "../features/homePage/Navbar";
import HeroSection from "../features/homePage/HeroSection";
import DetailsModal from "../features/homePage/DetailsModal";

function AppHome() {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [shipmentData, setShipmentData] = useState(null);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  
  // Create provider from wagmi public client or fallback
  const getProvider = () => {
    if (publicClient && publicClient.transport) {
      // Use wagmi's public client
      return new ethers.JsonRpcProvider(publicClient.transport.url || 'https://sepolia-rollup.arbitrum.io/rpc');
    }
    // Fallback to public RPC
    return new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
  };

  return (
    <div className="bg-white min-h-[100vh] text-black px-[100px]">
      {isDetailsOpen && shipmentData &&
        createPortal(
          <DetailsModal
            setIsDetailsOpen={setIsDetailsOpen}
            shipmentData={shipmentData}
            provider={getProvider()}
          />,
          document.body
        )}
      <Navbar />
      <HeroSection 
        setIsDetailsOpen={setIsDetailsOpen} 
        setShipmentData={setShipmentData}
      />
    </div>
  );
}

export default AppHome;
