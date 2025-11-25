export interface IOptions {
  requestModule: string;
  baseUrl: string;
  folder: string;
  root: string;
  optional: boolean;
  mock: boolean;
  port: string;
  help: string;
  includeProtos: string[]; // 包含的proto文件路径列表
  protoOptionTagHttpMethod: string; // 自定义option中，http method的tag名称
  protoOptionTagHttpPath: string; // 自定义option中，http path的tag名称
}
