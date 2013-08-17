define(function(require){
	var $ = require('jquery'),
		_ = require('underscore'),
		monster = require('monster'),
		toastr = require('toastr');

	var app = {

		name: 'failover',

		i18n: [ 'en-US' ],

		requests: {
			'failover.getNumber': {
				url: 'accounts/{accountId}/phone_numbers/{phoneNumber}',
				verb: 'GET'
			},
			'failover.updateNumber': {
				url: 'accounts/{accountId}/phone_numbers/{phoneNumber}',
				verb: 'POST'
			}
		},

		subscribe: {
			'failover.editPopup': 'edit'
		},

		load: function(callback){
			var self = this;

			self.initApp(function() {
				callback && callback(self);
			});
		},

		initApp: function(callback) {
			var self = this;

			monster.pub('auth.initApp', {
				app: self,
				callback: callback
			});
		},

		render: function(dataNumber, callbacks) {
			var self = this,
				radio = '';

			if('failover' in dataNumber) {
				radio = 'e164' in dataNumber.failover ? 'number' : 'sip'
			}

			var	tmplData = {
					radio: radio,
					failover: dataNumber.failover,
					phoneNumber: dataNumber.id
				},
				popupHtml = $(monster.template(self, 'failoverDialog', tmplData)),
				popup;

			popupHtml.find('.failover-block[data-type="'+radio+'"]').addClass('selected');
			popupHtml.find('.failover-block:not([data-type="'+radio+'"]) input').val('');

			popupHtml.find('.failover-block input').on('keyup', function() {
				popupHtml.find('.failover-block').removeClass('selected');
				popupHtml.find('.failover-block:not([data-type="'+$(this).parents('.failover-block').first().data('type')+'"]) input[type="text"]').val('');

				$(this).parents('.failover-block').addClass('selected');
			});

			popupHtml.find('.submit_btn').on('click', function(ev) {
				ev.preventDefault();

				var failoverFormData = { failover: {} },
					type = popupHtml.find('.failover-block.selected').data('type'),
					result;

				if(type === 'number' || type === 'sip') {
					failoverFormData.rawInput = popupHtml.find('.failover-block[data-type="'+type+'"] input').val();

					if(failoverFormData.rawInput.match(/^sip:/)) {
						failoverFormData.failover.sip = failoverFormData.rawInput;
					}
					else if(result = failoverFormData.rawInput.replace(/-|\(|\)|\s/g,'').match(/^\+?1?([2-9]\d{9})$/)) {
						failoverFormData.failover.e164 = '+1' + result[1];
					}
					else {
						failoverFormData.failover.e164 = '';
					}

					delete failoverFormData.rawInput;

					_.extend(dataNumber, failoverFormData);

					if(dataNumber.failover.e164 || dataNumber.failover.sip) {
						monster.ui.confirm(self.i18n.active().chargeReminder.line1 + '<br/><br/>' + self.i18n.active().chargeReminder.line2,
							function() {
								self.updateNumber(dataNumber.id, dataNumber,
									function(data) {
										var phoneNumber = monster.util.formatPhoneNumber(data.data.id),
											template = monster.template(self, '!' + self.i18n.active().successFailover, { phoneNumber: phoneNumber });

										toastr.success(template);

										popup.dialog('destroy').remove();

										callbacks.success && callbacks.success(data);
									},
									function(data) {
										monster.ui.alert(self.i18n.active().errorUpdate + '' + data.data.message);

										callbacks.error && callbacks.error(data);
									}
								);
							}
						);
					}
					else {
						monster.ui.alert(self.i18n.active().invalidFailoverNumber);
					}
				}
				else {
					monster.ui.alert(self.i18n.active().noDataFailover);
				}
			});

			popupHtml.find('.remove_failover').on('click', function(ev) {
				ev.preventDefault();

				delete dataNumber.failover;

				self.updateNumber(dataNumber.id, dataNumber,
					function(data) {
						var phoneNumber = monster.util.formatPhoneNumber(data.data.id),
							template = monster.template(self, '!' + self.i18n.active().successRemove, { phoneNumber: phoneNumber });

						toastr.success(template);

						popup.dialog('destroy').remove();

						callbacks.success && callbacks.success(data);
					},
					function(data) {
						monster.ui.alert(self.i18n.active().errorUpdate + '' + data.data.message);

						callbacks.error && callbacks.error(data);
					}
				);
			});

			popup = monster.ui.dialog(popupHtml, {
				title: self.i18n.active().failoverTitle,
				width: '540px'
			});
		},

		edit: function(args) {
			var self = this;

			self.getNumber(args.phoneNumber, function(dataNumber) {
				self.render(dataNumber.data, args.callbacks);
			});
		},

		getNumber: function(phoneNumber, success, error) {
			var self = this;

			monster.request({
				resource: 'failover.getNumber',
				data: {
					accountId: self.accountId,
					phoneNumber: encodeURIComponent(phoneNumber)
				},
				success: function(_data, status) {
					if(typeof success === 'function') {
						success(_data);
					}
				},
				error: function(_data, status) {
					if(typeof error === 'function') {
						error(_data);
					}
				}
			});
		},

		updateNumber: function(phoneNumber, data, success, error) {
			var self = this;

			monster.request({
				resource: 'failover.updateNumber',
				data: {
					accountId: self.accountId,
					phoneNumber: encodeURIComponent(phoneNumber),
					data: data
				},
				success: function(_data, status) {
					if(typeof success === 'function') {
						success(_data);
					}
				},
				error: function(_data, status) {
					if(typeof error === 'function') {
						error(_data);
					}
				}
			});
		}
	};

	return app;
});