import Social from "../../components/Social";
import Logo from "./Logo";
import twitter from "../../assets/twitter.svg";
import facebook from "../../assets/facebook.svg";
import pintrest from "../../assets/pintrest.svg";
import instagram from "../../assets/instagram.svg";
import NavigationLinks from "./NavigationLinks";
import searchIcon from "../../assets/searchIcon.svg";
import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <nav className="px-[38px] py-[24px] absolute left-0 right-0 top-0 flex justify-between items-center border-b-[1px] border-b-white border-opacity-10 text-center">
      <div className="flex items-center gap-x-[28px]">
        <Logo />
        <div className="flex gap-x-[10px]">
          <Social icon={twitter} />
          <Social icon={facebook} />
          <Social icon={pintrest} />
          <Social icon={instagram} />
        </div>
      </div>
      <NavigationLinks />
      <div className="flex items-center gap-x-[60px]">
        <button className="px-[31px] py-[6px] border-l-solid border-l-[1px] border-l-white border-opacity-30">
          <img src={searchIcon} alt="" />
        </button>
        <NavLink
          to="app"
          className="py-[14px] font-bold text-sm leading-[30px] px-[38px] bg-[#4BAF47] rounded-[10px]"
        >
          Go to App
        </NavLink>
      </div>
    </nav>
  );
}

export default Navbar;
