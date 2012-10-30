{
// Eww, global variables, I know! It's so shameful.
var offset = 0;
var limit = 10;
var count = 0;
var sqdb = new MooSQL({
	dbName:'Tools',
	dbVersion:'1.0',
	dbDesc:'TILFs',
	dbSize:2*100
});

window.addEvent('domready', function(){
	$('moar').addEvent('mousedown', function(event){
		//createItem('MEAT', 'http://24.media.tumblr.com/tumblr_mbxsvzFrmM1qc4uamo1_500.png');
		loadDevices(offset);
		offset += limit;
	});
	scrapeDB();
	loadDevices(0);
	offset += limit;
	
	sqdb.addEvent('databaseCreated',function(){
		console.log('Created.');
    });
    sqdb.addEvent('databaseReady',function(){
        console.log('Ready');
    });
    sqdb.addEvent('notSupported',function(){
        console.log('Browser not supported.');
    });
    sqdb.addEvent('transactionError',function(){
        console.log('transaction error');
    });
    sqdb.addEvent('statementError',function(){
       // alert('statement error');
    });
    

    
    

	new ScrollLoader({
		container: $('items'),
		onScroll: function(){
			var scroll = this;
			scroll.detach(); // We detach the listener so it does not execute while loading
			console.log('scroll');
			$('moar').fireEvent('mousedown');	
			// Now here goes some Request, this is just a simple timer to give you an idea
			(function(){
				scroll.attach();
			}).delay(4000); // Simulated one second delay
		}
	});
	
});

function loadDevices(offset){
	//console.log('load...');
	// JSONP request to iFixit
	var devices = new Request.JSONP({
		url: 'http://www.ifixit.com/api/0.1/users?offset='+offset+'&limit='+limit, 
		callbackKey: 'jsonp',
		onRequest: function(url){
			console.log('loading ' + url);
		},
		onComplete: function(data){
			data.forEach(function(value, index, array1){
				// for each item in the returned array, get 
				// the name, and then get the image.
				var data1 = data[index];
				//console.log(data1);
				var name = data1['username'];
				var id = data1['userid'];
				// getImage also creates an entry in the items pane
				getImageID(name, id);	
				});
			//console.log('Done loading.');
		}
	}).send();
}

function getImageID(person, usrid){
	//This scrapes the user data for userid
	//and gets the imageid to pass to the image-getter
	// Another JSONP request to the Images api
	var devices = new Request.JSONP({
		url: 'http://www.ifixit.com/api/0.1/user/'+usrid, 
		callbackKey: 'jsonp',
		onRequest: function(url){
			//console.log('loading image for ' + device);
		},
		onComplete: function(data){
			//console.log(data);
			var id = data['imageid'];
			var summary = data['summary'];
			//alert(url);
			console.log('Found '+usrid+'\'s imageid '+id);
			getImage(person, id, summary);
		
		}
	}).send();
	
}

function getImage(person, id, summary){
	// gets the user's image based off of the 
	// imageid passed in, the summary just gets forwarded
	var devices = new Request.JSONP({
		url: 'http://www.ifixit.com/api/0.1/image/'+id, 
		callbackKey: 'jsonp',
		onRequest: function(url){
			console.log('loading image for ' + person);
		},
		onComplete: function(data){
			//console.log(data);
			var url = data['base_url'];
			//alert(url);
			if(url == undefined){
				// here's a default image if none is returned from iFixit.
				// It came from the iFixit homepage
				url = 'http://www.ruggedelegantliving.com/a/images/Mona.Lisa.smile.by.da.Vinci.jpg';
			}
			else{
				// Otherwise, specify that you want the thumbnail.
			url =  url +".thumbnail"
			}
			// and finally insert the item into the pane
			console.log('Found URL '+ url);
			createItem(person, url, summary);
			count++;
			$('count').innerText = 'There are '+count+' peeps to choose from!';
		}
	}).send();
	
}
function createItem(title, image, summary){
	// new div element
	var item = new Element('div');
	item.className = 'item';
	item.setStyle('background-image', 'url('+image+')');
	item.setStyle('background-size', '100%');
	item.innerHTML = '<span>'+title+'</span>';
	// and inject it
	item.inject('items')
	// and make sure it has click events...
	createEvents(item);
}
function createItemInBag(title, image){
	// to make an item in the bag (from the database)
	var item = new Element('div');
	item.className= 'item';
	item.setStyle('background-image', image);
	item.setStyle('background-size', '100%');
	// remember to put the title into a span
	item.innerHTML = "<span>"+title+"</span>";
	// and put it in the toolbag
	item.inject('toolbag')
	createEvents(item);
}

function createEvents(item){
	// add a mousedown click event for the item passed in
	item.addEvent('mousedown', function(event){
    event.stop();
	console.log('An item was selected..');
    var gear = this;
    // Clone the item
    var clone = gear.clone().setStyles(gear.getCoordinates()).setStyles({
      opacity: 0.7,
      position: 'absolute'
    }).inject(document.body);
    // make the clone a draggable
    var drag = new Drag.Move(clone, {
      droppables: [$('toolbag'), $('items')],
      onDrop: function(dragging, dest){
        dragging.destroy();
        if (dest != null){
          // inject the item
          gear.inject(dest);
          $('status').set('html',"Added " + gear.innerText);
          // if the destination is the gearbag, add it to the database
          if(dest != $('items')){
          	insertDB(gear.innerText, gear.style.backgroundImage);
          }
          // if the destination is the items pane, remove it from the database
          if(dest == $('items')){
          	removeDB(gear.innerText);
          }
        }
        else{
        	// if you drop the item in the middle of nowhere...
        	$('status').set('html',"Girl, you gotta aim better.");
        }
      },
      // some helpful instructions
      onEnter: function(dragging, dest){
        $('status').set('html',"Release to put "+ gear.innerText +" into the " + dest.id +".");
      },
      // A little indicator
      onCancel: function(dragging){
        dragging.destroy();
        $('status').set('html',"Cancelled.");
      }
    });
    drag.start(event);
  });


}

function scrapeDB(){
	// get the entries currently in the database
	// Look to see if the "devices" table exists
	// If it doesn't, then create it.
    sqdb.tableExists('devices', {run: function(transaction, result){
		//console.log(transaction);
		createTable();
	}});
	// Get all the records, iterate through them.
    sqdb.exec("SELECT * FROM devices", function (transaction,result){
      for(var i=0; i < result.rows.length; i++){
		  //console.log(result.rows.item(i));
		  createItemInBag(result.rows.item(i)['name'], result.rows.item(i)['img']);
      }
      console.log('Scraped the database.');
    });
}
function createTable(){
	// make the table if it's not there
	sqdb.exec("CREATE TABLE devices(name varchar(255) UNIQUE, img varchar(255))", function(transaction, result){
		//console.log(transaction);
		//console.log(result);
	});
}	
function insertDB(device, img){
	console.log('inserting ' + device)
	// insert an item into the database table
	sqdb.exec("INSERT INTO devices (name, img) VALUES ('"+ device +"','"+ img +"')", function(transaction, result){
		//console.log(transaction);
		//console.log(result);
	});
}
function removeDB(device){
	// remove an item from the table
	console.log('deleting ' + device);
	sqdb.exec("DELETE FROM devices WHERE name='"+device+"'", function(transaction, result){
		//console.log(transaction);
		//console.log(result);
	});
}
}