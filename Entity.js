var Game = window.Game || {
	includes: function(module)
	{
		return typeof this[module] == "object";
	}
};

Game.entity = {
	noinit: "@no-init",
	
	globalID: -1,
	
	classes: {},
	
	entities: [],
	entitiesById: {},
	
	// Stores known z-indices and creates an array to render entities in order of back to front
	renderStack: {},
	
	pools: {},
	
	showHitboxes: false,
	
	useRenderStack: true,
	
	define: function(name, proto)
	{	
		return this.extend("Entity", name, proto);
	},
	
	extend: function(parent, name, proto)
	{
		if(!this.classes[parent])
			return;
		
		let superclass = new (this.classes[parent])(Game.entity.noinit);
		
		let klass = this.classes[name] = function(init)
		{			
			if(init != Game.entity.noinit && this.init)
			{
				if(typeof this.sheet == "string" && Game.includes("sheets"))
				{				
					this.sheet = Game.sheets.get(this.sheet);
				}
				
				this.init(...arguments);
			}
		};
		
		let val, fnStr, _superFn;
		
		for(var i in proto)
		{			
			val = proto[i];
			
			if(typeof val == "function" && typeof superclass[i] == "function")
			{
				fnStr = val.toString();
				_superFn = superclass[i];
				
				if(fnStr.includes("_super"))
				{					
					proto[i] = (function(fn, _superFn)
					{
						return function()
						{
							this._super = _superFn;
							
							let returnVal = fn.call(this, ...arguments);
							
							this._super = null;
							
							return returnVal;
						};
					})(val, _superFn);
				}
			}
		}
		
		klass.prototype = Object.assign(superclass, proto, {name: name});
		
		return klass;
	},
	
	create: function(name, ...args)
	{
		let pool = this.pools[name];
		
		// If an entity pool exists for named entity, begin recycling from pool before creating new entity from scratch
		if(pool && pool.length > 0)
		{
			// Recycles entities on a first in first out basis
			let e = pool.shift();
			
			// Set removal flag to false and initiate entity returning it
			e.__flagged = false;
			e.init(...args);
			
			return e;
		}
		else
		{
			let klass = this.classes[name];
			
			if(!klass)
				return;
			
			return new klass(...args);
		}
	},
	
	add: function(...entities)
	{
		let map = Game.map;
		
		if(entities.length == 1)
		{
			let entity = entities[0]
			
			if(entity && this.entities.indexOf(entity) == -1)
			{
				entity.uid = ++this.globalID;
				
				this.entities.push(entity);
				
				if(map)
					Game.map.add(entity);
			}
		}
		else
		{
			for(var i = 0, l = entities.length; i < l; i++)
			{
				this.add(entities[i]);
			}
		}
		
		return this;
	},
	
	// Creates and adds a new entity rather than calling "create" then "add" individually for efficiency
	addNew: function(name, ...args)
	{
		let entity = this.create(name, ...args);
		
		this.add(entity);
		
		return entity;
	},
	
	remove: function(...entities)
	{		
		if(entities.length == 1)
		{
			let entity = entities[0], index = this.entities.indexOf(entity);
			
			if(index > -1)
			{
				entity.__flagged = true;
			}
		}
		else
		{
			for(var i = 0, l = entities.length; i < l; i++)
			{
				this.remove(entities[i]);
			}
		}
		
		return this;
	},
	
	removeAll: function()
	{
		this.remove(...this.entities);
	},
	
	byId: function(...ids)
	{
		if(ids.length == 1)
			return this.entitiesById[ids[0]];
		
		let result = [];
			
		Array.prototype.forEach.call(...ids, id => this.entitiesById[id] && result.push(this.entitiesById[id]));
		
		return result;
	},
	
	byName: function(...names)
	{
		names = Array.from(names);
				
		return this.entities.filter(entity => names.indexOf(entity.name) != -1);
	},
	
	count: function(...names)
	{
		return this.byName(...names).length;
	},
	
	toggleHitboxes: function(forceState)
	{
		if(typeof forceState != "undefined")
		{
			this.showHitboxes = forceState;
		}
		else
			this.showHitboxes = !this.showHitboxes;
		
		return this.showHitboxes;
	},
	
	update: function(dt)
	{
		let entities = this.entities, entity;
		let map = Game.map, animation = Game.animation, entityAnim;
		
		let flagged = [];
		
		// Reset render stack to recalculate z-indices
		let renderStack = this.renderStack = {};
		
		for(var i = 0, l = entities.length; i < l; i++)
		{
			entity = entities[i];
			
			if(entity)
			{
				if(!entity.__flagged && entity.update)
				{
					entity.update(dt);
					
					entityAnim = entity.animation;
					
					if(animation && entityAnim)
					{
						if(entityAnim.isActive())
						{
							entityAnim.update(dt);
							
							entity.sprite = entityAnim.getFrame();
						}
					}
				}
			
				if(entity.__flagged)
					flagged.push(entity);
				else {
					if(map)
						map.refresh(entity);
					
					if(this.useRenderStack)
					{
						let zIndex = (entity.zIndex || 0).toString();
						
						if(!Array.isArray(renderStack[zIndex]))
							renderStack[zIndex] = [entity];
						else
							renderStack[zIndex].push(entity);
					}
				}
			}
		}
		
		this._purgeEntityList(flagged);
	},
	
	drawType: function(name, ctx)
	{
		let result = this.byName(name);
		
		if(result && result.length > 0)
		{
			this.draw(ctx, result, name)
		}
	},
	
	// Draw all entities if no argument is provided, a singular entity, or an array of entities
	draw: function(ctx, entities, type)
	{
		if(typeof entities != "undefined" && Array.isArray(entities) == false)
			entities = [entities];
		
		if(this.useRenderStack && typeof entities == "undefined")
		{
			// Take the render stack and sort the zIndex keys so that they are in numerical order
			let renderStack = this.renderStack, 
			renderOrder = Object.keys(renderStack).sort((a, b) => parseInt(b) - parseInt(a));
			
			for(var i = 0, l = renderOrder.length; i < l; i++)
			{				
				this.draw(ctx, renderStack[renderOrder[i]], type);
			}			
		}
		else {
			entities = entities || this.entities;
			let entity;
		
			let showHitboxes = this.showHitboxes;
			let rect;
			
			for(var i = 0, l = entities.length; i < l; i++)
			{
				entity = entities[i];
				
				/*
				if(typeof type == "string" && !entity.isA(type))
					continue;
				*/
				
				if(entity.hidden != true)
				{
					if(entity.handleDraw)
						entity.handleDraw(ctx);
					else if(entity.sheet && entity.sprite)
						entity.drawSprite(ctx);
					else if(entity.draw)
						entity.draw(ctx);
				}
				
				// Show hitboxes if flag is true and entity is collidable
				if(showHitboxes && entity.collidable)
				{
					rect = entity.getBoundingRect ? entity.getBoundingRect() : entity;
					
					ctx.strokeStyle = entity.hitboxColor || "white";
					ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
				}
			}
		}
	},
	
	_purgeEntityList: function(entities)
	{		
		if(Array.isArray(entities) && entities.length > 0)
		{
			let map = Game.map;
			let pools = this.pools, pool;
			let entity, index;
			
			for(var i = 0, l = entities.length; i < l; i++)
			{
				entity = entities[i];
				pool = pools[entity.name];
				
				index = this.entities.indexOf(entity);
				
				if(index > -1)
				{
					this.entities.splice(index, 1);
					
					if(entity.id)
						delete this.entitiesById[entity.id];
					
					if(map)
						Game.map.remove(entity);
					
					// If entity has .pool flag, create pool if it doesn't exist and add subsequent entities to pool
					if(pool)
						pool.push(entity);
					else if(!pool && entity.pool)
						pool = this.pools[entity.name] = [entity];
				}
			}
		}
	}
};

