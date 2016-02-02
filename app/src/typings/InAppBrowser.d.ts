interface Cordova {
	InAppBrowser: InAppBrowserInt;
}

interface InAppBrowserInt {
	open(url?: string,
		target?: string,
		features?: string,
		replace? :boolean): any;
}