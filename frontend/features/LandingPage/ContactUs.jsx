import location from "../../assets/iframLocation.svg";
function ContactUs() {
  return (
    <div className="flex justify-center pt-[60px] pb-[120px]">
      <div className="w-fit flex rounded-[10px] overflow-hidden">
        <img src={location} className="h-full" alt="" />
        <div className="px-[100px] bg-[#F8F7F0] pt-[93px]  pb-[103px] text-left">
          <h4 className="font-covered mb-1 text-[24px] leading-9 text-[#EEC044]">
            Contact us
          </h4>
          <h2 className="font-extrabold text-[48px] leading-[58px] text-[#1F1E17] mb-[30px]">
            Write a Message
          </h2>
          <form className="text-[#878680] w-full">
            <div className="grid grid-cols-[1fr_1fr] gap-x-5 mb-5">
              <input
                type="text"
                className="py-5 bg-white rounded-[10px] px-[31px] font-medium text-sm leading-5"
                placeholder="Name"
              />
              <input
                type="text"
                className="py-5 bg-white rounded-[10px] px-[31px] font-medium text-sm leading-5"
                placeholder="Email Address"
              />
            </div>
            <textarea
              cols="30"
              rows="10"
              className="w-full py-5 bg-white rounded-[10px] px-[31px] font-medium text-sm leading-5"
              placeholder="Write a Message"
            ></textarea>
            <button className="py-[15px] px-[50px] text-white font-bold text-sm leading-[30px] bg-[#4BAF47] rounded-[10px] mt-5">
              Send a Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ContactUs;
