// Message
chrome.extension.onMessage.addListener(
	function(request, sender, sendResponse) {

		// Variables
		var action = request.action;
		var amount = request.amount;

		// Action
		if(action == "opgaver") {
			downloadOpgaver(amount);
		}else{
			downloadDokumenter(amount);
		}
	}
);

// Opgaver
function downloadOpgaver(amount) {
	// URL
	var currentURL = $(location).attr('href');
	var URL = /^https:\/\/www.lectio.dk\/[^\?]*OpgaverElev.aspx*/;
	if(!URL.test($(location).attr('href')))
	{
		alert('Forkert URL. Besøg opgaver.');
		return;
	}

	// Message
	chrome.extension.sendMessage({text: 'Indlæser Opgaver'});

	// Variables
	var links = [];
	var downloads = [];
	var descriptions = [];

	// Elements
	var holder = $('#s_m_Content_Content_ExerciseGV tbody').first();
	var data = holder.children();
	data.splice(0, 1);

	// Assignments
	var minimalURL = currentURL.split('&')[0];
	var assignments = data;
	assignments.each(function() {
		// Variables
		var link = $(this).find('a').first();
		var href = link.attr('href');

		// Regex
		var folderID = /(&exerciseid.*)/
		var matches = href.match(folderID);

		// Visit
		var visit = (minimalURL+matches[1]).replace('OpgaverElev', 'ElevAflevering');
		var parent = $.trim(assignments.find('td:nth-child(2)').first().text());

		// Save
		links.push([parent, $.trim(link.text()), visit.toString()]);
	});

	// Message
	chrome.extension.sendMessage({text: 'Indlæser opgaver (0/'+links.length+')'});

	// Links
	var ajaxDone = 0;
	$.each(links, function(index, val) {
		// Variables
		value = val[2];

		// Ajax
		$.ajax({
			url: value,
			type: "get",
			success: function(data) {
				// Message
				ajaxDone++;
				chrome.extension.sendMessage({text: 'Indlæser opgaver ('+ajaxDone+'/'+links.length+')'});

				// Variables
				var _holder = $(data).find('#m_Content_RecipientGV');
				var _table = _holder.find('tbody')[0];

				// Items
				var _items = $(_table).find('tr');
				_items.splice(0, 1);

				// Loop
				_items.each(function(key) {
					// Variables
					var _download = $(this).find('a').first();
					var _name = _download.text();
					_download = _download.attr('href');

					// Missing
					if(!_download) {
						return true;
					}

					// Save
					downloads.push([val[0], val[1], $.trim('('+(key+1)+') '+_name), ('https://www.lectio.dk'+_download).toString()]);
				});

				// Info
				var _info = $(data).find('#m_Content_registerAfl_pa tbody').children();

				// Description
				var content = "";
				_info.each(function(key) {
					// Variables
					var _content = "";

					// Content
					_content = $.trim($(this).find('th').first().text())+' '+$.trim($(this).find('td').first().text());
					content = content+_content+'\n';
				});

				// Grade
				var grade = $(data).find('#m_Content_StudentGV tr:nth-child(2)');
				if(grade)
				{
					content = content+'Karakter: '+$.trim(grade.find('td:nth-child(6)').text())+'\n';
					content = content+$.trim(grade.find('td:nth-child(4)').text())+'\n';
				}

				// Files
				var files = [];
				var _infoFiles = $(_info[1]).find('a');
				_infoFiles.each(function(key) {
					// Variables
					var _name = $.trim($(this).text());
					var _download = $(this).attr('href');

					// Name
					var _regex = /[^.]*\.[^\s]*/
					var _name = _name.match(_regex)[0];

					// Save
					files.push([$.trim('('+(key+1)+') '+_name), ('https://www.lectio.dk'+_download).toString()]);
				});

				// Save
				descriptions.push([val[0], val[1], 'Opgaveoplysninger.txt', content, files]);
			}
		});
	});

	// Ajax
	var stepCount = 0;
	$(document).ajaxStop(function() {
		// Variables
		stepCount = Math.ceil(downloads.length/amount);
		downloadCount = 

		// Message
		chrome.extension.sendMessage({text: 'Downloader filer (0/'+downloads.length+')'});

		// Setup
		var zip = [];
		var _downloads = [];

		// Files
		$.each(downloads, function(index, value) {
			// Variables
			var _folder = value[0];
			var _assignment = value[1];
			var _file = value[2];
			var _link = value[3];

			// Replace
			_folder = _folder.replace(/(\s+|\/+)/g, '-');
			_assignment = _assignment.replace(/(\s+|\/+)/g, '-');

			_folder = _folder+'/'+_assignment+'/Afleveringer';

			// Folder
			_folder = _folder.replace('/[-]{2,}/g', '-');

			// Insert
			_downloads.push([_folder, _file, _link, 'url']);
		});

		$.each(descriptions, function(index, value) {
			// Variables
			var _folder = value[0];
			var _assignment = value[1];
			var _file = value[2];
			var _link = value[3];
			var _files = value[4];

			// Replace
			_folder = _folder.replace(/(\s+|\/+)/g, '-');
			_assignment = _assignment.replace(/(\s+|\/+)/g, '-');

			_folder = _folder+'/'+_assignment;
			_folder = _folder.replace('/[-]{2,}/g', '-');

			// Files
			$.each(_files, function(index, _value) {
				// Variables
				var __file = _value[0];
				var __link = _value[1];

				// Replace
				__file = __file.replace(/(\s+|\/+)/g, '-');

				// Insert
				_downloads.push([_folder, __file, __link, 'url']);
			});

			// Insert
			_downloads.push([_folder, _file, _link, 'text']);
		});

		// Downloads
		var downloadsDone = 0;
		var arrayDone = 0;
		$.each(_downloads, function(index, value) {
			// Variables
			var _folder = value[0];
			var _file = value[1];
			var _link = value[2];
			var _type = value[3]; 

			// Count
			arrayDone++;

			// Setup
			var _done = arrayDone;
			var _step = Math.floor(arrayDone/amount);
			if(zip[_step] == null)
			{
				zip[_step] = new JSZip();
			}

			// Content
			var _zip = zip[_step];
			if(_type == 'url') {
				// Binary
				JSZipUtils.getBinaryContent(_link, function (err, data) {
					// Error
					if(err) {
						throw err;
					}

					// Message
					downloadsDone++;
					chrome.extension.sendMessage({text: 'Downloader filer ('+downloadsDone+'/'+_downloads.length+')'});

					// Add
					_zip.file(_folder+'/'+_file, data, {
						binary: true
					});

					// Done
					if(downloadsDone == _downloads.length)
					{
						// Loop
						downloadZIP(zip, 0, zip.length, 'opgaver');
					}
				});
			}else{
				// File
				_zip.file(_folder+'/'+_file, _link);

				// Message
				downloadsDone++;
				chrome.extension.sendMessage({text: 'Downloader filer ('+downloadsDone+'/'+_downloads.length+')'});

				// Done
				if(downloadsDone == _downloads.length)
				{
					// Loop
					downloadZIP(zip, 0, zip.length, 'opgaver');
				}
			}
		});
	});
}

