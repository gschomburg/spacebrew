$(document).ready( function() {
    $("#btnRouteRadio").on('click', dorouteradio);
});

var name = gup('name') || window.location.href; 
var server = gup('server') || 'localhost';

var dorouteradio = function(e){
    if (e){e.preventDefault();};
    var selectedPub = $("input[name=pub]:radio:checked").val();
    var selectedSub = $("input[name=sub]:radio:checked").val();
    if (selectedPub && selectedSub){
        selectedPub = selectedPub.split('_').map(Unsafetify);
        selectedSub = selectedSub.split('_').map(Unsafetify);
        if (selectedPub.length == 4 && selectedSub.length == 4){
            ws.send(JSON.stringify({
                route:{type:'add',
                        publisher:{clientName:selectedPub[0],
                                    name:selectedPub[2],
                                    type:selectedPub[3],
                                    remoteAddress:selectedPub[1]},
                        subscriber:{clientName:selectedSub[0],
                                    name:selectedSub[2],
                                    type:selectedSub[3],
                                    remoteAddress:selectedSub[1]}}
            }));
        }
    }
};

var dorouteremove = function(index){
    if (index >= 0 && index < routes.length){
        var toRemove = routes.splice(index, 1);
        if (toRemove.length > 0){
            toRemove = toRemove[0];
            ws.send(JSON.stringify({
                route:{type:'remove',
                        publisher:toRemove.publisher,
                        subscriber:toRemove.subscriber}
            }));
        }
    }
};

var ws = new WebSocket("ws://"+server+":9000");
    ws.onopen = function() {
        console.log("WebSockets connection opened");
        var adminMsg = { "admin": [
            {"admin": true}
        ]};
        ws.send(JSON.stringify(adminMsg));
    };
    ws.onmessage = function(e) {
        //console.log("Got WebSockets message: " + e.data);
        console.log("Got WebSockets message:");
        console.log(e);
        //try {
            var json = JSON.parse(e.data);
            if (!handleMsg(json)){
                for(var i = 0, end = json.length; i < end; i++){
                    handleMsg(json[i]);
                }
            }
        // } catch (err) {
        //     console.log('This doesn\'t look like a valid JSON: ', e.data);
        //     return;
        // }
    };
    ws.onclose = function() {
        console.log("WebSockets connection closed");
    };

var clients = [];
var routes = [];

var handleMsg = function(json){
    if (json.name){
        handleNameMsg(json);
    } else if (json.config){
        handleConfigMsg(json);
    } else if (json.message){
        handleMessageMsg(json);
    } else if (json.route){
        handleRouteMsg(json);
    } else if (json.remove){
        handleRemoveMsg(json);
    } else if (json.admin){
        //do nothing
    } else {
        return false;
    }
    return true;
};

var handleMessageMsg = function(msg){
    for(var i = clients.length - 1; i >= 0; i--){
        if (clients[i].name === msg.message.clientName
            && clients[i].remoteAddress === msg.message.remoteAddress){
            var selector = "#client_list li:eq("+i+")";
            $(selector).addClass('active');
            setTimeout(function(){$(selector).removeClass('active');},200);
            break;
        }
    }
    var selector2 = "input[name=pub][value='{name}_{addr}_{pubName}_{pubType}']:radio".replace("{name}",msg.message.clientName.Safetify()).replace("{addr}", msg.message.remoteAddress.Safetify()).replace("{pubName}",msg.message.name.Safetify()).replace("{pubType}",msg.message.type.Safetify());
    $(selector2).parent().addClass('active');
    setTimeout(function(){$(selector2).parent().removeClass('active');},200);
};

var handleNameMsg = function(msg){
    for(var i = 0; i < msg.name.length; i++){
        clients.push({name:msg.name[i].name, remoteAddress:msg.name[i].remoteAddress});
    };
    generateList();
};

