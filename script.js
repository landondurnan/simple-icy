// Constants
const SERVICE_WORKER_PATH = '/service-worker.js';
const AUDIO_SELECTOR = 'audio';
const MESSAGE_LIST_SELECTOR = 'ul';
const MESSAGE_DISPLAY_SELECTOR = 'div';
const ORIGIN = 'http://localhost:5157';

// Variables
let delay = 8000;

// Check if service worker is available
if ('serviceWorker' in navigator) {
    registerServiceWorker();
}

// Event listeners
navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
document.querySelector(AUDIO_SELECTOR).addEventListener('play', handlePlayEvent);
document.querySelector(AUDIO_SELECTOR).addEventListener('playing', handlePlayingEvent);
document.querySelector(AUDIO_SELECTOR).addEventListener('pause', handlePauseEvent);

function registerServiceWorker() {
    navigator.serviceWorker.register(SERVICE_WORKER_PATH)
        .then(() => {
            console.log('Icecast service worker registered');
            addItemToList('Icecast service worker registered. Click play to start the stream.');
        })
        .catch((error) => {
            console.warn('Error ' + error);
            addItemToList('Error ' + error);
        });
}

function handleServiceWorkerMessage(event) {
    if(event.origin !== ORIGIN){
        return;
    }
    setTimeout(() => {
        document.querySelector(MESSAGE_DISPLAY_SELECTOR).innerText = extractMessage(event.data.msg);
    }, delay);
    console.log(event.data.msg);
    addItemToList('Message from service worker ' + event.data.msg);
}

function handlePlayEvent() {
    performance.mark('play');
    addItemToList("Measuring buffering time...");
}

function handlePlayingEvent() {
    console.log('Playing');
    performance.mark('playing');
    performance.measure('delay','play','playing');
    let measures = performance.getEntriesByName("delay");
    delay = measures[0].duration;
    addItemToList(`Buffering took ${(delay/1000).toFixed(2)} seconds`);
    addItemToList(`Setting metadata update delay to ${(delay/1000).toFixed(2)} seconds`);
}

function handlePauseEvent() {
    console.log('Paused');
    navigator.serviceWorker.controller.postMessage('message');
    document.querySelector(AUDIO_SELECTOR).src = document.querySelector(AUDIO_SELECTOR).src;
}

function addItemToList(text) {
    let node = document.createElement("li");
    let textnode = document.createTextNode(text);
    node.appendChild(textnode);
    document.querySelector(MESSAGE_LIST_SELECTOR).appendChild(node);
}

function extractMessage(msg) {
    return msg.substring(msg.indexOf("'") + 1, msg.lastIndexOf("'"));
}
