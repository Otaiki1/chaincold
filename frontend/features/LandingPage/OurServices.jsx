import Service from "./Service";
import offer1 from "../../assets/offer1.png";
import offer2 from "../../assets/offer2.png";
import offer3 from "../../assets/offer3.png";
import tractor from "../../assets/tractorIcon.svg";
import plant from "../../assets/plantIcon.svg";
import block from "../../assets/blockIcon.svg";
import wheat from "../../assets/wheats.png";

function OurServices() {
  return (
    <div className="py-[114px] pb-[116px] relative overflow-y-hidden bg-[#F8F7F0] flex flex-col items-center text-center">
      <img
        src={wheat}
        className="absolute w-full bottom-[-60px] left-1"
        alt=""
      />
      <h5 className="font-covered text-2xl leading-9 text-[#EEC044]">
        Our Services
      </h5>
      <h2 className="font-extrabold text-[48px] leading-[58px] text-[#1F1E17] mb-[50px]">
        What We Offer
      </h2>
      <div className="flex gap-x-[30px]">
        <Service
          thumbnail={offer1}
          icon={tractor}
          name="Comprehensive Real-Time Monitoring"
          info="Keep track of temperature, humidity, and location for crops and deliveries with our IoT platform. All data is securely recorded on-chain, ensuring transparency and accuracy."
        />
        <Service
          thumbnail={offer2}
          icon={plant}
          name="Automated Smart Contracts"
          info="Automate critical farming and logistics processes with our smart contract technology. Reduce manual intervention and streamline operations for greater efficiency and productivity."
        />
        <Service
          thumbnail={offer3}
          icon={block}
          name="AI-Driven Insights and Recommendations"
          info="Benefit from our embedded AI system that analyzes real-time data and provides expert advice. Optimize crop conditions and delivery logistics based on current temperature and humidity levels."
        />
      </div>
    </div>
  );
}

export default OurServices;
