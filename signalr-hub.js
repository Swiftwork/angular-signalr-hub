angular.module('SignalR', [])
.constant('$', $)
.factory('Hub', ['$', function ($) {
	//This will allow same connection to be used for all Hubs
	//It also keeps connection as singleton.
	var globalConnections = [];

	function initNewConnection(options) {
		var connection = null;
		if (options && options.rootPath) {
			connection = $.hubConnection(options.rootPath, { useDefaultPath: false });
		} else {
			connection = $.hubConnection();
		}

		connection.logging = (options && options.logging ? true : false);
		return connection;
	}

	function getConnection(options) {
		var useSharedConnection = !(options && options.useSharedConnection === false);
		if (useSharedConnection) {
			return typeof globalConnections[options.rootPath] === 'undefined' ?
			globalConnections[options.rootPath] = initNewConnection(options) :
			globalConnections[options.rootPath];
		}
		else {
			return initNewConnection(options);
		}
	}

	return function (hubName, options) {
		var Hub = this;

		Hub.connection = getConnection(options);
		Hub.proxy = Hub.connection.createHubProxy(hubName);

		Hub.on = function (event, fn) {
			Hub.proxy.on(event, fn);
		};
		Hub.invoke = function (method, args) {
			return Hub.proxy.invoke.apply(Hub.proxy, arguments)
		};
		Hub.disconnect = function () {
			Hub.connection.stop();
		};
		Hub.connect = function () {
			return Hub.connection.start(options.transport ? { transport: options.transport } : null);
		};

		if (options && options.listeners) {
			angular.forEach(options.listeners, function (fn, event) {
				Hub.on(event, fn);
			});
		}
		if (options && options.methods) {
			angular.forEach(options.methods, function (method) {
				Hub[method] = function () {
					var args = $.makeArray(arguments);
					args.unshift(method);
					return Hub.promise.then(function() {
		                 return Hub.invoke.apply(Hub, args);
		            });
				};
			});
		}
		if (options && options.queryParams) {
			Hub.connection.qs = options.queryParams;
		}
		if (options && options.errorHandler) {
			Hub.connection.error(options.errorHandler);
		}

		//Adding additional property of promise allows to access it in rest of the application.
		Hub.promise = Hub.connect();
		return Hub;
	};
}]);