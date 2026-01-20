// EpoxyTransport placeholder - would need @mercuryworkshop/epoxy-transport package
// This is a basic implementation for bare-mux compatibility

export default class EpoxyTransport {
    constructor(config) {
        this.config = config;
        this.ready = false;
    }

    async init() {
        this.ready = true;
        console.log('EpoxyTransport initialized with config:', this.config);
    }

    async connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
        console.warn('EpoxyTransport connect called but not implemented');
        onerror('EpoxyTransport not properly implemented');
    }

    async request(remote, method, body, headers, signal) {
        console.warn('EpoxyTransport request called but not implemented');
        throw new Error('EpoxyTransport not properly implemented');
    }

    meta() {
        return {};
    }
}


