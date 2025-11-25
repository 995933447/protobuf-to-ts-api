import fs from "fs";
import path from "path";

import protobuf from "protobufjs";

import { IOptions } from "../interfaces/IOptions";
import { RequestMethods } from "../interfaces/RequestMethods";
import { getProtoOption } from "../utils/getProtoOption";

const getLinePerfix = (requestModule: string, tsDefineFilename: string) =>
  `/* eslint-disable */
import request from "${requestModule}";
import api from './${tsDefineFilename.replace(".ts", "")}';
`;

const getLine = (serviceName: string, apiMethods: ApiMethod[]) => {
  let content = `
export class ${serviceName}Service {`;

  for (const apiMethod of apiMethods) {
    let requestType = `I${apiMethod.requestType}`;
    let responseType = `I${apiMethod.responseType}`;
    if (apiMethod.namespace) {
      requestType = `${apiMethod.namespace}.${requestType}`;
      responseType = `${apiMethod.namespace}.${responseType}`;
    }
    content += `

  ${apiMethod.comment ? `/** ${apiMethod.comment} */` : "/** no comment **/"}
  static async ${
    apiMethod.methodName
  }(req: api.${requestType}): Promise<api.${responseType}> {
    return await request.${apiMethod.httpMethod}('${apiMethod.urlPath}', ${
      apiMethod.httpMethod === "get" ? "{ params: req }" : "req"
    })
  };`;
  }

  content += `

};
`;
  return content;
};
/**
 * 生成前端api请求文件
 * @param {String} pbtsFilePath 生成的d.ts定义文件的路径
 * @param {Object} options 用户传入的自定义配置选项
 */
export async function saveApiFile(
  protoFilePath: string,
  pbtsFilePath: string,
  options: IOptions
): Promise<ApiMethod[]> {
  const { requestModule, baseUrl } = options;
  // 获取当前d.ts文件的目录名称和文件名称
  const tsDefineDirname = path.dirname(pbtsFilePath);
  const tsDefineFilename = path.basename(pbtsFilePath);
  let apiline = "";
  apiline += getLinePerfix(requestModule, tsDefineFilename);

  const apiMethods = await parseProtoApiMethods(protoFilePath, options);

  const mapServiceToMethods = new Map<string, ApiMethod[]>();
  for (const apiMethod of apiMethods) {
    let serviceName = apiMethod.serviceName || "";
    if (apiMethod.namespace) {
      if (apiMethod.namespace.toLowerCase() != serviceName.toLowerCase()) {
        serviceName =
          apiMethod.namespace +
          serviceName.slice(0, 1).toUpperCase() +
          serviceName.slice(1);
      }
      mapServiceToMethods.get(serviceName) ||
        mapServiceToMethods.set(serviceName, []);
      mapServiceToMethods.get(serviceName)?.push(apiMethod);
    }
  }

  for (const [serviceName, apiMethods] of mapServiceToMethods) {
    apiline += getLine(serviceName, apiMethods);
  }

  await fs.promises.writeFile(
    path.resolve(tsDefineDirname, tsDefineFilename.replace(".d.ts", ".ts")),
    apiline
  );
  return apiMethods;
}

export class ApiMethod {
  serviceName: string | undefined;
  methodName: string | undefined;
  requestType: string | undefined;
  responseType: string | undefined;
  httpMethod: string | undefined;
  urlPath: string | undefined;
  noAuth: boolean | undefined;
  namespace: string | undefined;
  comment: string | undefined;
}

/**
 * 解析api方法列表
 * @param {String} pbtsFilePath 生成的d.ts定义文件的路径
 * @param {Object} options 用户传入的自定义配置选项
 */
async function parseProtoApiMethods(
  protoFilePath: string,
  options: IOptions
): Promise<ApiMethod[]> { 
  // 直接读取文件内容（必须手动读）
  const protoSource = fs.readFileSync(protoFilePath, "utf8");

  // 解析proto内容,读取注释和自定义option
  const parsed = protobuf.parse(protoSource, {
    keepCase: true,
    preferTrailingComment: true,
    alternateCommentMode: true,
  });

  const root = parsed.root;
  root.resolveAll();

  const apiMethods: ApiMethod[] = [];
  const traverse = function (
    nested: protobuf.NamespaceBase,
    namespacePath: string
  ) {
    for (const nestedObj of Object.values(nested.nested || {})) {
      if (nestedObj instanceof protobuf.Service) {
        console.log(`Service: ${nestedObj.name}`);

        for (const [methodName, method] of Object.entries(nestedObj.methods)) {
          console.log(`  Method: ${methodName}`);
          console.log(`  Method comment: ${method.comment || ""}`);

          if (
            options.protoOptionTagHttpMethod ||
            options.protoOptionTagHttpPath
          ) {
            if (method.options) {
              for (const [key, value] of Object.entries(method.options)) {
                console.log(`    Option: ${key} = ${JSON.stringify(value)}`);
              }

              let protoOptionMethod = getProtoOption(
                method,
                options.protoOptionTagHttpMethod
              );
              let protoOptionPath = getProtoOption(
                method,
                options.protoOptionTagHttpPath
              );
              if (protoOptionMethod || protoOptionPath) {
                if (!protoOptionMethod) {
                  protoOptionMethod = RequestMethods.post;
                }
                if (!protoOptionPath) {
                  protoOptionPath = `/${methodName}`;
                }
                const apiMethod = new ApiMethod();
                apiMethods.push(apiMethod);
                apiMethod.serviceName = nestedObj.name;
                apiMethod.methodName = methodName;
                apiMethod.requestType = method.requestType;
                apiMethod.responseType = method.responseType;
                apiMethod.namespace = namespacePath || undefined;
                apiMethod.httpMethod = protoOptionMethod.toLowerCase();
                apiMethod.urlPath = options.baseUrl + protoOptionPath;
                apiMethod.comment = method.comment || "";
              }
            }
          } else {
            const apiMethod = new ApiMethod();
            apiMethods.push(apiMethod);
            apiMethod.serviceName = nestedObj.name;
            apiMethod.methodName = methodName;
            apiMethod.requestType = method.requestType;
            apiMethod.responseType = method.responseType;
            apiMethod.namespace = namespacePath || undefined;
            apiMethod.httpMethod = RequestMethods.post;
            apiMethod.urlPath = options.baseUrl + `/${methodName}`;
            apiMethod.comment = method.comment || "";
          }
        }
      }

      if (nestedObj instanceof protobuf.Namespace) {
        const childNamespace = namespacePath
          ? `${namespacePath}.${nestedObj.name}`
          : nestedObj.name;
        traverse(nestedObj, childNamespace);
      }
    }
  };

  traverse(root, "");
  return apiMethods;
}
