import * as dotenv from 'dotenv';
import * as _ from 'lodash';
import * as path from 'path';
import loadDotenv from './dotenv';

loadDotenv();

const extractArrayValues = env => {
  if (!env) {
    return null;
  }

  return env.replace(/ /g, '').split(',');
};

const ROOT: string = path.resolve(__dirname, '../');

export const config = {
  elastic: {
    host: _.defaultTo(process.env.ELASTIC_HOST, 'localhost'),
    port: _.defaultTo(process.env.ELASTIC_PORT, 9200),
    protocol: _.defaultTo(
      process.env.ELASTIC_PROTOCOL,
      'HTTP'
    ).toLocaleLowerCase(),
  },
  server: {
    host: _.defaultTo(process.env.HOST, 'localhost'),
    port: _.defaultTo(parseInt(process.env.PORT, 10), 3000),
    root: ROOT,
  },
  manualFilterAccounts: _.defaultTo(
    extractArrayValues(process.env.MANUAL_FILTER_ACCOUNTS),
    ['p.twitter', 'p.steemit']
  ),
};
