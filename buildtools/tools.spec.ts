import { describe, expect, it } from 'vitest';
import {
  extractDefaultGlobalExportName,
  extractDefaultExportTypeName,
  extractDefaultExportValueName,
  extractNotDefaultExportTypeNames,
  extractNotDefaultExportValueNames,
  htmlRegex,
  isLineCommented
} from './tools';

describe('Buildtools: comments and templateUrl', () => {
  it('templateUrl not commented', async () => {
    const code = `class TestComponent {
      templateUrl = './template.html';
    }`;

    const htmlFounds = code.matchAll(htmlRegex);
    let count = 0;
    for (const htmlFound of htmlFounds) {
      const isCommented = isLineCommented(htmlFound, code);
      expect(isCommented).toBeFalsy();
      count++;
    }
    expect(count).toEqual(1);
  });

  it('templateUrl simple comment', async () => {
    const code = `class TestComponent {
      // templateUrl = './template.html';
    }`;

    const htmlFounds = code.matchAll(htmlRegex);
    let count = 0;
    for (const htmlFound of htmlFounds) {
      const isCommented = isLineCommented(htmlFound, code);
      expect(isCommented).toBeTruthy();
      count++;
    }
    expect(count).toEqual(1);
  });

  it('templateUrl simple comment before', async () => {
    const code = `class TestComponent {
      // blablabla
      templateUrl = './template.html';
    }`;

    const htmlFounds = code.matchAll(htmlRegex);
    let count = 0;
    for (const htmlFound of htmlFounds) {
      const isCommented = isLineCommented(htmlFound, code);
      expect(isCommented).toBeFalsy();
      count++;
    }
    expect(count).toEqual(1);
  });

  it('templateUrl simple comment after', async () => {
    const code = `class TestComponent {
      templateUrl = './template.html';
      // blablabla
    }`;

    const htmlFounds = code.matchAll(htmlRegex);
    let count = 0;
    for (const htmlFound of htmlFounds) {
      const isCommented = isLineCommented(htmlFound, code);
      expect(isCommented).toBeFalsy();
      count++;
    }
    expect(count).toEqual(1);
  });

  it('templateUrl block comment', async () => {
    const code = `class TestComponent {
      /* templateUrl = './template.html'; */
    }`;

    const htmlFounds = code.matchAll(htmlRegex);
    let count = 0;
    for (const htmlFound of htmlFounds) {
      const isCommented = isLineCommented(htmlFound, code);
      expect(isCommented).toBeTruthy();
      count++;
    }
    expect(count).toEqual(1);
  });

  it('templateUrl block comment large', async () => {
    const code = `class TestComponent {
      /* 
      templateUrl = './template.html';
      */';
    }`;

    const htmlFounds = code.matchAll(htmlRegex);
    let count = 0;
    for (const htmlFound of htmlFounds) {
      const isCommented = isLineCommented(htmlFound, code);
      expect(isCommented).toBeTruthy();
      count++;
    }
    expect(count).toEqual(1);
  });

  it('templateUrl block comment multiple', async () => {
    const code = `class TestComponent {
      /* blablabla */
      /*
      templateUrl = './template.html'; 
      */';
    }`;

    const htmlFounds = code.matchAll(htmlRegex);
    let count = 0;
    for (const htmlFound of htmlFounds) {
      const isCommented = isLineCommented(htmlFound, code);
      expect(isCommented).toBeTruthy();
      count++;
    }
    expect(count).toEqual(1);
  });

  it('templateUrl block comment before', async () => {
    const code = `class TestComponent {
      /* blablabla */
      templateUrl = './template.html';
    }`;

    const htmlFounds = code.matchAll(htmlRegex);
    let count = 0;
    for (const htmlFound of htmlFounds) {
      const isCommented = isLineCommented(htmlFound, code);
      expect(isCommented).toBeFalsy();
      count++;
    }
    expect(count).toEqual(1);
  });

  it('templateUrl block comment after', async () => {
    const code = `class TestComponent {
      templateUrl = './template.html';
      /* blablabla */
    }`;

    const htmlFounds = code.matchAll(htmlRegex);
    let count = 0;
    for (const htmlFound of htmlFounds) {
      const isCommented = isLineCommented(htmlFound, code);
      expect(isCommented).toBeFalsy();
      count++;
    }
    expect(count).toEqual(1);
  });

  it('templateUrl double definition with comment', async () => {
    const code = `class TestComponent {
      // templateUrl = './template.html';
      templateUrl = './template.html';
    }`;

    const htmlFounds = code.matchAll(htmlRegex);
    let count = 0;
    let expectedValue = true;
    for (const htmlFound of htmlFounds) {
      const isCommented = isLineCommented(htmlFound, code);
      expect(isCommented).toBe(expectedValue);
      expectedValue = false;
      count++;
    }
    expect(count).toEqual(2);
  });

  it('templateUrl complex anarchical example', async () => {
    const code = `class TestComponent {
      // templateUrl = './template.html';
      /* templateUrl 
      */
      templateUrl    =   './template.html';
      templateUrls = 'toto';
      /** 
       * lkqjsdflkjsdf
       * templateUrl = './template.html';
       * /
    }`;

    const htmlFounds = code.matchAll(htmlRegex);
    let count = 0;
    let expectedValue = true;
    for (const htmlFound of htmlFounds) {
      const isCommented = isLineCommented(htmlFound, code);
      expect(isCommented).toBe(expectedValue);
      expectedValue = !expectedValue;
      count++;
    }
    expect(count).toEqual(3);
  });
});

