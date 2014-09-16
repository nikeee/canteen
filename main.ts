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

canteen.controller("CanteenCtrl", ($scope: CanteenScope, $http: ng.IHttpService, $interval: ng.IIntervalService, $q: ng.IQService) => {

	$scope.apiUrl = "http://uni.holz.nu:8081/menu/wilhelmshoehe";

	$scope.isLoading = true;
	$scope.isError = false;
	$scope.canteenApi = new CanteenApi($q, $http);
	$scope.lastResult = null;
	$scope.refreshInterval = 30 * 60 * 1000;

	$scope.refresh = () => {
		$scope.isLoading = true;

		var p = $scope.canteenApi.getMenu($scope.apiUrl);
		p.then(res => {
			if(res)
			{
				$scope.lastResult = res;
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
});
