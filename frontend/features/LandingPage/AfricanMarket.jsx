import veggies from "../../assets/veggiesBasket.svg";
function AfricanMarket() {
  return (
    <div className="pt-[120px] bg-veggiesBg bg-center bg-cover bg-no-repeat flex justify-center items-start font-manrope gap-x-[270px]">
      <div className="bg-[#49A760] w-[633px] pt-[70px] pl-[80px] pb-[80px] pr-[84px] text-white">
        <h2 className="font-semibold text-[50px] mb-[25px] leading-[60px]">
          Built the best African market
        </h2>
        <p className="font-medium text-base leading-7 mb-[25px]">
          Give lady of they such they sure it. Me contained explained my
          education. Vulgar as hearts by garret. Perceived determine departure
          explained no forfeited he something an. Contrasted dissimilar get joy
          you instrument out reasonably. Again keeps at no meant stuff. To
          perpetual do existence northward as difficult.
        </p>
        <button className="border-b-white leading-7  border-b-[1px] pb-2 font-semibold text-base">
          Discover More
        </button>
      </div>
      <img src={veggies} className="mt-[53px]" alt="" />
    </div>
  );
}

export default AfricanMarket;
