import rightArrRed from "../assets/arrow-right-red.svg";
import TimeLineItem from "./TimeLineItem";
import truckIcon from "../assets/truck-fast.svg";
import routeIcon from "../assets/route-icon.svg";
import boxIcon from "../assets/box.svg";
import map from "../assets/map.png";
import {ApolloClient, InMemoryCache, gql} from "@apollo/client";
import { useState, useEffect } from 'react';

function DetailsModal() {

  const [sensorData, setSensorData] = useState([]);

  const queryUrl = "https://api.studio.thegraph.com/query/57950/iotbase/version/latest";

  const client = new ApolloClient({
    uri: queryUrl,
    cache: new InMemoryCache()
  });

  const getSensorData = gql`
  query{
    updates{
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
        const {data} = await client.query({query: getSensorData});

        console.log(data)

        setSensorData(data.updates);
        console.log(data.updates)

      } catch (error) {
        console.log("unable to fetch data",error)
      }
    } 

    fetchSensorData();

    return() => {}

  }, [client, getSensorData]);

  return (
    <div className="absolute inset-0 flex justify-center text-white  pt-[120px] bg-white bg-opacity-65 backdrop-blur-sm">
      <div className="bg-white rounded-[5px] p-10 w-[856px] h-fit">
        <div className="bg-purpleGradient rounded-[6px] py-[27px] px-[35px]">
          <h5 className="font-semibold text-xs leading-[18px] mb-2">
            Current Location
          </h5>
          <h5 className="font-semibold text-xs leading-[18px] mb-3">
            Jos Nigeria,
          </h5>
          <div className="bg-[#5F77F5] mb-3 w-full py-[8.5px] font-bold text-base leading-[21px] flex justify-center gap-x-[18px]">
            <h2><small className="text-light">Humidity</small>, {sensorData && sensorData.length > 0 && sensorData[sensorData.length -1]?.humidity / 1000} <sup>0</sup></h2>
            <h2><small className="text-light">Temperature</small>, {sensorData && sensorData.length > 0 && sensorData[sensorData.length -1]?.temperature / 1000} <sup>0</sup></h2>
          </div>
          <h3 className="font-bold text-base leading-[24px] mb-[6px]">
            B5799585GDKE8
          </h3>
          <h6 className="text-[10px] leading-[15px]">Truck 206, 89 crates</h6>
        </div>
        <div className="flex items-center justify-between w-full mt-[25px]">
          <h2 className="font-semibold text-xl leading-[30px] text-[#121212]">
            History
          </h2>
          <button className="flex items-center gap-x-[9px] font-semibold text-sm leading-[21px] text-[#C8482C]">
            Details <img src={rightArrRed} alt="" />
          </button>
        </div>
        <div className="grid grid-cols-[1fr_1fr] mt-5 gap-x-[100px] text-[#121212]">
          <ul className="pl-[30px]">
            <TimeLineItem
              mini={true}
              title="In process-recipient city"
              subTitle="Berlin,germany"
              time="11:45 PM"
              icon={truckIcon}
              current={true}
            />
            <TimeLineItem
              mini={true}
              title="Humidity 60'  - Temperature 48'"
              subTitle="Jakarta,indonesia"
              time="11:45 PM"
              icon={routeIcon}
            />
            <TimeLineItem
              mini={true}
              title="Sent from majalengka"
              subTitle="Majalengka,indonesia"
              time="11:45 PM"
              icon={boxIcon}
              lastItem={true}
            />
          </ul>
          <img src={map} alt="" />
        </div>
      </div>
    </div>
  );
}

export default DetailsModal;
