var canteen = angular.module("canteen", []);

var CanteenApi = (function () {
    function CanteenApi($q, $http) {
        this.$q = $q;
        this.$http = $http;
    }
    CanteenApi.prototype.getMenu = function (url) {
        if (!url)
            return this.$q.reject("No url.");
        var d = this.$q.defer();

        this.$http({ url: url, method: "GET" }).success(function (data, status) {
            return d.resolve(data);
        }).error(function (data, status) {
            return d.reject(status);
        });
        return d.promise;
    };
    return CanteenApi;
})();

canteen.config([
    "$httpProvider", function ($httpProvider) {
        $httpProvider.defaults.transformResponse.push(function (responseData) {
            convertDateStringsToDates(responseData);
            return responseData;
        });
    }]);

var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,})(Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;

function convertDateStringsToDates(input) {
    if (typeof input !== "object")
        return input;

    for (var key in input) {
        if (!input.hasOwnProperty(key))
            continue;

        var value = input[key];
        var match;

        if (typeof value === "string" && (match = value.match(regexIso8601))) {
            var milliseconds = Date.parse(match[0]);
            if (!isNaN(milliseconds)) {
                input[key] = new Date(milliseconds);
            }
        } else if (typeof value === "object") {
            convertDateStringsToDates(value);
        }
    }
}

canteen.controller("CanteenCtrl", function ($scope, $http, $interval, $q) {
    var apiBase = "http://uni.holz.nu:8081/menu/";

    $scope.supportedCanteens = {
        hopla: "Holländischer Platz",
        wilhelmshoehe: "Wilhelmshöhe"
    };

    var fallback = "wilhelmshoehe";
    var newApiUrl = function () {
        var h = document.location.hash;
        return apiBase + (h.length > 1 ? h.substring(1) || fallback : fallback);
    };

    $scope.apiUrl = newApiUrl();

    $scope.updateApiUrl = function () {
        var prev = $scope.apiUrl;
        $scope.apiUrl = newApiUrl();
        if (prev != $scope.apiUrl)
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

    $scope.getValidWeekdays = function () {
        if ($scope.isLoading || $scope.isError)
            return [];

        var loopTime = $scope.lastResult.menu.validity.from.getTime();
        var endTime = $scope.lastResult.menu.validity.until.getTime();
        var arr = new Array();
        for (; loopTime <= endTime; loopTime += 86400000) {
            arr.push($scope.dayNames[(new Date(loopTime)).getDay()]);
        }

        return arr;
    };

    $scope.refresh = function () {
        $scope.isLoading = true;

        var p = $scope.canteenApi.getMenu($scope.apiUrl);
        p.then(function (res) {
            if (res) {
                $scope.lastResult = res;
                $scope.isLoading = false;
                $scope.isError = false;
            } else {
                $scope.isError = true;
            }
        }, function (err) {
            $scope.isError = true;
        });
    };

    $scope.refresh();
    $interval(function () {
        return $scope.refresh();
    }, $scope.refreshInterval);

    window.addEventListener("hashchange", function () {
        return $scope.updateApiUrl();
    }, false);
});
