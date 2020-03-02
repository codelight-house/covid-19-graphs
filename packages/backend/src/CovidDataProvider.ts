import * as path from "path";
import * as fs from "fs";
import { EventEmitter } from "events";

import * as csv from "csv-parser";
import {DateTime} from "luxon";
import * as _ from "lodash";
import fetch from "node-fetch";
import * as parseDuration from "parse-duration";

const REGION_FIELD = "Country/Region";
const SUBREGION_FIELD = "Province/State";
const RELOAD_INTERVAL = process.env.RELOAD_INTERVAL || "1h";

// @TODO use lokijs to manipualte on timeseries data

export interface IHistoryRow {
  date: string;
  confirmed?: number;
  deaths?: number;
  recovered?: number;
}

export interface ITimeSeriesRow {
  id: string;
  date: string;
  region: string;
  subRegion: string;
  lat: number;
  lng: number;
  // history: IHistoryRow[];
  confirmed?: number;
  deaths?: number;
  recovered?: number;
}

export interface ITimeSeriesParams {
  limit?: number;
  skip?: number;
  filter?: {
    id?: string;
    region?: string;
    subregion?: string;
    date?: string;
  }
}

export interface IRegion {
  id: string;
  name: string;
  code?: string;
  subregions?: IRegion[]
}

export type ValueFieldName = "confirmed" | "deaths" | "recovered";
export type DataCollection = ITimeSeriesRow[];
export type RegionCollection = IRegion[];

/**
 * parse input stream CSV and return object with fieldNames equals to the header values
 */
function readCsv(inputStream: NodeJS.ReadableStream): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const result: any[] = [];

    inputStream.pipe(csv())
      .on('data', (data) => result.push(data))
      .on('end', () => {
        resolve(result);
      })
      .on('error', reject);
  });
}

/**
 * get from original csv row all column values with date format
 */
function getHistoryFromRow(dataRow: any, valueField: ValueFieldName): IHistoryRow[] {
  const history = Object.keys(dataRow)
    .map(key => {
      const date = DateTime.fromFormat(key, "M/d/yy").toISODate();
      return {
        date,
        [valueField]: date ? parseInt(dataRow[key]) : null,
      };
    })
    .filter(historyRow => (historyRow.date != null));

  return _.sortBy(history, ["date"]);
};

/**
 * parse array of parsed csv rows to array of time series rows
 */
function transformCsvRows(rows: any[], valueFieldName: ValueFieldName): DataCollection {
  const result: DataCollection = [];
  rows.forEach((dataRow) => {
    const region = dataRow[REGION_FIELD];
    const subRegion = dataRow[SUBREGION_FIELD];
    const history = getHistoryFromRow(dataRow, valueFieldName);
    history.forEach(historyRow => {
      const timeSeriesRow: ITimeSeriesRow = {
        id: `${region}/${subRegion}/${historyRow.date}`,
        date: historyRow.date,
        region,
        subRegion,
        lat: parseFloat(dataRow.Lat),
        lng: parseFloat(dataRow.Long),
        [valueFieldName]: historyRow[valueFieldName],
      }
      result.push(timeSeriesRow);
    })
  })

  return result;
}

function mergeCollections (collections: DataCollection[]): DataCollection {
  if (collections.length < 2) {
    throw new Error(`At least 2 collections required`);
  }
  let result: DataCollection = collections[0];
  for (let collectionIndex = 1; collectionIndex < collections.length; collectionIndex++) {
    result = result.map(dataRow1 => {
      const newRow1 = _.clone(dataRow1);
      const id = dataRow1.id;
      const dataRow2 = _.find(collections[collectionIndex], { id });
      if (!dataRow2) {
        throw new Error(`Unable to find id = ${id}`);
      }
      const newRow2 = _.clone(dataRow2);
      return _.merge({}, newRow1, newRow2);
    });
  }
  return result;
};

function removeEmptyRows(collection: DataCollection): DataCollection {
  return collection.filter(dataRow => {
    return (dataRow.confirmed || dataRow.deaths || dataRow.recovered);
  });
}

