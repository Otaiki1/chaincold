import share from "../../assets/share.svg";

function Farmer({ farmerImg }) {
  return (
    <div className="w-[370px] h-[440px] relative pr-[30px] pb-[40px]">
      <img src={farmerImg} className="rounded-[10px]" alt="" />
      <div className="absolute bg-white py-[21px] pr-[61px] shadow-md rounded-[10px_0px_0px_10px] right-0 bottom-0 flex  items-center gap-x-10">
        <img src={share} className="ml-[-24px]" alt="" />
        <div className="text-right">
          <h4
            className="font-extrabold text-[#1F1E17] text-[20px] leading-[26px] text-[
#1F1E17] mb-[2.5px]"
          >
            Kofi Annan
          </h4>
          <h5 className="text-[#878680] font-medium text-base leading-5">
            Farmer
          </h5>
        </div>
      </div>
    </div>
  );
}

export default Farmer;
