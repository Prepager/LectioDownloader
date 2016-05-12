// Variables
var buttons = document.getElementsByClassName('btn');
var tab = null;

// Tab
chrome.tabs.getSelected(function(tabs) {
	tab = tabs;
});

// Submit
var submitResponse = function() {
	// Message
	chrome.tabs.sendMessage(tab.id, {action: this.id, amount: document.getElementById('amount').value});
}

// Loop
for (var i = 0; i < buttons.length; i++) {
	buttons[i].addEventListener('click', submitResponse, false);
}

// Messages
chrome.extension.onMessage.addListener(
	function(request, sender, sendResponse) {
		document.getElementsByClassName('status')[0].innerHTML = request.text;
	}
);