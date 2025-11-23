import arrow from "../../assets/divArrow.svg";
function FaqBar({ question }) {
  return (
    <div className="p-[10px] flex items-center w-[600px] rounded-[10px] bg-[#F8F7F0] justify-between">
      <h2 className="ml-7 font-extrabold text-xl leading-[30px] text-[#1F1E17]">
        {question}
      </h2>
      <img src={arrow} alt="" />
    </div>
  );
}

export default FaqBar;
