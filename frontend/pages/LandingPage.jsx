import Navbar from "../features/LandingPage/Navbar";
import swoosh from "../assets/swoosh.svg";
import GetToKnowUs from "../features/LandingPage/GetToKnowUs";
import OurServices from "../features/LandingPage/OurServices";
import Faq from "../features/LandingPage/Faq";
import AfricanMarket from "../features/LandingPage/AfricanMarket";
import Members from "../features/LandingPage/Members";
import EcoFriendly from "../features/LandingPage/EcoFriendly";
import NewsArticle from "../features/LandingPage/NewsArticle";
import ContactUs from "../features/LandingPage/ContactUs";
import Sponsors from "../features/LandingPage/Sponsors";
import Footer from "../features/LandingPage/Footer";
import { NavLink } from "react-router-dom";

function LandingPage() {
  return (
    <div className="text-white font-manrope">
      <div className="relative pb-[218px] bg-landingPageHero bg-center bg-cover bg-no-repeat pt-[322px] flex flex-col items-center">
        <Navbar />
        <div className="relative mb-[47px] w-[828px]">
          <img
            src={swoosh}
            className="right-[39.5px] top-[156.5px] absolute"
            alt=""
          />
          <h1 className="font-[800] text-[80px] leading-[85px] tracking-[-6px] text-center">
            Trustless <span className="text-[#EEC044]">Cold-Chain</span>{" "}
            Monitoring with Filecoin, Symbiotic & EVVM
          </h1>
        </div>
        <NavLink
          to="app"
          className="py-[14px] px-[50px] bg-[#4BAF47] font-bold text-sm leading-[30px] text-center rounded-[10px]"
        >
          Go to App
        </NavLink>
      </div>
      <GetToKnowUs />
      <OurServices />
      <Faq />
      <AfricanMarket />
      <Members />
      <EcoFriendly />
      <NewsArticle />
      <ContactUs />
      <Sponsors />
      <Footer />
    </div>
  );
}

export default LandingPage;
