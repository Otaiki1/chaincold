import logo from "../../assets/logo.svg";
import Logo from "./Logo";
import twitter from "../../assets/twitter.svg";
import facebook from "../../assets/facebook.svg";
import pintrest from "../../assets/pintrest.svg";
import instagram from "../../assets/instagram.svg";
import Social from "../../components/Social";
import divider from "../../assets/divider.svg";
import leaf from "../../assets/leaf.svg";
import call from "../../assets/phoneIcon.svg";
import mail from "../../assets/mailIcon.svg";
import location from "../../assets/locationIcon.svg";

function Footer() {
  return (
    <div>
      <div className="py-[120px] bg-[#24231D] flex justify-center">
        <div className="px-[15px] pb-[50px]">
          <Logo />
          <p className="mb-5 font-medium text-[15px] leading-[30px] text-[#A5A49A] w-[269px]">
            There are many variations of passages of lorem ipsum available, but
            the majority suffered.
          </p>
          <div className="flex gap-x-[10px]">
            <Social icon={twitter} />
            <Social icon={facebook} />
            <Social icon={pintrest} />
            <Social icon={instagram} />
          </div>
        </div>
        <div className="px-[15px]">
          <div className="mb-[20px]">
            <h3 className="mb-[9px] font-bold text-xl leading-9 text-white">
              Explore
            </h3>
            <div className="w-[170px]">
              <img src={divider} alt="" />
            </div>
          </div>
          <ul className="font-medium text-[15px] leading-[30px] text-[#A5A49A]">
            <li className="flex items-center gap-x-[14px]">
              <img src={leaf} alt="" /> About
            </li>
            <li className="flex items-center gap-x-[14px]">
              {" "}
              <img src={leaf} alt="" /> Services
            </li>
            <li className="flex items-center gap-x-[14px]">
              <img src={leaf} alt="" /> Our Projects
            </li>
            <li className="flex items-center gap-x-[14px]">
              <img src={leaf} alt="" /> Meet the Farmers
            </li>
            <li className="flex items-center gap-x-[14px]">
              <img src={leaf} alt="" /> Latest News
            </li>
            <li className="flex items-center gap-x-[14px]">
              <img src={leaf} alt="" /> Contact
            </li>
          </ul>
        </div>
        <div className="px-[15px]">
          <div className="mb-[20px]">
            <h3 className="mb-[9px] font-bold text-xl leading-9 text-white">
              News
            </h3>
            <div className="w-[170px]">
              <img src={divider} alt="" />
            </div>
          </div>
          <div className="font-medium flex flex-col gap-y-[26px] text-[15px] leading-[30px] text-[#A5A49A]">
            <div className="text-white  w-[145px]">
              <h2>Bringing Food Production Back To Cities</h2>
              <h4 className="text-[#EEC044] text-[15px] leading-7">
                July 5, 2022
              </h4>
            </div>
            <div className=" text-white w-[145px]">
              <h2>The Future of Farming, Smart Irrigation Solutions</h2>
              <h4 className="text-[#EEC044] text-[15px] leading-7">
                July 5, 2022
              </h4>
            </div>
          </div>
        </div>
        <div className="px-[15px] ml-10">
          <div className="mb-[20px]">
            <h3 className="mb-[9px] font-bold text-xl leading-9 text-white">
              Contact
            </h3>
            <div className="w-[170px]">
              <img src={divider} alt="" />
            </div>
          </div>
          <div className="flex flex-col gap-y-[10px] font-medium text-[15px] leading-[26px] text-[#A5A49A]">
            <div className="flex items-center gap-x-[9px]">
              <img src={call} alt="" />
              <h5>666 888 0000</h5>
            </div>
            <div className="flex items-center gap-x-[9px]">
              <img src={mail} alt="" />
              <h5>Realtrack@gmail.com</h5>
            </div>
            <div className="flex items-center gap-x-[9px]">
              <img src={location} alt="" />
              <h5>Abokobi Accra Ghana</h5>
            </div>
          </div>
        </div>
      </div>
      <div className="py-5 bg-[#1F1E17] text-[#A5A49A] px-[360px] flex items-center justify-between font-semibold">
        <h5 className="text-sm leading-[30px]">
          © All Copyright 2024 by{" "}
          <span className="text-[15px]">shawonetc Themes</span>
        </h5>
        <h6 className="text-sm leading-[14px]">
          Terms of Use <span className="mx-2">|</span> Privacy Policy
        </h6>
      </div>
    </div>
  );
}

export default Footer;
