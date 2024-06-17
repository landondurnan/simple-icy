const playerOrigin = 'http://localhost:5173';
let fetchController;
let fetchSignal = null;

self.addEventListener('fetch', handleFetchEvent);
self.addEventListener('install', handleInstallEvent);
self.addEventListener('activate', handleActivateEvent);
self.addEventListener('message', handleMessageEvent);

function handleFetchEvent(event) {
    if (event.request.destination != 'audio') {
        return;
    }

    let stream = new ReadableStream({
        start(controller) { 
            fetchController = new AbortController();
            let signal = fetchController.signal;
            let headers = new Headers({"Icy-Metadata": "1"});
            let fetchPromise = fetch(event.request.url, {signal, headers});

            fetchPromise
                .then(response => processStream(response, controller))
                .then(() => controller.close())
                .catch(handleFetchError);
        }
    });

    event.respondWith(new Response(stream, {
        headers: {'Content-Type': 'audio/mpeg'}
    }));
}

function processStream(response, controller) {
    let songs = Array();
    let decoder = new TextDecoder();
    let metaint = Number(response.headers.get("icy-metaint"));
    let reader = response.body.getReader();

    function process(result) {
        if (result.done) return;
        let chunk = result.value;
        for (let i = 0; i < chunk.length; i++) {
            songs.push(chunk[i]); 
            if(songs.length > (metaint + 4080)){
                handleMetadata(songs, decoder, controller);
            }
        }
        return reader.read().then(process);
    }

    return reader.read().then(process);
}

function handleMetadata(songs, decoder, controller) {
    let musicData = Uint8Array.from(songs.splice(0,metaint));
    let metalength = songs.shift() * 16;
    if (metalength > 0) {
        let songtitle = decoder.decode(Uint8Array.from(songs.splice(0,metalength)));
        sendMsgToAllClients(songtitle);
    }
    if (fetchSignal == 1) {
        fetchController.abort();
    }
    controller.enqueue(musicData);
}

function handleFetchError(e) {
    console.log('Connection to stream cancelled');
    fetchSignal = 0;
    sendMsgToAllClients('Dropped connection');
}

function handleInstallEvent(event) {
    self.skipWaiting();
}

function handleActivateEvent(event) {
    clients.claim();
}

function handleMessageEvent(event) {
    if(event.origin != playerOrigin){
        return;
    }
    fetchSignal = 1;
}

function sendMsgToAllClients(msg){
    self.clients.matchAll().then(function (clients){
        clients.forEach(function(client){
            client.postMessage({
                msg: msg
            });
        });
    });
}
