///<reference path="typings/jquery/jquery.d.ts" />
///<reference path="typings/angularjs/angular.d.ts" />
///<reference path="typings/bootstrap/bootstrap.d.ts" />
///<reference path="../node-canteen/interfaces-shared.ts" />

var canteen = angular.module("canteen", []);


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

	refreshValidWeekdays(): void;
	validWeekdays: string[];
	dayNames: string[];
}

class CanteenApi
{
	constructor(private $q: ng.IQService, private $http: ng.IHttpService)
	{ }

	public getMenu(url: string): ng.IPromise<IParseResult>
	{
		if(!url)
			return <ng.IPromise<IParseResult>><any>this.$q.reject("No url.");
		var d = this.$q.defer();
		//this.$http.get(url)
		this.$http({url: url, method: "GET"})
			.success((data, status) => d.resolve(data))
			.error((data, status) => d.reject(status));
		return d.promise;
	}
}

canteen.config(["$httpProvider", $httpProvider => {
	$httpProvider.defaults.transformResponse.push(responseData => {
		convertDateStringsToDates(responseData);
		return responseData;
	});
}]);

var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,})(Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;

function convertDateStringsToDates(input) {
	// Ignore things that aren't objects.
	if (typeof input !== "object")
		return input;

	for (var key in input)
	{
		if (!input.hasOwnProperty(key))
			continue;

		var value = input[key];
		var match;
		// Check for string properties which look like dates.
		// TODO: Improve this regex to better match ISO 8601 date strings.
		if (typeof value === "string" && (match = value.match(regexIso8601)))
		{
			// Assume that Date.parse can parse ISO 8601 strings, or has been shimmed in older browsers to do so.
			var milliseconds = Date.parse(match[0]);
			if (!isNaN(milliseconds))
			{
				input[key] = new Date(milliseconds);
			}
		}
		else if (typeof value === "object")
		{
			// Recurse into object
			convertDateStringsToDates(value);
		}
	}
}

canteen.controller("CanteenCtrl", ($scope: CanteenScope, $http: ng.IHttpService, $interval: ng.IIntervalService, $q: ng.IQService) => {

	var apiBase = "http://uni.holz.nu:8081/menu/";

	$scope.supportedCanteens = {
		hopla: "Holländischer Platz",
		wilhelmshoehe: "Wilhelmshöhe"
	};

	var fallback = $scope.supportedCanteens["wilhelmshoehe"];
	var newApiUrl = () => {
		var h = document.location.hash;
		return apiBase + (h.length > 1 ? h.substring(1) || fallback : fallback);
	};

	$scope.apiUrl = newApiUrl();

	$scope.updateApiUrl = () => {
		var prev = $scope.apiUrl;
		$scope.apiUrl = newApiUrl();
		if(prev != $scope.apiUrl)
			$scope.refresh();
	};

	$scope.dayNames = [
		"Sonntag",
		"Montag",
		"Dienstag",
		"Mittwoch",
		"Donnerstag",
		"Freitag",
		"Samstag"
	];

	$scope.isLoading = true;
	$scope.isError = false;
	$scope.canteenApi = new CanteenApi($q, $http);
	$scope.lastResult = null;
	$scope.refreshInterval = 30 * 60 * 1000;

	$scope.refreshValidWeekdays = () => {
		if($scope.isLoading || $scope.isError)
			return [];

		var loopTime = $scope.lastResult.menu.validity.from.getTime();
		var endTime = $scope.lastResult.menu.validity.until.getTime();
		var arr = new Array<string>();
		for(; loopTime <= endTime; loopTime += 86400000)
		{
			arr.push($scope.dayNames[(new Date(loopTime)).getDay()]);
		}
		$scope.validWeekdays = arr;
	};

	$scope.refresh = () => {
		$scope.isLoading = true;

		var p = $scope.canteenApi.getMenu($scope.apiUrl);
		p.then(res => {
			if(res)
			{
				$scope.lastResult = res;
				$scope.refreshValidWeekdays();
				$scope.isLoading = false;
				$scope.isError = false;
			}
			else
			{
				$scope.isError = true;
			}
		}, err => {
			$scope.isError = true;
		});
	};

	$scope.refresh();
	$interval(() => $scope.refresh(), $scope.refreshInterval);

	window.addEventListener("hashchange",() => $scope.updateApiUrl(), false);
});