// Dokumenter
function downloadDokumenter(amount) {
	// URL
	var currentURL = $(location).attr('href');
	var URL = /^https:\/\/www.lectio.dk\/[^\?]*DokumentOversigt.aspx*/;
	if(!URL.test(currentURL))
	{
		alert('Forkert URL. Besøg dokumenter.');
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
			{
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
	chrome.extension.sendMessage({text: 'Indlæser mapper (0/'+links.length+')'});

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
				chrome.extension.sendMessage({text: 'Indlæser mapper ('+ajaxDone+'/'+links.length+')'});

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

					// Debug
					//if(downloads.length >= 150) { return false; }

					// Save
					downloads.push([val[0], $.trim(_name), ('https://www.lectio.dk'+_download).toString()]);
				});
			}
		});
	});

	// Ajax
	var stepCount = 0;
	$(document).ajaxStop(function() {
		// Variables
		stepCount = Math.ceil(downloads.length/amount);

		// Message
		chrome.extension.sendMessage({text: 'Downloader filer (0/'+downloads.length+')'});

		// Setup
		var zip = [];

		// Downloads
		var downloadsDone = 0;
		var arrayDone = 0;
		var zipDone = 0;
		$.each(downloads, function(index, value) {
			// Variables
			var _folder = value[0];
			var _file = value[1];
			var _link = value[2];
			arrayDone++;

			// Folder
			_folder = _folder.replace('/[-]{2,}/g', '-');

			// Setup
			var _done = arrayDone;
			var _step = Math.floor(arrayDone/amount);
			if(zip[_step] == null)
			{
				zip[_step] = new JSZip();
			}

			// Content
			var _zip = zip[_step];
			JSZipUtils.getBinaryContent(_link, function (err, data) {
				// Error
				if(err) {
					throw err;
				}

				// Message
				downloadsDone++;
				chrome.extension.sendMessage({text: 'Downloader filer ('+downloadsDone+'/'+downloads.length+')'});

				// Add
				_zip.file(_folder+'/'+_file, data, {
					binary: true
				});

				// Done
				if(downloadsDone == downloads.length)
				{
					// Loop
					downloadZIP(zip, 0, zip.length, 'dokumenter');
				}
			});
		});
	});
}

// Download
function downloadZIP(zip, current, max, name)
{
	// Check
	if(zip[current] == null) { return false; }
	value = zip[current];

	// Message
	chrome.extension.sendMessage({text: 'Genererer ZIP 0% ('+(current+1)+'/'+max+')'});

	// Save
	value.generateAsync({
		type: 'blob'
	}, function(data) {
		// Message
		chrome.extension.sendMessage({text: 'Genererer ZIP '+Math.round(data.percent)+'% ('+(current+1)+'/'+max+')'});
	}).then(function(content) {
		// Message
		chrome.extension.sendMessage({text: 'Downloader ZIP ('+(current+1)+'/'+max+')'});

		// Save
		var filesaver = saveAs(content, 'lectio-'+name+'-step'+(current+1)+'.zip');

		// Done
		filesaver.onwriteend = function() {
			if(current == max)
			{
				// Message
				chrome.extension.sendMessage({text: 'Download færdig...'});
			}else{
				// Restart
				downloadZIP(zip, current+1, max, name)
			}
		}
	});
}