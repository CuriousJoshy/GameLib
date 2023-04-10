var Game = window.Game || {
	includes: function(module)
	{
		return typeof this[module] == "object";
	}
};

Game.loop = {
	running: false,
	
	currentTime: null,
	lastTime: null,
	delta: 0,
	
	tick: 0,
	frame: null,
	fps: 60,
	frameInterval: 1000 / 60 / 1000,
	
	updateFunc: null,
	drawFunc: null,
	
	start: function()
	{
		this.lastTime = performance.now();
		this.running = true;
		
		this.nextFrame();
	},
	
	stop: function()
	{
		cancelAnimationFrame(this.frame);
		this.running = false;
	},
	
	nextFrame: function(force)
	{		
		if(!force && this.isRunning())
			this.frame = requestAnimationFrame(this.nextFrame.bind(Game.loop, null));
	
		this.currentTime = performance.now();
		this.delta += this.currentTime - this.lastTime;
		
		if(force == true || this.delta >= this.frameInterval)
		{			
			if(this.updateFunc)
				this.updateFunc(this.frameInterval);
			
			if(!force && this.drawFunc)
				this.drawFunc();
			
			this.delta = 0;
		}
		
		this.lastTime = this.currentTime;
		this.tick++;
	},
	
	fastForward: function(numFrames)
	{
		let wasRunning = this.isRunning();
		
		if(wasRunning)
			this.stop();
				
		for(var i = 0; i < numFrames; i++)
		{
			this.nextFrame(true);
		}
			
		if(wasRunning)
			this.start();
	},
	
	isRunning: function()
	{
		return this.running;
	},
	
	setFPS: function(fps)
	{
		if(typeof fps != "number")
			throw new TypeError("FPS must be a number");
		
		this.fps = fps;
		this.frameInterval = 1000 / fps;
	},
	
	getFPS: function()
	{
		return this.fps;
	},
	
	onUpdate: function(callback, context)
	{
		this.updateFunc = callback.bind(context);
		
		return this;
	},
	
	onDraw: function(callback, context)
	{
		this.drawFunc = callback.bind(context);
		
		return this;
	}
};

// Convenience methods

Game.start = function(scene, ...args)
{
	if(this.scene)
		this.scene.enter(scene, ...args);
	
	this.loop.start();
};

Game.stop = function()
{
	this.loop.stop();
};

Game.setFPS = function(fps)
{
	this.loop.setFPS(fps);
};

Game.fastForward = function(numFrames)
{
	this.loop.fastForward(numFrames);
};