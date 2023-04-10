var Game = window.Game || {
	includes: function(module)
	{
		return typeof this[module] == "object";
	}
};

Game.ui = {
	mouse: {
		x: 0,
		y: 0,
		
		down: false,
		
		hoverTarget: null,
		
		isDown: function()
		{
			return this.down;
		},
		
		getHoverTarget: function()
		{
			return this.hoverTarget;
		}
	},
	
	keys: {
		isDown: function(...keys)
		{
			let self = this;
			
			return Array.prototype.every.call(keys, (key) => !!self[key]);
		},
	},
	
	elements: [],
	elementsByID: {},
	elementTypes: {},
	
	listeners: {},
	mouseEvents: ["click", "mousedown", "mouseup", "mousemove"],
	
	init: function(stage)
	{
		this.stage = stage;
		
		stage.addEventListener("mousemove", this.handleMouse.bind(this));
		stage.addEventListener("mousedown", this.handleMouse.bind(this));
		stage.addEventListener("mouseup", this.handleMouse.bind(this));
		stage.addEventListener("click", this.handleMouse.bind(this));
		
		addEventListener("keydown", this.handleKeypress.bind(this));
		addEventListener("keyup", this.handleKeypress.bind(this));
	},
	
	handleMouse: function(e)
	{
		let eventType = e.type, x = e.offsetX, y = e.offsetY;
		
		let mouse = this.mouse;
		
		if(eventType == "mousemove")
		{
			mouse.x = x;
			mouse.y = y;
			
			let elements = this.elements, hoverTarget;
			
			for(var i = 0, l = elements.length; i < l; i++)
			{
				element = elements[i];
				
				if(element && !mouse.hoverTarget && element.isAt(mouse.x, mouse.y))
					hoverTarget = element;
			}
		
			if(hoverTarget)
			{
				hoverTarget.trigger("mouseenter", mouse, mouse.x, mouse.y);
				
				mouse.hoverTarget = hoverTarget;
			}
			else if(mouse.hoverTarget && !mouse.hoverTarget.isAt(mouse.x, mouse.y))
			{
				mouse.hoverTarget.trigger("mouseleave", mouse, mouse.x, mouse.y);
				
				mouse.hoverTarget = null;
			}
			
			this.trigger("mousemove", mouse, x, y);
		}
		else if(eventType == "mousedown")
		{
			mouse.down = true;
			
			this.trigger("mousedown", mouse, x, y);
		}
		else if(eventType == "mouseup")
		{
			mouse.down = false;
			
			this.trigger("mouseup", mouse, x, y);
		}
		else if(eventType == "click")
		{
			this.trigger("click", mouse, x, y);
		}
	},
	
	handleKeypress: function(e)
	{
		let eventType = e.type, keys = this.keys, key = e.key.toLowerCase().replace(" ", "space");
	
		if(eventType == "keydown")
		{
			let heldDown = !!keys[key];
			
			keys[key] = true;
			
			this.trigger("keydown", keys, key);
			
			if(!heldDown)
				this.trigger("keypress", keys, key);
		}
		else if(eventType == "keyup")
		{
			delete keys[key];
			
			this.trigger("keyup", keys, key);
		}
	},
	
	on: function(event, callback, context)
	{
		let listeners = this.listeners, callbackId = context ? callback.bind(context) : callback;
		
		if(!listeners[event])
			listeners[event] = [];
		
		listeners[event].push(callbackId);
		
		return callbackId;
	},
	
	off: function(event, callbackId)
	{
		let listenerCallbacks = this.listeners[event];
		
		if(!callbackId)
		{
			listenerCallbacks.length = 0;
		}
		else if(listenerCallbacks && listenerCallbacks.length > 0)
		{
			let index = listenerCallbacks.indexOf(callbackId);
			
			if(index > -1)
			{
				listenerCallbacks.splice(index, 1);
				
				return true;
			}
		}
		
		return false;
	},
	
	trigger: function(event, ...data)
	{
		let listenerCallbacks = this.listeners[event];
		
		if(listenerCallbacks && listenerCallbacks.length > 0)
		{
			for(var i = 0, l = listenerCallbacks.length; i < l; i++)
			{
				listenerCallbacks[i](...data);
			}			
		}
		
		let elements = this.elements, mouseEvents = this.mouseEvents, isMouseEvent = mouseEvents.includes(event), mouse = this.mouse;
		
		let element;
		
		for(var i = 0, l = elements.length; i < l; i++)
		{
			element = elements[i]
			
			if(!element)
				break;
			
			if(isMouseEvent && !element.isAt(mouse.x, mouse.y))
				continue;
		
			element.trigger(event, ...data);
		}
	},
	
	define: function(name, config)
	{
		if(config)
		{
			config.name = name;
			config._super = config._super || this.Element;
			
			this.elementTypes[name] = {...this.Element, ...config};
			
			return true;
		}
		
		return false;
	},
	
	extend: function(type, name, config)
	{
		let elementType = this.elementTypes[type];
		
		if(elementType)
		{
			let _super = {...elementType};
	
			this.define(name, {..._super, ...config, _super: _super});
			
			return true;
		}
		
		return false;
	},
	
	create: function(name, config)
	{
		let elementType = this.elementTypes[name];
		
		if(!elementType)
		{
			this.define(name, config);
			
			elementType = this.elementTypes[name];
		}
	
		let element = Object.create({...elementType, ...config});
		element.listeners = {};
		
		let _super = element._super || this.Element, fn, fnString;
		
		for(var i in _super)
		{
			fn = element[i];
			
			if(typeof fn == "function" && typeof _super[i] == "function")
			{
				fnString = fn.toString();
				
				if(fnString.indexOf("_super") == -1)
					continue;
				
				element[i] = (function(context, fn, _super)
				{
					return function()
					{
						let originalValue = context._super;
						context._super = _super.bind(context);
						
						let result = fn.call(context, ...arguments);
						
						context._super = originalValue;
						
						return result;
					};
				})(element, fn, _super[i]);
			}
		}
				
		element.init(config);
		
		return element;
	},
	
	add: function(element)
	{		
		this.elements.push(element);
		
		if(element.id)
			this.elementsByID[element.uid] = element;
		
		return this;
	},
	
	addNew: function(name, config)
	{
		let element = this.create(name, config);
		
		this.add(element);
		
		return element;
	},
	
	remove: function(element)
	{
		if(element)
		{
			let index = this.elements.indexOf(element);
			
			if(index > -1)
			{
				this.elements.splice(index, 1);
				
				if(element.id)
					delete this.elementsByID[element.id];
				
				return true;
			}
		}
		
		return false;
	},
	
	removeAll: function()
	{
		this.elements.length = 0;
		this.elementsByID = {};
	},
	
	update: function(dt)
	{
		let elements = this.elements, element;
		
		for(var i = 0, l = elements.length; i < l; i++)
		{
			element = elements[i];
			
			if(element.update)
				element.update(dt);
		}
	},
	
	draw: function(ctx)
	{
		let elements = this.elements, element;
		
		for(var i = 0, l = elements.length; i < l; i++)
		{
			element = elements[i];
			
			if(!element.hidden && element.draw)
				elements[i].draw(ctx);
		}
	}
};

