///<reference path="typings/jquery/jquery.d.ts" />
///<reference path="typings/angularjs/angular.d.ts" />
///<reference path="typings/bootstrap/bootstrap.d.ts" />
///<reference path="../node-canteen/interfaces-shared.ts" />

var canteen = angular.module("canteen", []);


interface CanteenScope extends ng.IScope
{
	isLoading: boolean;
	canteenApi: CanteenApi;

	refresh: () => void;
	currentMenu: IParseResult;

	apiUrl: string;

	refreshInterval: number;
}

class CanteenApi
{
	constructor(private $q: ng.IQService, private $http: ng.IHttpService)
	{ }

	public getMenu(url: string): ng.IPromise<IParseResult>
	{
		if(!url)
			return <ng.IPromise<IParseResult>><any>this.$q.reject("No url.");

		return this.$http.get(url);
	}
}

canteen.controller("CanteenCtrl", ($scope: CanteenScope, $http: ng.IHttpService, $interval: ng.IIntervalService, $q: ng.IQService) => {

	$scope.apiUrl = "http://holz.nu:8081/menu/wilhemshoehe";

	$scope.isLoading = true;
	$scope.canteenApi = new CanteenApi($q, $http);
	$scope.currentMenu = null;
	$scope.refreshInterval = 30 * 60 * 1000;

	$scope.refresh = () => {
		$scope.isLoading = true;
		$scope.canteenApi.getMenu($scope.apiUrl).then(res => {
			if(res)
			{
				$scope.currentMenu = res;
				$scope.isLoading = false;
			}
		});
	};

	$interval(() => $scope.refresh(), $scope.refreshInterval);
});
