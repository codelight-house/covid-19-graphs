import * as path from "path";

import * as express from 'express';
import { ApolloServer } from 'apollo-server-express';
// import deliveryMethods from './deliveryMethods';
import { getDataCollection, DataCollection } from "./covid-data-provider";
import {typeDefs} from "./graphql-type-defs"

const port = process.env.PORT || 4000;
const frontendAssetsPath = process.env.FRONTEND_ASSETS_PATH || path.join(__dirname, '../../frontend/build' );

let all: DataCollection

function debug(parent, params, context, info) {
  console.log('----- parent: ', parent);
  console.log('----- params: ', params);
  // console.log('----- context: ', context);
  // console.log('----- info: ', info);
}

interface IDataRowsParams {
  limit: number;
  skip: number;
  filter?: {
    id?: string;
    region?: string;
    subregion?: string;
    date?: string;
  }
}

const resolvers = {
  // ShippingItem: {
  //   __resolveType(entity, context, info){
  //     if(entity.firstName){
  //       return 'PersonShippingItem';
  //     } else {
  //       return 'ParcelShippingItem';
  //     }
  //   },
  // },
  DataRow: {
    history: (parent, params, context, info) => {
      // debug(parent, params, context, info)
      let limit = params.limit || 10;
      let skip = params.skip || 0;

      return parent.history.slice(skip, skip + limit);;
    },
  },
  Query: {
    dataRows: (parent, params: IDataRowsParams, context, info) => {
      let limit = params.limit || 999;
      let skip = params.skip || 0;
      let filtered: DataCollection;
      if (params.filter) {
        // todo
      }
      const page = all.slice(skip, skip + limit);
      return page;
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
  all = await getDataCollection();
  console.log(`Data collection fetched: ${all.length} rows`);
});
