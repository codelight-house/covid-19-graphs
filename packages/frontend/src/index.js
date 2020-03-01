import { ApolloProvider } from "react-apollo";
import ApolloClient from "apollo-boost";
import React from "react";
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

const COVID_DATA_ROWS = gql`
  query {
    dataRows(limit: 400) {
      id
      region
      subRegion
      confirmed
      deaths
      recovered
    }
  }
`;

function CowidRow(props) {
  return (
    <div>
      <div>region: <strong>{props.dataRow.region}{props.dataRow.subRegion ? ` / ${props.dataRow.subRegion}` : null}</strong></div>
    </div>
  )
}

function CovidGraph() {
  const { loading, error, data } = useQuery(COVID_DATA_ROWS);

  if (loading || !data) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

  // return data.dataRows.map((dataRow) => (<CowidRow key={dataRow.id} dataRow={dataRow} />));
  // data.dataRows.forEach((dataRow) => {
  //   if (!countriesMap[dataRow.region]) {
  //     console.log(`region not found in countriesMap: ${dataRow.region}`);
  //   }
  // });
  return (
    <div style={{ width: "500px", height: "500px" }}>

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
        data={data.dataRows}
        features={worldCountries.features}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        colors="reds"
        // colors={(value,foo,bar)=>{
        //   console.log(value,foo,bar)
        //   return 100
        // }}
        domain={[1,500]}
        unknownColor="#EFE"
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
    </div>)
}

// const data = [
//   {
//     "id": "KOR",
//     "foo": 50000
//   },
//   {
//     "id": "POL",
//     "foo": 10000,
//   },
// ];

const App = () => (
  <ApolloProvider client={client}>
    <CovidGraph />
  </ApolloProvider>
);

render(<App />, document.getElementById("root"));
