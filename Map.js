var Game = window.Game || {
	includes: function(module)
	{
		return typeof this[module] == "object";
	}
};

Game.map = {
	initiated: false,
	
	cells: [],
	hashList: [],
	
	globalHashId: 0,
	
	width: 0,
	height: 0,
	cellSize: 0,
	
	init: function(width, height, cellSize)
	{
		this.width = width;
		this.height = height;
		this.cellSize = cellSize;
		
		this.cellsX = Math.ceil(width / cellSize);
		this.cellsY = Math.ceil(height / cellSize);
		
		this.initiated = true;
		
		this.cells = new Array(this.cellsX * this.cellsY);
	},
	
	add: function(o)
	{
		let key = this.key(o);
		
		if(this.initiated && key)
		{
			let cells = this.cells, cellsX = this.cellsX, cellsY = this.cellsY, pos, cell;
			
			let x1 = key.x1, y1 = key.y1, x2 = key.x2, y2 = key.y2;
			
			if(o.occupied)
				o.occupied.length = 0;
			else
				o.occupied = [];
			
			if(typeof o.hashID == "undefined")
				o.hashId = this.globalHashId++;
			
			for(var y = y1; y <= y2; y++)
			{
				if(y < 0 || y >= cellsY)
					continue;
				
				for(var x = x1; x <= x2; x++)
				{				
					if(x < 0 || x >= cellsX)
						continue;
			
					pos = this.getCellPos(x, y);
					
					if(Array.isArray(cells[pos]) == false)
						cells[pos] = [];
					
					cells[pos].push(o);
					o.occupied.push(pos);
				}
			}
			
			return true;
		}
		
		return false;
	},
	
	remove: function(o)
	{
		if(this.initiated && o)
		{
			let cells = this.cells, occupied = o.occupied;
			
			if(occupied)
			{
				let l = occupied.length, cell, pos;
				
				if(l > 0)
				{
					for(var i = 0; i < l; i++)
					{
						pos = occupied[i];
						
						cell = cells[pos];
						
						if(!cell)
							continue;
						
						cell.splice(cell.indexOf(o), 1);
						
						if(cell.length === 0)
							cells[pos] = null;
					}
				}
			}
			
			o.occupied.length = 0;
			
			return true;
		}
		
		return false;
	},
	
	refresh: function(o)
	{
		return this.remove(o) ? this.add(o) : false;
	},
	
	search: function(o, callback)
	{
		let result = [], cells = this.cells, row, cell;
		
		if(this.initiated && typeof o == "object")
		{
			if(o.occupied)
			{
				let occupied = o.occupied, pos;
				
				for(var i = 0, ol = occupied.length; i < ol; i++)
				{
					pos = occupied[i];
					
					cell = cells[pos];
					
					if(!cell)
					{
						console.error(o.name, o.occupied.join(","), pos);
						
						continue;
					}
					
					for(var j = 0, cl = cell.length; j < cl; j++)
					{
						if(result.indexOf(cell[j]) < 0 && cell[j] != o)
						{
							result.push(cell[j]);
						}
					}
				}
			}
			else
			{		
				let key = this.key(o), x1 = key.x1, x2 = key.x2, y1 = key.y1, y2 = key.y2;
				let cellsX = this.cellsX, cellsY = this.cellsY;
				
				for(var y = y1; y <= y2; y++)
				{
					if(y < 0 || y >= cellsY)
						continue;
					
					for(var x = x1; x <= x2; x++)
					{
						if(x < 0 || x >= cellsX)
							continue;
						
						cell = this.getCellPos(x, y);
						
						if(cell)
						{
							for(var i = 0, l = cell.length; i < l; i++)
							{
								if(result.indexOf(cell[i]) < 0 && cell[i] != o)
								{
									result.push(cell[i]);
								}
							}
						}
					}
				}
			}
		}
		
		if(callback)
			callback(result);
		
		return result;
	},
	
	findOverlapping: function(o, callback)
	{
		let nearby = this.search(o), hashList = this.hashList, result = [];
		
		if(nearby.length > 0)
		{			
			let hash, collided, o2;
			
			for(var i = 0, l = nearby.length; i < l; i++)
			{
				o2 = nearby[i];				
				hash = this.hash(o, o2);
				
				// If both objects exist in the hashList, a collision check has already been made
				if(hashList.indexOf(hash) < 0 && o != o2)
				{
					collided = false;
					
					// Check if object has collidingWith function and use it if it does. Otherwise, use standard rect overlap test
					if(o.collidingWith)
					{
						if(o.collidingWith(o2))
							collided = true;
					}
					else if(o2.collidingWith)
					{
						if(o2.collidingWith(o))
							collided = true;
					}
					else if(o.x <= o2.x + o2.w && o.x + o.w >= o2.x && o.y <= o2.y + o2.h && o.y + o.h >= o2.y)
						collided = true;
					
					if(collided)
						result.push(o2);
				}
				else
					hashList.push(hash);
			}
		}
		
		if(callback)
			callback(result);
		
		return result;
	},
	
	hash: function(o1, o2)
	{
		let id1 = o1.hashId, id2 = o2.hashId;
		
		if(id2 > id1)
			return id2 + ":" + id1;
		
		return id1 + ":" + id2;
	},
	
	key: function(o)
	{
		if(this.initiated && typeof o == "object")
		{
			let cellSize = this.cellSize;
			
			let x = o.getX ? o.getX() : o.x,
			y = o.getY ? o.getY() : o.y,
			w = o.getW ? o.getW() : o.w,
			h = o.getH ? o.getH() : o.h;
			
			if(!(isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)))
			{				
				return {
					x1: Math.floor(x / cellSize),
					y1: Math.floor(y / cellSize),
					
					x2: Math.floor((x + w) / cellSize),
					y2: Math.floor((y + h) / cellSize)
				};
			}
		}
	},
	
	getCellPos: function(x, y)
	{
		return y * this.cellsX + x;
	},
	
	clearHashList: function()
	{
		this.hashList.length = 0;
	},
	
	// Draws grid and highlights cells that are occupied with at least 1 object
	draw: function(ctx)
	{		
		let width = this.width, height = this.height;
		
		ctx.strokeStyle = "white";
		ctx.lineWidth = 1;
		
		let cellSize = this.cellSize, cellsX = this.cellsX, cellsY = this.cellsY, pos;
		
		ctx.beginPath();
		
		// Draw horizontal lines
		for(var y = 0; y < cellsY; y++)
		{			
			pos = y * cellSize;
			
			ctx.moveTo(0, pos);
			ctx.lineTo(width, pos);
		}
		
		// Draw vertical lines
		for(var x = 0; x < cellsX; x++)
		{
			pos = x * cellSize;
			
			ctx.moveTo(pos, 0);
			ctx.lineTo(pos, height);
		}
		
		ctx.stroke();
		
		
		ctx.strokeStyle = "red";
		let cells = this.cells;
		
		ctx.beginPath();
		
		// Highlight occupied cells red
		
		for(y = 0; y < cellsY; y++)
		{			
			for(x = 0; x < cellsX; x++)
			{
				pos = y * cellsX + x;
				
				if(cells[pos] && cells[pos].length > 0)
				{					
					ctx.moveTo(x * cellSize, y * cellSize);
					ctx.rect(x * cellSize, y * cellSize, cellSize, cellSize);
				}
			}
		}		
		
		ctx.stroke();
	}
};