Game.ui.Element = {
	x: 0,
	y: 0,
	w: 0,
	h: 0,
	
	hidden: false,
	
	fill: "",
	stroke: "",
	
	color: "black",
	text: "",
	verticalAlign: "middle",
	textAlign: "center",
	textBaseline: "middle",
	
	fontSize: "16px",
	fontFamily: "Arial",
	fontWeight: "normal",
	
	image: null,
	cropX: null,
	cropY: null,
	cropW: null,
	cropH: null,
	
	init: function(config)
	{
		for(var i in config)
		{
			this[i] = config[i];
		}
	},
	
	on: function(event, callback, context)
	{			
		let callbackId = callback.bind(context || this);
	
		this.listeners[event] = this.listeners[event] || [];
		
		this.listeners[event].push(callbackId);
		
		return this;
	},
	
	off: function(event, callbackId)
	{
		let listenerCallbacks = this.listeners[event];
		
		if(listenerCallbacks && listenerCallbacks.length > 0)
		{				
			if(!callbackId)
			{
				listenerCallbacks.length = 0;
			}
			else {
				let index = listenerCallbacks.indexOf(callbackId);
				
				if(index > -1)
				{
					listenerCallbacks.splice(index, 1);
				}
			}
			
			return true;
		}
		
		return false;
	},
	
	trigger: function(event, ...data)
	{
		let listenerCallbacks = this.listeners[event];
	
		if(listenerCallbacks && listenerCallbacks.length > 0)
		{
			for(var i = 0, l = listenerCallbacks.length; i < l; i++)
			{
				listenerCallbacks[i](...data);
			}			
		}
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
	
	setPos: function(x, y)
	{
		this.x = x;
		this.y = y;
		
		return this;
	},
	setSize: function(w, h)
	{
		this.w = w;
		this.h = h;
		
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
	
	setText: function(text)
	{
		this.text = text + "";
		
		return this;
	},
	
	getText: function()
	{
		return this.text;
	},
	
	show: function()
	{
		this.hidden = false;
		
		return this;
	},
	
	hide: function()
	{
		this.hidden = true;
		
		return this;
	},
	
	toggle: function(forceState)
	{
		this.hidden = typeof forceState != "undefined" ? forceState : !this.hidden;
		
		return this;
	},
	
	isAt: function(px, py)
	{
		let x = this.getX(), y = this.getY(), w = this.getW(), h = this.getH();
		
		return x <= px && x + w >= px && y <= py && y + h >= py;
	},
	
	remove: function()
	{
		return Game.ui.remove(this);
	},
	
	setFill: function(color)
	{
		this.fill = color;
		
		return this;
	},
	
	setStroke: function(color)
	{
		this.stroke = color;
		
		return this;
	},
	
	draw: function(ctx)
	{
		let x = this.getX(), y = this.getY(), w = this.getW(), h = this.getH();
		
		ctx.fillStyle = this.fill;
		ctx.strokeStyle = this.stroke;
		
		ctx.beginPath();
		ctx.rect(x, y, w, h);
		
		if(this.fill)
			ctx.fill();
		
		if(this.stroke)
			ctx.stroke();
		
		if(this.text && this.text.length > 0)
		{
			ctx.fillStyle = this.color || "black";
			
			ctx.textAlign = this.textAlign;
			ctx.textBaseline = this.textBaseline;
			
			ctx.font = (this.fontWeight || "normal") + " " + this.fontSize + " " + this.fontFamily;
			
			let textX, textY
			
			if(!this.textAlign || this.textAlign == "center")
				textX = x + w / 2;
			else if(this.textAlign == "left")
				textX = x;
			else if(this.textAlign == "right")
				textX = x + w;
			
			if(!this.verticalAlign || this.verticalAlign == "middle")
				textY = y + h / 2;
			else if(this.verticalAlign == "top")
				textY = y;
			else if(this.verticalAlign == "bottom")
				textY = y + h;
			
			ctx.fillText(this.text, textX, textY, w);
		}
		
		// TO-DO: Update to include option to crop image onto destination
		if(this.image)
			ctx.drawImage(this.image, this.x, this.y, this.w, this.h);
	}
};

// Convenience methods

Game.on = function(event, callback, context)
{
	return this.ui.on(event, callback, context);
};

Game.off = function(event, callbackId)
{
	return this.ui.off(event, callbackId);
};

Game.trigger = function(event, ...args)
{
	return this.ui.trigger(event, ...args);
}