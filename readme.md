# COVID-19-graphs

COVID-19 growth animations and graphs: https://covid-19-graphs.herokuapp.com/

Data sources: 
* covid-19 data
  * https://github.com/CSSEGISandData/COVID-19
* maps
  * http://geojson.xyz/
  * https://geojson-maps.ash.ms/

## Development

```
yarn install
yarn bootstrap
yarn dev
```

http://localhost:3000

In development mode all data is fetched from local static csv files (old COVID data source). When needed to fetch current datafiles you should set production mode: `NODE_ENV=production yarn dev`

## Deployment

```
yarn build
yarn start
```

http://localhost:4000

Default port 4000 can be configured via `PORT` environment value:
```
PORT=9999 yarn start
``` 

## TODO

* Graphql API
  * fetch external data - done
  * transform external data - done
  * serve data as GraphQl API - done
  * time series API
    * aggregate by country
    * filter by date - done
  * report API
    * calculate cumulated confirmed, deaths, recovered - done
    * serve calculated data
     
* React frontend with animated graphs
  * react map library - done
  * fetch map source
  * match map and covid data

* Add unit tests 
