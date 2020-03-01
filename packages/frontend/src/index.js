import { ApolloProvider } from "react-apollo";
import ApolloClient from "apollo-boost";
import React, {useState} from "react";
import { render } from "react-dom";
import {
  useQuery,
} from "@apollo/react-hooks";
import { gql } from "apollo-boost";
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ResponsiveChoropleth } from '@nivo/geo'
// import * as fuzzy from "fuzzy";
// import worldCountries from "./world_countries-v2.json";
import worldCountries from "./world_countries-from-nivo.json";

const countriesMap = {};
worldCountries.features.forEach(feature => {
  countriesMap[feature.properties.name] = feature.id;
})

// console.log(countriesMap);

const cache = new InMemoryCache({
});

const client = new ApolloClient({
  uri: "/graphql",
  cache,
});

// const COVID_DATA_ROWS = gql`
//   query timeSeriesByDate($date: String!) {
//     dataRows(limit: 999, filter: {
//       date: $date
//     }) {
//       id
//       date
//       region
//       subRegion
//       confirmed
//       deaths
//       recovered
//     }
//   }
// `;

const COVID_ALL_DATA_ROWS = gql`
  query {
    dataRows(limit: 10000) {
      id
      date
      region
      subRegion
      confirmed
      deaths
      recovered
    }
  }
`;

const COVID_AVAILABLE_DATES = gql`
  query {
    availableDates
  }
`;

const CovidAnimationController = () => {
  const { loading, error, data } = useQuery(COVID_AVAILABLE_DATES);
  const [ currentDate, setCurrentDate ] = useState(null);
  const [ isAnimationActive, setAnimationActive ] = useState(true);

  if (loading || !data) {
    return <p>Loading...</p>;
  }
  if (error) {
    return <p>Error :(</p>;
  }

  if (!currentDate) {
    setCurrentDate(data.availableDates[0]);
  }

  const selectNextDate = () => {
    const currentIndex = data.availableDates.indexOf(currentDate);
    const nextIndex = (currentIndex + 1) % data.availableDates.length;
    setCurrentDate(data.availableDates[nextIndex]);
  };
  let animationTimeout = null;
  if (isAnimationActive) {
    animationTimeout = setTimeout(selectNextDate, 200);
  }

  const dates = data.availableDates.map(date => {
    return <button key={date} onClick={()=>{
      setCurrentDate(date);
    }} style={{fontWeight: (date === currentDate) ? "bold" : "normal"}}> {date} </button>
  })
  return (
    <>
      <button onClick={() => {
        setAnimationActive(!isAnimationActive);
        if (animationTimeout) {
          clearTimeout(animationTimeout);
        }
      }}>{isAnimationActive ? "pause" : "start"}</button>
      {dates}
      <div style={{ width: "750px", height: "500px" }}>
        <CovidDataLoader date={currentDate}/>
      </div>
    </>
  );
}

function CovidDataLoader(props) {
  const { loading, error, data } = useQuery(COVID_ALL_DATA_ROWS);

  if (loading || !data) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

  const filteredData = data.dataRows.filter((row) => {
    return row.date === props.date;
  });
  // console.log(data.dataRows.length, filteredData.length);
  return (
    <div style={{ width: "750px", height: "500px" }}>
      <CovidGraph data={filteredData}/>
    </div>
  )
}

function CovidGraph(props) {
  return (
    <ResponsiveChoropleth
      match={(feature, dataItem) => {
        return (feature.properties.name === dataItem.region);
        //  {
        //   return true;
        // } else {
        //   console.log(`Not metched: ${feature.properties.name} !== ${dataItem.region}`);
        //   return false;
        // }
      }}
      data={props.data}
      features={worldCountries.features}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      colors="reds"
      // colors={(value,foo,bar)=>{
      //   console.log(value,foo,bar)
      //   return 100
      // }}
      domain={[1, 500]}
      unknownColor="#FFF"
      label="properties.name"
      value="confirmed"
      valueFormat="d"

      projectionTranslation={[0.5, 0.5]}
      projectionRotation={[0, 0, 0]}
      enableGraticule={true}
      graticuleLineColor="#dddddd"
      borderWidth={0.5}
      borderColor="#152538"
      legends={[
        // {
        //   anchor: 'bottom-left',
        //   direction: 'column',
        //   justify: true,
        //   translateX: 20,
        //   translateY: -100,
        //   itemsSpacing: 0,
        //   itemWidth: 94,
        //   itemHeight: 18,
        //   itemDirection: 'left-to-right',
        //   itemTextColor: '#444444',
        //   itemOpacity: 0.85,
        //   symbolSize: 18,
        //   effects: [
        //     {
        //       on: 'hover',
        //       style: {
        //         itemTextColor: '#000000',
        //         itemOpacity: 1
        //       }
        //     }
        //   ]
        // }
      ]}
    />
  )
}

const App = () => (
  <ApolloProvider client={client}>
    <CovidAnimationController />
  </ApolloProvider>
);

render(<App />, document.getElementById("root"));