Game.entity.Entity = function(init)
{
	if(init != Game.entity.noinit && this.init)
	{		
		this.init(...arguments);
	}
};

Game.entity.Entity.prototype = {
	name: "Entity",
	
	color: "black",
	
	zIndex: 0,
	
	x: 0,
	y: 0,
	w: 0,
	h: 0,
	
	rotation: 0,
	
	vx: 0,
	vy: 0,
	
	collidable: true,
	
	init: function()
	{},
	
	isA: function(name)
	{
		return this.name == name;
	},
	
	setId: function(id)
	{
		if(this.id)
			delete Game.entities.entitiesById[this.id]
		
		this.id = id;
		
		Game.entity.entitiesById[id] = this;
		
		return this;
	},
	
	setX: function(x)
	{
		this.x = x;
		
		return this;
	},
	
	setY: function(y)
	{
		this.y = y;
		
		return this;
	},
	
	setPos: function(x, y)
	{
		this.x = x;
		this.y = y;
		
		return this;
	},
	
	centerOn: function(x, y)
	{
		this.setPos(this.getX() + this.getW() / 2, this.getY() + this.getH() / 2);
	},
	
	shiftX: function(x)
	{
		return this.setX(this.x + x);
	},
	
	shiftY: function(y)
	{
		return this.setY(this.y + y);
	},
	
	shift: function(x, y)
	{
		return this.setPos(this.x + x, this.y + y);
	},
	
	setW: function(w)
	{
		this.w = w;
		
		return this;
	},
	setH: function(h)
	{
		this.h = h;
		
		return this;
	},
	setSize: function(w, h)
	{
		this.w = w;
		this.h = h;
		
		return this;
	},
	
	setVx: function(vx)
	{
		this.vx = vx;
		
		return this;
	},
	setVy: function(vy)
	{
		this.vy = vy;
		
		return this;
	},
	setVel: function(vx, vy)
	{
		this.vx = vx;
		this.vy = vy;
		
		return this;
	},
	
	setRotation: function(deg)
	{
		this.rotation = deg;
		
		return this;
	},
	
	getX: function()
	{
		return this.x;
	},
	getY: function()
	{
		return this.y;
	},
	
	getW: function()
	{
		return this.w;
	},
	getH: function()
	{
		return this.h;
	},
	
	getVx: function()
	{
		return this.vx;
	},
	getVy: function()
	{
		return this.vy;
	},
	
	getRotation: function()
	{
		return this.rotation;
	},
	
	getBoundingRect: function()
	{
		return {
			x: this.x,
			y: this.y,
			w: this.w,
			h: this.h
		};
	},
	
	isAt: function(x, y)
	{
		let rect = this.getBoundingRect();
		
		return rect.x <= x && rect.x + rect.w >= x && rect.y <= y && rect.y + rect.h >= y;
	},
	
	// Returns all entities that overlap at least 1 spatial hash cell with this entity. Requires Map.js to function
	getNearby: function()
	{
		return Game.map ? Game.map.search(this) : null;
	},
	
	// Tests if an entity or rect shares a spatial hash cell with this entity. Requires Map.js to function
	isNearby: function(e)
	{
		if(Game.map)
		{
			let selfOccupied = this.occupied, eOccupied = e.occupied;
			
			for(var i = 0, l = selfOccupied.length; i < l; i++)
			{
				if(eOccupied.indexOf(selfOccupied[i]) > -1)
					return true;
			}
			
			return false;
		}
		
		return null;
	},
	
	// Find all entities that overlap this entity in the Spatial Hash. Requires Map.js to function.
	findOverlapping: function()
	{
		return Game.map ? Game.map.findOverlapping(this) : [];
	},
	
	collidingWith: function(rectB)
	{
		if(this.collidable == false || rectB.collidable == false)
			return false;
		
		if(typeof rectB == "object")
		{
			let rectA = this.getBoundingRect();
			
			if(rectB.getBoundingRect)
				rectB = rectB.getBoundingRect();
			
			return rectA.x <= rectB.x + rectB.w && rectA.x + rectA.w >= rectB.x && rectA.y <= rectB.y + rectB.h && rectA.y + rectA.h >= rectB.y;
		}
		else if(typeof rectB == "string" && Game.map)
		{
			let nearby = this.getNearby();
			
			for(var i = 0, l = nearby.length; i < l; i++)
			{
				if(nearby[i].isA(rectB) && this.collidingWith(nearby[i]))
					return true;
			}
		}
		else if(Array.isArray(rectB))
		{
			for(var i = 0, l = rectB.length; i < l; i++)
			{
				if(this.collidesWith(rectB))
					return true;
			}
		}
			
		return false;
	},
	
	// Adapted from https://somethinghitme.com/2013/04/16/creating-a-canvas-platformer-tutorial-part-tw/
	hitTest: function(rectB)
	{
		let rectA = this.getBoundingRect();
		
		if(rectB.getBoundingRect)
			rectB = rectB.getBoundingRect();
		
		// get the vectors to check against
		var vX = (rectA.x + (rectA.w / 2)) - (rectB.x + (rectB.w / 2)),
			vY = (rectA.y + (rectA.h / 2)) - (rectB.y + (rectB.h / 2)),
			// add the half widths and half heights of the objects
			hWidths = (rectA.w / 2) + (rectB.w / 2),
			hHeights = (rectA.h / 2) + (rectB.h / 2),
			colDir = null,
			colAdj = null;

		// if the x and y vector are less than the half width or half height, they we must be inside the object, causing a collision
		if (Math.abs(vX) < hWidths && Math.abs(vY) < hHeights) {
			// figures out on which side we are colliding (top, bottom, left, or right)
			var oX = hWidths - Math.abs(vX),
				oY = hHeights - Math.abs(vY);
			if (oX >= oY) {
				if (vY > 0) {
					colDir = "top";
					colAdj = oY;
				} else {
					colDir = "bottom";
					colAdj = -oY;
				}
			} else {
				if (vX > 0) {
					colDir = "left";
					colAdj = oX;
				} else {
					colDir = "right";
					colAdj = -oX;
				}
			}
		}
		
		return colDir ? {
			direction: colDir,
			adjustment: colAdj
		} : false;
	},
	
	play: function(name, startFrame)
	{				
		if(Game.includes("sheets") && Game.includes("animation"))
		{
			let anim = this.sheet.name + "." + name;
			
			if(Game.animation.has(anim))
			{
				let prevInst = this.animation;
				
				// If the named animation is the same as what is already cached, keep the cached instance rather than creating a new one
				let instance = (prevInst && prevInst.name == anim) ? prevInst : Game.animation.create(anim, {
					onUpdate: this.onAnimationUpdate,
					onLoop: this.onAnimationLoop,
					onComplete: this.onAnimationComplete
				});
				
				instance.play(startFrame);
				
				this.animation = instance;
				
				return true;
			}
		}
				
		return false;
	},
	
	reverse: function(name, startFrame)
	{
		if(Game.includes("sheets") && Game.includes("animation"))
		{
			let anim = this.sheet.name + "." + name;
			
			if(Game.animation.has(anim))
			{
				let prevInst = this.animation;
				
				// If the named animation is the same as what is already cached, keep the cached instance rather than creating a new one
				let instance = (prevInst && prevInst.name == anim) ? prevInst : Game.animation.create(anim, {
					onUpdate: this.onAnimationUpdate,
					onLoop: this.onAnimationLoop,
					onComplete: this.onAnimationComplete
				});
				
				instance.reverse(startFrame);
				
				this.animation = instance;
				
				return true;
			}
		}
		
		return false;
	},
	
	pause: function()
	{
		if(!Game.includes("animation") || !this.animation)
			return false;
		
		this.animation.pause();
		
		return true;
	},
	
	resetAnimation: function(useLastFrame)
	{
		if(!Game.includes("animation") || !this.animation)
			return false;
		
		this.animation.reset(useLastFrame);
		
		return true;
	},
	
	stop: function(useLastFrame)
	{
		if(!Game.includes("animation") || !this.animation)
			return false;
		
		this.animation.stop(useLastFrame);
		
		return true;
	},
	
	setAnimationFrame: function(frame)
	{
		if(!Game.includes("animation") || !this.animation)
			return false;
		
		this.animation.goTo(useLastFrame);
		
		return true;
	},
	
	draw: function(ctx)
	{
		let vx = 0, vy = 0, vz = 1;
		
		if(Game.includes("viewport"))
		{
			let view = Game.viewport;
			
			vx = view.getX();
			vy = view.getY();
			vz = view.getZoom();
		}
		
		x = (this.getX() - vx) * vz;
		y = (this.getY() - vy) * vz;
		w = this.getW() * vz;
		h = this.getH() * vz;
		
		ctx.fillStyle = this.color;
		
		ctx.fillRect(x, y, w, h);
	},
	
	// Draws the current sprite or the sprite of choice. Requires Sheets.js and the .sheet property to be defined
	// Optional rect argument to define custom size and position for sprite
	drawSprite: function(ctx, sprite, rect)
	{
		if(this.sheet && Game.sheets)
		{
			this.sheet.getSprite(sprite || this.sprite).draw(ctx, rect || this);
		}
	},
	
	remove: function()
	{
		Game.entity.remove(this);
		
		return this;
	}
};

// Convenience methods

Game.define = (...args) => Game.entity.define(...args);

Game.create = (...args) => Game.entity.create(...args);

Game.add = (...args) => Game.entity.add(...args);

Game.addNew = (...args) => Game.entity.addNew(...args);

Game.remove = (...args) => Game.entity.remove(...args);

Game.removeAll = (...args) => Game.entity.removeAll(...args);

Game.toggleHitboxes = function(forceState)
{
	return this.entities.toggleHitboxes(forceState);
};

Game.entity.classes.Entity = Game.entity.Entity;