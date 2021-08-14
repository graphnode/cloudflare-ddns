import forever from 'forever-monitor';

const Monitor = forever.Monitor;

const maxRestarts = 3;

var child = new Monitor('server.js', {
    max: maxRestarts,
    silent: false,
    args: []
});

child.on('exit', function () {
    console.log(`cloudflare-ddns has exited after ${maxRestarts} restarts`);
});

child.start();