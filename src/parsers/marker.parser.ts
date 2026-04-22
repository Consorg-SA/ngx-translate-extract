import { tsquery } from '@phenomnomnominal/tsquery';

import { ParserInterface } from './parser.interface.js';
import { TranslationCollection } from '../utils/translation.collection.js';
import { getNamedImportAlias, findFunctionCallExpressions, getStringsFromExpression } from '../utils/ast-helpers.js';
import pkg from 'typescript';
const { isCallExpression } = pkg;
import { ServiceParser } from './service.parser.js';

const MARKER_MODULE_NAME = 'ngx-translate-extract-marker';
const MARKER_IMPORT_NAME = 'marker';

export class MarkerParser implements ParserInterface {
	public extract(source: string, filePath: string): TranslationCollection | null {
		const sourceFile = tsquery.ast(source, filePath);

		const markerImportName = getNamedImportAlias(sourceFile, MARKER_MODULE_NAME, MARKER_IMPORT_NAME);
		if (!markerImportName) {
			return null;
		}

		let collection: TranslationCollection = new TranslationCollection();

		const callExpressions = findFunctionCallExpressions(sourceFile, markerImportName);
		callExpressions.forEach((callExpression) => {
			const [firstArg] = callExpression.arguments;
			if (!firstArg) {
				return;
			}
			const strings = getStringsFromExpression(firstArg);
			if (strings.length > 1)
				collection = collection.addKeys(strings, filePath);
			else if (strings.length) {
				if (isCallExpression(callExpression.parent) && callExpression.parent.arguments.length >= 2) {
					const v = ServiceParser.extractDefaultValueFromObjArg(callExpression.parent.arguments[1]);
					collection = collection.add(strings[0], v, filePath);
				} else {
					collection = collection.add(strings[0], '', filePath);
				}
			}
		});
		return collection;
	}
}
