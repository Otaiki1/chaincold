function TimeLineItem({
  title,
  subTitle,
  time,
  icon,
  lastItem,
  current = false,
  mini = false,
}) {
  return (
    <li
      className={`pl-[42px] py-1  relative h-[142px] flex text-[#121212] justify-between ${
        !lastItem && "border-l-[1px] border-[#121212]"
      }`}
    >
      <div
        className={`absolute top-0 bg-[#8BC34A]  ${
          mini ? "p-[13px] left-[-25px]" : "p-[18px] left-[-30px] "
        } rounded-full`}
      >
        <img src={icon} alt="" />
      </div>
      <div>
        <h1
          className={`font-semibold ${
            mini ? "text-[10px] leading-[15px]" : "text-base leading-6"
          } `}
        >
          {title}
        </h1>
        <h3
          className={`mt-2 ${
            mini ? "text-[10px] leading-[15px]" : "text-sm leading-[21px]"
          } `}
        >
          {subTitle}
        </h3>
      </div>
      <h5
        className={`font-normal ${
          mini ? "text-[10px] leading-[15px]" : "text-xs leading-4"
        } `}
      >
        {time}
      </h5>
    </li>
  );
}

export default TimeLineItem;
