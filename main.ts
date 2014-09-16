///<reference path="typings/jquery/jquery.d.ts" />
///<reference path="typings/angularjs/angular.d.ts" />
///<reference path="typings/bootstrap/bootstrap.d.ts" />
///<reference path="../node-canteen/interfaces-shared.ts" />

var canteen = angular.module("canteen", []);


interface CanteenScope extends ng.IScope
{
	isLoading: boolean;
	canteenApi: CanteenApi;
}

class CanteenApi
{
	constructor(private $q: ng.IQService)
	{ }

	public getMenu(): ng.IPromise<IParseResult>
	{
		var d = this.$q.defer<IParseResult>();


		return d.promise();
	}
}

canteen.controller("CanteenCtrl", ($scope: CanteenScope, $http: ng.IHttpService, $interval: ng.IIntervalService, $q: ng.IQService) => {

	$scope.canteenApi = new CanteenApi($q);
});
