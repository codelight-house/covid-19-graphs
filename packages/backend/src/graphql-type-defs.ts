import { gql } from "apollo-server";

export const typeDefs = gql`
  type DataRow {
    id: String!
    region: String!
    subregion: String
    lat: Float
    lng: Float
    confirmed: Int
    deaths: Int
    recovered: Int
    history(skip: Int, limit: Int): [HistoryRow!]
  }

  input DataRowFilter {
    id: String
    region: String
    subregion: String
    date: String
  }

  type HistoryRow {
    date: String!
    confirmed: Int
    deaths: Int
    recovered: Int
  }

  type Query {
    dataRows(skip: Int, limit: Int, filter: DataRowFilter): [DataRow]
    # shippings: [Shipping!]!
    # shippingByType(shippingType: ShippingType): Shipping
  }
`;
