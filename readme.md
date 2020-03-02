# COVID-19-graphs

COVID-19 growth animations and graphs

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


## Configurarion

Enviromental variables:
* `PORT` - backend server port (default: `4000`),
* `RELOAD_INTERVAL` - autoreload data interval, can be used `h`, `s`, `m` units (default: `1h`),

## TODO

* Graphql API
  * time series API
    * aggregate by country
     
* React frontend with animated graphs
  * fetch map source
  * match map and covid data

* Add unit tests 
