import * as bodybuilder from 'bodybuilder';
import { Request, Response } from 'express';
import elastic from '../lib/elastic';

export class PlatformTransactionByAccountController {
  public getActions = async (req: Request, res: Response) => {
    const { body } = req;

    if (!body.platform) {
      res.status(400).send('Platform is required');
      return;
    }

    if (Object.keys(body.platform).length !== 1) {
      res.status(400).send('Platform can contain only one platform key-id');
      return;
    }

    if (!Object.keys(body.platform).map(key => body.platform[key].id)[0]) {
      res.status(400).send('id in platform object is required');
      return;
    }

    const query: any = this.createQuery(body);

    try {
      const elasticResponse = await elastic.search(query);

      const data = elasticResponse.hits.hits.map(item => {
        const source: any = item._source;
        source.act.data = JSON.parse(source.act.data);

        return {
          block_num: source.block_num,
          block_time: source.block_time,
          action_trace: source,
        };
      });

      const result = {
        actions: data,
        total: elasticResponse.hits.total,
      };

      res.send(result);
    } catch (error) {
      res.status(500).send(error);
    }
  };

  private createQuery({ platform, account_name, pos = -1, offset = -20 }) {
    const order = offset >= 0 ? 'asc' : 'desc';
    const size = Math.abs(offset);

    const platformId = Object.keys(platform)[0];
    const userId: any = Object.keys(platform).map(key => platform[key].id)[0];

    const query = bodybuilder()
      .size(size)
      .sort('block_time', order)
      .query('bool', q => {
        if (pos !== -1 && offset < 0) {
          q = q.query('nested', { path: 'receipt' }, q => {
            return q.query('range', 'receipt.global_sequence', { lt: pos });
          });
        }

        if (pos !== -1 && offset > 0) {
          q = q.query('nested', { path: 'receipt' }, q => {
            return q.query('range', 'receipt.global_sequence', { gt: pos });
          });
        }

        q = q.query('bool', q => {
          q = q.orQuery('nested', { path: 'act' }, q => {
            return q
              .query('match_phrase', 'act.data', `"to": ${userId}`)
              .query('match', 'act.name', 'transfersoc')
              .query('match', 'act.account', platformId);
          });

          if (account_name) {
            q = q.orQuery('bool', q => {
              return q
                .query('bool', q => {
                  return q
                    .orQuery('nested', { path: 'act' }, q => {
                      return q
                        .query('match', 'act.name', 'transfer')
                        .query('nested', { path: 'act.authorization' }, q => {
                          return q.query(
                            'match',
                            'act.authorization.actor',
                            platformId
                          );
                        });
                    })
                    .orQuery('nested', { path: 'act' }, q => {
                      return q
                        .query('match', 'act.name', 'transfer')
                        .query('nested', { path: 'act.authorization' }, q => {
                          return q.query(
                            'match',
                            'act.authorization.actor',
                            'snax.airdrop'
                          );
                        });
                    });
                })
                .query('nested', { path: 'receipt' }, q => {
                  return q.query('match', 'receipt.receiver', account_name);
                });
            });
          }
          return q;
        });

        return q;
      });

    return {
      index: 'action_traces',
      body: query.build(),
    };
  }
}
