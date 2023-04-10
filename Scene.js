var Game = window.Game || {
	includes: function(module)
	{
		return typeof this[module] == "object";
	}
};

Game.scene = {
	scenes: [],
	currentScene: null,
	
	define: function(name, config)
	{
		if(config)
		{
			config.name = name;
			
			this.scenes[name] = config;
		}
	},
	
	enter: function(name, ...args)
	{
		let scene = this.get(name);
		
		if(scene)
		{
			let lastScene = this.currentScene;
			
			this.currentScene = scene;
			
			if(scene.enter)
				scene.enter(lastScene, ...args);
			
			return true;
		}
		
		return false;
	},
	
	exit: function(...args)
	{
		let scene = this.get();
		
		if(scene)
		{			
			if(scene.exit)
				scene.exit(...args);
			
			this.currentScene = null;
			
			return true;
		}
		
		return false;
	},
	
	/*
		Scene.changeTo changes the current scene but also completely exits out of the previous scene unlike using Scene.enter
	*/
	changeTo: function(name, ...args)
	{
		let lastScene = this.get(),
		scene = this.get(name);
		
		if(scene)
		{
			
			if(lastScene && lastScene.exit)
			{
				lastScene.exit(...args);
			}
			
			if(scene.enter)
				scene.enter(lastScene ? lastScene.name : "", ...args);
			
			this.currentScene = scene;
			
			return true;
		}
		
		return false;
	},
	
	/*
		Trigger an event for the current scene
		Return true if the event successfully triggers, false otherwise
	*/
	trigger: function(eventName, ...data)
	{
		let scene = this.get();
		
		if(scene && scene[eventName])
		{
			scene[eventName](...data);
			
			return true;
		}
		
		return false;
	},
	
	is: function(name)
	{
		let scene = this.get();
		
		return scene && scene.name == name;
	},
	
	get: function(name)
	{
		return this.scenes[name] || this.currentScene;
	},
	
	execute: function(name, method, ...args)
	{
		let scene = this.get(name);
		
		if(scene && scene.method)
		{
			return scene.method(...args);
		}
	},
	
	update: function(dt)
	{
		let scene = this.get();
		
		if(scene && scene.update)
		{
			scene.update(dt);			
		}
	},
	
	draw: function(ctx)
	{
		let scene = this.get();
		
		if(scene && scene.draw)
		{
			scene.draw(ctx);			
		}
	}
};