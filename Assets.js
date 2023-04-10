var Game = window.Game || {
	includes: function(module)
	{
		return typeof this[module] == "object";
	}
};

Game.assets = {
	library: {},
	tags: {},
	
	images: {},
	audio: {},
	json: {},
	xml: {},
	
	requests: [],
	total: 0,
	loaded: 0,
	failed: 0,
	
	assetTypes: {
		jpg: "image",
		jpeg: "image",
		gif: "image",
		png: "image",
		bmp: "image",
		tif: "image",
		tiff: "image",
		svg: "image",
		
		mp3: "audio",
		ogg: "audio",
		m4a: "audio",
		mp4: "audio",
		flac: "audio",
		wav: "audio",
		alac: "audio",
		aiff: "audio",
		dsd: "audio",
		pcm: "audio",
		
		json: "json",
		xml: "xml"
	},
	
	add: function(name, sources, tags)
	{
		let request = {
			name: name, 
			sources: sources,
			type: ""			
		};
		
		if(Array.isArray(sources))			
			request.type = this.assetTypes[this.getExt(sources[0])];			
		else
			request.type = this.assetTypes[this.getExt(sources)];
		
		this.requests.push(request);
		
		this.addTagsFor(name, tags);
	},
	
	get: function(name)
	{
		let type = this.library[name];
				
		return this[type] ? this[type][name] : false;
	},
	
	createTag: function(tag)
	{		
		if(typeof tag == "string" && !this.tags[tag])
		{
			this.tags[tag] = [];
			
			return true;
		}
	},
	
	createTags: function(tags)
	{
		if(typeof tags == "string")
			tags.split(",").forEach((tag) => this.createTag(tag.trim()));
	},
	
	deleteTag: function(tag)
	{
		if(typeof tag == "string" && this.tags[tag])
		{
			delete this.tags[tag];
			
			return true;
		}
	},
	
	deleteTags: function(tags)
	{
		if(typeof tags == "string")
			tags.split(",").forEach((tag) => this.deleteTag(tag.trim()));;
	},
	
	addTagFor: function(name, tag)
	{
		if(typeof name == "undefined" || typeof tag == "undefined")
			return;
		
		this.createTag(tag);
		
		let index = this.tags[tag].indexOf(name);
		
		if(index == -1)
		{
			this.tags[tag].push(name);
			return true;
		}
	},
	
	addTagsFor: function(name, tags)
	{
		if(typeof name == "string" && typeof tag == "string")
			tags.split(",").forEach((tag) => this.addTagFor(name, tag.trim()));
	},
	
	removeTagFrom: function(name, tag)
	{
		if(typeof name == "undefined" || typeof tag == "undefined")
			return;
		
		let index = this.tags[tag].indexOf(name);
		
		if(index > -1)
		{
			this.tags.splice(index, 1);
			return true;
		}
	},
	
	removeTagsFrom: function(name, tags)
	{
		if(typeof name == "string" &&  typeof tags == "string")
			tags.split(",").forEach((tag) => this.removeTagFrom(name, tag.trim()));
	},
	
	getExt: function(src)
	{
		let extStartIndex = src.lastIndexOf(".") + 1;
		
		return extStartIndex > 0 ? src.substring(extStartIndex, src.length) : "";
	},
	
	load: function(callbacks)
	{
		if(typeof callbacks == "function")
		{
			callbacks = {
				load: callbacks
			};
		}
		
		let requests = this.requests, request, type;
		
		for(var i = 0, l = requests.length; i < l; i++)
		{
			request = requests[i];
			type = request.type;
			
			if(type == "image")
				this._loadImage(request, callbacks);
			else if(type == "audio")
				this._loadAudio(request, callbacks);
			else if(type == "json")
				this._loadJSON(request, callbacks);
			
			this.total++;
		}
	},
	
	_removeRequest: function(request)
	{
		let index = this.requests.indexOf(request);
		
		if(index > -1)
			this.requests.splice(index, 1);
	},
	
	_loadImage: function(request, callbacks)
	{
		var img = new Image(), name = request.name, src = request.sources
		
		img.addEventListener("load", () => {
			this.images[name] = img;
			this.library[name] = "images";
			
			this.loaded++;
			this._completionHandler("progress", callbacks, img);
		});
		
		img.addEventListener("error", () => {
			this.failed++;
			this._completionHandler("error", callbacks, img);
		});
		
		img.src = src;
	},
	
	_loadAudio: function()
	{},
	
	_loadJSON: function()
	{},
	
	_completionHandler: function(event, callbacks, asset)
	{
		if(!callbacks)
			return;
		
		let total = this.total, loaded = this.loaded;
		
		if(event == "progress" && callbacks.progress)
			callbacks.progress(loaded / total, asset);
		
		if(event == "error" && callbacks.error)
			callbacks.error(asset);
		
		if(loaded >= total && callbacks.load)
		{
			callbacks.load();
			
			this.requests.length = 0;
		}
	}
};