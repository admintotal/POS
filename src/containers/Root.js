if (process.env.NODE_ENV === 'production') {    
    module.exports = require('./Root.prod'); // eslint-disable-line global-require
} else {
    if(process._events.uncaughtException && process._events.uncaughtException.length > 0){
        process._events.uncaughtException.splice(0,1);
    }

    process.on('uncaughtException', function(e){
        console.group('Node uncaughtException');
        if(!!e.message){
            console.error(e.message);
        }
        if(!!e.stack){
            console.error(e.stack);
        }
        console.groupEnd();
    });


    // Clean Buggy thing
    if(process._events.uncaughtException.length > 1 
        && !!process._events.uncaughtException[0].toString().match(/native code/)
    ){
        process._events.uncaughtException.splice(0,1);
    }
    
    module.exports = require('./Root.dev'); // eslint-disable-line global-require
}
