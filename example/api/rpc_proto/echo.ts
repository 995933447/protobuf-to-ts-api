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

  /** no comment **/
  static async deleteExampleData(req: api.echo.IDeleteExampleDataReq): Promise<api.echo.IDeleteExampleDataRsp> {
    return await request.delete('/v1/example/data', req)
  };

};
