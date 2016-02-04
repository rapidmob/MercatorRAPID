/// <reference path="../../_libs.ts" />

interface PointObject {
	code: string,
	description: string
}

interface ILocalStorageService {
	set(keyId: string, keyvalue: string): void;
	get(keyId: string, defaultValue: string): string;
	setObject(keyId: string, keyvalue: any[]): void;
	getObject(keyId: string): any;
	isRecentEntryAvailable(orginObject: PointObject, type: string): void;
	addRecentEntry(data: any, type: string): void;
}

class LocalStorageService implements ILocalStorageService {

	public static $inject = ['$window'];
	private recentEntries: [PointObject];

	constructor(private $window: ng.IWindowService) {
	}

	set(keyId: string, keyvalue: string): void {
		this.$window.localStorage[keyId] = keyvalue;
	}
	get(keyId: string, defaultValue: string): string {
		return this.$window.localStorage[keyId] || defaultValue;
	}
	setObject(keyId: string, keyvalue: any[]): void {
		this.$window.localStorage[keyId] =  JSON.stringify(keyvalue);
	}
	getObject(keyId: string): any {
		return this.$window.localStorage[keyId] ? JSON.parse(this.$window.localStorage[keyId]) : undefined;
	}

	isRecentEntryAvailable(orginObject: PointObject, type: string) {
		this.recentEntries = this.getObject(type) ? this.getObject(type) : [];
		return this.recentEntries.filter(function (entry) { return entry.code === orginObject.code });
	}

	addRecentEntry(data: any, type: string) {
		var orginObject: PointObject	=	data ? data.originalObject : undefined;

		if (orginObject) {
			if (this.isRecentEntryAvailable(orginObject, type).length === 0) {
				this.recentEntries = this.getObject(type) ? this.getObject(type) : [];
				(this.recentEntries.length == 3) ? this.recentEntries.pop() : this.recentEntries;
				this.recentEntries.unshift(orginObject);
				this.setObject(type, this.recentEntries);
			}
		}
	}
}
