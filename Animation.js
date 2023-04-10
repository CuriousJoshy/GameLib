var Game = window.Game || {
	includes: function(module)
	{
		return typeof this[module] == "object";
	}
};

Game.animation = {
	STOPPED: 0,
	PLAYING: 1,
	REVERSING: 2,
	PAUSED: 3,
	COMPLETE: 4,
	
	animations: {},
	
	define: function(name, config)
	{
		this.animations[name] = config;
	},
	
	// Creates a new Animation object either from the existing library via a string or from a dict. as an argument
	// Optionally, add custom properties to the animation to separate it from the base animation
	create: function(name, custom)
	{
		if(typeof name != "string" && typeof name != "object")
			throw new TypeError("Argument must be either a string or object");
		
		let anim = this.animations[name] || name;
		
		if(anim)
			return new Game.animation.Animation(anim, custom);
	},
	
	has: function(name)
	{
		return typeof this.animations[name] != "undefined";
	},
	
	get: function(name)
	{
		return this.animations[name];
	}
};

Game.animation.Animation = function(config, custom)
{
	let fps = Game.loop ? Game.loop.getFPS() : 60;
	
	// Copy any properties from custom object to config object if applicable
	if(typeof custom != "undefined")
		Object.assign(config, custom);
	
	this.duration = typeof custom || config.duration == "number" ? config.duration / 1000 * fps : 0;
	this.frames = config.frames;
	this.frameInterval = typeof config.frameInterval == "number" ? config.frameInterval / 1000 * fps : undefined;
	
	this.loop = config.loop || false;
	this.loops = config.loops;
	this.loopCount = 0;
	this.resetOnCompletion = typeof config.resetOnCompletion != "undefined" ? config.resetOnCompletion : true;
	
	this.updateFunc = config.onUpdate;
	this.completeFunc = config.onComplete;
	this.loopFunc = config.onLoop;
	
	this.frameCount = Array.isArray(config.frames) ? config.frames.length : config.frames;
		
	if(typeof this.frames == "undefined" && typeof this.frameInterval == "number")
	{
		this.frames = this.duration / this.frameInterval;
		this.frameCount = this.frames;
	}
	else if(typeof this.frames != "number" && typeof this.frameInterval == "undefined")
	{
		this.frameInterval = this.duration / this.frameCount;
	}
	else if(typeof this.duration == "undefined")
	{
		this.duration = this.frameInterval * this.frameCount;
	}
	else 
	{
		this.frames = this.duration;
		this.frameInterval = 1;
	}
		
	this.tick = 0;
	this.frame = 0;
};

Game.animation.Animation.prototype = {
	state: Game.animation.STOPPED,
	loop: false,
	
	play: function(startFrame)
	{
		this.state = Game.animation.PLAYING;
		this.goTo(startFrame);
	},
	
	reverse: function(startFrame)
	{
		this.state = Game.animation.REVERSING;
		this.goTo(startFrame);
	},
	
	pause: function()
	{
		this.state = Game.animation.PAUSED;
	},
	
	reset: function(useLastFrame)
	{
		if(useLastFrame)
		{
			this.frame = this.frameCount - 1;
			this.tick = this.frameInterval;
		}
		else
		{
			this.frame = 0;
			this.tick = 0;
		}
		
		this.loopCount = 0;
	},
	
	stop: function(useLastFrame)
	{
		this.state = Game.animation.STOPPED;
		
		this.reset(useLastFrame);
	},
	
	goTo: function(frame)
	{
		// Clamp value to keep frame number within animation limits
		this.frame = (typeof frame == "number") ? Math.max(Math.min(frame, this.frameCount - 1), 0) : this.frame;
	},
	
	getFrame: function(frame)
	{
		if(typeof frame == "undefined")
			frame = this.frame;
		
		return Array.isArray(this.frames) ? this.frames[frame] : frame;
	},
	
	isActive: function()
	{
		return this.state == Game.animation.PLAYING || this.state == Game.animation.REVERSING;
	},
	
	isPaused: function()
	{
		return this.state == Game.animation.PAUSED;
	},
	
	isStopped: function()
	{
		return this.state == Game.animation.STOPPED;
	},
	
	isComplete: function()
	{
		return this.state == Game.animation.COMPLETE;
	},
	
	update: function()
	{		
		if(this.state == Game.animation.PLAYING)
		{
			if(this.tick >= this.frameInterval)
			{
				this.frame++;
				
				if(this.frame >= this.frameCount - 1)
				{
					if(this.loop ? (typeof this.loops != "undefined" ? this.loopCount++ < this.loops : true) : false)
					{
						if(this.loopFunc)
							this.loopFunc(this.frame, this.tick, this.frameInterval);
						
						this.reset(true);
					}
					else	{
						if(this.resetOnCompletion)
							this.stop();
						else
							this.stop(true);
						
						this.state = Game.animation.COMPLETE;
						
						if(this.completeFunc)
							this.completeFunc(this.frame, this.tick, this.frameInterval);
					}
				}
				
				this.tick = 0;
			}
			else
				this.tick++;
			
			if(this.state != Game.animation.COMPLETE && this.updateFunc)
				this.updateFunc(this.frame, this.tick, this.frameInterval);
		}
		else if(this.state == Game.animation.REVERSING)
		{
			if(this.tick <= 0)
			{
				this.frame--;
				
				if(this.frame <= 0)
				{
					if(this.loop ? (typeof this.loops != "undefined" ? this.loopCount++ < this.loops : true) : false)
					{
						this.reset(true);
					}
					else
					{
						if(this.resetOnCompletion)
							this.stop(true);
						else
							this.stop();
						
						this.state = Game.animation.COMPLETE;
						
						if(this.completeFunc)
							this.completeFunc(this.frame, this.tick, this.frameInterval);
					}
				}
				
				this.tick = 0;
			}
			else
				this.tick--;
			
			if(this.state != Game.animation.COMPLETE && this.updateFunc)
				this.updateFunc(this.frame, this.tick, this.frameInterval);
		}
	},
	
	onUpdate: function(callback)
	{
		this.updateFunc = callback;
	},
	
	onLoop: function(callback)
	{
		this.loopFunc = callback;
	},
	
	onComplete: function(callback)
	{
		this.completeFunc = callback;
	}
};