describe('Buildtools: generate main files', () => {
  const classCode = `
    export default class myClass {}
    export class myClass2 {}
    class myClass3 {}
    string str = 'this export should not generate an error';
  `;

  const functionCode = `
    export default function myFunction() {}
    export function myFunction2() {}
    function myFunction3() {}
    string str = 'this export should not generate an error';
  `;

  const asyncFunctionCode = `
    export default async function myAsyncFunction() {}
    export async function myAsyncFunction2() {}
    function async myAsyncFunction3() {}
    string str = 'this export should not generate an error';
  `;

  const interfaceCode = `
    export default interface myInterface {}
    export interface myInterface2 {}
    interface myInterface3 {}
    string str = 'this export should not generate an error';
  `;

  const typeCode = `
    export default type myType = {}
    export type myType2 = {}
    type myType3 = {}
    string str = 'this export should not generate an error';
  `;

  const constCode = `
    export default const myConst = 12;
    export const myConst2 = 12;
    const myConst3 = 12;
    string str = 'this export should not generate an error';
  `;

  const enumCode = `
    export default enum myEnum { val = 1, reg = 2 }
    export enum myEnum2 { val = 1, reg = 2 }
    enum myEnum3 { val = 1, reg = 2 }
    string str = 'this export should not generate an error';
  `;

  it('identify default type exports', async () => {
    const defaultName = extractDefaultExportTypeName(typeCode);
    expect(defaultName).toEqual('myType');
  });

  it('identify default interface exports', async () => {
    const defaultName = extractDefaultExportTypeName(interfaceCode);
    expect(defaultName).toEqual('myInterface');
  });

  it('identify default class exports', async () => {
    const defaultName = extractDefaultExportValueName(classCode);
    expect(defaultName).toEqual('myClass');
  });

  it('identify default function exports', async () => {
    const defaultName = extractDefaultExportValueName(functionCode);
    expect(defaultName).toEqual('myFunction');
  });

  it('identify default async function exports', async () => {
    const defaultName = extractDefaultExportValueName(asyncFunctionCode);
    expect(defaultName).toEqual('myAsyncFunction');
  });

  it('identify default const exports', async () => {
    const defaultName = extractDefaultExportValueName(constCode);
    expect(defaultName).toEqual('myConst');
  });

  it('identify default enum exports', async () => {
    const defaultName = extractDefaultExportTypeName(enumCode);
    expect(defaultName).toEqual('myEnum');
  });

  it('identify not default type exports', async () => {
    const defaultNames = extractNotDefaultExportTypeNames(typeCode);
    expect(defaultNames.length).toEqual(1);
    expect(defaultNames[0]).toEqual('myType2');
  });

  it('identify not default interface exports', async () => {
    const defaultNames = extractNotDefaultExportTypeNames(interfaceCode);
    expect(defaultNames.length).toEqual(1);
    expect(defaultNames[0]).toEqual('myInterface2');
  });

  it('identify not default class exports', async () => {
    const defaultNames = extractNotDefaultExportValueNames(classCode);
    expect(defaultNames.length).toEqual(1);
    expect(defaultNames[0]).toEqual('myClass2');
  });

  it('identify not default function exports', async () => {
    const defaultNames = extractNotDefaultExportValueNames(functionCode);
    expect(defaultNames.length).toEqual(1);
    expect(defaultNames[0]).toEqual('myFunction2');
  });

  it('identify not default async function exports', async () => {
    const defaultNames = extractNotDefaultExportValueNames(asyncFunctionCode);
    expect(defaultNames.length).toEqual(1);
    expect(defaultNames[0]).toEqual('myAsyncFunction2');
  });

  it('identify not default const exports', async () => {
    const defaultNames = extractNotDefaultExportValueNames(constCode);
    expect(defaultNames.length).toEqual(1);
    expect(defaultNames[0]).toEqual('myConst2');
  });

  it('identify not default enum exports', async () => {
    const defaultNames = extractNotDefaultExportTypeNames(enumCode);
    expect(defaultNames.length).toEqual(1);
    expect(defaultNames[0]).toEqual('myEnum2');
  });

  it('identify default interface', async () => {
    const code = `
      interface ILayerWithFilter {}
      export default ILayerWithFilter;
    `;
    const defaultObject = extractDefaultGlobalExportName(code);
    expect(defaultObject.objectType).toEqual('interface');
    expect(defaultObject.objectName).toEqual('ILayerWithFilter');
  });

  it('identify default type', async () => {
    const code = `
      type MyType = {}
      export default MyType;
    `;
    const defaultObject = extractDefaultGlobalExportName(code);
    expect(defaultObject.objectType).toEqual('type');
    expect(defaultObject.objectName).toEqual('MyType');
  });

  it('identify default class', async () => {
    const code = `
      class MyClass {}
      export default MyClass;
    `;
    const defaultObject = extractDefaultGlobalExportName(code);
    expect(defaultObject.objectType).toEqual('class');
    expect(defaultObject.objectName).toEqual('MyClass');
  });

  it('identify default enum', async () => {
    const code = `
      enum MyEnum { val = 1, reg = 2 }
      export default MyEnum;
    `;
    const defaultObject = extractDefaultGlobalExportName(code);
    expect(defaultObject.objectType).toEqual('enum');
    expect(defaultObject.objectName).toEqual('MyEnum');
  });
});
