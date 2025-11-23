import React from "react";
import banner from "../../assets/faqBanner.png";
import callUs from "../../assets/callUs.png";
import FaqBar from "./FaqBar";

function Faq() {
  return (
    <div className="flex items-center pb-[208px] bg-white">
      <img src={banner} alt="" />
      <div className="flex gap-x-[90px] ml-[-251px]">
        <img src={callUs} alt="" />
        <div>
          <h4 className="font-covered mb-1 text-[24px] leading-9 text-[#EEC044]">
            Frequently Asked Questions
          </h4>
          <h2 className="font-extrabold text-[48px] leading-[58px] text-[#1F1E17] mb-[40px]">
            You've Any Questions
          </h2>
          <div className="flex flex-col gap-y-[10px]">
            <FaqBar question="How do i get the smart trackers?" />
            <FaqBar question="How can we buy your trackers?" />
            <FaqBar question="What products does it suit best?" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Faq;
