// Message
chrome.extension.onMessage.addListener(
	function(request, sender, sendResponse) {

		// Variables
		var action = request.action;

		// Action
		if(action == "opgaver") {
			downloadOpgaver();
		}else{
			downloadDokumenter();
		}
	}
);

// Opgaver
function downloadOpgaver() {
	// Debug
	console.log('downloadOpgaver');

	// URL
	var URL = /^https:\/\/www.lectio.dk\/[^\?]*OpgaverElev.aspx*/;
	if(!URL.test($(location).attr('href')))
	{
		alert('Forkert URL.');
		return;
	}
}

// Dokumenter
function downloadDokumenter() {
	// Debug
	console.log('downloadDokumenter');

	// URL
	var currentURL = $(location).attr('href');
	var URL = /^https:\/\/www.lectio.dk\/[^\?]*DokumentOversigt.aspx*/;
	if(!URL.test(currentURL))
	{
		alert('Forkert URL.');
		return;
	}

	// Message
	chrome.extension.sendMessage({text: 'Indlæser foldere'});

	// Variables
	var links = [];
	var downloads = [];

	// Elements
	var holder = $('#s_m_Content_Content_FolderTreeView');
	var data = holder.children();
	data.splice(0, 1);

	// Folders
	var minimalURL = currentURL.split('&')[0];
	var folders = data.find('td.TreeNode');
	folders.each(function() {
		// Variables
		var link = $(this).children('a').first();
		var href = link.attr('href');

		// Regex
		var folderID = /TREECLICKED_([^']*)/
		var matches = href.match(folderID);

		// Modify
		var visit = minimalURL+'&folderid='+matches[1];

		// Path
		var path = $.trim(link.text());
		var cur = link;

		// Check
		if(path.indexOf('...') >= 0 && link.attr('rel'))
		{
			path = $.trim(link.attr('rel').replace('Mappenavn: ', ''));
		}
		path = path.replace(/(\s+|\/+)/g, '-');

		// Loop
		var active = true;
		while(active) {
			// Variables
			var div = cur.parents('div').first();

			// Check
			if(div.attr('id') == "s_m_Content_Content_FolderTreeView")
			{$
				// Stop
				active = false;
				break;
			}

			// Replace
			var replaced = (div.attr('id')).toString();
			replaced = replaced.replace('Viewn', 'Viewt');
			replaced = replaced.replace('Nodes', '');

			// Find
			var parent = $('a#'+replaced);
			if(parent.length == 0)
			{
				// Stop
				active = false;
				break;
			}

			// Path
			var parentPath = $.trim(parent.text())
			if(parentPath.indexOf('...') >= 0 && parent.attr('rel'))
			{
				parentPath = $.trim(parent.attr('rel').replace('Mappenavn: ', ''));
			}

			// Save
			path = parentPath.replace(/(\s+|\/+)/g, '-')+'/'+path

			// Update
			cur = parent;
		}

		// Save
		links.push([path, visit.toString()]);
	});

	// Message
	chrome.extension.sendMessage({text: 'Indlæser filer (0/'+links.length+')'});

	// Links
	var ajaxDone = 0;
	$.each(links, function(index, val) {
		// Variables
		value = val[1];

		// Ajax
		$.ajax({
			url: value,
			type: "get",
			success: function(data) {
				// Message
				ajaxDone++;
				chrome.extension.sendMessage({text: 'Indlæser filer ('+ajaxDone+'/'+links.length+')'});

				// Variables
				var _holder = $(data).find('td.documentFolderContent');
				var _table = _holder.find('table')[1];

				// Items
				var _items = $(_table).find('tr');
				_items.splice(0, 1);

				// Loop
				_items.each(function() {
					// Variables
					var _download = $(this).find('a').first();
					var _name = _download.text();
					_download = _download.attr('href');

					// Save
					downloads.push([val[0], $.trim(_name), ('https://www.lectio.dk'+_download).toString()]);
				});
			}
		});
		//return false;
	});

	// Ajax
	$(document).ajaxStop(function() {
		// Message
		chrome.extension.sendMessage({text: 'Downloader filer (0/'+downloads.length+')'});

		// Setup
		var zip = new JSZip();

		// Downloads
		var downloadsDone = 0;
		$.each(downloads, function(index, value) {
			// Variables
			var _folder = value[0];
			var _file = value[1];
			var _link = value[2];

			// Content
			JSZipUtils.getBinaryContent(_link, function (err, data) {
				// Error
				if(err) {
					throw err;
				}

				// Message
				downloadsDone++;
				chrome.extension.sendMessage({text: 'Downloader filer ('+downloadsDone+'/'+downloads.length+')'});

				// Add
				zip.file(_folder+'/'+_file, data, {
					binary: true
				});

				// Done
				if(downloadsDone == downloads.length)
				{
					// Message
					chrome.extension.sendMessage({text: 'Genererer ZIP'});

					// Save
					zip.generateAsync({
						type: 'blob'
					}).then(function(content) {
						// Message
						chrome.extension.sendMessage({text: 'Downloader ZIP'});

						// Save
						saveAs(content, "lectio-dokumenter.zip");
					});
				}
			});
		});
	});
}
















