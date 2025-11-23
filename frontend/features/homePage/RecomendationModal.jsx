import closeIcon from "../../assets/closeIcon.svg";
import Spinner from "../../components/Spinner";

function RecomendationModal({
  setIsRecommendationOpen,
  setIsDetailsOpen,
  data,
  loadingAiData,
}) {
  return (
    <div className="absolute inset-0 flex justify-center text-black  pt-[120px] bg-white bg-opacity-65 backdrop-blur-sm">
      <div className="w-[858px] px-[45px] relative py-10 bg-white font-manrope shadow-md h-fit rounded-[5px]">
        <button
          className="absolute top-[9px] right-4"
          onClick={() => {
            setIsDetailsOpen(true);
            setIsRecommendationOpen(false);
          }}
        >
          <img src={closeIcon} alt="" />
        </button>
        <div className="py-[7px] px-10 bg-[#4BAF47] rounded-[6px] font-semibold text-lg leading-[27px] mb-3 text-white">
          Recomendation
        </div>
        <div className="py-5 pl-[27px] pr-[79px] bg-[#F5F5F5] min-h-[300px]">
          {loadingAiData ? (
            <Spinner />
          ) : (
            <p className="text-sm leading-[30px] font-medium">{data}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecomendationModal;
