import news1 from "../../assets/news1.png";
import news2 from "../../assets/news2.png";
import news3 from "../../assets/news3.png";
function NewsArticle() {
  return (
    <div className="text-center pt-[113px] pb-[60px]">
      <h4 className="font-covered mb-1 text-[24px] leading-9 text-[#EEC044]">
        From the Blog
      </h4>
      <h2 className="font-extrabold text-[48px] leading-[58px] text-[#1F1E17] mb-[50px]">
        News & Articles
      </h2>
      <div className="flex justify-center gap-x-[30px]">
        <img src={news1} alt="" />
        <img src={news2} alt="" />
        <img src={news3} alt="" />
      </div>
    </div>
  );
}

export default NewsArticle;
