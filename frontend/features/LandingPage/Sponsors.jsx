import sponsor1 from "../../assets/sponsor1.svg";
import sponsor2 from "../../assets/sponsor2.svg";
import sponsor3 from "../../assets/sponsor3.svg";
import sponsor4 from "../../assets/sponsor4.svg";
import sponsor5 from "../../assets/sponsor5.svg";
import dot1 from "../../assets/dots1.svg";
import dot2 from "../../assets/dots2.svg";
function Sponsors() {
  return (
    <div className="flex justify-center items-center gap-x-[70px] bg-[#EEC044] relative py-[80px] overflow-hidden">
      <img src={dot1} className="absolute top-[-20px] left-[-30px]" alt="" />
      <img src={dot2} className="absolute top-[-20px] right-[-30px]" alt="" />
      <img src={sponsor1} alt="" />
      <img src={sponsor2} alt="" />
      <img src={sponsor3} alt="" />
      <img src={sponsor4} alt="" />
      <img src={sponsor5} alt="" />
    </div>
  );
}

export default Sponsors;
