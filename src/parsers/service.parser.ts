import { ClassDeclaration, CallExpression, isObjectLiteralExpression, isPropertyAssignment, isIdentifier, isStringLiteralLike, Expression } from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';

import { ParserInterface } from './parser.interface';
import { TranslationCollection } from '../utils/translation.collection';
import {
	findClassDeclarations,
	findClassPropertyByType,
	findPropertyCallExpressions,
	findMethodCallExpressions,
	getStringsFromExpression,
	findMethodParameterByType,
	findConstructorDeclaration
} from '../utils/ast-helpers';

const TRANSLATE_SERVICE_TYPE_REFERENCE = 'TranslateService';
const TRANSLATE_SERVICE_METHOD_NAMES = ['get', 'instant', 'stream'];

export class ServiceParser implements ParserInterface {

	public static extractDefaultValueFromObjArg(objArg: Expression): string {
		if (objArg && isObjectLiteralExpression(objArg)) {
			const node = objArg.properties.find(p => isPropertyAssignment(p) && p.name && isIdentifier(p.name) && p.name.text == '_');
			if (node && isPropertyAssignment(node) && node.initializer && isStringLiteralLike(node.initializer))
				return node.initializer.text;
		}
		return '';
	}

	public static extractFromMethodCallExpressions(callExpressions: CallExpression[], collection: TranslationCollection): TranslationCollection {
		callExpressions.forEach((callExpression) => {
			const [firstArg, secondArg] = callExpression.arguments;
			if (!firstArg) {
				return;
			}
			const strings = getStringsFromExpression(firstArg);
			if (strings.length > 1)
				collection = collection.addKeys(strings);
			else if (strings.length) {
				const v = ServiceParser.extractDefaultValueFromObjArg(secondArg);
				collection = collection.add(strings[0], v);
			}
		});
		return collection;
	}

	public extract(source: string, filePath: string): TranslationCollection | null {
		const sourceFile = tsquery.ast(source, filePath);

		const classDeclarations = findClassDeclarations(sourceFile);
		if (!classDeclarations) {
			return null;
		}

		let collection: TranslationCollection = new TranslationCollection();

		classDeclarations.forEach((classDeclaration) => {
			const callExpressions = [
				...this.findConstructorParamCallExpressions(classDeclaration),
				...this.findPropertyCallExpressions(classDeclaration)
			];
			collection = ServiceParser.extractFromMethodCallExpressions(callExpressions, collection);
		});
		return collection;
	}

	protected findConstructorParamCallExpressions(classDeclaration: ClassDeclaration): CallExpression[] {
		const constructorDeclaration = findConstructorDeclaration(classDeclaration);
		if (!constructorDeclaration) {
			return [];
		}
		const paramName = findMethodParameterByType(constructorDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE);
		return findMethodCallExpressions(constructorDeclaration, paramName, TRANSLATE_SERVICE_METHOD_NAMES);
	}

	protected findPropertyCallExpressions(classDeclaration: ClassDeclaration): CallExpression[] {
		const propName: string = findClassPropertyByType(classDeclaration, TRANSLATE_SERVICE_TYPE_REFERENCE);
		if (!propName) {
			return [];
		}
		return findPropertyCallExpressions(classDeclaration, propName, TRANSLATE_SERVICE_METHOD_NAMES);
	}
}
