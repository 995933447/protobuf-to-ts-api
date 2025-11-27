/* eslint-disable */
import request from "axios";
import api from './echo.d';

export class EchoService {

  /** no comment **/
  static async getExampleData(req: api.echo.IGetExampleDataReq): Promise<api.echo.IGetExampleDataRsp> {
    return await request.get('/v1/example/data', { params: req })
  };

  /** no comment **/
  static async postExampleData(req: api.echo.IPostExampleDataReq): Promise<api.echo.IPostExampleDataRsp> {
    return await request.post('/postExampleData', req)
  };

};
