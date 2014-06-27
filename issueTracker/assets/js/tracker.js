
function IssueTracker(items)
{	
	var self = this;
	var editor;
	this.classes = {
		warning: 'bg-warning',
		success: 'bg-success',
		information: 'bg-info',
		error: 'bg-danger',
		hidden: 'hidden',
	};
	this.views = {
		issue: 'issue',
		issues: 'issues',
		issuesOpenTab: "[id^='open-issues-tab']",
		issuesClosedTab: "[id^='closed-issues-tab']",
		issuesOpen: "[id^='open-issues']",
		issuesClosed: "[id^='closed-issues']",
		issueForm: "[id^='issues-form']",
		issueUpdateForm: "[id^='issues-update-form']",
		issueUpdateFormTab: "[id^='issues-update-form-tab']",
		issuesAlerts: "[id^='issues-alerts']",
		roles: {
			issues: "[role='entityIssues']"
		}
	};
	this.forms = {
		allowCreateUpdate: ['createIssue', 'updateIssue'],
		allowCreateUpdateTrigger: ['updateIssueTrigger'],
		actions : {
			create: '/issue/create',
			resolve: '/issue/resolve',
			close: '/issue/close',
			duplicate: '/flag/duplicate',
		},
		inputs : {
			unique: 'issueTracker-unique',
			pour: 'issueTracker-for',
			reply_to: 'issueTracker-reply_to',
			message: 'issueTracker-message'
		},
	};
	this.actions = {
		allowMeta: ['resolveIssue', 'closeIssue', 'duplicateIssue'],
		disabledOnClose: "disabledOnClose",
	};
	this.roles = {
		updateIssue: 'updateIssue',
		resolveIssue: 'resolveIssue',
		closeIssue: 'closeIssue',
		duplicateIssue: 'duplicateIssue',
	};
	this.defaultInit = [
		'initCreateUpdateTrigger',
		'initCreateUpdate',
		'initMeta',
	];

	this.init = function () {
		this.defaultInit.map(function (method, key) {
			if(typeof self[method] == 'function')
			{
				self[method]();
			}
		});
	}
	
	this.initCreateUpdate = function (containerId) {
		var container = $nitm.getObj((containerId == undefined) ? 'body' : containerId);
		this.forms.allowCreateUpdate.map(function (v) {
			container.find("form[role~='"+v+"']").map(function() {
				$(this).off('submit');
				$(this).on('submit', function (e) {
					e.preventDefault();
					self.operation(this);
				});
			})
		});
	}
	
	this.initCreateUpdateTrigger = function (containerId) {
		var container = $nitm.getObj((containerId == undefined) ? 'body' : containerId);
		this.forms.allowCreateUpdateTrigger.map(function (v) {
			container.find("[role~='"+v+"']").map(function() {
				switch(v)
				{
					case 'updateIssueTrigger':
					$(this).off('click');
					$(this).on('click', function (e) {
						e.preventDefault();
						$.post($(this).attr('href'), 
							function (result) {
								var tab = container.find(self.views.issueUpdateFormTab);
								var tabContent = $nitm.getObj(tab.attr('href'));
								tabContent.html(result);
								self.initCreateUpdate(tabContent.attr('id'));
								tab.removeClass('hidden');
								tab.tab('show');
						}, 'html');
					});
					break;
				}
			})
		});
	}
	
	this.initMeta = function (container) {
		var container = $((container == undefined) ? 'body' : container);
		this.actions.allowMeta.map(function (v) {
			container.find("[role~='"+v+"']").map(function() {
				$(this).off('click');
				$(this).on('click', function (e) {
					e.preventDefault();
					$.post($(this).attr('href'), 
						function (result) { 
							switch(result.action)
							{
								case 'close':
								self.afterClose(result);
								break;
								
								case 'resolve':
								self.afterResolve(result);
								break;
								
								case 'duplicate':
								self.afterDuplicate(result);
								break;
							}
						}, 'json');
				});
			});
		});
	}
	
	this.operation = function (form) {
		var _form = $(form);
		var parent = _form.parents(self.views.roles.issues);
		data = _form.serializeArray();
		data.push({'name':'__format', 'value':'json'});
		data.push({'name':'getHtml', 'value':true});
		data.push({'name':'do', 'value':true});
		data.push({'name':'ajax', 'value':true});
		switch(!_form.attr('action'))
		{
			case false:
			var request = $nitm.doRequest(_form.attr('action'), 
					data,
					function (result) {
						switch(result.action)
						{		
							case 'create':
							self.afterCreate(result, form);
							break;
								
							case 'update':
							self.afterUpdate(result, form);
							break;
						}
					},
					function () {
						$nitm.notify('Error Could not perform IssueTracker action. Please try again', self.classes.error, '#'+parent.attr('id')+' '+self.views.issuesAlerts);
					}
				);
				break;
		}
	}
	
	this.afterCreate = function(result, form) {
		var _form = $(form);
		var parent = _form.parents(self.views.roles.issues);
		if(result.success)
		{
			_form.get(0).reset();
			$nitm.notify("Added new issue. You can add another or view the newly added one", '#'+parent.attr('id')+' '+self.views.issuesAlerts);
			if(result.data)
			{
				var open = parent.find(self.views.issuesOpenTab).find('.badge');
				var openValue = (result.data == 1) ? Number(open.html())-1 : Number(open.html())+1;
				open.html(openValue);
			}
		}
		else
		{
			$nitm.notify("Couldn't create new issue", self.classes.error, '#'+parent.attr('id')+' '+self.views.issuesAlerts);
		}
	}
	
	this.afterUpdate = function (result, form) {
		var _form = $(form);
		var parent = _form.parents(self.views.roles.issues);
		if(result.success)
		{
			$nitm.notify("Updated issue sucessfully", self.classes.success, '#'+parent.attr('id')+' '+self.views.issuesAlerts);
			parent.find(self.views.issueUpdateFormTab).addClass('hidden');
		}
		else
		{
			$nitm.notify("Couldn't update the issue", self.classes.error, '#'+parent.attr('id')+' '+self.views.issuesAlerts);
		}
	}
	
	this.afterClose = function (result) {
		if(result.success)
		{
			var container = $nitm.getObj('#'+self.views.issue+result.id);
			var parent = container.parents(self.views.roles.issues);
			container.find("[role~='"+self.roles.updateIssue+"']").toggleClass(self.classes.hidden, result.data);
			var actionElem = container.find("[role~='"+self.roles.closeIssue+"']");
			actionElem.attr('title', result.title);
			actionElem.find(':first-child').replaceWith(result.actionHtml);
			container.removeClass().addClass(result.class);
			//Move elements between sections and update counters
			var open = parent.find(self.views.issuesOpenTab).find('.badge');
			var openValue = (result.data == 1) ? Number(open.html())-1 : Number(open.html())+1;
			open.html(openValue);
			var closed = parent.find(self.views.issuesClosedTab).find('.badge');
			var closedValue = (result.data == 0) ? Number(closed.html())-1 : Number(closed.html())+1;
			closed.html(closedValue);
			container.remove();
		}
	}
	
	this.afterResolve = function (result) {
		if(result.success)
		{
			var container = $nitm.getObj('#'+self.views.issue+result.id);
			container.removeClass().addClass(result.class);
			var actionElem = container.find("[role~='"+self.roles.resolveIssue+"']");
			actionElem.attr('title', result.title);
			actionElem.find(':first-child').replaceWith(result.actionHtml);
		}
	}
	
	this.afterDuplicate = function (result) {
		if(result.success)
		{
			var container = $nitm.getObj('#'+self.views.issue+result.id);
			container.removeClass().addClass(result.class);
			var actionElem = container.find("[role~='"+self.roles.duplicateIssue+"']");
			actionElem.attr('title', result.title);
			actionElem.find(':first-child').replaceWith(result.actionHtml);
		}
	}
}

$nitm.issueTracker = new IssueTracker();
$nitm.issueTracker.init();