var canteen = angular.module("canteen", []);

var CanteenApi = (function () {
    function CanteenApi($scope, $q, $http) {
        this.$scope = $scope;
        this.$q = $q;
        this.$http = $http;
    }
    CanteenApi.prototype.doGet = function (url) {
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

    CanteenApi.prototype.getMenu = function (url) {
        return this.doGet(url);
    };

    CanteenApi.prototype.getCanteens = function () {
        return this.doGet(this.$scope.apiUrl + "canteens");
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
        wilhelmshoehe: "Wilhelmshöhe",
        hopla: "Holländischer Platz",
        menzelstrasse: "Menzelstraße",
        plett: "Heinrich-Plett"
    };

    var fallback = "wilhelmshoehe";
    var newApiUrl = function () {
        var h = document.location.hash;
        $scope.currentCanteen = (h.length > 1 ? h.substring(1) || fallback : fallback);
        return apiBase + $scope.currentCanteen;
    };

    $scope.apiUrl = newApiUrl();

    $scope.updateApiUrl = function () {
        var prev = $scope.apiUrl;
        $scope.apiUrl = newApiUrl();
        if (prev != $scope.apiUrl)
            $scope.refresh();
    };

    $scope.isToday = function (dow) {
        var f = $scope.lastResult.menu.validity.from.getTime();
        f -= 86400000;
        f += 86400000 * dow;
        var now = new Date();
        var dowD = new Date(f);

        return dowD.getDate() === now.getDate() && dowD.getMonth() === now.getMonth() && dowD.getFullYear() === now.getFullYear();
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

    $scope.isMeatless = function (m) {
        return !!m && m.attributes.indexOf("F") > -1;
    };
    $scope.isVegan = function (m) {
        return !!m && m.attributes.indexOf("V") > -1;
    };
    $scope.getMealClass = function (m) {
        if ($scope.isVegan(m))
            return "vegan";
        if ($scope.isMeatless(m))
            return "meatless";
        return "containsmeat";
    };

    $scope.refreshValidWeekdays = function () {
        if ($scope.isLoading || $scope.isError) {
            $scope.validWeekdays = [];
            return;
        }

        var loopTime = $scope.lastResult.menu.validity.from.getTime();
        var endTime = $scope.lastResult.menu.validity.until.getTime();
        var arr = new Array();
        for (; loopTime <= endTime; loopTime += 86400000) {
            arr.push($scope.dayNames[(new Date(loopTime)).getDay()]);
        }
        $scope.validWeekdays = arr;
    };

    $scope.refresh = function () {
        $scope.isLoading = true;

        var p = $scope.canteenApi.getMenu($scope.apiUrl);
        p.then(function (res) {
            if (res) {
                $scope.lastResult = res;
                $scope.isLoading = false;
                $scope.isError = false;
                $scope.refreshValidWeekdays();
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
