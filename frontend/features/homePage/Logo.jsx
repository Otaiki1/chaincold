import logo from "../../assets/logo.png";
function Logo() {
  return (
    <div className="flex items-center gap-x-2 font-semibold text-2xl leading-4 text-[#121212]">
      <img src={logo} alt="RealTrack Logo" className="h-8 w-8" />
      <h3>RealTrack</h3>
    </div>
  );
}

export default Logo;
