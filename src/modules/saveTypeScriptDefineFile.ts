import { ImportDeclaration, Project } from 'ts-morph';

import { IOptions } from '../interfaces/IOptions';
import { travelTopModule } from './travelAllModule';

import { readFile, writeFile } from 'fs/promises'

export async function replaceInFile(filePath: string, searchValue: string | RegExp, replaceValue: string) {
  try {
    // 读取文件
    let content = await readFile(filePath, 'utf-8')

    // 替换内容
    content = content.replace(searchValue, replaceValue)

    // 写回文件
    await writeFile(filePath, content, 'utf-8')

    console.log(`✅ 替换 ${searchValue} -> ${replaceValue} 完成: ${filePath}`)
  } catch (err) {
    console.error('❌ 替换失败:', err)
  }
}

export async function saveTypeScriptDefineRuntimeFile(pbtsFilePath: string, options: IOptions) {
  
}

/**
 * 去除protobuf-cli生成的d.ts文件中的冗余的class模块
 * @param {String} pbtsFilePath 生成的d.ts定义文件的路径
 * @param {Object} options 用户传入的自定义配置选项
 */
export async function saveTypeScriptDefineFile(pbtsFilePath: string, options: IOptions) {
  const project = new Project();
  project.addSourceFileAtPath(pbtsFilePath);
  const file = project.getSourceFileOrThrow(pbtsFilePath);
  const modules = file.getModules();
  // 去掉生成的import
  file.getImportDeclarations().forEach(i => i.remove());

  // 对于importString的处理
  file.getImportStringLiterals().forEach(i => {
    const p = i.getParent()?.getParent() as ImportDeclaration;
    p.remove();
  });

  travelTopModule(modules, async module => {
    // 去掉生成的class
    const classes = module.getClasses();
    classes.forEach(c => c.remove());

    // 去掉生成的rpc-type
    const typeAliases = module.getTypeAliases();
    typeAliases.forEach(t => t.remove());

    const subModules = module.getModules();
    subModules.forEach(m => {
      const kind = m.getDeclarationKind();
      if (kind === 'namespace') {
        console.log("This is a namespace:", m.getName());
        m.remove();
      }
    });

    if (!options.optional) {
      module.getInterfaces().forEach(item => {
        const structure = item.getStructure();
        structure.properties?.forEach(property => {
          property.hasQuestionToken = false;
          if (typeof property.type === 'string') {
            property.type = property.type.replace(/^\((\S*)\|null\)$/, '$1');
          }
        });
        item.set(structure);
      });
    }
  });
  project.saveSync();
}
