import play from "../../assets/playIcon.svg";
function EcoFriendly() {
  return (
    <div className="pt-[170px] pb-[107px] text-center text-white font-manrope bg-ecoBg bg-cover bg-center bg-no-repeat flex flex-col items-center">
      <img src={play} className="mb-[95px]" alt="" />
      <h4 className="w-[720px] font-extrabold text-[60px] leading-[72px] tracking-[-4px]">
        ECO-Friendly Products can be Made from Scratch
      </h4>
    </div>
  );
}

export default EcoFriendly;
