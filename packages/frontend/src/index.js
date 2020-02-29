import { ApolloProvider } from "react-apollo";
import ApolloClient from "apollo-boost";
import React from "react";
import { render } from "react-dom";
import {
  useQuery,
} from "@apollo/react-hooks";
import { gql } from "apollo-boost";
import { InMemoryCache } from 'apollo-cache-inmemory';

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

function CowidRow (props) {
  return (
    <div>
      <div>region: <strong>{props.dataRow.region}{props.dataRow.subRegion ? ` / ${props.dataRow.subRegion}` : null}</strong></div>
    </div>
  )
}

function CovidGraph() {
  const { loading, error, data } = useQuery(COVID_DATA_ROWS);

  if (loading|| !data) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

  return data.dataRows.map((dataRow) => (<CowidRow key={dataRow.id} dataRow={dataRow}/>) );
}

const App = () => (
  <ApolloProvider client={client}>
    <CovidGraph />
  </ApolloProvider>
);

render(<App />, document.getElementById("root"));