//generates the list of clients for viewing
var generateList = function(){
    return;
    //we should do this dynamically
    var olHtml = '';
    for(var i = 0; i < clients.length; i++){
        var name=clients[i].name;
        var addr = clients[i].remoteAddress, pubColumn = '<div class="span3 offset2 publishers">', title = '', subColumn = '<div class="span3 subscribers">';
        if (clients[i].config){
            if (clients[i].config.publish && clients[i].config.publish.messages){
                for(var j = clients[i].config.publish.messages.length - 1; j >= 0; j--){
                    var currM = clients[i].config.publish.messages[j];
                    pubColumn += '<label class="radio"><input type="radio" name="pub" value="{name}_{addr}_{pubName}_{pubType}">{pubName}, {pubType}</label>'.replace(/{pubName}/g,currM.name.Safetify()).replace(/{pubType}/g,currM.type.Safetify());
                }
            }
            if (clients[i].config.subscribe && clients[i].config.subscribe.messages){
                for (var j = clients[i].config.subscribe.messages.length - 1; j >= 0; j--){
                    var currM = clients[i].config.subscribe.messages[j];
                    subColumn += '<label class="radio"><input type="radio" name="sub" value="{name}_{addr}_{subName}_{subType}">{subName}, {subType}</label>'.replace(/{subName}/g,currM.name.Safetify()).replace(/{subType}/g,currM.type.Safetify());
                }
            }
            title = clients[i].config.description;
        }
        pubColumn += '</div>';
        subColumn += '</div>';
        var leftColumn = '<div class="span8 client" title="{title}">{name} @ {addr}<div class="row">{col2}{col3}</div></div>';
        olHtml += '<li><div class="row">{col1}</div></li>'.replace(/{col1}/g,leftColumn).replace(/{col2}/g,pubColumn).replace(/{col3}/g,subColumn).replace(/{name}/g,name.Safetify()).replace(/{addr}/g,addr.Safetify()).replace(/{title}/g,title);
    };
    $("#client_list").html(olHtml);
};

var routeTemplate;
routeTemplate = Handlebars.compile(document.getElementById( 'route_handlebar' ).textContent);
var clientTemplate;
clientTemplate = Handlebars.compile(document.getElementById( 'client_handlebar' ).textContent);

var displayRoutes = function(){
    $("#route_list").html(routeTemplate({routes:routes}));
};

var handleConfigMsg = function(msg){
    for(var j = 0; j < clients.length; j++){
        if (clients[j].name === msg.config.name
            && clients[j].remoteAddress === msg.config.remoteAddress){
            if (clients[j].config){
                removeClient(clients[j]);
            }
            clients[j].config = msg.config;
            $("#client_list").append($(clientTemplate(clients[j])));
            break;
        }
    }
    generateList();
};

var removeClient = function(client){
    $("#"+client.name.Safetify()+"_"+client.remoteAddress.Safetify()).remove();
};

var handleRouteMsg = function(msg){
    if (msg.route.type === 'add'){
        routes.push({publisher:msg.route.publisher,
                    subscriber:msg.route.subscriber});
    } else if (msg.route.type === 'remove'){
        for(var i = routes.length - 1; i >= 0; i--){
            var myPub = routes[i].publisher;
            var thePub = msg.route.publisher;
            var mySub = routes[i].subscriber;
            var theSub = msg.route.subscriber;
            if (myPub.clientName === thePub.clientName
                && myPub.name === thePub.name
                && myPub.type === thePub.type
                && myPub.remoteAddress === thePub.remoteAddress
                && mySub.clientName === theSub.clientName
                && mySub.name === theSub.name
                && mySub.type === theSub.type
                && mySub.remoteAddress === theSub.remoteAddress){
                routes.splice(i, 1);
            }
        }
    }
    displayRoutes();
};

var handleRemoveMsg = function(msg){
    //for each entry in the remove list
    //for each entry in the clients list
    //if the name & address match, then remove it from the list
    for(var i = 0; i < msg.remove.length; i++){
        for(var j = 0; j < clients.length; j++){
            if (clients[j].name === msg.remove[i].name
                && clients[j].remoteAddress === msg.remove[i].remoteAddress){
                removeClient(clients.splice(j, 1)[0]);
                break;
            }
        }
    }
    generateList();
};