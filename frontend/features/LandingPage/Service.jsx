function Service({ thumbnail, name, icon, info }) {
  return (
    <div className="font-manrope w-[369px]">
      <img src={thumbnail} className="w-full h-[253px]" alt="" />
      <div className="h-[240px] bg-white text-left shadow-md rounded-[0_0_10px_10px] pt-[17px] pl-[15px] pb-[9.5px] relative pr-[21px]">
        <div className="absolute right-5 top-[-40px] p-[15px] bg-[#C5CE38] rounded-[8px]">
          <img src={icon} className="w-[50px] h-[50px]" alt="" />
        </div>
        <h2 className="font-extrabold text-[22px] leading-[31px] text-[#1F1E17] mb-[17px] w-[245px]">
          {name}
        </h2>
        <p className="font-[500] text-sm leading-[25px] text-[#878680]">
          {info}
        </p>
      </div>
    </div>
  );
}

export default Service;
