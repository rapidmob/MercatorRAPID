interface Screen {
	orientation: ScreenOrientation;
	lockOrientation(orientation: string): void;
	unlockOrientation(): string;
}

interface ScreenOrientation {
	angle: number;
	onchange: any;
	type: string;
}