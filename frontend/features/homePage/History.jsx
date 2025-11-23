import rightArrRed from "../../assets/arrow-right-red.svg";
import { Button, Timeline } from "flowbite-react";
import truckIcon from "../../assets/truck-fast.svg";
import routeIcon from "../../assets/route-icon.svg";
import boxIcon from "../../assets/box.svg";
import TimeLineItem from "../../components/TimeLineItem";
import { useEffect, useState } from "react";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
function History({ setIsDetailsOpen, setIsRecommendationOpen }) {
  const [sensorData, setSensorData] = useState([]);
  const queryUrl =
    "https://api.studio.thegraph.com/query/57950/iotbase/version/latest";

  const client = new ApolloClient({
    uri: queryUrl,
    cache: new InMemoryCache(),
  });

  const getSensorData = gql`
    query {
      updates {
        id
        sensor
        temperature
        humidity
      }
    }
  `;

  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const { data } = await client.query({ query: getSensorData });

        console.log(data);

        setSensorData(
          data.updates
            .map((update, i) => {
              return {
                ...update,
                time: i * 12,
              };
            })
            .sort((a, b) => a.time - b.time)
        );
        console.log(
          data.updates.map((update, i) => {
            return {
              ...update,
              time: i * 12,
            };
          })
        );
      } catch (error) {
        console.log("unable to fetch data", error);
      }
    };

    fetchSensorData();

    return () => {};
  }, [client, getSensorData]);
  return (
    <div className="py-[36px]">
      <div className="flex items-center justify-between w-full mb-[30px]">
        <h2 className="font-semibold text-xl leading-[30px]">History</h2>
        <button
          className="flex items-center gap-x-[9px] font-semibold text-sm leading-[21px] text-[#121212]"
          onClick={() => setIsDetailsOpen(true)}
        >
          Details <img src={rightArrRed} alt="" />
        </button>
      </div>
      <ul className="pl-[30px]">
        <TimeLineItem
          title="In process-recipient city"
          subTitle="Berlin,germany"
          time="11:45 PM"
          icon={truckIcon}
        />
        <TimeLineItem
          title={`Humidity ${
            sensorData &&
            sensorData.length > 0 &&
            sensorData[sensorData.length - 1]?.humidity / 1000
          }'  - Temperature ${
            sensorData &&
            sensorData.length > 0 &&
            sensorData[sensorData.length - 1]?.temperature / 1000
          }'`}
          subTitle="Jakarta,indonesia"
          time="11:45 PM"
          icon={routeIcon}
        />
        <TimeLineItem
          title="Sent from majalengka"
          subTitle="Majalengka,indonesia"
          time="11:45 PM"
          icon={boxIcon}
          lastItem={true}
        />
      </ul>
    </div>
  );
}

export default History;
