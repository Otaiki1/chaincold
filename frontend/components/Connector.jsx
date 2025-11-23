import {
  useAccount,
  useContractRead,
  useDisconnect,
} from "@starknet-react/core";
import { useState } from "react";
import { createPortal } from "react-dom";
import ConnectModal from "./ConnectModal";
function Connector() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const [openConnectModal, setConnectModal] = useState(false);

  const toggleModal = () => {
    setConnectModal((prev) => !prev);
  };
  return (
    <>
      {openConnectModal &&
        createPortal(
          <ConnectModal isOpen={openConnectModal} onClose={toggleModal} />,
          document.body
        )}
      {!address ? (
        <button
          className="py-[10px] px-6 bg-[#4BAF47] text-white rounded-[10px] font-medium text-lg leading-7"
          onClick={() => setConnectModal(true)}
        >
          Connect wallet
        </button>
      ) : (
        <div className="flex items-center gap-5">
          <div className="">
            <p className="text-[#121212] text-xs">
              Connected Wallet: {address.slice(0, 6)}...{address.slice(6, 11)}
            </p>
          </div>
          <button
            onClick={() => disconnect()}
            className="py-[10px] px-6 bg-[#4BAF47] rounded-[10px] font-medium text-lg leading-7 text-white"
          >
            Disconnect
          </button>
        </div>
      )}
    </>
  );
}

export default Connector;
