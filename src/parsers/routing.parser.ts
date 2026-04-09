import { tsquery } from "@phenomnomnominal/tsquery";
import { CallExpression, ScriptKind, StringLiteral } from "typescript";
import { findMethodCallExpressions } from "../utils/ast-helpers";
import { TranslationCollection } from "../utils/translation.collection";
import { ParserInterface } from "./parser.interface";
import { ServiceParser } from "./service.parser";

const TRANSLATE_SERVICE_VARIABLE_NAME = 'translate';
const TRANSLATE_SERVICE_METHOD_NAMES = ['get', 'instant', 'stream'];

export class RoutingParser implements ParserInterface {

  methodRegex = new RegExp(`${TRANSLATE_SERVICE_VARIABLE_NAME}\.(${TRANSLATE_SERVICE_METHOD_NAMES.join('|')})`);

  extract(source: string, filePath: string): TranslationCollection {
    let collection: TranslationCollection = new TranslationCollection();

    const regExp: RegExp = /\/\*.*EXTRACT_TRANSLATIONS.*\*\//;
    if (!source || !regExp.test(source))
      return collection;

    const sourceFile = tsquery.ast(source, filePath);
    const strings = tsquery<StringLiteral>(sourceFile, 'StringLiteral')
      .map(node => node.text)
      .filter(s => this.methodRegex.test(s));
    const callExpressions = strings
      .map(s => tsquery.ast(s, undefined, ScriptKind.JS))
      .reduce((acc, ast) => 
        acc.concat(findMethodCallExpressions(ast, TRANSLATE_SERVICE_VARIABLE_NAME, TRANSLATE_SERVICE_METHOD_NAMES)),
      [] as CallExpression[]
    );
    collection = ServiceParser.extractFromMethodCallExpressions(callExpressions, collection);

    return collection;
  }

}