async function getDataCollection(): Promise<DataCollection> {
  // data source: https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_time_series
  const CONFIRMED_PATH = process.env.CONFIRMED_PATH || path.join(__dirname, "../data/time_series_19-covid-Confirmed.csv")
  const DEATHS_PATH = process.env.DEATHS_PATH || path.join(__dirname, "../data/time_series_19-covid-Deaths.csv")
  const RECOVERED_PATH = process.env.RECOVERED_PATH || path.join(__dirname, "../data/time_series_19-covid-Recovered.csv")

  const CONFIRMED_URL = process.env.CONFIRMED_URL || "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv"
  const DEATHS_URL = process.env.DEATHS_URL || "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv"
  const RECOVERED_URL = process.env.RECOVERED_URL || "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv"

  let confirmedStream: NodeJS.ReadableStream;
  let deathsStream: NodeJS.ReadableStream;
  let recoveredStream: NodeJS.ReadableStream;
  if (process.env.NODE_ENV === "production") {
    confirmedStream = (await fetch(CONFIRMED_URL)).body
    deathsStream = (await fetch(DEATHS_URL)).body
    recoveredStream = (await fetch(RECOVERED_URL)).body
  } else {
    confirmedStream = fs.createReadStream(CONFIRMED_PATH)
    deathsStream = fs.createReadStream(DEATHS_PATH)
    recoveredStream = fs.createReadStream(RECOVERED_PATH)
  }

  const [ confirmed, deaths, recovered ] = await Promise.all([
    readCsv( confirmedStream ),
    readCsv( deathsStream ),
    readCsv( recoveredStream ),
  ])

  const transformedConfirmed = transformCsvRows(confirmed, "confirmed");
  const transformedDeaths = transformCsvRows(deaths, "deaths");
  const transformedRecovered = transformCsvRows(recovered, "recovered");
  const mergedCollections = mergeCollections([transformedConfirmed, transformedDeaths, transformedRecovered]);

  return _.sortBy(removeEmptyRows(mergedCollections), "id" );
}

async function getAvailableDates(collection: DataCollection): Promise<string[]> {
  const dates: any = {};
  collection.forEach((rowData, index) => {
    dates[rowData.date] = null;
  });
  return Object.keys(dates).sort();
}

async function getAvailableRegionNames(collection: DataCollection): Promise<string[]> {
  const dates: any = {};
  collection.forEach((rowData, index) => {
    dates[rowData.region] = null;
  });
  return Object.keys(dates).sort();
}

export async function getRegions(collection: DataCollection): Promise<RegionCollection> {
  throw new Error("Not implemented");
}

interface ICumulativeResult {
  confirmed: number;
  deaths: number;
  recovered: number;
}

export class CovidDataProvider extends EventEmitter {
  private fullDataCollection: DataCollection = [];
  private availableDates: string[] = [];
  private availableRegionNames: string[] = [];
  private stats: any = {};

  constructor () {
    super();

    this.loadData().catch(error => console.error);
    const reloadInterval = parseDuration(RELOAD_INTERVAL);
    setInterval(() => {
      this.loadData().catch(error => console.error);
    }, reloadInterval);
  }

  private async loadData() {
    console.log((new Date()).toISOString(), 'data loading started');
    this.fullDataCollection = await getDataCollection();
    this.availableDates = await getAvailableDates(this.fullDataCollection);
    this.availableRegionNames = await getAvailableRegionNames(this.fullDataCollection);
    this.stats = await this.calculateStats();
    console.log((new Date()).toISOString(), 'data loading finished');
    this.emit('update');
  }

  private async calculateStats() {
    const lastDate = await this.getLastDate();
    const lastCumulative = lastDate ? await this.getCumulativeCount(
      await this.getTimeSeriesCollection({
        filter: { date: lastDate }
      })
    ) : {};
    const result = {
      timeSeriesCount: this.fullDataCollection.length,
      regionCount: this.availableRegionNames.length,
      datesCount: this.availableDates.length,
      firstDate: await this.getFirstDate(),
      lastDate: await this.getLastDate(),
      lastCumulative,
    }
    return result;
  }

  private async pageAndFilter(collection: DataCollection, params: ITimeSeriesParams): Promise<DataCollection> {
    let limit = Math.max(0, params.limit || 1000 );
    let skip = Math.max(0, params.skip || 0);
    const filter: any = {};
    if (params.filter) {
      Object.assign(filter, params.filter);
    }
    const currentDataRows = _.filter(collection, filter);
    const page = currentDataRows.slice(skip, skip + limit);
    return page;
  }

  public async getTimeSeriesCollection(params: ITimeSeriesParams): Promise<DataCollection> {
    return this.pageAndFilter(this.fullDataCollection, params);
  }

  public async getAvailableDates(): Promise<string[]> {
    return this.availableDates;
  }

  public async getAvailableRegionNames(): Promise<string[]> {
    return this.availableRegionNames;
  }

  public async getLastDate(): Promise<string|null> {
    const last = _.last(this.availableDates);
    return last ? last : null;
  }

  public async getFirstDate(): Promise<string|null> {
    const first = _.first(this.availableDates);
    return first ? first : null;
  }

  private async getCumulativeCount(collection: DataCollection) {
    return _.reduce<ITimeSeriesRow, ICumulativeResult>(collection, (prevValue, dataRow, all) => {
      return {
        confirmed: prevValue.confirmed + (dataRow.confirmed ? dataRow.confirmed : 0),
        deaths: prevValue.deaths + (dataRow.deaths ? dataRow.deaths : 0),
        recovered: prevValue.recovered + (dataRow.recovered ? dataRow.recovered : 0),
      };
    }, {confirmed: 0, deaths: 0, recovered: 0});
  }

  public async getStats() {
    return this.stats;
  }
}
