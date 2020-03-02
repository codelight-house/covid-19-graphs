import * as path from "path";

import * as express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { CovidDataProvider, ITimeSeriesParams } from "./CovidDataProvider";
import {typeDefs} from "./graphql-type-defs"

const port = process.env.PORT || 4000;
const frontendAssetsPath = process.env.FRONTEND_ASSETS_PATH || path.join(__dirname, '../../frontend/build' );

const covidDataProvider = new CovidDataProvider();
covidDataProvider.on("update", async () => {
  const stats = await covidDataProvider.getStats();
  console.log(`Data collection updated`, stats);
});

function debug(parent, params, context, info) {
  console.log('----- parent: ', parent);
  console.log('----- params: ', params);
  // console.log('----- context: ', context);
  // console.log('----- info: ', info);
}

const resolvers = {
  DataRow: {
    // history: (parent, params, context, info) => {
    //   let limit = params.limit || 10;
    //   let skip = params.skip || 0;

    //   return parent.history.slice(skip, skip + limit);;
    // },
  },
  Query: {
    dataRows: async (parent, params: ITimeSeriesParams, context, info) => {
      return await covidDataProvider.getTimeSeriesCollection(params);
    },
    availableDates: async () => {
      return await covidDataProvider.getAvailableDates();
    },
    availableRegionNames: async () => {
      return await covidDataProvider.getAvailableRegionNames();
    },
    stats: async () => {
      return await covidDataProvider.getStats();
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  playground: true,
  introspection: true,
  // mocks: {},
  // mockEntireSchema: false,
  // tracing: true,
});

const app = express();
app.use(server.getMiddleware({path: "/graphql"}));
app.use(express.static(frontendAssetsPath));

app.listen(port, async () => {
  console.log(`🚀  Server ready at port: ${port}`);
});
