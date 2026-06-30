export interface TranslationType {
	[key: string]: TranslationInterface;
}

export interface TranslationInterface {
	value: string;
	sourceFiles: string[];
}

type CollectionDiffEntry = { key: string; v1: string; v2: string; };

export class TranslationCollection {
	public values: TranslationType = {};
	public diff: CollectionDiffEntry[] = [];

	public constructor(values: TranslationType = {}, diff: CollectionDiffEntry[] = []) {
		this.values = values;
		this.diff = diff;
	}

	public add(key: string, val: string, sourceFile: string): TranslationCollection {
		const existing = this.values[key]?.value;
		if (existing && val != existing)
			this.diff.push({ key, v1: existing, v2: val });
		const translation = this.values[key]
			? {...this.values[key]}
			: {value: val, sourceFiles: []};
		translation.sourceFiles.push(sourceFile);

		return new TranslationCollection({...this.values, [key]: translation}, this.diff);
	}

	public addKeys(keys: string[], sourceFile: string): TranslationCollection {
		const values = keys.reduce(
			(results, key) => ({
				...results,
				[key]: <TranslationInterface>{value: '', sourceFiles: [sourceFile]}
			}),
			{} as TranslationType
		);
		return new TranslationCollection({...this.values, ...values}, this.diff);
	}

	public remove(key: string): TranslationCollection {
		return this.filter((k) => key !== k);
	}

	public forEach(callback: (key?: string, val?: TranslationInterface) => void): TranslationCollection {
		Object.keys(this.values).forEach((key) => callback.call(this, key, this.values[key]));
		return this;
	}

	public filter(callback: (key?: string, val?: TranslationInterface) => boolean): TranslationCollection {
		const values: TranslationType = {};
		this.forEach((key, val) => {
			if (callback.call(this, key, val)) {
				values[key] = val;
			}
		});
		return new TranslationCollection(values, this.diff);
	}

	public map(callback: (key?: string, val?: TranslationInterface) => TranslationInterface): TranslationCollection {
		const values: TranslationType = {};
		this.forEach((key, val) => {
			values[key] = callback.call(this, key, val);
		});
		return new TranslationCollection(values, this.diff);
	}

	public union(collection: TranslationCollection, detectDiff = false): TranslationCollection {
		if (detectDiff)
			this.saveDuplicateKeysWithDifferentValues(collection);

		return new TranslationCollection({ ...this.values, ...collection.values }, [ ...this.diff, ...collection.diff ]);
	}

	public intersect(collection: TranslationCollection, detectDiff = false): TranslationCollection {
		if (detectDiff)
			this.saveDuplicateKeysWithDifferentValues(collection);

		const values: TranslationType = {};
		this.filter((key) => collection.has(key)).forEach((key, val) => {
			values[key] = val;
		});

		return new TranslationCollection(values, [ ...this.diff, ...collection.diff ]);
	}

	public has(key: string): boolean {
		return this.values.hasOwnProperty(key);
	}

	public get(key: string): TranslationInterface {
		return this.values[key];
	}

	public keys(): string[] {
		return Object.keys(this.values);
	}

	public count(): number {
		return Object.keys(this.values).length;
	}

	public isEmpty(): boolean {
		return Object.keys(this.values).length === 0;
	}

	public sort(compareFn?: (a: string, b: string) => number): TranslationCollection {
		const values: TranslationType = {};
		this.keys()
			.sort(compareFn)
			.forEach((key) => {
				values[key] = this.get(key);
			});

		return new TranslationCollection(values, this.diff);
	}

	private saveDuplicateKeysWithDifferentValues(collection: TranslationCollection) {
		this.diff.push(...this.findDuplicateKeysWithDifferentValues(this.values, collection.values));
	}

	private findDuplicateKeysWithDifferentValues(a: TranslationType, b: TranslationType): CollectionDiffEntry[] {
		const result: CollectionDiffEntry[] = [];
		if (a == null || b == null)
			return result;
		for (const key in a)
			if (b.hasOwnProperty(key))
				if (a[key].value !== b[key].value)
					result.push({ key, v1: a[key].value, v2: b[key].value });
		return result;
	}

	public toKeyValueObject(): {[key: string]: string} {
		const jsonTranslations: {[key: string]: string} = {};
		Object.entries(this.values).map(([key, value]: [string, TranslationInterface]) => jsonTranslations[key] = value.value);
		return jsonTranslations;
	}

	public stripKeyPrefix(prefix: string): TranslationCollection {
		const cleanedValues: TranslationType = {};
		const lowercasePrefix = prefix.toLowerCase();
		for (const key in this.values) {
			if (this.has(key)) {
				const lowercaseKey = key.toLowerCase();
				if (lowercaseKey.startsWith(lowercasePrefix)) {
					const cleanedKey = key.substring(prefix.length);
					cleanedValues[cleanedKey] = this.values[key];
				} else {
					cleanedValues[key] = this.values[key];
				}
			}
		}

		return new TranslationCollection(cleanedValues);
	}
}
