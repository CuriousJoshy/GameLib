var stage, ctx;

var WIDTH, HEIGHT;

var Game = {
	stage: null,
	context: null,
	
	width: null,
	height: null,
	
	counters: {},
	
	includes: function(module)
	{
		return typeof this[module] == "object";
	},
	
	init: function(options)
	{
		let boundsDefined = false, stage;
		
		if(options.stage)
		{
			if(typeof options.stage == "string")
				this.stage = document.getElementById(options.stage);
			else if(options.stage instanceof HTMLCanvasElement)
				this.stage = options.stage;
		
			if(this.stage)
				this.context = this.stage.getContext("2d");
			else if(options.context instanceof CanvasRenderingContext2D)
			{
				this.context = options.context;
				this.stage = this.context.canvas;
			}
			
			stage = this.stage;
		}
				
		if(stage)
		{
			if(typeof options.width != "undefined")
				stage.width = options.width;
			
			if(typeof options.height != "undefined")
				stage.height = options.height;
			
			if(this.includes("ui") && options.noUI != true)
			{
				this.ui.init(stage);
				
				this.ui.on("keypress", (...data) => Game.scene.trigger("keypress", ...data));
			}
			
			this.width = stage.width;
			this.height = stage.height;
			
			boundsDefined = true;
		}
		else if(typeof options.width == "undefined" && typeof options.height == "undefined")
		{
			this.width = options.width;
			this.height = options.height;
			
			boundsDefined = true;
		}
		
		if(boundsDefined && this.includes("map") && options.noMap != true)
		{
			this.map.init(this.width, this.height, typeof options.hashSize == "number" ? 
			options.hashSize : Math.max(this.width, this.height) / 10);
		}
		
		if(this.includes("scene") && options.scene)
			this.scene.enter(options.scene);
		
		if(this.includes("loop") && options.noLoop != true)
		{
			if(typeof options.fps == "number")
				this.loop.setFPS(options.fps);
			
			this.loop.onUpdate(this.update, Game);
			this.loop.onDraw(this.draw, Game);
			
			if(options.start)
				this.start();
		}
	},
	
	setCounter: function(name, startValue)
	{
		this.counters[name] = typeof startValue == "number" ? startValue : 0;
	},
	
	getCounter: function(name)
	{
		return this.counters[name];
	},
	
	hasCounter: function(name)
	{
		return typeof this.getCounter(name) == "number";
	},
	
	increaseCounter: function(name, amount)
	{
		if(this.hasCounter(name))
		{
			this.counters[name] += (typeof amount == "number") ? amount : 1;
		}
	},
	
	decreaseCounter: function(name, amount)
	{
		if(this.hasCounter(name))
		{			
			this.counters[name] -= (typeof amount == "number") ? amount : 1;
		}
	},
	
	getBounds: function()
	{
		if(this.stage)
			return {
				x: 0,
				y: 0,
				w: this.width,
				h: this.height
			};
	},
	
	update: function(dt)
	{
		if(this.scene)
			this.scene.update(dt);
		
		if(this.ui)
			this.ui.update(dt);
		
		if(this.updateFunc)
			this.updateFunc(dt);
	},
	
	draw: function()
	{
		let ctx = this.context;
		
		if(ctx)
		{
			if(this.scene)
				this.scene.draw(ctx);
			
			if(this.ui)
				this.ui.draw(ctx);
			
			if(this.drawFunc)
				this.drawFunc(ctx);
		}
	}
};