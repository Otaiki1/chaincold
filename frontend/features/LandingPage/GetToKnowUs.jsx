import know1 from "../../assets/know1.png";
import map from "../../assets/map.svg";
import know2 from "../../assets/know2.png";
import barn from "../../assets/barnIllus.png";
import know3 from "../../assets/know3.svg";
function GetToKnowUs() {
  return (
    <div className="pt-[120px] pb-[86px] relative flex justify-center gap-x-[40px] font-manrope">
      <img src={barn} alt="" className="absolute bottom-0 left-3 z-[2]" />
      <div className="w-[500px] z-20">
        <h5 className="font-covered mb-1 text-[24px] leading-9 text-[#EEC044]">
          Get to know us
        </h5>
        <h1 className="f font-extrabold text-[48px] leading-[58px] text-[#1F1E17] mb-7">
          Smart Agriculture: On-Chain IoT for Precision Farming
        </h1>
        <p className="font-medium text-base leading-[30px] mb-8 text-[#878680]">
          Enhance your farming operations with our IoT platform. Monitor
          temperature, humidity, and location in real-time, all securely stored
          on-chain. Automate processes with smart contracts and get AI-powered
          advice tailored to your crops' needs. Stay ahead with innovative,
          data-driven agriculture.
        </p>
        <div className="flex gap-x-[83px] items-start">
          <div>
            <h4 className="mb-1 text-[#4BAF47] font-covered text-[24px] leading-9">
              Modern agriculture types
            </h4>
            <p className="font-medium text-base leading-[30px] text-[#878680]">
              We're here for you from start to finish
            </p>
            <button className="py-[15px] px-[50px] text-white font-bold text-sm leading-[30px] bg-[#4BAF47] rounded-[10px] mt-7">
              Discover More
            </button>
          </div>
          <img src={know3} alt="" />
        </div>
      </div>
      <div className="flex gap-x-[18px] z-20">
        <div className="flex flex-col gap-y-[34px] items-end">
          <img
            src={know1}
            className="!w-[248px] !h-[359px] rounded-[80px_0_0_0]"
            alt=""
          />
          <img src={map} alt="" />
        </div>
        <img src={know2} alt="" />
      </div>
    </div>
  );
}

export default GetToKnowUs;
