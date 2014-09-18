interface CanteenScope extends ng.IScope
{
	isLoading: boolean;
	isError: boolean;
	canteenApi: CanteenApi;

	refresh: () => void;
	lastResult: IParseResult;

	apiUrl: string;

	refreshInterval: number;
	updateApiUrl: () => void;
	supportedCanteens: { [name: string]: string; };
	currentCanteen: string;

	refreshValidWeekdays(): void;
	validWeekdays: string[];
	dayNames: string[];

	isMeatless(m: IMealItem) : boolean;
	isVegan(m: IMealItem) : boolean;
	getMealClass(m: IMealItem): string;
	isToday(dayOfWeek: number): boolean;
}

interface IAvailableCanteens
{
	availableCanteens: string[];
}
