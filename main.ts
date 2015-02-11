///<reference path="typings/jquery/jquery.d.ts" />
///<reference path="typings/angularjs/angular.d.ts" />
///<reference path="typings/bootstrap/bootstrap.d.ts" />
///<reference path="../node-canteen/interfaces-shared.ts" />
///<reference path="interfaces.ts" />

var canteen = angular.module("canteen", []);

class CanteenApi
{

	constructor(private $scope: CanteenScope, private $q: ng.IQService, private $http: ng.IHttpService)
	{ }

	private doGet<T>(url: string): ng.IPromise<T>
	{
		if(!url)
			return <ng.IPromise<T>><any>this.$q.reject("No url.");
		var d = this.$q.defer();

		this.$http({url: url, method: "GET"})
			.success((data, status) => d.resolve(data))
			.error((data, status) => d.reject(status));
		return d.promise;
	}

	public getMenu(url: string): ng.IPromise<IParseResult>
	{
		return this.doGet<IParseResult>(url);
	}

	public getCanteens(): ng.IPromise<IAvailableCanteens>
	{
		return this.doGet<IAvailableCanteens>(this.$scope.apiUrl + "canteens");
	}
}

/*
	ng does not parse date strings in JSOn responses as Date.
	This code found somewhere on the internet does exactly that.
*/

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
/* / internet-code */

canteen.controller("CanteenCtrl", ($scope: CanteenScope, $http: ng.IHttpService, $interval: ng.IIntervalService, $q: ng.IQService) => {

	var apiBase = "https://node-canteen.herokuapp.com/";

	$scope.supportedCanteens = {
		wilhelmshoehe: "Wilhelmshöhe",
		hopla: "Holländischer Platz",
		menzelstrasse: "Menzelstraße",
		plett: "Heinrich-Plett",
		witzenhausen: "Witzenhausen"
	};

	var fallback = "wilhelmshoehe";
	var newApiUrl = () => {
		var h = document.location.hash;
		$scope.currentCanteen = (h.length > 1 ? h.substring(1) || fallback : fallback);
		return apiBase + $scope.currentCanteen;
	};

	$scope.apiUrl = newApiUrl();

	$scope.updateApiUrl = () => {
		var prev = $scope.apiUrl;
		$scope.apiUrl = newApiUrl();
		if(prev != $scope.apiUrl)
			$scope.refresh();
	};

	$scope.isToday = dow => {
		var f = $scope.lastResult.menu.validity.from.getTime();
		f -= 86400000;
		f += 86400000 * dow;
		var now = new Date();
		var dowD = new Date(f);

		return dowD.getDate() === now.getDate()
				&& dowD.getMonth() === now.getMonth()
				&& dowD.getFullYear() === now.getFullYear();
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
	$scope.canteenApi = new CanteenApi($scope, $q, $http);
	$scope.lastResult = null;
	$scope.refreshInterval = 30 * 60 * 1000;

	$scope.isMeatless = m => !!m && m.attributes.indexOf("F") > -1;
	$scope.isVegan = m => !!m && m.attributes.indexOf("V") > -1;
	$scope.getMealClass = m => {
		if($scope.isVegan(m))
			return "vegan";
		if($scope.isMeatless(m))
			return "meatless";
		return "containsmeat";
	};

	$scope.refreshValidWeekdays = () => {
		if($scope.isLoading || $scope.isError)
		{
			$scope.validWeekdays = [];
			return;
		}

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
				$scope.isLoading = false;
				$scope.isError = false;
				$scope.refreshValidWeekdays();
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
