var Game = window.Game || {
	includes: function(module)
	{
		return typeof this[module] == "object";
	}
};

Game.sheets = {
	library: {},

	create: function(name, options)
	{
		let sheet = new Game.sheets.Sheet(name, options);
		
		this.library[name] = sheet;
		
		return sheet;
	},
	
	get: function(name)
	{
		return this.library[name];
	},
	
	_cacheSprite: function(img, sx ,sy, sw, sh, w, h)
	{
		let canvas = document.createElement("canvas"),
		ctx = canvas.getContext("2d");
		
		canvas.width = w || sw;
		canvas.height = h || sh;
		
		ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
		
		return canvas;
	}
};

// Sheet Class

Game.sheets.Sheet = function(name, options)
{
	this.name = name;
	
	this.image = options.image;
	
	this.sprites = [];
	this.namedSprites = {};
	
	this.animations = {};
	
	let width = this.width = this.image.width;
	let height = this.height = this.image.height;
	
	let marginX = this.marginX = options.marginX || 0;
	let marginY = this.marginY = options.marginY || 0;
	
	let spacingX = this.spacingX = options.spacingX || 0;
	let spacingY = this.spacingY = options.spacingY || 0;
	
	let countX, countY, spriteW, spriteH;
	
	if(typeof options.countX != "undefined")
	{
		let usableW = width - (this.marginX + options.countX * this.spacingX),
			usableH = height - (this.marginY + options.countY * this.spacingY);
		
		spriteW = this.spriteW = usableW / options.countX;
		spriteH = this.spriteH = usableH / options.countY;
		
		countX = this.countX = options.countX;
		countY = this.countY = options.countY;
	}
	else {
		spriteW = this.spriteW = options.spriteW;
		spriteH = this.spriteH = options.spriteH;
		
		countX = this.countX = (this.width - this.marginX) / (this.spriteW + this.spacingX);
		countY = this.countY = (this.height - this.marginY) / (this.spriteH + this.spacingY);
	}
	
	let sprites = this.sprites, sprite;
	
	for(var y = 0, cy = countY; y < cy; y++)
	{			
		for(var x = 0, cx = countX; x < cx; x++)
		{
			sprites.push(new Game.sheets.Sprite(this.image, marginX + x * (spriteW + spacingX), marginY + y * (spriteH + spacingY), spriteW, spriteH));
		}
	}
	
	let named = options.sprites;
	
	if(named)
		this.nameSprites(named);
	
	let animations = options.animations;
	
	if(animations)
		this.defineAnimations(animations);
};

Game.sheets.Sheet.prototype = {
	nameSprite: function(name, x, y)
	{
		this.namedSprites[name] = this._getSpriteIndex(x, y);
	},
	
	nameSprites: function(dict)
	{
		for(var i in dict)
		{
			this.nameSprite(i, dict[i]);
		}
	},
	
	getSprite: function(x, y)
	{
		let index;
		
		if(typeof x == "string")
			index = this.namedSprites[x];
		else
			index = this._getSpriteIndex(x, y);
		
		return this.sprites[index];
	},
	
	getSprites: function(sprites)
	{		
		let list, result = [];
	
		if(Array.isArray(sprites))
			list = sprites;
		else if(arguments.length > 1)
			list = arguments;
		
		if(list)
		{
			for(var i = 0, l = list.length; i < l; i++)
			{
				result.push(this.getSprite(list[i]));
			}
		}
		
		return result;
	},
	
	defineAnimation: function(name, config)
	{
		if(!Game.animation)
			return false;
		
		if(name && config)
		{
			name = this.name+ "." + name;
			
			config.name = name;
			
			this.animations[name] = config;
			
			Game.animation.define(name, {
				duration: config.duration,
				frames: config.frames,
				
				loop: config.loop,
				loops: config.loops,
				
				resetOnCompletion: config.resetOnCompletion
			});
		}
		
		return true;
	},
	
	defineAnimations: function(dict)
	{
		for(var i in dict)
		{
			this.defineAnimation(i, dict[i]);
		}
	},
	
	drawSprite: function(ctx, index, x, y, w, h)
	{
		let sprite = this.getSprite(index);
		
		if(sprite && ctx)
		{
			sprite.draw(ctx, x, y, w, h);
		}
	},
	
	_getSpriteIndex: function(x, y)
	{
		let spriteIndex;
		
		if(typeof y == "undefined")
		{
			if(typeof x == "number")
			{
				spriteIndex = x;
			}
			else {
				if(Array.isArray(x))
				{
					y = x[1];
					x = x[0];
				}
				else if(typeof x == "object")
				{
					y = x.y;
					x = x.x;
				}
			}
		}
		
		if(typeof spriteIndex == "undefined")
			spriteIndex = y * this.countX + x;
		
		return spriteIndex;
	}
};

// Sprite Class

let degToRad = Math.PI / 180;

Game.sheets.Sprite = function(sourceImage, sx, sy, sw, sh, w, h)
{
	this.source = sourceImage;
	this.image = Game.sheets._cacheSprite(sourceImage, sx, sy, sw, sh, w || sw, h || sh);
	
	this.sx = sx;
	this.sy = sy;
	this.sw = sw;
	this.sh = sh;
		
	this.w = this.image.width;
	this.h = this.image.height;
};

Game.sheets.Sprite.prototype = {	
	draw: function(ctx, rect)
	{		
		let vx = 0, vy = 0, vz = 1;
		
		if(Game.includes("viewport"))
		{
			let view = Game.viewport;
			
			vx = view.getX();
			vy = view.getY();
			vz = view.getZoom();
		}
		
		x = ((rect.getX ? rect.getX() : rect.x) - vx) * vz;
		y = ((rect.getY ? rect.getY() : rect.y) - vy) * vz;
		w = (rect.getW ? rect.getW() : rect.w) * vz;
		h = (rect.getH ? rect.getH() : rect.h) * vz;
		rotation = rect.getRotation ? rect.getRotation() : rect.rotation;
		
		if(rotation && rotation % 360 != 0)
		{			
			let cx = x + w / 2,
			cy = y + h / 2;
						
			ctx.save();
				ctx.translate(cx, cy);
					ctx.rotate(rotation * degToRad);
				ctx.translate(-cx, -cy);
				
				ctx.drawImage(this.image, x, y, w, h);
			ctx.restore();
		}
		else
			ctx.drawImage(this.image, x, y, w, h);
	}
};

// Sprite Animation Class

Game.sheets.SpriteAnimation = function(config)
{
	this.sheet = config.sheet;
	this.frames = config.frames;
	
	this.frameRate = config.frameRate;
	
	this.currentFrame = 0;
};