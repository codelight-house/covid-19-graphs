import { gql } from "apollo-server";

export const typeDefs = gql`
  type DataRow {
    id: String!
    date: String!
    region: String!
    subRegion: String
    lat: Float
    lng: Float
    confirmed: Int
    deaths: Int
    recovered: Int
    # history(skip: Int, limit: Int): [HistoryRow!]
  }

  input DataRowFilter {
    id: String
    region: String
    subRegion: String
    date: String
  }

  # type HistoryRow {
  #   date: String!
  #   confirmed: Int
  #   deaths: Int
  #   recovered: Int
  # }

  type Stats {
    timeSeriesCount: Int!
    regionCount: Int!
    datesCount: Int!
    firstDate: String
    lastDate: String
    lastCumulative: CumulativeResult
  }

  type CumulativeResult {
    confirmed: Int!
    deaths: Int!
    recovered: Int!
  }

  type Query {
    dataRows(skip: Int, limit: Int, filter: DataRowFilter): [DataRow]
    availableDates: [String!]!
    availableRegionNames: [String!]!
    stats: Stats!
  }
`;
