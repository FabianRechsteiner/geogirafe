import { describe, expect, it } from 'vitest';
import { htmlRegex, isLineCommented } from './tools';

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
