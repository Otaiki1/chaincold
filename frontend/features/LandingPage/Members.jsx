import Farmer from "./Farmer";
import farmer from "../../assets/farmer.png";

function Members() {
  return (
    <div className="pt-[98px] pb-[120px] flex flex-col items-center text-center">
      <h4 className="font-covered mb-1 text-[24px] leading-9 text-[#EEC044]">
        Team Members
      </h4>
      <h2 className="font-extrabold text-[48px] leading-[58px] text-[#1F1E17] mb-[50px]">
        Meet Our Farmers
      </h2>
      <div className="flex justify-center gap-x-[30px]">
        <Farmer farmerImg={farmer} />
        <Farmer farmerImg={farmer} />
        <Farmer farmerImg={farmer} />
      </div>
    </div>
  );
}

export default Members;
