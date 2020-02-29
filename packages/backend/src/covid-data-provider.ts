import * as path from "path";
import * as fs from "fs";

import * as csv from "csv-parser";
import {DateTime} from "luxon";
import * as _ from "lodash";
import fetch from "node-fetch";

const REGION_FIELD = "Country/Region";
const SUBREGION_FIELD = "Province/State";

export interface IHistoryRow {
  date: string;
  confirmed?: number;
  deaths?: number;
  recovered?: number;
}

export interface IDataRow {
  id: string;
  region: string;
  subRegion: string;
  lat: number;
  lng: number;
  history: IHistoryRow[];
  confirmed?: number;
  deaths?: number;
  recovered?: number;
}

export interface IDenormalizedDataRow {
  id: string;
  date: string;
  region: string;
  subRegion: string;
  lat: number;
  lng: number;
  confirmed?: number;
  deaths?: number;
  recovered?: number;
}

export interface IRegion {
  id: string;
  name: string;
  code?: string;
  subregions?: IRegion[]
}

export type ValueFieldName = "confirmed" | "deaths" | "recovered";
export type DataCollection = IDataRow[];
export type DenormalizedDataCollection = IDenormalizedDataRow[];
export type RegionCollection = IRegion[];

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

function transformCsvRows(rows: any[], valueFieldName: ValueFieldName): IDataRow[] {
  return rows.map((dataRow) => {
    const region = dataRow[REGION_FIELD];
    const subRegion = dataRow[SUBREGION_FIELD];
    const history = getHistoryFromRow(dataRow, valueFieldName);
    const lastHistoryItem = _.last(history);
    return {
      id: `${region}/${subRegion}`,
      region,
      subRegion,
      lat: parseFloat(dataRow.Lat),
      lng: parseFloat(dataRow.Long),
      history,
      [valueFieldName]: lastHistoryItem ? lastHistoryItem[valueFieldName] : undefined,
    }
  })
}

function mergeCollections (collections: DataCollection[]): DataCollection {
  if (collections.length < 2) {
    throw new Error(`At least 2 collections required`);
  }
  let result: DataCollection = collections[0];
  for (let collectionIndex = 1; collectionIndex < collections.length; collectionIndex++) {
    result = result.map(dataRow1 => {
      const newRow1 = _.omit(dataRow1, ["history"]);
      const id = dataRow1.id;
      const dataRow2 = _.find(collections[collectionIndex], { id });
      if (!dataRow2) {
        throw new Error(`Unable to find id = ${id}`);
      }
      const newRow2 = _.omit(dataRow2, ["history"]);
      const mergedHistory = _.map(_.merge({}, _.keyBy(dataRow1.history, "date"), _.keyBy(dataRow2.history, "date")), (historyRow) => historyRow);
      const result: Partial<IDataRow> = _.merge({}, newRow1, newRow2);
      result.history = mergedHistory;
      return result as IDataRow;
    });
  }
  return result;
};

export async function getDataCollection(): Promise<DataCollection> {
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

  return _.sortBy(mergeCollections([transformedConfirmed, transformedDeaths, transformedRecovered]), "id" );
}

export async function getDenormalizedDataCollection(collection: DataCollection): Promise<DenormalizedDataCollection> {
  const result: DenormalizedDataCollection = [];
  collection.forEach(dataRow => {
    const rowWithoutHistory = _.omit(dataRow, "history");
    dataRow.history.forEach(historyItem => {
      const newDenormalizedRow: Partial<IDenormalizedDataRow> = _.merge({}, rowWithoutHistory, historyItem);
      newDenormalizedRow.id = `${newDenormalizedRow.region}/${newDenormalizedRow.subRegion}/${historyItem.date}`;
      result.push(newDenormalizedRow as IDenormalizedDataRow);
    });
  });
  return result;
}

export async function getRegions(collection: DataCollection): Promise<RegionCollection> {
  throw new Error("Not implemented");
}
