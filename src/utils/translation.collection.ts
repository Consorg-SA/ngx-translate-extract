export interface TranslationType {
	[key: string]: string;
}

type CollectionDiffEntry = { key: string; v1: string; v2: string; };

export class TranslationCollection {
	public values: TranslationType = {};
	public diff: CollectionDiffEntry[] = [];

	public constructor(values: TranslationType = {}, diff: CollectionDiffEntry[] = []) {
		this.values = values;
		this.diff = diff;
	}

	public add(key: string, val: string = ''): TranslationCollection {
		const existing = this.values[key];
		if (existing && val != existing)
			this.diff.push({ key, v1: existing, v2: val });
		return new TranslationCollection({ ...this.values, [key]: val }, this.diff);
	}

	public addKeys(keys: string[]): TranslationCollection {
		const values = keys.reduce((results, key) => {
			return { ...results, [key]: '' };
		}, {} as TranslationType);
		return new TranslationCollection({ ...this.values, ...values }, this.diff);
	}

	public remove(key: string): TranslationCollection {
		return this.filter((k) => key !== k);
	}

	public forEach(callback: (key?: string, val?: string) => void): TranslationCollection {
		Object.keys(this.values).forEach((key) => callback.call(this, key, this.values[key]));
		return this;
	}

	public filter(callback: (key?: string, val?: string) => boolean): TranslationCollection {
		const values: TranslationType = {};
		this.forEach((key, val) => {
			if (callback.call(this, key, val)) {
				values[key] = val;
			}
		});
		return new TranslationCollection(values, this.diff);
	}

	public map(callback: (key?: string, val?: string) => string): TranslationCollection {
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

	public get(key: string): string {
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

	private findDuplicateKeysWithDifferentValues(a: any, b: any): CollectionDiffEntry[] {
		const result: CollectionDiffEntry[] = [];
		if (a == null || b == null)
			return result;
		for (const key in a)
			if (b.hasOwnProperty(key))
				if (a[key] !== b[key])
					result.push({ key, v1: a[key], v2: b[key] });
		return result;
	}
}
